import clone from 'clone';

import * as util from './util';
import RxDocument from './rx-document';
import RxQuery from './rx-query';
import RxChangeEvent from './rx-change-event';
import RxError from './rx-error';
import DataMigrator from './data-migrator';
import Crypter from './crypter';
import DocCache from './doc-cache';
import QueryCache from './query-cache';
import ChangeEventBuffer from './change-event-buffer';
import overwritable from './overwritable';
import {
    runPluginHooks
} from './hooks';

import RxSchema from './rx-schema';
import RxDatabase from './rx-database';

const HOOKS_WHEN = ['pre', 'post'];
const HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];

export class RxCollection {
    constructor(database, name, schema, pouchSettings = {}, migrationStrategies = {}, methods = {}) {
        this.database = database;
        this.name = name;
        this.schema = schema;
        this._migrationStrategies = migrationStrategies;
        this._pouchSettings = pouchSettings;
        this._methods = methods;
        this._atomicUpsertLocks = {};

        this._docCache = DocCache.create();
        this._queryCache = QueryCache.create();

        // defaults
        this.synced = false;
        this.hooks = {};
        this._subs = [];
        this._repStates = [];
        this.pouch = null; // this is needed to preserve this name

        // set HOOKS-functions dynamically
        HOOKS_KEYS.forEach(key => {
            HOOKS_WHEN.map(when => {
                const fnName = when + util.ucfirst(key);
                this[fnName] = (fun, parallel) => this.addHook(when, key, fun, parallel);
            });
        });

    }
    async prepare() {
        this._dataMigrator = DataMigrator.create(this, this._migrationStrategies);
        this._crypter = Crypter.create(this.database.password, this.schema);

        this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this._pouchSettings);
        await this.pouch.info(); // ensure that we wait until db is useable

        this._observable$ = this.database.$
            .filter(event => event.data.col == this.name);
        this._changeEventBuffer = ChangeEventBuffer.create(this);

        // INDEXES
        await Promise.all(
            this.schema.indexes
            .map(indexAr => {
                const compressedIdx = indexAr
                    .map(key => {
                        if (!this.schema.doKeyCompression())
                            return key;
                        else
                            return this._keyCompressor._transformKey('', '', key.split('.'));
                    });
                return this.pouch.createIndex({
                    index: {
                        fields: compressedIdx
                    }
                });
            })
        );

