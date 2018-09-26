import {
    filter
} from 'rxjs/operators';

import {
    clone,
    validateCouchDBString,
    ucfirst,
    nextTick,
    generateId,
    promiseSeries
} from './util';
import RxDocument from './rx-document';
import RxQuery from './rx-query';
import RxSchema from './rx-schema';
import RxChangeEvent from './rx-change-event';
import RxError from './rx-error';
import DataMigrator from './data-migrator';
import {
    mustMigrate
} from './data-migrator';
import Crypter from './crypter';
import DocCache from './doc-cache';
import QueryCache from './query-cache';
import ChangeEventBuffer from './change-event-buffer';
import overwritable from './overwritable';
import {
    runPluginHooks
} from './hooks';


export class RxCollection {
    constructor(
        database,
        name,
        schema,
        pouchSettings = {},
        migrationStrategies = {},
        methods = {},
        attachments = {},
        options = {},
        statics = {}
    ) {
        this._isInMemory = false;
        this.destroyed = false;
        this.database = database;
        this.name = name;
        this.schema = schema;
        this._migrationStrategies = migrationStrategies;
        this._pouchSettings = pouchSettings;
        this._methods = methods; // orm of documents
        this._attachments = attachments; // orm of attachments
        this.options = options;

        this._atomicUpsertQueues = new Map();
        this._statics = statics;

        this._docCache = DocCache.create();
        this._queryCache = QueryCache.create();

        // defaults
        this.synced = false;
        this.hooks = {};
        this._subs = [];
        this._repStates = [];
        this.pouch = null; // this is needed to preserve this name

        _applyHookFunctions(this);
    }
    prepare() {
        this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this._pouchSettings);

        if (this.schema.doKeyCompression()) {
            this._keyCompressor = overwritable.createKeyCompressor(this.schema);
        }

        // we trigger the non-blocking things first and await them later so we can do stuff in the mean time
        const spawnedPouchPromise = this.pouch.info(); // resolved when the pouchdb is useable
        const createIndexesPromise = _prepareCreateIndexes(this, spawnedPouchPromise);


        this._dataMigrator = DataMigrator.create(this, this._migrationStrategies);
        this._crypter = Crypter.create(this.database.password, this.schema);

        this._observable$ = this.database.$.pipe(
            filter(event => event.data.col === this.name)
        );
        this._changeEventBuffer = ChangeEventBuffer.create(this);

        this._subs.push(
            this._observable$
            .pipe(
                filter(cE => !cE.data.isLocal)
            )
            .subscribe(cE => {
                // when data changes, send it to RxDocument in docCache
                const doc = this._docCache.get(cE.data.doc);
                if (doc) doc._handleChangeEvent(cE);
            })
        );

