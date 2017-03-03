import {
    default as PouchDB
} from './PouchDB';

import {
    default as objectPath
} from 'object-path';

import {
    default as clone
} from 'clone';

import * as util from './util';
import * as RxDocument from './RxDocument';
import * as RxQuery from './RxQuery';
import * as RxChangeEvent from './RxChangeEvent';
import * as KeyCompressor from './KeyCompressor';
import * as DataMigrator from './DataMigrator';
import * as Crypter from './Crypter';
import * as DocCache from './DocCache';

const HOOKS_WHEN = ['pre', 'post'];
const HOOKS_KEYS = ['insert', 'save', 'remove'];

class RxCollection {


    constructor(database, name, schema, pouchSettings = {}, migrationStrategies = {}, methods = {}) {
        this.database = database;
        this.name = name;
        this.schema = schema;
        this._migrationStrategies = migrationStrategies;
        this._pouchSettings = pouchSettings;
        this._methods = methods;

        // contains a weak link to all used RxDocuments of this collection
        this._docCache = DocCache.create();


        // defaults
        this.synced = false;
        this.hooks = {};
        this._subs = [];
        this.pouchSyncs = [];
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
        this._keyCompressor = KeyCompressor.create(this.schema);

        this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this._pouchSettings);

        this._observable$ = this.database.$
            .filter(event => event.data.col == this.name);

        // INDEXES
        await Promise.all(
            this.schema.indexes
            .map(indexAr => {
                const compressedIdx = indexAr
                    .map(key => {
                        if (!this.schema.doKeyCompression()) return key;
                        const ret = this._keyCompressor._transformKey('', '', key.split('.'));
                        return ret;
                    });
                return this.pouch.createIndex({
                    index: {
                        fields: compressedIdx
                    }
                });
            })
        );


