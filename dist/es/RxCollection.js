function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

import PouchDB from './PouchDB';
import objectPath from 'object-path';
import clone from 'clone';

import * as util from './util';
import * as RxDocument from './RxDocument';
import * as RxQuery from './RxQuery';
import * as RxChangeEvent from './RxChangeEvent';
import * as KeyCompressor from './KeyCompressor';
import * as DataMigrator from './DataMigrator';
import * as Crypter from './Crypter';
import * as DocCache from './DocCache';
import * as QueryCache from './QueryCache';
import * as ChangeEventBuffer from './ChangeEventBuffer';
import { RxSchema } from './RxSchema';
import { RxDatabase } from './RxDatabase';

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
        // TODO weak links are a joke!
        this._docCache = DocCache.create();
        this._queryCache = QueryCache.create();

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
    prepare() {
        var _this = this;

        return _asyncToGenerator(function* () {
            _this._dataMigrator = DataMigrator.create(_this, _this._migrationStrategies);
            _this._crypter = Crypter.create(_this.database.password, _this.schema);
            _this._keyCompressor = KeyCompressor.create(_this.schema);

            _this.pouch = _this.database._spawnPouchDB(_this.name, _this.schema.version, _this._pouchSettings);

            _this._observable$ = _this.database.$.filter(function (event) {
                return event.data.col == _this.name;
            });

            _this._changeEventBuffer = ChangeEventBuffer.create(_this);

            // INDEXES
            yield Promise.all(_this.schema.indexes.map(function (indexAr) {
                const compressedIdx = indexAr.map(function (key) {
                    if (!_this.schema.doKeyCompression()) return key;
                    const ret = _this._keyCompressor._transformKey('', '', key.split('.'));
                    return ret;
                });
                return _this.pouch.createIndex({
                    index: {
                        fields: compressedIdx
                    }
                });
            }));

            _this._subs.push(_this._observable$.subscribe(function (cE) {
                // when data changes, send it to RxDocument in docCache
                const doc = _this._docCache.get(cE.data.doc);
                if (doc) doc._handleChangeEvent(cE);
            }));
        })();
    }

    /**
     * checks if a migration is needed
     * @return {boolean}
     */
    migrationNeeded() {
        var _this2 = this;

        return _asyncToGenerator(function* () {
            if (_this2.schema.version == 0) return false;
            const oldCols = yield _this2._dataMigrator._getOldCollections();
            return oldCols.length > 0;
        })();
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
    _pouchPut(obj, overwrite = false) {
        var _this3 = this;

        return _asyncToGenerator(function* () {
            obj = _this3._handleToPouch(obj);
            let ret = null;
            try {
                ret = yield _this3.pouch.put(obj);
            } catch (e) {
                if (overwrite && e.status == 409) {
                    const exist = yield _this3.pouch.get(obj._id);
                    obj._rev = exist._rev;
                    ret = yield _this3.pouch.put(obj);
                } else throw e;
            }
            return ret;
        })();
    }
    _pouchGet(key) {
        var _this4 = this;

        return _asyncToGenerator(function* () {
            let doc = yield _this4.pouch.get(key);
            doc = _this4._handleFromPouch(doc);
            return doc;
        })();
    }
    /**
     * wrapps pouch-find
     * @param {RxQuery} rxQuery
     * @param {?number} limit overwrites the limit
     * @param {?boolean} noDecrypt if true, decryption will not be made
     * @return {Object[]} array with documents-data
     */
    _pouchFind(rxQuery, limit, noDecrypt = false) {
        var _this5 = this;

        return _asyncToGenerator(function* () {
            const compressedQueryJSON = rxQuery.keyCompress();
            if (limit) compressedQueryJSON.limit = limit;

            const docsCompressed = yield _this5.pouch.find(compressedQueryJSON);
            const docs = docsCompressed.docs.map(function (doc) {
                return _this5._handleFromPouch(doc, noDecrypt);
            });

            return docs;
        })();
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
    insert(json) {
        var _this6 = this;

        return _asyncToGenerator(function* () {
            json = clone(json);

            if (json._id) throw new Error('do not provide ._id, it will be generated');

            // fill _id
            if (_this6.schema.primaryPath == '_id' && !json._id) json._id = util.generate_id();

            yield _this6._runHooks('pre', 'insert', json);

            _this6.schema.validate(json);

            const insertResult = yield _this6._pouchPut(json);

            json[_this6.schema.primaryPath] = insertResult.id;
            json._rev = insertResult.rev;
            const newDoc = _this6._createDocument(json);

            yield _this6._runHooks('post', 'insert', newDoc);

            // event
            const emitEvent = RxChangeEvent.create('INSERT', _this6.database, _this6, newDoc, json);
            _this6.$emit(emitEvent);

            return newDoc;
        })();
    }

    /**
     * same as insert but overwrites existing document with same primary
     */
    upsert(json) {
        var _this7 = this;

        return _asyncToGenerator(function* () {
            json = clone(json);
            const primary = json[_this7.schema.primaryPath];
            if (!primary) throw new Error('RxCollection.upsert() does not work without primary');

            const existing = yield _this7.findOne(primary).exec();
            if (existing) {
                json._rev = existing._rev;
                existing._data = json;
                yield existing.save();
                return existing;
            } else {
                const newDoc = yield _this7.insert(json);
                return newDoc;
            }
        })();
    }

    /**
     * takes a mongoDB-query-object and returns the documents
     * @param  {object} queryObj
     * @return {RxDocument[]} found documents
     */
    find(queryObj) {
        if (typeof queryObj === 'string') throw new Error('if you want to search by _id, use .findOne(_id)');

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

        if (typeof queryObj === 'number' || Array.isArray(queryObj)) throw new TypeError('.findOne() needs a queryObject or string');

        return query;
    }

    /**
     * export to json
     * @param {boolean} decrypted if true, all encrypted values will be decrypted
     */
    dump(decrypted = false) {
        var _this8 = this;

        return _asyncToGenerator(function* () {
            const encrypted = !decrypted;

            const json = {
                name: _this8.name,
                schemaHash: _this8.schema.hash,
                encrypted: false,
                passwordHash: null,
                docs: []
            };

            if (_this8.database.password && encrypted) {
                json.passwordHash = util.hash(_this8.database.password);
                json.encrypted = true;
            }

            const query = RxQuery.create('find', {}, _this8);
            let docs = yield _this8._pouchFind(query, null, encrypted);
            json.docs = docs.map(function (docData) {
                delete docData._rev;
                return docData;
            });
            return json;
        })();
    }

    /**
     * imports the json-data into the collection
     * @param {Array} exportedJSON should be an array of raw-data
     */
    importDump(exportedJSON) {
        var _this9 = this;

        return _asyncToGenerator(function* () {

            // check schemaHash
            if (exportedJSON.schemaHash != _this9.schema.hash) throw new Error('the imported json relies on a different schema');

            // check if passwordHash matches own
            if (exportedJSON.encrypted && exportedJSON.passwordHash != util.hash(_this9.database.password)) throw new Error('json.passwordHash does not match the own');

            const importFns = exportedJSON.docs
            // decrypt
            .map(function (doc) {
                return _this9._crypter.decrypt(doc);
            })
            // validate schema
            .map(function (doc) {
                return _this9.schema.validate(doc);
            })
            // import
            .map(function (doc) {
                return _this9._pouchPut(doc);
            });
            return Promise.all(importFns);
        })();
    }

    /**
     * because it will have document-conflicts when 2 syncs write to the same storage
     */
    sync(serverURL, alsoIfNotLeader = false) {
        var _this10 = this;

        return _asyncToGenerator(function* () {

            if (typeof _this10.pouch.sync !== 'function') {
                throw new Error(`RxCollection.sync needs 'pouchdb-replication'. Code:
                 RxDB.plugin(require('pouchdb-replication')); `);
            }

            if (!alsoIfNotLeader) yield _this10.database.waitForLeadership();

            if (!_this10.synced) {
                /**
                 * this will grap the changes and publish them to the rx-stream
                 * this is to ensure that changes from 'synced' dbs will be published
                 */
                const sendChanges = {};
                const pouch$ = util.Rx.Observable.fromEvent(_this10.pouch.changes({
                    since: 'now',
                    live: true,
                    include_docs: true
                }), 'change').filter(function (c) {
                    return c.id.charAt(0) != '_';
                }).map(function (c) {
                    return c.doc;
                }).map(function (doc) {
                    doc._ext = true;
                    return doc;
                }).filter(function (doc) {
                    return !_this10._changeEventBuffer.buffer.map(function (cE) {
                        return cE.data.v._rev;
                    }).includes(doc._rev);
                }).filter(function (doc) {
                    return sendChanges[doc._rev] = 'YES';
                }).delay(10).map(function (doc) {
                    let ret = null;
                    if (sendChanges[doc._rev] == 'YES') ret = doc;
                    delete sendChanges[doc._rev];
                    return ret;
                }).filter(function (doc) {
                    return doc != null;
                }).subscribe(function (doc) {
                    _this10.$emit(RxChangeEvent.fromPouchChange(doc, _this10));
                });
                _this10._subs.push(pouch$);

                const ob2 = _this10.$.map(function (cE) {
                    return cE.data.v;
                }).map(function (doc) {
                    if (doc && sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
                }).subscribe();
                _this10._subs.push(ob2);
            }
            _this10.synced = true;
            const sync = _this10.pouch.sync(serverURL, {
                live: true,
                retry: true
            }).on('error', function (err) {
                throw new Error(err);
            });
            _this10.pouchSyncs.push(sync);
            return sync;
        })();
    }

    /**
     * HOOKS
     */
    addHook(when, key, fun, parallel = false) {
        if (typeof fun != 'function') throw new TypeError(key + '-hook must be a function');

        if (!HOOKS_WHEN.includes(when)) throw new TypeError('hooks-when not known');

        if (!HOOKS_KEYS.includes(key)) throw new Error('hook-name ' + key + 'not known');

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
    }
    _runHooks(when, key, doc) {
        var _this11 = this;

        return _asyncToGenerator(function* () {
            const hooks = _this11.getHooks(when, key);
            if (!hooks) return;

            for (let i = 0; i < hooks.series.length; i++) yield hooks.series[i](doc);

            yield Promise.all(hooks.parallel.map(function (hook) {
                return hook(doc);
            }));
        })();
    }

    destroy() {
        var _this12 = this;

        return _asyncToGenerator(function* () {
            _this12._subs.forEach(function (sub) {
                return sub.unsubscribe();
            });
            _this12._changeEventBuffer && _this12._changeEventBuffer.destroy();
            _this12._queryCache.destroy();
            _this12.pouchSyncs.forEach(function (sync) {
                return sync.cancel();
            });
            delete _this12.database.collections[_this12.name];
        })();
    }

}

/**
 * checks if the migrationStrategies are ok, throws if not
 * @param  {RxSchema} schema
 * @param  {Object} migrationStrategies
 * @throws {Error|TypeError} if not ok
 * @return {boolean}
 */
const checkMigrationStrategies = function (schema, migrationStrategies) {
    // migrationStrategies must be object not array
    if (typeof migrationStrategies !== 'object' || Array.isArray(migrationStrategies)) throw new TypeError('migrationStrategies must be an object');

    // for every previousVersion there must be strategy
    if (schema.previousVersions.length != Object.keys(migrationStrategies).length) {
        throw new Error(`
      a migrationStrategy is missing or too much
      - have: ${JSON.stringify(Object.keys(migrationStrategies).map(v => parseInt(v)))}
      - should: ${JSON.stringify(schema.previousVersions)}
      `);
    }

    // every strategy must have number as property and be a function
    schema.previousVersions.map(vNr => {
        return {
            v: vNr,
            s: migrationStrategies[vNr + 1 + '']
        };
    }).filter(strat => typeof strat.s !== 'function').forEach(strat => {
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
const checkORMmethdods = function (statics) {
    Object.entries(statics).forEach(entry => {
        if (typeof entry[0] != 'string') throw new TypeError(`given static method-name (${entry[0]}) is not a string`);

        if (entry[0].startsWith('_')) throw new TypeError(`static method-names cannot start with underscore _ (${entry[0]})`);

        if (typeof entry[1] != 'function') throw new TypeError(`given static method (${entry[0]}) is not a function but ${typeof entry[1]}`);

        if (properties().includes(entry[0]) || RxDocument.properties().includes(entry[0])) throw new Error(`statics-name not allowed: ${entry[0]}`);
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
export let create = (() => {
    var _ref = _asyncToGenerator(function* ({
        database,
        name,
        schema,
        pouchSettings = {},
        migrationStrategies = {},
        autoMigrate = true,
        statics = {},
        methods = {}
    }) {
        if (!schema instanceof RxSchema) throw new TypeError('given schema is no Schema-object');

        if (!database instanceof RxDatabase) throw new TypeError('given database is no Database-object');

        if (typeof autoMigrate !== 'boolean') throw new TypeError('autoMigrate must be boolean');

        util.validateCouchDBString(name);
        checkMigrationStrategies(schema, migrationStrategies);

        // check ORM-methods
        checkORMmethdods(statics);
        checkORMmethdods(methods);
        Object.keys(methods).filter(function (funName) {
            return schema.topLevelFields.includes(funName);
        }).forEach(function (funName) {
            throw new Error(`collection-method not allowed because fieldname is in the schema ${funName}`);
        });

        const collection = new RxCollection(database, name, schema, pouchSettings, migrationStrategies, methods);
        yield collection.prepare();

        // ORM add statics
        Object.entries(statics).forEach(function (entry) {
            const fun = entry.pop();
            const funName = entry.pop();
            collection.__defineGetter__(funName, function () {
                return fun.bind(collection);
            });
        });

        if (autoMigrate) yield collection.migratePromise();

        return collection;
    });

    return function create(_x) {
        return _ref.apply(this, arguments);
    };
})();