        return Promise.all([
            spawnedPouchPromise,
            createIndexesPromise
        ]);
    }

    /**
     * merge the prototypes of schema, orm-methods and document-base
     * so we do not have to assing getters/setters and orm methods to each document-instance
     */
    getDocumentPrototype() {
        if (!this._getDocumentPrototype) {
            const schemaProto = this.schema.getDocumentPrototype();
            const ormProto = getDocumentOrmPrototype(this);
            const baseProto = RxDocument.basePrototype;
            const proto = {};
            [
                schemaProto,
                ormProto,
                baseProto
            ].forEach(obj => {
                const props = Object.getOwnPropertyNames(obj);
                props.forEach(key => {
                    const desc = Object.getOwnPropertyDescriptor(obj, key);


                    /**
                     * When enumerable is true, it will show on console.dir(instance)
                     * To not polute the output, only getters and methods are enumerable
                     */
                    let enumerable = true;
                    if (
                        key.startsWith('_') ||
                        key.endsWith('_') ||
                        key.startsWith('$') ||
                        key.endsWith('$')
                    ) enumerable = false;

                    if (typeof desc.value === 'function') {
                        // when getting a function, we automatically do a .bind(this)
                        Object.defineProperty(proto, key, {
                            get() {
                                return desc.value.bind(this);
                            },
                            enumerable,
                            configurable: false
                        });

                    } else {
                        desc.enumerable = enumerable;
                        desc.configurable = false;
                        if (desc.writable)
                            desc.writable = false;
                        Object.defineProperty(proto, key, desc);
                    }
                });
            });

            this._getDocumentPrototype = proto;
        }
        return this._getDocumentPrototype;
    }

    getDocumentConstructor() {
        if (!this._getDocumentConstructor) {
            this._getDocumentConstructor = RxDocument.createRxDocumentConstructor(
                this.getDocumentPrototype()
            );
        }
        return this._getDocumentConstructor;
    }

    /**
     * checks if a migration is needed
     * @return {Promise<boolean>}
     */
    migrationNeeded() {
        return mustMigrate(this._dataMigrator);
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
     * every write on the pouchdb
     * is tunneld throught this function
     * @param {object} obj
     * @param {boolean} [overwrite=false] if true, it will overwrite existing document
     * @return {Promise}
     */
    async _pouchPut(obj, overwrite = false) {
        obj = this._handleToPouch(obj);
        let ret = null;
        try {
            ret = await this.database.lockedRun(
                () => this.pouch.put(obj)
            );
        } catch (e) {
            if (overwrite && e.status === 409) {
                const exist = await this.database.lockedRun(
                    () => this.pouch.get(obj._id)
                );
                obj._rev = exist._rev;
                ret = await this.database.lockedRun(
                    () => this.pouch.put(obj)
                );
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
    _pouchFind(rxQuery, limit, noDecrypt = false) {
        const compressedQueryJSON = rxQuery.keyCompress();
        if (limit) compressedQueryJSON.limit = limit;

        return this.database.lockedRun(
            () => this.pouch.find(compressedQueryJSON)
        ).then(docsCompressed => {
            const docs = docsCompressed.docs
                .map(doc => this._handleFromPouch(doc, noDecrypt));

            return docs;
        });
    }

    /**
     * create a RxDocument-instance from the jsonData
     * @param {Object} json documentData
     * @return {RxDocument}
     */
    _createDocument(json) {
        // return from cache if exsists
        const id = json[this.schema.primaryPath];
        const cacheDoc = this._docCache.get(id);
        if (cacheDoc) return cacheDoc;


        const doc = RxDocument.createWithConstructor(
            this.getDocumentConstructor(),
            this,
            json
        );

        this._docCache.set(id, doc);
        this._runHooksSync('post', 'create', json, doc);
        runPluginHooks('postCreateRxDocument', doc);
        return doc;
    }
    /**
     * create RxDocument from the docs-array
     * @return {Promise<RxDocument[]>} documents
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
    get insert$() {
        return this.$.pipe(
            filter(cE => cE.data.op === 'INSERT')
        );
    }
    get update$() {
        return this.$.pipe(
            filter(cE => cE.data.op === 'UPDATE')
        );
    }
    get remove$() {
        return this.$.pipe(
            filter(cE => cE.data.op === 'REMOVE')
        );
    }

    /**
     * only emits the change-events that change something with the documents
     */
    get docChanges$() {
        if (!this.__docChanges$) {
            this.__docChanges$ = this.$.pipe(
                filter(cEvent => ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op))
            );
        }
        return this.__docChanges$;
    }

    $emit(changeEvent) {
        return this.database.$emit(changeEvent);
    }

    /**
     * @param {Object|RxDocument} json data or RxDocument if temporary
     * @param {RxDocument} doc which was created
     * @return {Promise<RxDocument>}
     */
    insert(json) {
        // inserting a temporary-document
        let tempDoc = null;
        if (RxDocument.isInstanceOf(json)) {
            tempDoc = json;
            if (!json._isTemporary) {
                throw RxError.newRxError('COL1', {
                    data: json
                });
            }
            json = json.toJSON();
        }

        json = clone(json);
        json = this.schema.fillObjectWithDefaults(json);

        if (json._id && this.schema.primaryPath !== '_id') {
            throw RxError.newRxError('COL2', {
                data: json
            });
        }

        // fill _id
        if (
            this.schema.primaryPath === '_id' &&
            !json._id
        ) json._id = generateId();

        let newDoc = tempDoc;
        return this._runHooks('pre', 'insert', json)
            .then(() => {
                this.schema.validate(json);
                return this._pouchPut(json);
            }).then(insertResult => {
                json[this.schema.primaryPath] = insertResult.id;
                json._rev = insertResult.rev;

                if (tempDoc) {
                    tempDoc._dataSync$.next(json);
                } else newDoc = this._createDocument(json);

                return this._runHooks('post', 'insert', json, newDoc);
            }).then(() => {
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
            });
    }

    /**
     * same as insert but overwrites existing document with same primary
     * @return {Promise<RxDocument>}
     */
    upsert(json) {
        json = clone(json);
        const primary = json[this.schema.primaryPath];
        if (!primary) {
            throw RxError.newRxError('COL3', {
                primaryPath: this.schema.primaryPath,
                data: json
            });
        }

        return this.findOne(primary).exec()
            .then(existing => {
                if (existing) {
                    json._rev = existing._rev;

                    return existing.atomicUpdate(() => json)
                        .then(() => existing);
                } else {
                    return this.insert(json);
                }
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
        if (!primary) {
            throw RxError.newRxError('COL4', {
                data: json
            });
        }

        // ensure that it wont try 2 parallel runs
        let queue;
        if (!this._atomicUpsertQueues.has(primary)) {
            queue = Promise.resolve();
        } else {
            queue = this._atomicUpsertQueues.get(primary);
        }
        queue = queue
            .then(() => _atomicUpsertEnsureRxDocumentExists(this, primary, json))
            .then(wasInserted => {
                if (!wasInserted.inserted) {
                    return _atomicUpsertUpdate(wasInserted.doc, json)
                        .then(() => nextTick()) // tick here so the event can propagate
                        .then(() => wasInserted.doc);
                } else
                    return wasInserted.doc;
            });
        this._atomicUpsertQueues.set(primary, queue);
        return queue;
    }

    /**
     * takes a mongoDB-query-object and returns the documents
     * @param  {object} queryObj
     * @return {RxDocument[]} found documents
     */
    find(queryObj) {
        if (typeof queryObj === 'string') {
            throw RxError.newRxError('COL5', {
                queryObj
            });
        }

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
        ) {
            throw RxError.newRxTypeError('COL6', {
                queryObj
            });
        }

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
    importDump() {
        throw RxError.pluginMissing('json-dump');
    }

    /**
     * waits for external changes to the database
     * and ensures they are emitted to the internal RxChangeEvent-Stream
     * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
     */
    watchForChanges() {
        throw RxError.pluginMissing('watch-for-changes');
    }

    /**
     * sync with another database
     */
    sync() {
        throw RxError.pluginMissing('replication');
    }

    /**
     * Create a replicated in-memory-collection
     */
    inMemory() {
        throw RxError.pluginMissing('in-memory');
    }


    /**
     * HOOKS
     */
    addHook(when, key, fun, parallel = false) {
        if (typeof fun !== 'function') {
            throw RxError.newRxTypeError('COL7', {
                key,
                when
            });
        }

        if (!HOOKS_WHEN.includes(when)) {
            throw RxError.newRxTypeError('COL8', {
                key,
                when
            });
        }

        if (!HOOKS_KEYS.includes(key)) {
            throw RxError.newRxError('COL9', {
                key
            });
        }

        if (when === 'post' && key === 'create' && parallel === true) {
            throw RxError.newRxError('COL10', {
                when,
                key,
                parallel
            });
        }

        // bind this-scope to hook-function
        const boundFun = fun.bind(this);

        const runName = parallel ? 'parallel' : 'series';

        this.hooks[key] = this.hooks[key] || {};
        this.hooks[key][when] = this.hooks[key][when] || {
            series: [],
            parallel: []
        };
        this.hooks[key][when][runName].push(boundFun);
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
    }

    /**
     * @return {Promise<void>}
     */
    _runHooks(when, key, data, instance) {
        const hooks = this.getHooks(when, key);
        if (!hooks) return Promise.resolve();

        // run parallel: false
        const tasks = hooks.series.map(hook => () => hook(data, instance));
        return promiseSeries(tasks)
            // run parallel: true
            .then(() => Promise.all(
                hooks.parallel
                .map(hook => hook(data, instance))
            ));
    }

    /**
     * does the same as ._runHooks() but with non-async-functions
     */
    _runHooksSync(when, key, data, instance) {
        const hooks = this.getHooks(when, key);
        if (!hooks) return;
        hooks.series.forEach(hook => hook(data, instance));
    }

    /**
     * creates a temporaryDocument which can be saved later
     * @param {Object} docData
     * @return {RxDocument}
     */
    newDocument(docData = {}) {
        docData = this.schema.fillObjectWithDefaults(docData);
        const doc = RxDocument.createWithConstructor(
            this.getDocumentConstructor(),
            this,
            docData
        );
        doc._isTemporary = true;

        this._runHooksSync('post', 'create', docData, doc);
        return doc;
    }

    /**
     * returns a promise that is resolved when the collection gets destroyed
     * @return {Promise}
     */
    get onDestroy() {
        if (!this._onDestroy)
            this._onDestroy = new Promise(res => this._onDestroyCall = res);
        return this._onDestroy;
    }

    destroy() {
        if (this.destroyed) return;

        this._onDestroyCall && this._onDestroyCall();
        this._subs.forEach(sub => sub.unsubscribe());
        this._changeEventBuffer && this._changeEventBuffer.destroy();
        this._queryCache.destroy();
        this._repStates.forEach(sync => sync.cancel());
        delete this.database.collections[this.name];
        this.destroyed = true;
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
    ) {
        throw RxError.newRxTypeError('COL11', {
            schema
        });
    }

    // for every previousVersion there must be strategy
    if (schema.previousVersions.length !== Object.keys(migrationStrategies).length) {
        throw RxError.newRxError('COL12', {
            have: Object.keys(migrationStrategies),
            should: schema.previousVersions
        });
    }

    // every strategy must have number as property and be a function
    schema.previousVersions
        .map(vNr => ({
            v: vNr,
            s: migrationStrategies[(vNr + 1) + '']
        }))
        .filter(strat => typeof strat.s !== 'function')
        .forEach(strat => {
            throw RxError.newRxTypeError('COL13', {
                version: strat.v,
                type: typeof strat,
                schema
            });
        });

    return true;
};

const HOOKS_WHEN = ['pre', 'post'];
const HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
let hooksApplied = false;
/**
 * adds the hook-functions to the collections prototype
 * this runs only once
 */
function _applyHookFunctions(collection) {
    if (hooksApplied) return; // already run
    hooksApplied = true;
    const colProto = Object.getPrototypeOf(collection);
    HOOKS_KEYS.forEach(key => {
        HOOKS_WHEN.map(when => {
            const fnName = when + ucfirst(key);
            colProto[fnName] = function(fun, parallel) {
                return this.addHook(when, key, fun, parallel);
            };
        });
    });
}


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
const checkOrmMethods = function(statics) {
    Object
        .entries(statics)
        .forEach(([k, v]) => {
            if (typeof k !== 'string') {
                throw RxError.newRxTypeError('COL14', {
                    name: k
                });
            }

            if (k.startsWith('_')) {
                throw RxError.newRxTypeError('COL15', {
                    name: k
                });
            }

            if (typeof v !== 'function') {
                throw RxError.newRxTypeError('COL16', {
                    name: k,
                    type: typeof k
                });
            }

            if (properties().includes(k) || RxDocument.properties().includes(k)) {
                throw RxError.newRxError('COL17', {
                    name: k
                });
            }
        });
};

/**
 * @return {Promise}
 */
function _atomicUpsertUpdate(doc, json) {
    return doc.atomicUpdate(innerDoc => {
        json._rev = innerDoc._rev;
        innerDoc._data = json;
        return innerDoc._data;
    }).then(() => doc);
}

/**
 * ensures that the given document exists
 * @param  {string}  primary
 * @param  {any}  json
 * @return {Promise<{ doc: RxDocument, inserted: boolean}>} promise that resolves with new doc and flag if inserted
 */
function _atomicUpsertEnsureRxDocumentExists(rxCollection, primary, json) {
    return rxCollection.findOne(primary).exec()
        .then(doc => {
            if (!doc) {
                return rxCollection.insert(json).then(newDoc => ({
                    doc: newDoc,
                    inserted: true
                }));
            } else {
                return {
                    doc,
                    inserted: false
                };
            }
        });
}

/**
 * returns the prototype-object
 * that contains the orm-methods,
 * used in the proto-merge
 * @return {{}}
 */
export function getDocumentOrmPrototype(rxCollection) {
    const proto = {};
    Object
        .entries(rxCollection._methods)
        .forEach(([k, v]) => {
            proto[k] = v;
        });
    return proto;
}

/**
 * creates the indexes in the pouchdb
 */
function _prepareCreateIndexes(rxCollection, spawnedPouchPromise) {
    return Promise.all(
        rxCollection.schema.indexes
        .map(indexAr => {
            const compressedIdx = indexAr
                .map(key => {
                    if (!rxCollection.schema.doKeyCompression())
                        return key;
                    else
                        return rxCollection._keyCompressor.transformKey('', '', key.split('.'));
                });

            return spawnedPouchPromise.then(
                () => rxCollection.pouch.createIndex({
                    index: {
                        fields: compressedIdx
                    }
                })
            );
        })
    );
}


/**
 * creates and prepares a new collection
 * @param  {RxDatabase}  database
 * @param  {string}  name
 * @param  {RxSchema}  schema
 * @param  {?Object}  [pouchSettings={}]
 * @param  {?Object}  [migrationStrategies={}]
 * @return {Promise<RxCollection>} promise with collection
 */
export function create({
    database,
    name,
    schema,
    pouchSettings = {},
    migrationStrategies = {},
    autoMigrate = true,
    statics = {},
    methods = {},
    attachments = {},
    options = {}
}) {
    validateCouchDBString(name);

    // ensure it is a schema-object
    if (!RxSchema.isInstanceOf(schema))
        schema = RxSchema.create(schema);

    checkMigrationStrategies(schema, migrationStrategies);

    // check ORM-methods
    checkOrmMethods(statics);
    checkOrmMethods(methods);
    checkOrmMethods(attachments);
    Object.keys(methods)
        .filter(funName => schema.topLevelFields.includes(funName))
        .forEach(funName => {
            throw RxError.newRxError('COL18', {
                funName
            });
        });

    const collection = new RxCollection(
        database,
        name,
        schema,
        pouchSettings,
        migrationStrategies,
        methods,
        attachments,
        options,
        statics
    );

    return collection.prepare()
        .then(() => {

            // ORM add statics
            Object
                .entries(statics)
                .forEach(([funName, fun]) => collection.__defineGetter__(funName, () => fun.bind(collection)));

            let ret = Promise.resolve();
            if (autoMigrate) ret = collection.migratePromise();
            return ret;
        })
        .then(() => {
            runPluginHooks('createRxCollection', collection);
            return collection;
        });
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
