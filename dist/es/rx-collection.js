import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import IdleQueue from 'custom-idle-queue';
import { filter } from 'rxjs/operators';

import { clone, validateCouchDBString, ucfirst, nextTick, generateId } from './util';
import RxDocument from './rx-document';
import RxQuery from './rx-query';
import RxSchema from './rx-schema';
import RxChangeEvent from './rx-change-event';
import RxError from './rx-error';
import DataMigrator from './data-migrator';
import Crypter from './crypter';
import DocCache from './doc-cache';
import QueryCache from './query-cache';
import ChangeEventBuffer from './change-event-buffer';
import overwritable from './overwritable';
import { runPluginHooks, runAsyncPluginHooks } from './hooks';

var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];

export var RxCollection = function () {
    function RxCollection(database, name, schema) {
        var pouchSettings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        var migrationStrategies = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
        var methods = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};

        var _this = this;

        var attachments = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
        var options = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};

        _classCallCheck(this, RxCollection);

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
        this._atomicUpsertQueues = {};

        this._docCache = DocCache.create();
        this._queryCache = QueryCache.create();

        // defaults
        this.synced = false;
        this.hooks = {};
        this._subs = [];
        this._repStates = [];
        this.pouch = null; // this is needed to preserve this name

        // set HOOKS-functions dynamically
        HOOKS_KEYS.forEach(function (key) {
            HOOKS_WHEN.map(function (when) {
                var fnName = when + ucfirst(key);
                _this[fnName] = function (fun, parallel) {
                    return _this.addHook(when, key, fun, parallel);
                };
            });
        });
    }

    RxCollection.prototype.prepare = function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
            var _this2 = this;

            return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            this._dataMigrator = DataMigrator.create(this, this._migrationStrategies);
                            this._crypter = Crypter.create(this.database.password, this.schema);

                            this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this._pouchSettings);

                            // ensure that we wait until db is useable
                            _context.next = 5;
                            return this.database.lockedRun(function () {
                                return _this2.pouch.info();
                            });

                        case 5:

                            this._observable$ = this.database.$.pipe(filter(function (event) {
                                return event.data.col === _this2.name;
                            }));
                            this._changeEventBuffer = ChangeEventBuffer.create(this);

                            // INDEXES
                            _context.next = 9;
                            return Promise.all(this.schema.indexes.map(function (indexAr) {
                                var compressedIdx = indexAr.map(function (key) {
                                    if (!_this2.schema.doKeyCompression()) return key;else return _this2._keyCompressor._transformKey('', '', key.split('.'));
                                });

                                return _this2.database.lockedRun(function () {
                                    return _this2.pouch.createIndex({
                                        index: {
                                            fields: compressedIdx
                                        }
                                    });
                                });
                            }));

                        case 9:

                            this._subs.push(this._observable$.pipe(filter(function (cE) {
                                return !cE.data.isLocal;
                            })).subscribe(function (cE) {
                                // when data changes, send it to RxDocument in docCache
                                var doc = _this2._docCache.get(cE.data.doc);
                                if (doc) doc._handleChangeEvent(cE);
                            }));

                        case 10:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));

        function prepare() {
            return _ref.apply(this, arguments);
        }

        return prepare;
    }();

    /**
     * checks if a migration is needed
     * @return {boolean}
     */
    RxCollection.prototype.migrationNeeded = function migrationNeeded() {
        if (this.schema.version === 0) return false;
        return this._dataMigrator._getOldCollections().then(function (oldCols) {
            return oldCols.length > 0;
        });
    };

    /**
     * @param {number} [batchSize=10] amount of documents handled in parallel
     * @return {Observable} emits the migration-status
     */


    RxCollection.prototype.migrate = function migrate() {
        var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

        return this._dataMigrator.migrate(batchSize);
    };

    /**
     * does the same thing as .migrate() but returns promise
     * @param {number} [batchSize=10] amount of documents handled in parallel
     * @return {Promise} resolves when finished
     */


    RxCollection.prototype.migratePromise = function migratePromise() {
        var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

        return this._dataMigrator.migratePromise(batchSize);
    };

    /**
     * wrappers for Pouch.put/get to handle keycompression etc
     */


    RxCollection.prototype._handleToPouch = function _handleToPouch(docData) {
        var data = clone(docData);
        data = this._crypter.encrypt(data);
        data = this.schema.swapPrimaryToId(data);
        if (this.schema.doKeyCompression()) data = this._keyCompressor.compress(data);
        return data;
    };

    RxCollection.prototype._handleFromPouch = function _handleFromPouch(docData) {
        var noDecrypt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        var data = clone(docData);
        data = this.schema.swapIdToPrimary(data);
        if (this.schema.doKeyCompression()) data = this._keyCompressor.decompress(data);
        if (noDecrypt) return data;
        data = this._crypter.decrypt(data);
        return data;
    };

    /**
     * [overwrite description]
     * @param {object} obj
     * @param {boolean} [overwrite=false] if true, it will overwrite existing document
     */


    RxCollection.prototype._pouchPut = function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(obj) {
            var _this3 = this;

            var overwrite = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
            var ret, exist;
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            obj = this._handleToPouch(obj);
                            ret = null;
                            _context2.prev = 2;
                            _context2.next = 5;
                            return this.database.lockedRun(function () {
                                return _this3.pouch.put(obj);
                            });

                        case 5:
                            ret = _context2.sent;
                            _context2.next = 21;
                            break;

                        case 8:
                            _context2.prev = 8;
                            _context2.t0 = _context2['catch'](2);

                            if (!(overwrite && _context2.t0.status === 409)) {
                                _context2.next = 20;
                                break;
                            }

                            _context2.next = 13;
                            return this.database.lockedRun(function () {
                                return _this3.pouch.get(obj._id);
                            });

                        case 13:
                            exist = _context2.sent;

                            obj._rev = exist._rev;
                            _context2.next = 17;
                            return this.database.lockedRun(function () {
                                return _this3.pouch.put(obj);
                            });

                        case 17:
                            ret = _context2.sent;
                            _context2.next = 21;
                            break;

                        case 20:
                            throw _context2.t0;

                        case 21:
                            return _context2.abrupt('return', ret);

                        case 22:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this, [[2, 8]]);
        }));

        function _pouchPut(_x9) {
            return _ref2.apply(this, arguments);
        }

        return _pouchPut;
    }();

    /**
     * get document from pouchdb by its _id
     * @param  {[type]} key [description]
     * @return {[type]}     [description]
     */


    RxCollection.prototype._pouchGet = function _pouchGet(key) {
        var _this4 = this;

        return this.pouch.get(key).then(function (doc) {
            return _this4._handleFromPouch(doc);
        });
    };

    /**
     * wrapps pouch-find
     * @param {RxQuery} rxQuery
     * @param {?number} limit overwrites the limit
     * @param {?boolean} noDecrypt if true, decryption will not be made
     * @return {Object[]} array with documents-data
     */


    RxCollection.prototype._pouchFind = function _pouchFind(rxQuery, limit) {
        var _this5 = this;

        var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        var compressedQueryJSON = rxQuery.keyCompress();
        if (limit) compressedQueryJSON.limit = limit;

        return this.database.lockedRun(function () {
            return _this5.pouch.find(compressedQueryJSON);
        }).then(function (docsCompressed) {
            var docs = docsCompressed.docs.map(function (doc) {
                return _this5._handleFromPouch(doc, noDecrypt);
            });

            return docs;
        });
    };

    /**
     * assigns the ORM-methods to the RxDocument
     * @param {RxDocument} doc
     */


    RxCollection.prototype._assignMethodsToDocument = function _assignMethodsToDocument(doc) {
        Object.entries(this._methods).forEach(function (_ref3) {
            var funName = _ref3[0],
                fun = _ref3[1];
            return doc.__defineGetter__(funName, function () {
                return fun.bind(doc);
            });
        });
    };

    /**
     * create a RxDocument-instance from the jsonData
     * @param {Object} json documentData
     * @return {Promise<RxDocument>}
     */


    RxCollection.prototype._createDocument = function _createDocument(json) {
        // return from cache if exsists
        var id = json[this.schema.primaryPath];
        var cacheDoc = this._docCache.get(id);
        if (cacheDoc) return cacheDoc;

        var doc = RxDocument.create(this, json);
        this._assignMethodsToDocument(doc);
        this._docCache.set(id, doc);
        this._runHooksSync('post', 'create', doc);

        return runAsyncPluginHooks('postCreateRxDocument', doc).then(function () {
            return doc;
        });
    };
    /**
     * create RxDocument from the docs-array
     * @return {Promise<RxDocument[]>} documents
     */


    RxCollection.prototype._createDocuments = function _createDocuments(docsJSON) {
        var _this6 = this;

        return Promise.all(docsJSON.map(function (json) {
            return _this6._createDocument(json);
        }));
    };

    /**
     * returns observable
     */


    RxCollection.prototype.$emit = function $emit(changeEvent) {
        return this.database.$emit(changeEvent);
    };

    /**
     * @param {Object|RxDocument} json data or RxDocument if temporary
     * @param {RxDocument} doc which was created
     * @return {Promise<RxDocument>}
     */


    RxCollection.prototype.insert = function () {
        var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(json) {
            var tempDoc, insertResult, newDoc, emitEvent;
            return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            // inserting a temporary-document
                            tempDoc = null;

                            if (!RxDocument.isInstanceOf(json)) {
                                _context3.next = 6;
                                break;
                            }

                            tempDoc = json;

                            if (json._isTemporary) {
                                _context3.next = 5;
                                break;
                            }

                            throw RxError.newRxError('COL1', {
                                data: json
                            });

                        case 5:
                            json = json.toJSON();

                        case 6:

                            json = clone(json);
                            json = this.schema.fillObjectWithDefaults(json);

                            if (!json._id) {
                                _context3.next = 10;
                                break;
                            }

                            throw RxError.newRxError('COL2', {
                                data: json
                            });

                        case 10:

                            // fill _id
                            if (this.schema.primaryPath === '_id' && !json._id) json._id = generateId();

                            _context3.next = 13;
                            return this._runHooks('pre', 'insert', json);

                        case 13:

                            this.schema.validate(json);

                            _context3.next = 16;
                            return this._pouchPut(json);

                        case 16:
                            insertResult = _context3.sent;


                            json[this.schema.primaryPath] = insertResult.id;
                            json._rev = insertResult.rev;

                            newDoc = tempDoc;

                            if (!tempDoc) {
                                _context3.next = 24;
                                break;
                            }

                            tempDoc._data = json;
                            _context3.next = 27;
                            break;

                        case 24:
                            _context3.next = 26;
                            return this._createDocument(json);

                        case 26:
                            newDoc = _context3.sent;

                        case 27:
                            _context3.next = 29;
                            return this._runHooks('post', 'insert', newDoc);

                        case 29:

                            // event
                            emitEvent = RxChangeEvent.create('INSERT', this.database, this, newDoc, json);

                            this.$emit(emitEvent);

                            return _context3.abrupt('return', newDoc);

                        case 32:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this);
        }));

        function insert(_x12) {
            return _ref4.apply(this, arguments);
        }

        return insert;
    }();

    /**
     * same as insert but overwrites existing document with same primary
     */


    RxCollection.prototype.upsert = function () {
        var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(json) {
            var primary, existing, newDoc;
            return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            json = clone(json);
                            primary = json[this.schema.primaryPath];

                            if (primary) {
                                _context4.next = 4;
                                break;
                            }

                            throw RxError.newRxError('COL3', {
                                primaryPath: this.schema.primaryPath,
                                data: json
                            });

                        case 4:
                            _context4.next = 6;
                            return this.findOne(primary).exec();

                        case 6:
                            existing = _context4.sent;

                            if (!existing) {
                                _context4.next = 15;
                                break;
                            }

                            json._rev = existing._rev;
                            existing._data = json;
                            _context4.next = 12;
                            return existing.save();

                        case 12:
                            return _context4.abrupt('return', existing);

                        case 15:
                            _context4.next = 17;
                            return this.insert(json);

                        case 17:
                            newDoc = _context4.sent;
                            return _context4.abrupt('return', newDoc);

                        case 19:
                        case 'end':
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));

        function upsert(_x13) {
            return _ref5.apply(this, arguments);
        }

        return upsert;
    }();

    /**
     * ensures that the given document exists
     * @param  {string}  primary
     * @param  {any}  json
     * @return {Promise<{ doc: RxDocument, inserted: boolean}>} promise that resolves with new doc and flag if inserted
     */


    RxCollection.prototype._atomicUpsertEnsureRxDocumentExists = function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(primary, json) {
            var doc, newDoc;
            return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            _context5.next = 2;
                            return this.findOne(primary).exec();

                        case 2:
                            doc = _context5.sent;

                            if (doc) {
                                _context5.next = 10;
                                break;
                            }

                            _context5.next = 6;
                            return this.insert(json);

                        case 6:
                            newDoc = _context5.sent;
                            return _context5.abrupt('return', {
                                doc: newDoc,
                                inserted: true
                            });

                        case 10:
                            return _context5.abrupt('return', {
                                doc: doc,
                                inserted: false
                            });

                        case 11:
                        case 'end':
                            return _context5.stop();
                    }
                }
            }, _callee5, this);
        }));

        function _atomicUpsertEnsureRxDocumentExists(_x14, _x15) {
            return _ref6.apply(this, arguments);
        }

        return _atomicUpsertEnsureRxDocumentExists;
    }();

    /**
     * @return {Promise}
     */


    RxCollection.prototype._atomicUpsertUpdate = function _atomicUpsertUpdate(doc, json) {
        return doc.atomicUpdate(function (innerDoc) {
            json._rev = innerDoc._rev;
            innerDoc._data = json;
        }).then(function () {
            return doc;
        });
    };

    /**
     * upserts to a RxDocument, uses atomicUpdate if document already exists
     * @param  {object}  json
     * @return {Promise}
     */


    RxCollection.prototype.atomicUpsert = function () {
        var _ref7 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(json) {
            var _this7 = this;

            var primary, queue, ret;
            return _regeneratorRuntime.wrap(function _callee7$(_context7) {
                while (1) {
                    switch (_context7.prev = _context7.next) {
                        case 0:
                            json = clone(json);
                            primary = json[this.schema.primaryPath];

                            if (primary) {
                                _context7.next = 4;
                                break;
                            }

                            throw RxError.newRxError('COL4', {
                                data: json
                            });

                        case 4:

                            // ensure that it wont try 2 parallel runs
                            if (!this._atomicUpsertQueues[primary]) this._atomicUpsertQueues[primary] = new IdleQueue();
                            queue = this._atomicUpsertQueues[primary];
                            _context7.next = 8;
                            return queue.requestIdlePromise();

                        case 8:
                            _context7.next = 10;
                            return queue.wrapCall(_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6() {
                                var wasInserted;
                                return _regeneratorRuntime.wrap(function _callee6$(_context6) {
                                    while (1) {
                                        switch (_context6.prev = _context6.next) {
                                            case 0:
                                                _context6.next = 2;
                                                return _this7._atomicUpsertEnsureRxDocumentExists(primary, json);

                                            case 2:
                                                wasInserted = _context6.sent;

                                                if (wasInserted.inserted) {
                                                    _context6.next = 11;
                                                    break;
                                                }

                                                _context6.next = 6;
                                                return _this7._atomicUpsertUpdate(wasInserted.doc, json);

                                            case 6:
                                                _context6.next = 8;
                                                return nextTick();

                                            case 8:
                                                return _context6.abrupt('return', wasInserted.doc);

                                            case 11:
                                                return _context6.abrupt('return', wasInserted.doc);

                                            case 12:
                                            case 'end':
                                                return _context6.stop();
                                        }
                                    }
                                }, _callee6, _this7);
                            })));

                        case 10:
                            ret = _context7.sent;
                            return _context7.abrupt('return', ret);

                        case 12:
                        case 'end':
                            return _context7.stop();
                    }
                }
            }, _callee7, this);
        }));

        function atomicUpsert(_x16) {
            return _ref7.apply(this, arguments);
        }

        return atomicUpsert;
    }();

    /**
     * takes a mongoDB-query-object and returns the documents
     * @param  {object} queryObj
     * @return {RxDocument[]} found documents
     */


    RxCollection.prototype.find = function find(queryObj) {
        if (typeof queryObj === 'string') {
            throw RxError.newRxError('COL5', {
                queryObj: queryObj
            });
        }

        var query = RxQuery.create('find', queryObj, this);
        return query;
    };

    RxCollection.prototype.findOne = function findOne(queryObj) {
        var query = void 0;

        if (typeof queryObj === 'string') {
            query = RxQuery.create('findOne', {
                _id: queryObj
            }, this);
        } else query = RxQuery.create('findOne', queryObj, this);

        if (typeof queryObj === 'number' || Array.isArray(queryObj)) {
            throw RxError.newRxTypeError('COL6', {
                queryObj: queryObj
            });
        }

        return query;
    };

    /**
     * export to json
     * @param {boolean} decrypted if true, all encrypted values will be decrypted
     */


    RxCollection.prototype.dump = function dump() {
        throw RxError.pluginMissing('json-dump');
    };

    /**
     * imports the json-data into the collection
     * @param {Array} exportedJSON should be an array of raw-data
     */


    RxCollection.prototype.importDump = function importDump() {
        throw RxError.pluginMissing('json-dump');
    };

    /**
     * waits for external changes to the database
     * and ensures they are emitted to the internal RxChangeEvent-Stream
     * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
     */


    RxCollection.prototype.watchForChanges = function watchForChanges() {
        throw RxError.pluginMissing('replication');
    };

    /**
     * sync with another database
     */


    RxCollection.prototype.sync = function sync() {
        throw RxError.pluginMissing('replication');
    };

    /**
     * Create a replicated in-memory-collection
     */


    RxCollection.prototype.inMemory = function inMemory() {
        throw RxError.pluginMissing('in-memory');
    };

    /**
     * HOOKS
     */


    RxCollection.prototype.addHook = function addHook(when, key, fun) {
        var parallel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

        if (typeof fun !== 'function') {
            throw RxError.newRxTypeError('COL7', {
                key: key,
                when: when
            });
        }

        if (!HOOKS_WHEN.includes(when)) {
            throw RxError.newRxTypeError('COL8', {
                key: key,
                when: when
            });
        }

        if (!HOOKS_KEYS.includes(key)) {
            throw RxError.newRxError('COL9', {
                key: key
            });
        }

        if (when === 'post' && key === 'create' && parallel === true) {
            throw RxError.newRxError('COL10', {
                when: when,
                key: key,
                parallel: parallel
            });
        }

        var runName = parallel ? 'parallel' : 'series';

        this.hooks[key] = this.hooks[key] || {};
        this.hooks[key][when] = this.hooks[key][when] || {
            series: [],
            parallel: []
        };
        this.hooks[key][when][runName].push(fun);
    };

    RxCollection.prototype.getHooks = function getHooks(when, key) {
        try {
            return this.hooks[key][when];
        } catch (e) {
            return {
                series: [],
                parallel: []
            };
        }
    };

    RxCollection.prototype._runHooks = function () {
        var _ref9 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(when, key, doc) {
            var hooks, i;
            return _regeneratorRuntime.wrap(function _callee8$(_context8) {
                while (1) {
                    switch (_context8.prev = _context8.next) {
                        case 0:
                            hooks = this.getHooks(when, key);

                            if (hooks) {
                                _context8.next = 3;
                                break;
                            }

                            return _context8.abrupt('return');

                        case 3:
                            i = 0;

                        case 4:
                            if (!(i < hooks.series.length)) {
                                _context8.next = 10;
                                break;
                            }

                            _context8.next = 7;
                            return hooks.series[i](doc);

                        case 7:
                            i++;
                            _context8.next = 4;
                            break;

                        case 10:
                            _context8.next = 12;
                            return Promise.all(hooks.parallel.map(function (hook) {
                                return hook(doc);
                            }));

                        case 12:
                        case 'end':
                            return _context8.stop();
                    }
                }
            }, _callee8, this);
        }));

        function _runHooks(_x18, _x19, _x20) {
            return _ref9.apply(this, arguments);
        }

        return _runHooks;
    }();

    /**
     * does the same as ._runHooks() but with non-async-functions
     */


    RxCollection.prototype._runHooksSync = function _runHooksSync(when, key, doc) {
        var hooks = this.getHooks(when, key);
        if (!hooks) return;
        hooks.series.forEach(function (hook) {
            return hook(doc);
        });
    };

    /**
     * creates a temporaryDocument which can be saved later
     * @param {Object} docData
     * @return {RxDocument}
     */


    RxCollection.prototype.newDocument = function newDocument() {
        var docData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        docData = this.schema.fillObjectWithDefaults(docData);
        var doc = RxDocument.create(this, docData);
        doc._isTemporary = true;
        this._assignMethodsToDocument(doc);
        this._runHooksSync('post', 'create', doc);
        return doc;
    };

    /**
     * returns a promise that is resolved when the collection gets destroyed
     * @return {Promise}
     */


    RxCollection.prototype.destroy = function destroy() {
        if (this.destroyed) return;

        this._onDestroyCall && this._onDestroyCall();
        this._subs.forEach(function (sub) {
            return sub.unsubscribe();
        });
        this._changeEventBuffer && this._changeEventBuffer.destroy();
        this._queryCache.destroy();
        this._repStates.forEach(function (sync) {
            return sync.cancel();
        });
        delete this.database.collections[this.name];
        this.destroyed = true;
    };

    /**
     * remove all data
     * @return {Promise}
     */


    RxCollection.prototype.remove = function remove() {
        return this.database.removeCollection(this.name);
    };

    _createClass(RxCollection, [{
        key: '_keyCompressor',
        get: function get() {
            if (!this.__keyCompressor) this.__keyCompressor = overwritable.createKeyCompressor(this.schema);
            return this.__keyCompressor;
        }
    }, {
        key: '$',
        get: function get() {
            return this._observable$;
        }
    }, {
        key: 'insert$',
        get: function get() {
            return this.$.pipe(filter(function (cE) {
                return cE.data.op === 'INSERT';
            }));
        }
    }, {
        key: 'update$',
        get: function get() {
            return this.$.pipe(filter(function (cE) {
                return cE.data.op === 'UPDATE';
            }));
        }
    }, {
        key: 'remove$',
        get: function get() {
            return this.$.pipe(filter(function (cE) {
                return cE.data.op === 'REMOVE';
            }));
        }
    }, {
        key: 'onDestroy',
        get: function get() {
            var _this8 = this;

            if (!this._onDestroy) this._onDestroy = new Promise(function (res) {
                return _this8._onDestroyCall = res;
            });
            return this._onDestroy;
        }
    }]);

    return RxCollection;
}();