        this._subs.push(
            this._observable$.subscribe(cE => {
                // when data changes, send it to RxDocument in docCache
                const doc = this._docCache.get(cE.data.doc);
                if (doc) doc._handleChangeEvent(cE);
            })
        );
    }

    get _keyCompressor() {
        if (!this.__keyCompressor)
            this.__keyCompressor = overwritable.createKeyCompressor(this.schema);
        return this.__keyCompressor;
    }

    /**
     * checks if a migration is needed
     * @return {boolean}
     */
    migrationNeeded() {
        if (this.schema.version == 0) return false;
        return this
            ._dataMigrator
            ._getOldCollections()
            .then(oldCols => oldCols.length > 0);
    }

    /**
     * @param {number} [batchSize=10] amount of documents handled in parallel
     * @return {Observable} emits the migration-status
     */
    migrate(batchSize = 10) {
        return this._dataMigrator.migrate(batchSize);
    }

    /**
     * does the same thing as .migrate() but returns promise
     * @param {number} [batchSize=10] amount of documents handled in parallel
     * @return {Promise} resolves when finished
     */
    migratePromise(batchSize = 10) {
        return this._dataMigrator.migratePromise(batchSize);
    }

    /**
     * wrappers for Pouch.put/get to handle keycompression etc
     */
    _handleToPouch(docData) {
        let data = clone(docData);
        data = this._crypter.encrypt(data);
        data = this.schema.swapPrimaryToId(data);
        if (this.schema.doKeyCompression())
            data = this._keyCompressor.compress(data);
        return data;
    }
    _handleFromPouch(docData, noDecrypt = false) {
        let data = clone(docData);
        data = this.schema.swapIdToPrimary(data);
        if (this.schema.doKeyCompression())
            data = this._keyCompressor.decompress(data);
        if (noDecrypt) return data;
        data = this._crypter.decrypt(data);
        return data;
    }

    /**
     * [overwrite description]
     * @param {object} obj
     * @param {boolean} [overwrite=false] if true, it will overwrite existing document
     */
    async _pouchPut(obj, overwrite = false) {
        obj = this._handleToPouch(obj);
        let ret = null;
        try {
            ret = await this.pouch.put(obj);
        } catch (e) {
            if (overwrite && e.status == 409) {
                const exist = await this.pouch.get(obj._id);
                obj._rev = exist._rev;
                ret = await this.pouch.put(obj);
            } else throw e;
        }
        return ret;
    }

    /**
     * get document from pouchdb by its _id
     * @param  {[type]} key [description]
     * @return {[type]}     [description]
     */
    _pouchGet(key) {
        return this
            .pouch
            .get(key)
            .then(doc => this._handleFromPouch(doc));
    }

    /**
     * wrapps pouch-find
     * @param {RxQuery} rxQuery
     * @param {?number} limit overwrites the limit
     * @param {?boolean} noDecrypt if true, decryption will not be made
     * @return {Object[]} array with documents-data
     */
    async _pouchFind(rxQuery, limit, noDecrypt = false) {
        const compressedQueryJSON = rxQuery.keyCompress();
        if (limit) compressedQueryJSON.limit = limit;

        const docsCompressed = await this.pouch.find(compressedQueryJSON);
        const docs = docsCompressed.docs
            .map(doc => this._handleFromPouch(doc, noDecrypt));

        return docs;
    }

    /**
     * assigns the ORM-methods to the RxDocument
     * @param {RxDocument} doc
     */
    _assignMethodsToDocument(doc) {
        Object.entries(this._methods).forEach(entry => {
            const funName = entry[0];
            const fun = entry[1];
            doc.__defineGetter__(funName, () => fun.bind(doc));
        });
    }

    /**
     * create a RxDocument-instance from the jsonData
     * @param {Object} json documentData
     * @return {Promise<RxDocument>}
     */
    async _createDocument(json) {
        // return from cache if exsists
        const id = json[this.schema.primaryPath];
        const cacheDoc = this._docCache.get(id);
        if (cacheDoc) return cacheDoc;

        const doc = RxDocument.create(this, json);
        this._assignMethodsToDocument(doc);
        this._docCache.set(id, doc);
        this._runHooksSync('post', 'create', doc);

        return doc;
    }
    /**
     * create RxDocument from the docs-array
     * @return {Promise<RxDocument[]>} documents
     */
    async _createDocuments(docsJSON) {
        return Promise.all(docsJSON.map(json => this._createDocument(json)));
    }

    /**
     * returns observable
     */
    get $() {
        return this._observable$;
    }
    $emit(changeEvent) {
        return this.database.$emit(changeEvent);
    }

    /**
     * @param {Object|RxDocument} json data or RxDocument if temporary
     * @param {RxDocument} doc which was created
     * @return {Promise<RxDocument>}
     */
    async insert(json) {

        // inserting a temporary-document
        let tempDoc = null;
        if (RxDocument.isInstanceOf(json)) {
            tempDoc = json;
            if (!json._isTemporary)
                throw new Error('You cannot insert an existing document');
            json = json.toJSON();
        }

        json = clone(json);
        json = this.schema.fillObjectWithDefaults(json);

        if (json._id)
            throw new Error('do not provide ._id, it will be generated');

        // fill _id
        if (
            this.schema.primaryPath == '_id' &&
            !json._id
        ) json._id = util.generate_id();

        await this._runHooks('pre', 'insert', json);

        this.schema.validate(json);

        const insertResult = await this._pouchPut(json);

        json[this.schema.primaryPath] = insertResult.id;
        json._rev = insertResult.rev;

        let newDoc = tempDoc;
        if (tempDoc) tempDoc._data = json;
        else newDoc = await this._createDocument(json);

        await this._runHooks('post', 'insert', newDoc);

        // event
        const emitEvent = RxChangeEvent.create(
            'INSERT',
            this.database,
            this,
            newDoc,
            json
        );
        this.$emit(emitEvent);

        return newDoc;
    }

    /**
     * same as insert but overwrites existing document with same primary
     */
    async upsert(json) {
        json = clone(json);
        const primary = json[this.schema.primaryPath];
        if (!primary) throw new Error('RxCollection.upsert() does not work without primary');

        const existing = await this.findOne(primary).exec();
        if (existing) {
            json._rev = existing._rev;
            existing._data = json;
            await existing.save();
            return existing;
        } else {
            const newDoc = await this.insert(json);
            return newDoc;
        }
    }

    /**
     * ensures that the given document exists
     * @param  {string}  primary
     * @param  {any}  json
     * @return {Promise} promise that resolves when finished
     */
    _atomicUpsertEnsureRxDocumentExists(primary, json) {
        return this
            .findOne(primary)
            .exec()
            .then(doc => {
                if (!doc)
                    return this.insert(json);
            });
    }

    /**
     * upserts to a RxDocument, uses atomicUpdate if document already exists
     * @param  {object}  json
     * @return {Promise}
     */
    atomicUpsert(json) {
        json = clone(json);
        const primary = json[this.schema.primaryPath];
        if (!primary) throw new Error('RxCollection.atomicUpsert() does not work without primary');

        // ensure that it wont try 2 parallel inserts
        if (!this._atomicUpsertLocks[primary])
            this._atomicUpsertLocks[primary] = this._atomicUpsertEnsureRxDocumentExists(primary, json);

        return this
            ._atomicUpsertLocks[primary]
            .then(() => this.findOne(primary).exec())
            .then(doc => doc.atomicUpdate(innerDoc => {
                json._rev = innerDoc._rev;
                innerDoc._data = json;
            }));
    }

    /**
     * takes a mongoDB-query-object and returns the documents
     * @param  {object} queryObj
     * @return {RxDocument[]} found documents
     */
    find(queryObj) {
        if (typeof queryObj === 'string')
            throw new Error('if you want to search by _id, use .findOne(_id)');

        const query = RxQuery.create('find', queryObj, this);
        return query;
    }

    findOne(queryObj) {
        let query;

        if (typeof queryObj === 'string') {
            query = RxQuery.create('findOne', {
                _id: queryObj
            }, this);
        } else query = RxQuery.create('findOne', queryObj, this);

        if (
            typeof queryObj === 'number' ||
            Array.isArray(queryObj)
        ) throw new TypeError('.findOne() needs a queryObject or string');

        return query;
    }

    /**
     * export to json
     * @param {boolean} decrypted if true, all encrypted values will be decrypted
     */
    dump() {
        throw RxError.pluginMissing('json-dump');
    }

    /**
     * imports the json-data into the collection
     * @param {Array} exportedJSON should be an array of raw-data
     */
    async importDump() {
        throw RxError.pluginMissing('json-dump');
    }

    /**
     * waits for external changes to the database
     * and ensures they are emitted to the internal RxChangeEvent-Stream
     * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
     */
    watchForChanges() {
        throw RxError.pluginMissing('replication');
    }

    /**
     * sync with another database
     */
    sync() {
        throw RxError.pluginMissing('replication');
    }


    /**
     * HOOKS
     */
    addHook(when, key, fun, parallel = false) {
        if (typeof fun != 'function')
            throw new TypeError(key + '-hook must be a function');

        if (!HOOKS_WHEN.includes(when))
            throw new TypeError('hooks-when not known');

        if (!HOOKS_KEYS.includes(key))
            throw new Error('hook-name ' + key + 'not known');

        if (when == 'post' && key == 'create' && parallel == true)
            throw new Error('.postCreate-hooks cannot be async');

        const runName = parallel ? 'parallel' : 'series';

        this.hooks[key] = this.hooks[key] || {};
        this.hooks[key][when] = this.hooks[key][when] || {
            series: [],
            parallel: []
        };
        this.hooks[key][when][runName].push(fun);
    }
    getHooks(when, key) {
        try {
            return this.hooks[key][when];
        } catch (e) {
            return {
                series: [],
                parallel: []
            };
        }
    };
    async _runHooks(when, key, doc) {
        const hooks = this.getHooks(when, key);
        if (!hooks) return;

        for (let i = 0; i < hooks.series.length; i++)
            await hooks.series[i](doc);

        await Promise.all(
            hooks.parallel
            .map(hook => hook(doc))
        );
    }

    /**
     * does the same as ._runHooks() but with non-async-functions
     */
    _runHooksSync(when, key, doc) {
        const hooks = this.getHooks(when, key);
        if (!hooks) return;
        hooks.series.forEach(hook => hook(doc));
    }

    /**
     * creates a temporaryDocument which can be saved later
     * @param {Object} docData
     * @return {RxDocument}
     */
    newDocument(docData = {}) {
        docData = this.schema.fillObjectWithDefaults(docData);
        const doc = RxDocument.create(this, docData);
        doc._isTemporary = true;
        this._assignMethodsToDocument(doc);
        this._runHooksSync('post', 'create', doc);
        return doc;
    }

    async destroy() {
        this._subs.forEach(sub => sub.unsubscribe());
        this._changeEventBuffer && this._changeEventBuffer.destroy();
        this._queryCache.destroy();
        this._repStates.forEach(sync => sync.cancel());
        delete this.database.collections[this.name];
    }

    /**
     * remove all data
     * @return {Promise}
     */
    remove() {
        return this.database.removeCollection(this.name);
    }

}

