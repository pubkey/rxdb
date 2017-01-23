'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.create = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var create = exports.create = function () {
    var _ref13 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee13(database, name, schema) {
        var pouchSettings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        var collection;
        return _regenerator2.default.wrap(function _callee13$(_context13) {
            while (1) {
                switch (_context13.prev = _context13.next) {
                    case 0:
                        if (!(schema.constructor.name != 'RxSchema')) {
                            _context13.next = 2;
                            break;
                        }

                        throw new TypeError('given schema is no Schema-object');

                    case 2:
                        if (!(database.constructor.name != 'RxDatabase')) {
                            _context13.next = 4;
                            break;
                        }

                        throw new TypeError('given database is no Database-object');

                    case 4:
                        if (!(typeof name != 'string' || name.length == 0)) {
                            _context13.next = 6;
                            break;
                        }

                        throw new TypeError('given name is no string or empty');

                    case 6:
                        collection = new RxCollection(database, name, schema);
                        _context13.next = 9;
                        return collection.prepare();

                    case 9:
                        return _context13.abrupt('return', collection);

                    case 10:
                    case 'end':
                        return _context13.stop();
                }
            }
        }, _callee13, this);
    }));

    return function create(_x17, _x18, _x19) {
        return _ref13.apply(this, arguments);
    };
}();

var _PouchDB = require('./PouchDB');

var _PouchDB2 = _interopRequireDefault(_PouchDB);

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxDocument = require('./RxDocument');

var RxDocument = _interopRequireWildcard(_RxDocument);

var _RxQuery = require('./RxQuery');

var RxQuery = _interopRequireWildcard(_RxQuery);

var _RxChangeEvent = require('./RxChangeEvent');

var RxChangeEvent = _interopRequireWildcard(_RxChangeEvent);

var _KeyCompressor = require('./KeyCompressor');

var KeyCompressor = _interopRequireWildcard(_KeyCompressor);

var _Crypter = require('./Crypter');