/**
 * checks if the migrationStrategies are ok, throws if not
 * @param  {RxSchema} schema
 * @param  {Object} migrationStrategies
 * @throws {Error|TypeError} if not ok
 * @return {boolean}
 */
var checkMigrationStrategies = function checkMigrationStrategies(schema, migrationStrategies) {
    // migrationStrategies must be object not array
    if (typeof migrationStrategies !== 'object' || Array.isArray(migrationStrategies)) {
        throw RxError.newRxTypeError('COL11', {
            schema: schema
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
    schema.previousVersions.map(function (vNr) {
        return {
            v: vNr,
            s: migrationStrategies[vNr + 1 + '']
        };
    }).filter(function (strat) {
        return typeof strat.s !== 'function';
    }).forEach(function (strat) {
        throw RxError.newRxTypeError('COL13', {
            version: strat.v,
            type: typeof strat,
            schema: schema
        });
    });

    return true;
};

/**
 * returns all possible properties of a RxCollection-instance
 * @return {string[]} property-names
 */
var _properties = null;
export function properties() {
    if (!_properties) {
        var pseudoInstance = new RxCollection();
        var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
        _properties = [].concat(ownProperties, prototypeProperties);
    }
    return _properties;
}

/**
 * checks if the given static methods are allowed
 * @param  {{}} statics [description]
 * @throws if not allowed
 */
var checkOrmMethods = function checkOrmMethods(statics) {
    Object.entries(statics).forEach(function (_ref10) {
        var k = _ref10[0],
            v = _ref10[1];

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
 * creates and prepares a new collection
 * @param  {RxDatabase}  database
 * @param  {string}  name
 * @param  {RxSchema}  schema
 * @param  {?Object}  [pouchSettings={}]
 * @param  {?Object}  [migrationStrategies={}]
 * @return {Promise.<RxCollection>} promise with collection
 */
export var create = function () {
    var _ref11 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9(_ref12) {
        var database = _ref12.database,
            name = _ref12.name,
            schema = _ref12.schema,
            _ref12$pouchSettings = _ref12.pouchSettings,
            pouchSettings = _ref12$pouchSettings === undefined ? {} : _ref12$pouchSettings,
            _ref12$migrationStrat = _ref12.migrationStrategies,
            migrationStrategies = _ref12$migrationStrat === undefined ? {} : _ref12$migrationStrat,
            _ref12$autoMigrate = _ref12.autoMigrate,
            autoMigrate = _ref12$autoMigrate === undefined ? true : _ref12$autoMigrate,
            _ref12$statics = _ref12.statics,
            statics = _ref12$statics === undefined ? {} : _ref12$statics,
            _ref12$methods = _ref12.methods,
            methods = _ref12$methods === undefined ? {} : _ref12$methods,
            _ref12$attachments = _ref12.attachments,
            attachments = _ref12$attachments === undefined ? {} : _ref12$attachments,
            _ref12$options = _ref12.options,
            options = _ref12$options === undefined ? {} : _ref12$options;
        var collection;
        return _regeneratorRuntime.wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        validateCouchDBString(name);

                        // ensure it is a schema-object
                        if (!RxSchema.isInstanceOf(schema)) schema = RxSchema.create(schema);

                        checkMigrationStrategies(schema, migrationStrategies);

                        // check ORM-methods
                        checkOrmMethods(statics);
                        checkOrmMethods(methods);
                        checkOrmMethods(attachments);
                        Object.keys(methods).filter(function (funName) {
                            return schema.topLevelFields.includes(funName);
                        }).forEach(function (funName) {
                            throw RxError.newRxError('COL18', {
                                funName: funName
                            });
                        });

                        collection = new RxCollection(database, name, schema, pouchSettings, migrationStrategies, methods, attachments, options);
                        _context9.next = 10;
                        return collection.prepare();

                    case 10:

                        // ORM add statics
                        Object.entries(statics).forEach(function (_ref13) {
                            var funName = _ref13[0],
                                fun = _ref13[1];
                            return collection.__defineGetter__(funName, function () {
                                return fun.bind(collection);
                            });
                        });

                        if (!autoMigrate) {
                            _context9.next = 14;
                            break;
                        }

                        _context9.next = 14;
                        return collection.migratePromise();

                    case 14:

                        runPluginHooks('createRxCollection', collection);
                        return _context9.abrupt('return', collection);

                    case 16:
                    case 'end':
                        return _context9.stop();
                }
            }
        }, _callee9, this);
    }));

    return function create(_x22) {
        return _ref11.apply(this, arguments);
    };
}();

export function isInstanceOf(obj) {
    return obj instanceof RxCollection;
}

export default {
    create: create,
    properties: properties,
    isInstanceOf: isInstanceOf,
    RxCollection: RxCollection
};