/**
 * checks if the migrationStrategies are ok, throws if not
 * @param  {RxSchema} schema
 * @param  {Object} migrationStrategies
 * @throws {Error|TypeError} if not ok
 * @return {boolean}
 */
const checkMigrationStrategies = function(schema, migrationStrategies) {
    // migrationStrategies must be object not array
    if (
        typeof migrationStrategies !== 'object' ||
        Array.isArray(migrationStrategies)
    ) throw new TypeError('migrationStrategies must be an object');

    // for every previousVersion there must be strategy
    if (schema.previousVersions.length != Object.keys(migrationStrategies).length) {
        throw new Error(`
      a migrationStrategy is missing or too much
      - have: ${JSON.stringify(Object.keys(migrationStrategies).map(v => parseInt(v)))}
      - should: ${JSON.stringify(schema.previousVersions)}
      `);
    }

    // every strategy must have number as property and be a function
    schema.previousVersions
        .map(vNr => ({
            v: vNr,
            s: migrationStrategies[(vNr + 1) + '']
        }))
        .filter(strat => typeof strat.s !== 'function')
        .forEach(strat => {
            throw new TypeError(`migrationStrategy(v${strat.v}) must be a function; is : ${typeof strat}`);
        });

    return true;
};


/**
 * returns all possible properties of a RxCollection-instance
 * @return {string[]} property-names
 */