var Crypter = _interopRequireWildcard(_Crypter);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RxCollection = function () {
    function RxCollection(database, name, schema) {
        var _this = this;

        var pouchSettings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        (0, _classCallCheck3.default)(this, RxCollection);

        this.$emit = function (changeEvent) {
            return _this.database.$emit(changeEvent);
        };

        this.database = database;
        this.name = name;
        this.schema = schema;
        this.synced = false;
        this.keyCompressor = KeyCompressor.create(this.schema);

        this.hooks = {};

        var adapterObj = {
            db: this.database.adapter
        };
        if (typeof this.database.adapter === 'string') {
            adapterObj = {
                adapter: this.database.adapter
            };
        }

        this.subs = [];
        this.pouchSyncs = [];

        this.pouch = new _PouchDB2.default(database.prefix + ':RxDB:' + name, adapterObj, pouchSettings);

        this.observable$ = this.database.$.filter(function (event) {
            return event.data.col == _this.name;
        });
    }

    (0, _createClass3.default)(RxCollection, [{
        key: 'prepare',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                var _this2 = this;

                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:

                                this.crypter = Crypter.create(this.database.password, this.schema);

                                // INDEXES
                                _context.next = 3;
                                return Promise.all(this.schema.indexes.map(function (indexAr) {
                                    var compressedIdx = indexAr.map(function (key) {
                                        var ret = _this2.keyCompressor.table[key] ? _this2.keyCompressor.table[key] : key;
                                        return ret;
                                    });

                                    _this2.pouch.createIndex({
                                        index: {
                                            fields: compressedIdx
                                        }
                                    });
                                }));

                            case 3:

                                // HOOKS
                                RxCollection.HOOKS_KEYS.forEach(function (key) {
                                    RxCollection.HOOKS_WHEN.map(function (when) {
                                        var fnName = when + util.ucfirst(key);
                                        _this2[fnName] = function (fun, parallel) {
                                            return _this2.addHook(when, key, fun, parallel);
                                        };
                                    });
                                });

                            case 4:
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
        }()

        /**
         * wrappers for Pouch.put/get to handle keycompression etc
         */

    }, {
        key: '_handleToPouch',
        value: function _handleToPouch(docData) {
            var encrypted = this.crypter.encrypt(docData);
            var swapped = this.schema.swapPrimaryToId(encrypted);
            var compressed = this.keyCompressor.compress(swapped);
            return compressed;
        }
    }, {
        key: '_handleFromPouch',
        value: function _handleFromPouch(docData) {
            var noDecrypt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var swapped = this.schema.swapIdToPrimary(docData);
            var decompressed = this.keyCompressor.decompress(swapped);
            if (noDecrypt) return decompressed;
            var decrypted = this.crypter.decrypt(decompressed);
            return decrypted;
        }
    }, {
        key: '_pouchPut',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(obj) {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                obj = this._handleToPouch(obj);
                                return _context2.abrupt('return', this.pouch.put(obj));

                            case 2:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function _pouchPut(_x3) {
                return _ref2.apply(this, arguments);
            }

            return _pouchPut;
        }()
    }, {
        key: '_pouchGet',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(key) {
                var doc;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.pouch.get(key);

                            case 2:
                                doc = _context3.sent;

                                doc = this._handleFromPouch(doc);
                                return _context3.abrupt('return', doc);

                            case 5:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function _pouchGet(_x4) {
                return _ref3.apply(this, arguments);
            }

            return _pouchGet;
        }()
        /**
         * wrapps pouch-find
         * @param {RxQuery} rxQuery
         * @param {?number} limit overwrites the limit
         * @param {?boolean} noDecrypt if true, decryption will not be made
         * @return {Object[]} array with documents-data
         */

    }, {
        key: '_pouchFind',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(rxQuery, limit) {
                var _this3 = this;

                var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
                var compressedQueryJSON, docsCompressed, docs;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                compressedQueryJSON = rxQuery.keyCompress();

                                if (limit) compressedQueryJSON.limit = limit;
                                _context4.next = 4;
                                return this.pouch.find(compressedQueryJSON);

                            case 4:
                                docsCompressed = _context4.sent;
                                docs = docsCompressed.docs.map(function (doc) {
                                    return _this3._handleFromPouch(doc, noDecrypt);
                                });
                                return _context4.abrupt('return', docs);

                            case 7:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function _pouchFind(_x5, _x6) {
                return _ref4.apply(this, arguments);
            }

            return _pouchFind;
        }()

        /**
         * returns observable
         */

    }, {
        key: 'insert',


        /**
         * @param {Object} json data
         * @param {RxDocument} doc which was created
         */
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(json) {
                var insertResult, newDoc, emitEvent;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                json = (0, _clone2.default)(json);

                                if (!json._id) {
                                    _context5.next = 3;
                                    break;
                                }

                                throw new Error('do not provide ._id, it will be generated');

                            case 3:

                                // fill _id
                                if (this.schema.primaryPath == '_id' && !json._id) json._id = util.generate_id();

                                _context5.next = 6;
                                return this._runHooks('pre', 'insert', json);

                            case 6:

                                this.schema.validate(json);

                                _context5.next = 9;
                                return this._pouchPut(json);

                            case 9:
                                insertResult = _context5.sent;


                                json[this.schema.primaryPath] = insertResult.id;
                                json._rev = insertResult.rev;
                                newDoc = RxDocument.create(this, json, {});
                                _context5.next = 15;
                                return this._runHooks('post', 'insert', newDoc);

                            case 15:

                                // event
                                emitEvent = RxChangeEvent.create('RxCollection.insert', this.database, this, newDoc, json);

                                this.$emit(emitEvent);

                                return _context5.abrupt('return', newDoc);

                            case 18:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function insert(_x8) {
                return _ref5.apply(this, arguments);
            }

            return insert;
        }()

        /**
         * takes a mongoDB-query-object and returns the documents
         * @param  {object} queryObj
         * @return {RxDocument[]} found documents
         */

    }, {
        key: 'find',
        value: function find(queryObj) {
            var _this4 = this;

            if (typeof queryObj === 'string') throw new Error('if you want to search by _id, use .findOne(_id)');

            var query = RxQuery.create(queryObj, this);
            query.exec = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
                var docs, ret;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                _context6.next = 2;
                                return _this4._pouchFind(query);

                            case 2:
                                docs = _context6.sent;
                                ret = RxDocument.createAr(_this4, docs, query.toJSON());
                                return _context6.abrupt('return', ret);

                            case 5:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, _this4);
            }));
            return query;
        }
    }, {
        key: 'findOne',
        value: function findOne(queryObj) {
            var _this5 = this;

            var query = void 0;

            if (typeof queryObj === 'string') {
                query = RxQuery.create({
                    _id: queryObj
                }, this);
            } else query = RxQuery.create(queryObj, this);

            query.exec = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7() {
                var docs, doc, ret;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.next = 2;
                                return _this5._pouchFind(query, 1);

                            case 2:
                                docs = _context7.sent;

                                if (!(docs.length === 0)) {
                                    _context7.next = 5;
                                    break;
                                }

                                return _context7.abrupt('return', null);

                            case 5:
                                doc = docs.shift();
                                ret = RxDocument.create(_this5, doc, query.toJSON());
                                return _context7.abrupt('return', ret);

                            case 8:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, _this5);
            }));
            query.limit = function () {
                throw new Error('.limit() cannot be called on .findOne()');
            };
            return query;
        }

        /**
         * get a query only
         * @return {RxQuery} query which can be subscribed to
         */

    }, {
        key: 'query',
        value: function query(queryObj) {
            if (typeof queryObj === 'string') throw new Error('if you want to search by _id, use .findOne(_id)');

            var query = RxQuery.create(queryObj, this);
            return query;
        }

        /**
         * export to json
         * @param {boolean} decrypted if true, all encrypted values will be decrypted
         */

    }, {
        key: 'dump',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
                var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
                var encrypted, json, query, docs;
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                encrypted = !decrypted;
                                json = {
                                    name: this.name,
                                    schemaHash: this.schema.hash(),
                                    encrypted: false,
                                    passwordHash: null,
                                    docs: []
                                };


                                if (this.database.password && encrypted) {
                                    json.passwordHash = util.hash(this.database.password);
                                    json.encrypted = true;
                                }

                                query = RxQuery.create({}, this);
                                _context8.next = 6;
                                return this._pouchFind(query, null, encrypted);

                            case 6:
                                docs = _context8.sent;

                                json.docs = docs.map(function (docData) {
                                    delete docData._rev;
                                    return docData;
                                });
                                return _context8.abrupt('return', json);

                            case 9:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function dump() {
                return _ref8.apply(this, arguments);
            }

            return dump;
        }()

        /**
         * imports the json-data into the collection
         * @param {Array} exportedJSON should be an array of raw-data
         */

    }, {
        key: 'importDump',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(exportedJSON) {
                var _this6 = this;

                var importFns;
                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                if (!(exportedJSON.schemaHash != this.schema.hash())) {
                                    _context9.next = 2;
                                    break;
                                }

                                throw new Error('the imported json relies on a different schema');

                            case 2:
                                if (!(exportedJSON.encrypted && exportedJSON.passwordHash != util.hash(this.database.password))) {
                                    _context9.next = 4;
                                    break;
                                }

                                throw new Error('json.passwordHash does not match the own');

                            case 4:
                                importFns = exportedJSON.docs
                                // decrypt
                                .map(function (doc) {
                                    return _this6.crypter.decrypt(doc);
                                })
                                // validate schema
                                .map(function (doc) {
                                    return _this6.schema.validate(doc);
                                })
                                // import
                                .map(function (doc) {
                                    return _this6._pouchPut(doc);
                                });
                                return _context9.abrupt('return', Promise.all(importFns));

                            case 6:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function importDump(_x10) {
                return _ref9.apply(this, arguments);
            }

            return importDump;
        }()

        /**
         * TODO make sure that on multiInstances only one can sync
         * because it will have document-conflicts when 2 syncs write to the same storage
         */

    }, {
        key: 'sync',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10(serverURL) {
                var _this7 = this;

                var alsoIfNotLeader = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
                var sync;
                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                if (!(typeof this.pouch.sync !== 'function')) {
                                    _context10.next = 2;
                                    break;
                                }

                                throw new Error('RxCollection.sync needs \'pouchdb-replication\'. Code:\n                 RxDB.plugin(require(\'pouchdb-replication\')); ');

                            case 2:
                                if (alsoIfNotLeader) {
                                    _context10.next = 5;
                                    break;
                                }

                                _context10.next = 5;
                                return this.database.waitForLeadership();

                            case 5:

                                if (!this.synced) {
                                    (function () {
                                        /**
                                         * this will grap the changes and publish them to the rx-stream
                                         * this is to ensure that changes from 'synced' dbs will be published
                                         */
                                        var sendChanges = {};
                                        var pouch$ = util.Rx.Observable.fromEvent(_this7.pouch.changes({
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
                                            return sendChanges[doc._rev] = 'YES';
                                        }).delay(10).map(function (doc) {
                                            var ret = null;
                                            if (sendChanges[doc._rev] == 'YES') ret = doc;
                                            delete sendChanges[doc._rev];
                                            return ret;
                                        }).filter(function (doc) {
                                            return doc != null;
                                        }).subscribe(function (doc) {
                                            _this7.$emit(RxChangeEvent.fromPouchChange(doc, _this7));
                                        });
                                        _this7.subs.push(pouch$);

                                        var ob2 = _this7.$.map(function (cE) {
                                            return cE.data.v;
                                        }).map(function (doc) {
                                            if (sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
                                        }).subscribe();
                                        _this7.subs.push(ob2);
                                    })();
                                }
                                this.synced = true;
                                sync = this.pouch.sync(serverURL, {
                                    live: true,
                                    retry: true
                                }).on('error', function (err) {
                                    throw new Error(err);
                                });

                                this.pouchSyncs.push(sync);
                                return _context10.abrupt('return', sync);

                            case 10:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this);
            }));

            function sync(_x11) {
                return _ref10.apply(this, arguments);
            }

            return sync;
        }()

        /**
         * HOOKS
         */

    }, {
        key: 'addHook',
        value: function addHook(when, key, fun) {
            var parallel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

            if (typeof fun != 'function') throw new TypeError(key + '-hook must be a function');

            if (!RxCollection.HOOKS_WHEN.includes(when)) throw new TypeError('hooks-when not known');

            if (!RxCollection.HOOKS_KEYS.includes(key)) throw new Error('hook-name ' + key + 'not known');

            var runName = parallel ? 'parallel' : 'series';

            this.hooks[key] = this.hooks[key] || {};
            this.hooks[key][when] = this.hooks[key][when] || {
                series: [],
                parallel: []
            };
            this.hooks[key][when][runName].push(fun);
        }
    }, {
        key: 'getHooks',
        value: function getHooks(when, key) {
            try {
                return this.hooks[key][when];
            } catch (e) {
                return {
                    series: [],
                    parallel: []
                };
            }
        }
    }, {
        key: '_runHooks',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee11(when, key, doc) {
                var hooks, i;
                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                hooks = this.getHooks(when, key);

                                if (hooks) {
                                    _context11.next = 3;
                                    break;
                                }

                                return _context11.abrupt('return');

                            case 3:
                                i = 0;

                            case 4:
                                if (!(i < hooks.series.length)) {
                                    _context11.next = 10;
                                    break;
                                }

                                _context11.next = 7;
                                return hooks.series[i](doc);

                            case 7:
                                i++;
                                _context11.next = 4;
                                break;

                            case 10:
                                _context11.next = 12;
                                return Promise.all(hooks.parallel.map(function (hook) {
                                    return hook(doc);
                                }));

                            case 12:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function _runHooks(_x14, _x15, _x16) {
                return _ref11.apply(this, arguments);
            }

            return _runHooks;
        }()
    }, {
        key: 'destroy',
        value: function () {
            var _ref12 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee12() {
                return _regenerator2.default.wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                this.subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });
                                this.pouchSyncs.map(function (sync) {
                                    return sync.cancel();
                                });
                                delete this.database.collections[this.name];

                            case 3:
                            case 'end':
                                return _context12.stop();
                        }
                    }
                }, _callee12, this);
            }));

            function destroy() {
                return _ref12.apply(this, arguments);
            }

            return destroy;
        }()
    }, {
        key: '$',
        get: function get() {
            return this.observable$;
        }
    }]);
    return RxCollection;
}();

RxCollection.HOOKS_WHEN = ['pre', 'post'];
RxCollection.HOOKS_KEYS = ['insert', 'save', 'remove'];