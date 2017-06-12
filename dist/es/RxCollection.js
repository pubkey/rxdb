import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
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

var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];

var RxCollection = function () {
    function RxCollection(database, name, schema) {
        var pouchSettings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

        var _this = this;

        var migrationStrategies = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
        var methods = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};

        _classCallCheck(this, RxCollection);

        this.database = database;
        this.name = name;
        this.schema = schema;
        this._migrationStrategies = migrationStrategies;
        this._pouchSettings = pouchSettings;
        this._methods = methods;

        this._docCache = DocCache.create();
        this._queryCache = QueryCache.create();

        // defaults
        this.synced = false;
        this.hooks = {};
        this._subs = [];
        this.pouchSyncs = [];
        this.pouch = null; // this is needed to preserve this name

        // set HOOKS-functions dynamically
        HOOKS_KEYS.forEach(function (key) {
            HOOKS_WHEN.map(function (when) {
                var fnName = when + util.ucfirst(key);
                _this[fnName] = function (fun, parallel) {
                    return _this.addHook(when, key, fun, parallel);
                };
            });
        });
    }

    RxCollection.prototype.prepare = function () {
        var _ref = _asyncToGenerator(_regeneratorRuntime.mark(function _callee() {
            var _this2 = this;

            return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            this._dataMigrator = DataMigrator.create(this, this._migrationStrategies);
                            this._crypter = Crypter.create(this.database.password, this.schema);
                            this._keyCompressor = KeyCompressor.create(this.schema);

                            this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this._pouchSettings);

                            this._observable$ = this.database.$.filter(function (event) {
                                return event.data.col == _this2.name;
                            });

                            this._changeEventBuffer = ChangeEventBuffer.create(this);

                            // INDEXES
                            _context.next = 8;
                            return Promise.all(this.schema.indexes.map(function (indexAr) {
                                var compressedIdx = indexAr.map(function (key) {
                                    if (!_this2.schema.doKeyCompression()) return key;
                                    var ret = _this2._keyCompressor._transformKey('', '', key.split('.'));
                                    return ret;
                                });
                                return _this2.pouch.createIndex({
                                    index: {
                                        fields: compressedIdx
                                    }
                                });
                            }));

                        case 8:

                            this._subs.push(this._observable$.subscribe(function (cE) {
                                // when data changes, send it to RxDocument in docCache
                                var doc = _this2._docCache.get(cE.data.doc);
                                if (doc) doc._handleChangeEvent(cE);
                            }));

                        case 9:
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


    RxCollection.prototype.migrationNeeded = function () {
        var _ref2 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee2() {
            var oldCols;
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            if (!(this.schema.version == 0)) {
                                _context2.next = 2;
                                break;
                            }

                            return _context2.abrupt('return', false);

                        case 2:
                            _context2.next = 4;
                            return this._dataMigrator._getOldCollections();

                        case 4:
                            oldCols = _context2.sent;
                            return _context2.abrupt('return', oldCols.length > 0);

                        case 6:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        function migrationNeeded() {
            return _ref2.apply(this, arguments);
        }

        return migrationNeeded;
    }();

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
        var encrypted = this._crypter.encrypt(docData);
        var swapped = this.schema.swapPrimaryToId(encrypted);
        var compressed = this._keyCompressor.compress(swapped);
        return compressed;
    };

    RxCollection.prototype._handleFromPouch = function _handleFromPouch(docData) {
        var noDecrypt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        var swapped = this.schema.swapIdToPrimary(docData);
        var decompressed = this._keyCompressor.decompress(swapped);
        if (noDecrypt) return decompressed;
        var decrypted = this._crypter.decrypt(decompressed);
        return decrypted;
    };

    /**
     * [overwrite description]
     * @param {object} obj
     * @param {boolean} [overwrite=false] if true, it will overwrite existing document
     */


    RxCollection.prototype._pouchPut = function () {
        var _ref3 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee3(obj) {
            var overwrite = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
            var ret, exist;
            return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            obj = this._handleToPouch(obj);
                            ret = null;
                            _context3.prev = 2;
                            _context3.next = 5;
                            return this.pouch.put(obj);

                        case 5:
                            ret = _context3.sent;
                            _context3.next = 21;
                            break;

                        case 8:
                            _context3.prev = 8;
                            _context3.t0 = _context3['catch'](2);

                            if (!(overwrite && _context3.t0.status == 409)) {
                                _context3.next = 20;
                                break;
                            }

                            _context3.next = 13;
                            return this.pouch.get(obj._id);

                        case 13:
                            exist = _context3.sent;

                            obj._rev = exist._rev;
                            _context3.next = 17;
                            return this.pouch.put(obj);

                        case 17:
                            ret = _context3.sent;
                            _context3.next = 21;
                            break;

                        case 20:
                            throw _context3.t0;

                        case 21:
                            return _context3.abrupt('return', ret);

                        case 22:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this, [[2, 8]]);
        }));

        function _pouchPut(_x7) {
            return _ref3.apply(this, arguments);
        }

        return _pouchPut;
    }();

    RxCollection.prototype._pouchGet = function () {
        var _ref4 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee4(key) {
            var doc;
            return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            _context4.next = 2;
                            return this.pouch.get(key);

                        case 2:
                            doc = _context4.sent;

                            doc = this._handleFromPouch(doc);
                            return _context4.abrupt('return', doc);

                        case 5:
                        case 'end':
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));

        function _pouchGet(_x9) {
            return _ref4.apply(this, arguments);
        }

        return _pouchGet;
    }();
    /**
     * wrapps pouch-find
     * @param {RxQuery} rxQuery
     * @param {?number} limit overwrites the limit
     * @param {?boolean} noDecrypt if true, decryption will not be made
     * @return {Object[]} array with documents-data
     */


    RxCollection.prototype._pouchFind = function () {
        var _ref5 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee5(rxQuery, limit) {
            var _this3 = this;

            var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
            var compressedQueryJSON, docsCompressed, docs;
            return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            compressedQueryJSON = rxQuery.keyCompress();

                            if (limit) compressedQueryJSON.limit = limit;

                            _context5.next = 4;
                            return this.pouch.find(compressedQueryJSON);

                        case 4:
                            docsCompressed = _context5.sent;
                            docs = docsCompressed.docs.map(function (doc) {
                                return _this3._handleFromPouch(doc, noDecrypt);
                            });
                            return _context5.abrupt('return', docs);

                        case 7:
                        case 'end':
                            return _context5.stop();
                    }
                }
            }, _callee5, this);
        }));

        function _pouchFind(_x10, _x11) {
            return _ref5.apply(this, arguments);
        }

        return _pouchFind;
    }();

    /**
     * assigns the ORM-methods to the RxDocument
     * @param {RxDocument} doc
     */


    RxCollection.prototype._assignMethodsToDocument = function _assignMethodsToDocument(doc) {
        Object.entries(this._methods).forEach(function (entry) {
            var funName = entry[0];
            var fun = entry[1];
            doc.__defineGetter__(funName, function () {
                return fun.bind(doc);
            });
        });
    };
    /**
     * @return {Promise<RxDocument>}
     */


    RxCollection.prototype._createDocument = function () {
        var _ref6 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee6(json) {
            var id, cacheDoc, doc;
            return _regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            // return from cache if exsists
                            id = json[this.schema.primaryPath];
                            cacheDoc = this._docCache.get(id);

                            if (!cacheDoc) {
                                _context6.next = 4;
                                break;
                            }

                            return _context6.abrupt('return', cacheDoc);

                        case 4:
                            doc = RxDocument.create(this, json);

                            this._assignMethodsToDocument(doc);
                            this._docCache.set(id, doc);
                            _context6.next = 9;
                            return this._runHooks('post', 'create', doc);

                        case 9:
                            return _context6.abrupt('return', doc);

                        case 10:
                        case 'end':
                            return _context6.stop();
                    }
                }
            }, _callee6, this);
        }));

        function _createDocument(_x13) {
            return _ref6.apply(this, arguments);
        }

        return _createDocument;
    }();
    /**
     * create RxDocument from the docs-array
     * @return {Promise<RxDocument[]>} documents
     */


    RxCollection.prototype._createDocuments = function () {
        var _ref7 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee7(docsJSON) {
            var _this4 = this;

            return _regeneratorRuntime.wrap(function _callee7$(_context7) {
                while (1) {
                    switch (_context7.prev = _context7.next) {
                        case 0:
                            return _context7.abrupt('return', Promise.all(docsJSON.map(function (json) {
                                return _this4._createDocument(json);
                            })));

                        case 1:
                        case 'end':
                            return _context7.stop();
                    }
                }
            }, _callee7, this);
        }));

        function _createDocuments(_x14) {
            return _ref7.apply(this, arguments);
        }

        return _createDocuments;
    }();

    /**
     * returns observable
     */


    RxCollection.prototype.$emit = function $emit(changeEvent) {
        return this.database.$emit(changeEvent);
    };

    /**
     * @param {Object} json data
     * @param {RxDocument} doc which was created
     */


    RxCollection.prototype.insert = function () {
        var _ref8 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee8(json) {
            var insertResult, newDoc, emitEvent;
            return _regeneratorRuntime.wrap(function _callee8$(_context8) {
                while (1) {
                    switch (_context8.prev = _context8.next) {
                        case 0:
                            json = clone(json);

                            if (!json._id) {
                                _context8.next = 3;
                                break;
                            }

                            throw new Error('do not provide ._id, it will be generated');

                        case 3:

                            // fill _id
                            if (this.schema.primaryPath == '_id' && !json._id) json._id = util.generate_id();

                            _context8.next = 6;
                            return this._runHooks('pre', 'insert', json);

                        case 6:

                            this.schema.validate(json);

                            _context8.next = 9;
                            return this._pouchPut(json);

                        case 9:
                            insertResult = _context8.sent;


                            json[this.schema.primaryPath] = insertResult.id;
                            json._rev = insertResult.rev;
                            _context8.next = 14;
                            return this._createDocument(json);

                        case 14:
                            newDoc = _context8.sent;
                            _context8.next = 17;
                            return this._runHooks('post', 'insert', newDoc);

                        case 17:

                            // event
                            emitEvent = RxChangeEvent.create('INSERT', this.database, this, newDoc, json);

                            this.$emit(emitEvent);

                            return _context8.abrupt('return', newDoc);

                        case 20:
                        case 'end':
                            return _context8.stop();
                    }
                }
            }, _callee8, this);
        }));

        function insert(_x15) {
            return _ref8.apply(this, arguments);
        }

        return insert;
    }();

    /**
     * same as insert but overwrites existing document with same primary
     */


    RxCollection.prototype.upsert = function () {
        var _ref9 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee9(json) {
            var primary, existing, newDoc;
            return _regeneratorRuntime.wrap(function _callee9$(_context9) {
                while (1) {
                    switch (_context9.prev = _context9.next) {
                        case 0:
                            json = clone(json);
                            primary = json[this.schema.primaryPath];

                            if (primary) {
                                _context9.next = 4;
                                break;
                            }

                            throw new Error('RxCollection.upsert() does not work without primary');

                        case 4:
                            _context9.next = 6;
                            return this.findOne(primary).exec();

                        case 6:
                            existing = _context9.sent;

                            if (!existing) {
                                _context9.next = 15;
                                break;
                            }

                            json._rev = existing._rev;
                            existing._data = json;
                            _context9.next = 12;
                            return existing.save();

                        case 12:
                            return _context9.abrupt('return', existing);

                        case 15:
                            _context9.next = 17;
                            return this.insert(json);

                        case 17:
                            newDoc = _context9.sent;
                            return _context9.abrupt('return', newDoc);

                        case 19:
                        case 'end':
                            return _context9.stop();
                    }
                }
            }, _callee9, this);
        }));

        function upsert(_x16) {
            return _ref9.apply(this, arguments);
        }

        return upsert;
    }();

    /**
     * takes a mongoDB-query-object and returns the documents
     * @param  {object} queryObj
     * @return {RxDocument[]} found documents
     */


    RxCollection.prototype.find = function find(queryObj) {
        if (typeof queryObj === 'string') throw new Error('if you want to search by _id, use .findOne(_id)');

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

        if (typeof queryObj === 'number' || Array.isArray(queryObj)) throw new TypeError('.findOne() needs a queryObject or string');

        return query;
    };

    /**
     * export to json
     * @param {boolean} decrypted if true, all encrypted values will be decrypted
     */


    RxCollection.prototype.dump = function () {
        var _ref10 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee10() {
            var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
            var encrypted, json, query, docs;
            return _regeneratorRuntime.wrap(function _callee10$(_context10) {
                while (1) {
                    switch (_context10.prev = _context10.next) {
                        case 0:
                            encrypted = !decrypted;
                            json = {
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

                            query = RxQuery.create('find', {}, this);
                            _context10.next = 6;
                            return this._pouchFind(query, null, encrypted);

                        case 6:
                            docs = _context10.sent;

                            json.docs = docs.map(function (docData) {
                                delete docData._rev;
                                return docData;
                            });
                            return _context10.abrupt('return', json);

                        case 9:
                        case 'end':
                            return _context10.stop();
                    }
                }
            }, _callee10, this);
        }));

        function dump() {
            return _ref10.apply(this, arguments);
        }

        return dump;
    }();

    /**
     * imports the json-data into the collection
     * @param {Array} exportedJSON should be an array of raw-data
     */


    RxCollection.prototype.importDump = function () {
        var _ref11 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee11(exportedJSON) {
            var _this5 = this;

            var importFns;
            return _regeneratorRuntime.wrap(function _callee11$(_context11) {
                while (1) {
                    switch (_context11.prev = _context11.next) {
                        case 0:
                            if (!(exportedJSON.schemaHash != this.schema.hash)) {
                                _context11.next = 2;
                                break;
                            }

                            throw new Error('the imported json relies on a different schema');

                        case 2:
                            if (!(exportedJSON.encrypted && exportedJSON.passwordHash != util.hash(this.database.password))) {
                                _context11.next = 4;
                                break;
                            }

                            throw new Error('json.passwordHash does not match the own');

                        case 4:
                            importFns = exportedJSON.docs
                            // decrypt
                            .map(function (doc) {
                                return _this5._crypter.decrypt(doc);
                            }
                            // validate schema
                            ).map(function (doc) {
                                return _this5.schema.validate(doc);
                            }
                            // import
                            ).map(function (doc) {
                                return _this5._pouchPut(doc);
                            });
                            return _context11.abrupt('return', Promise.all(importFns));

                        case 6:
                        case 'end':
                            return _context11.stop();
                    }
                }
            }, _callee11, this);
        }));

        function importDump(_x18) {
            return _ref11.apply(this, arguments);
        }

        return importDump;
    }();

    RxCollection.prototype.watchForChanges = function watchForChanges() {
        var _this6 = this;

        if (!this.synced) {
            /**
             * this will grap the changes and publish them to the rx-stream
             * this is to ensure that changes from 'synced' dbs will be published
             */
            var sendChanges = {};
            var pouch$ = util.Rx.Observable.fromEvent(this.pouch.changes({
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
                return !_this6._changeEventBuffer.buffer.map(function (cE) {
                    return cE.data.v._rev;
                }).includes(doc._rev);
            }).filter(function (doc) {
                return sendChanges[doc._rev] = 'YES';
            }).delay(10).map(function (doc) {
                var ret = null;
                if (sendChanges[doc._rev] == 'YES') ret = doc;
                delete sendChanges[doc._rev];
                return ret;
            }).filter(function (doc) {
                return doc != null;
            }).subscribe(function (doc) {
                _this6.$emit(RxChangeEvent.fromPouchChange(doc, _this6));
            });

            this._subs.push(pouch$);

            var ob2 = this.$.map(function (cE) {
                return cE.data.v;
            }).map(function (doc) {
                if (doc && sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
            }).subscribe();
            this._subs.push(ob2);
        }

        this.synced = true;
    };

    /**
     * sync with another database
     */


    RxCollection.prototype.sync = function () {
        var _ref12 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee12(serverURL) {
            var alsoIfNotLeader = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
            var direction = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
                pull: true,
                push: true
            };
            var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {
                live: true,
                retry: true
            };
            var query = arguments[4];
            var syncFun, sync;
            return _regeneratorRuntime.wrap(function _callee12$(_context12) {
                while (1) {
                    switch (_context12.prev = _context12.next) {
                        case 0:
                            if (!(typeof this.pouch.sync !== 'function')) {
                                _context12.next = 2;
                                break;
                            }

                            throw new Error('RxCollection.sync needs \'pouchdb-replication\'. Code:\n                 RxDB.plugin(require(\'pouchdb-replication\')); ');

                        case 2:

                            options = clone(options);
                            syncFun = util.pouchReplicationFunction(this.pouch, direction);

                            if (query) options.selector = query.keyCompress().selector;

                            if (alsoIfNotLeader) {
                                _context12.next = 8;
                                break;
                            }

                            _context12.next = 8;
                            return this.database.waitForLeadership();

                        case 8:

                            this.watchForChanges();

                            sync = syncFun(serverURL, options).on('error', function (err) {
                                throw new Error(err);
                            });

                            this.pouchSyncs.push(sync);
                            return _context12.abrupt('return', sync);

                        case 12:
                        case 'end':
                            return _context12.stop();
                    }
                }
            }, _callee12, this);
        }));

        function sync(_x19) {
            return _ref12.apply(this, arguments);
        }

        return sync;
    }();

    /**
     * HOOKS
     */


    RxCollection.prototype.addHook = function addHook(when, key, fun) {
        var parallel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

        if (typeof fun != 'function') throw new TypeError(key + '-hook must be a function');

        if (!HOOKS_WHEN.includes(when)) throw new TypeError('hooks-when not known');

        if (!HOOKS_KEYS.includes(key)) throw new Error('hook-name ' + key + 'not known');

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
        var _ref13 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee13(when, key, doc) {
            var hooks, i;
            return _regeneratorRuntime.wrap(function _callee13$(_context13) {
                while (1) {
                    switch (_context13.prev = _context13.next) {
                        case 0:
                            hooks = this.getHooks(when, key);

                            if (hooks) {
                                _context13.next = 3;
                                break;
                            }

                            return _context13.abrupt('return');

                        case 3:
                            i = 0;

                        case 4:
                            if (!(i < hooks.series.length)) {
                                _context13.next = 10;
                                break;
                            }

                            _context13.next = 7;
                            return hooks.series[i](doc);

                        case 7:
                            i++;
                            _context13.next = 4;
                            break;

                        case 10:
                            _context13.next = 12;
                            return Promise.all(hooks.parallel.map(function (hook) {
                                return hook(doc);
                            }));

                        case 12:
                        case 'end':
                            return _context13.stop();
                    }
                }
            }, _callee13, this);
        }));

        function _runHooks(_x24, _x25, _x26) {
            return _ref13.apply(this, arguments);
        }

        return _runHooks;
    }();

    RxCollection.prototype.destroy = function () {
        var _ref14 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee14() {
            return _regeneratorRuntime.wrap(function _callee14$(_context14) {
                while (1) {
                    switch (_context14.prev = _context14.next) {
                        case 0:
                            this._subs.forEach(function (sub) {
                                return sub.unsubscribe();
                            });
                            this._changeEventBuffer && this._changeEventBuffer.destroy();
                            this._queryCache.destroy();
                            this.pouchSyncs.forEach(function (sync) {
                                return sync.cancel();
                            });
                            delete this.database.collections[this.name];

                        case 5:
                        case 'end':
                            return _context14.stop();
                    }
                }
            }, _callee14, this);
        }));

        function destroy() {
            return _ref14.apply(this, arguments);
        }

        return destroy;
    }();

    /**
     * remove all data
     * @return {Promise}
     */


    RxCollection.prototype.remove = function () {
        var _ref15 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee15() {
            return _regeneratorRuntime.wrap(function _callee15$(_context15) {
                while (1) {
                    switch (_context15.prev = _context15.next) {
                        case 0:
                            _context15.next = 2;
                            return this.database.removeCollection(this.name);

                        case 2:
                        case 'end':
                            return _context15.stop();
                    }
                }
            }, _callee15, this);
        }));

        function remove() {
            return _ref15.apply(this, arguments);
        }

        return remove;
    }();

    _createClass(RxCollection, [{
        key: '$',
        get: function get() {
            return this._observable$;
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
    if (typeof migrationStrategies !== 'object' || Array.isArray(migrationStrategies)) throw new TypeError('migrationStrategies must be an object');

    // for every previousVersion there must be strategy
    if (schema.previousVersions.length != Object.keys(migrationStrategies).length) {
        throw new Error('\n      a migrationStrategy is missing or too much\n      - have: ' + JSON.stringify(Object.keys(migrationStrategies).map(function (v) {
            return parseInt(v);
        })) + '\n      - should: ' + JSON.stringify(schema.previousVersions) + '\n      ');
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
        throw new TypeError('migrationStrategy(v' + strat.v + ') must be a function; is : ' + typeof strat);
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
var checkORMmethdods = function checkORMmethdods(statics) {
    Object.entries(statics).forEach(function (entry) {
        if (typeof entry[0] != 'string') throw new TypeError('given static method-name (' + entry[0] + ') is not a string');

        if (entry[0].startsWith('_')) throw new TypeError('static method-names cannot start with underscore _ (' + entry[0] + ')');

        if (typeof entry[1] != 'function') throw new TypeError('given static method (' + entry[0] + ') is not a function but ' + typeof entry[1]);

        if (properties().includes(entry[0]) || RxDocument.properties().includes(entry[0])) throw new Error('statics-name not allowed: ' + entry[0]);
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
    var _ref16 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee16(_ref17) {
        var database = _ref17.database,
            name = _ref17.name,
            schema = _ref17.schema,
            _ref17$pouchSettings = _ref17.pouchSettings,
            pouchSettings = _ref17$pouchSettings === undefined ? {} : _ref17$pouchSettings,
            _ref17$migrationStrat = _ref17.migrationStrategies,
            migrationStrategies = _ref17$migrationStrat === undefined ? {} : _ref17$migrationStrat,
            _ref17$autoMigrate = _ref17.autoMigrate,
            autoMigrate = _ref17$autoMigrate === undefined ? true : _ref17$autoMigrate,
            _ref17$statics = _ref17.statics,
            statics = _ref17$statics === undefined ? {} : _ref17$statics,
            _ref17$methods = _ref17.methods,
            methods = _ref17$methods === undefined ? {} : _ref17$methods;
        var collection;
        return _regeneratorRuntime.wrap(function _callee16$(_context16) {
            while (1) {
                switch (_context16.prev = _context16.next) {
                    case 0:
                        if (!(!schema instanceof RxSchema)) {
                            _context16.next = 2;
                            break;
                        }

                        throw new TypeError('given schema is no Schema-object');

                    case 2:
                        if (!(!database instanceof RxDatabase)) {
                            _context16.next = 4;
                            break;
                        }

                        throw new TypeError('given database is no Database-object');

                    case 4:
                        if (!(typeof autoMigrate !== 'boolean')) {
                            _context16.next = 6;
                            break;
                        }

                        throw new TypeError('autoMigrate must be boolean');

                    case 6:

                        util.validateCouchDBString(name);
                        checkMigrationStrategies(schema, migrationStrategies);

                        // check ORM-methods
                        checkORMmethdods(statics);
                        checkORMmethdods(methods);
                        Object.keys(methods).filter(function (funName) {
                            return schema.topLevelFields.includes(funName);
                        }).forEach(function (funName) {
                            throw new Error('collection-method not allowed because fieldname is in the schema ' + funName);
                        });

                        collection = new RxCollection(database, name, schema, pouchSettings, migrationStrategies, methods);
                        _context16.next = 14;
                        return collection.prepare();

                    case 14:

                        // ORM add statics
                        Object.entries(statics).forEach(function (entry) {
                            var fun = entry.pop();
                            var funName = entry.pop();
                            collection.__defineGetter__(funName, function () {
                                return fun.bind(collection);
                            });
                        });

                        if (!autoMigrate) {
                            _context16.next = 18;
                            break;
                        }

                        _context16.next = 18;
                        return collection.migratePromise();

                    case 18:
                        return _context16.abrupt('return', collection);

                    case 19:
                    case 'end':
                        return _context16.stop();
                }
            }
        }, _callee16, this);
    }));

    return function create(_x27) {
        return _ref16.apply(this, arguments);
    };
}();