let _properties = null;
export function properties() {
    if (!_properties) {
        const pseudoInstance = new RxCollection();
        const ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        const prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
        _properties = [...ownProperties, ...prototypeProperties];
    }
    return _properties;
}

/**
 * checks if the given static methods are allowed
 * @param  {{}} statics [description]
 * @throws if not allowed
 */
const checkORMmethdods = function(statics) {
    Object.entries(statics).forEach(entry => {
        if (typeof entry[0] != 'string')
            throw new TypeError(`given static method-name (${entry[0]}) is not a string`);

        if (entry[0].startsWith('_'))
            throw new TypeError(`static method-names cannot start with underscore _ (${entry[0]})`);

        if (typeof entry[1] != 'function')
            throw new TypeError(`given static method (${entry[0]}) is not a function but ${typeof entry[1]}`);

        if (properties().includes(entry[0]) || RxDocument.properties().includes(entry[0]))
            throw new Error(`statics-name not allowed: ${entry[0]}`);
    });
};

/**
 * creates and prepares a new collection
 * @param  {RxDatabase}  database
 * @param  {string}  name
 * @param  {RxSchema}  schema
 * @param  {?Object}  [pouchSettings={}]
 * @param  {?Object}  [migrationStrategies={}]
 * @return {Promise.<RxCollection>} promise with collection
 */
export async function create({
    database,
    name,
    schema,
    pouchSettings = {},
    migrationStrategies = {},
    autoMigrate = true,
    statics = {},
    methods = {}
}) {
    if (!RxSchema.isInstanceOf(schema))
        throw new TypeError('given schema is no Schema-object');

    if (!RxDatabase.isInstanceOf(database))
        throw new TypeError('given database is no Database-object');

    if (typeof autoMigrate !== 'boolean')
        throw new TypeError('autoMigrate must be boolean');

    util.validateCouchDBString(name);
    checkMigrationStrategies(schema, migrationStrategies);

    // check ORM-methods
    checkORMmethdods(statics);
    checkORMmethdods(methods);
    Object.keys(methods)
        .filter(funName => schema.topLevelFields.includes(funName))
        .forEach(funName => {
            throw new Error(`collection-method not allowed because fieldname is in the schema ${funName}`);
        });

    const collection = new RxCollection(database, name, schema, pouchSettings, migrationStrategies, methods);
    await collection.prepare();

    // ORM add statics
    Object.entries(statics).forEach(entry => {
        const fun = entry.pop();
        const funName = entry.pop();
        collection.__defineGetter__(funName, () => fun.bind(collection));
    });

    if (autoMigrate)
        await collection.migratePromise();

    runPluginHooks('createRxCollection', collection);
    return collection;
}

export function isInstanceOf(obj) {
    return obj instanceof RxCollection;
}

export default {
    create,
    properties,
    isInstanceOf,
    RxCollection
};