        // when data changes, send it to RxDocument in docCache
        this._subs.push(
            this._observable$.subscribe(cE => {
                const doc = this._docCache.get(cE.data.doc);
                if (!doc) return;
                else doc._handleChangeEvent(cE);
            })
        );
    }


    /**
     * checks if a migration is needed
     * @return {boolean}
     */
    async migrationNeeded() {
        if (this.schema.version == 0) return false;
        const oldCols = await this._dataMigrator._getOldCollections();
        return oldCols.length > 0;
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
        const encrypted = this._crypter.encrypt(docData);
        const swapped = this.schema.swapPrimaryToId(encrypted);
        const compressed = this._keyCompressor.compress(swapped);
        return compressed;
    }
    _handleFromPouch(docData, noDecrypt = false) {
        const swapped = this.schema.swapIdToPrimary(docData);
        const decompressed = this._keyCompressor.decompress(swapped);
        if (noDecrypt) return decompressed;
        const decrypted = this._crypter.decrypt(decompressed);
        return decrypted;
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
    async _pouchGet(key) {
        let doc = await this.pouch.get(key);
        doc = this._handleFromPouch(doc);
        return doc;
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
     * @return {RxDocument}
     */
    _createDocument(json) {

        // return from cache if exsists
        const id = json[this.schema.primaryPath];
        const cacheDoc = this._docCache.get(id);
        if (cacheDoc) return cacheDoc;

        const doc = RxDocument.create(this, json);
        this._assignMethodsToDocument(doc);

        this._docCache.set(id, doc);

        return doc;
    }
    /**
     * create RxDocument from the docs-array
     * @return {RxDocument[]} documents
     */
    _createDocuments(docsJSON) {
        return docsJSON.map(json => this._createDocument(json));
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
     * @param {Object} json data
     * @param {RxDocument} doc which was created
     */
    async insert(json) {
        json = clone(json);

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
        const newDoc = this._createDocument(json);

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
     * takes a mongoDB-query-object and returns the documents
     * @param  {object} queryObj
     * @return {RxDocument[]} found documents
     */
    find(queryObj) {
        if (typeof queryObj === 'string')
            throw new Error('if you want to search by _id, use .findOne(_id)');

        const query = RxQuery.create(queryObj, this);
        query.exec = async() => {
            const docs = await this._pouchFind(query);
            const ret = this._createDocuments(docs);
            return ret;
        };
        return query;
    }

    findOne(queryObj) {
        let query;

        if (typeof queryObj === 'string') {
            query = RxQuery.create({
                _id: queryObj
            }, this);
        } else query = RxQuery.create(queryObj, this);

        if (
            typeof queryObj === 'number' ||
            Array.isArray(queryObj)
        ) throw new TypeError('.findOne() needs a queryObject or string');

        query.exec = async() => {
            const docs = await this._pouchFind(query, 1);
            if (docs.length === 0) return null;
            const doc = docs.shift();
            const ret = this._createDocument(doc);
            return ret;
        };
        query.limit = () => {
            throw new Error('.limit() cannot be called on .findOne()');
        };
        return query;
    }

    /**
     * get a query only
     * @return {RxQuery} query which can be subscribed to
     */
    query(queryObj) {
        if (typeof queryObj === 'string')
            throw new Error('if you want to search by _id, use .findOne(_id)');

        const query = RxQuery.create(queryObj, this);
        return query;
    }

    /**
     * export to json
     * @param {boolean} decrypted if true, all encrypted values will be decrypted
     */
    async dump(decrypted = false) {
        const encrypted = !decrypted;

        const json = {
            name: this.name,
            schemaHash: this.schema.hash,
            encrypted: false,
            passwordHash: null,
            docs: []
        };

        if (this.database.password && encrypted) {
            json.passwordHash = util.hash(this.database.password);
            json.encrypted = true;
        }

        const query = RxQuery.create({}, this);
        let docs = await this._pouchFind(query, null, encrypted);
        json.docs = docs.map(docData => {
            delete docData._rev;
            return docData;
        });
        return json;
    }

    /**
     * imports the json-data into the collection
     * @param {Array} exportedJSON should be an array of raw-data
     */
    async importDump(exportedJSON) {

        // check schemaHash
        if (exportedJSON.schemaHash != this.schema.hash)
            throw new Error('the imported json relies on a different schema');

        // check if passwordHash matches own
        if (
            exportedJSON.encrypted &&
            exportedJSON.passwordHash != util.hash(this.database.password)
        ) throw new Error('json.passwordHash does not match the own');


        const importFns = exportedJSON.docs
            // decrypt
            .map(doc => this._crypter.decrypt(doc))
            // validate schema
            .map(doc => this.schema.validate(doc))
            // import
            .map(doc => this._pouchPut(doc));
        return Promise.all(importFns);
    }


    /**
     * because it will have document-conflicts when 2 syncs write to the same storage
     */
    async sync(serverURL, alsoIfNotLeader = false) {

        if (typeof this.pouch.sync !== 'function') {
            throw new Error(
                `RxCollection.sync needs 'pouchdb-replication'. Code:
                 RxDB.plugin(require('pouchdb-replication')); `
            );
        }

        if (!alsoIfNotLeader)
            await this.database.waitForLeadership();

        if (!this.synced) {
            /**
             * this will grap the changes and publish them to the rx-stream
             * this is to ensure that changes from 'synced' dbs will be published
             */
            const sendChanges = {};
            const pouch$ = util.Rx.Observable
                .fromEvent(
                    this.pouch.changes({
                        since: 'now',
                        live: true,
                        include_docs: true
                    }), 'change')
                .filter(c => c.id.charAt(0) != '_')
                .map(c => c.doc)
                .map(doc => {
                    doc._ext = true;
                    return doc;
                })
                .filter(doc => sendChanges[doc._rev] = 'YES')
                .delay(10)
                .map(doc => {
                    let ret = null;
                    if (sendChanges[doc._rev] == 'YES') ret = doc;
                    delete sendChanges[doc._rev];
                    return ret;
                })
                .filter(doc => doc != null)
                .subscribe(doc => {
                    this.$emit(RxChangeEvent.fromPouchChange(doc, this));
                });
            this._subs.push(pouch$);

            const ob2 = this.$
                .map(cE => cE.data.v)
                .map(doc => {
                    if (sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
                })
                .subscribe();
            this._subs.push(ob2);
        }
        this.synced = true;
        const sync = this.pouch.sync(serverURL, {
            live: true,
            retry: true
        }).on('error', function(err) {
            throw new Error(err);
        });
        this.pouchSyncs.push(sync);
        return sync;
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


    async _mustMigrate() {

    }


    async destroy() {
        this._subs.forEach(sub => sub.unsubscribe());
        this.pouchSyncs.forEach(sync => sync.cancel());
        delete this.database.collections[this.name];
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
        .map(vNr => {
            return {
                v: vNr,
                s: migrationStrategies[(vNr + 1) + '']
            };
        })
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
            throw new TypeError(`given static method (${entry[0]}) is not a function`);

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
    if (schema.constructor.name !== 'RxSchema')
        throw new TypeError('given schema is no Schema-object');

    if (database.constructor.name !== 'RxDatabase')
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
            throw new Error(`collection-method not allowed because its in the schema ${funName}`);
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

    return collection;
}
