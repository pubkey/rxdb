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
    var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(database, name, schema) {
        var pouchSettings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        var collection;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        if (!(schema.constructor.name != 'RxSchema')) {
                            _context9.next = 2;
                            break;
                        }

                        throw new TypeError('given schema is no Schema-object');

                    case 2:
                        if (!(database.constructor.name != 'RxDatabase')) {
                            _context9.next = 4;
                            break;
                        }

                        throw new TypeError('given database is no Database-object');

                    case 4:
                        if (!(typeof name != 'string' || name.length == 0)) {
                            _context9.next = 6;
                            break;
                        }

                        throw new TypeError('given name is no string or empty');

                    case 6:
                        collection = new RxCollection(database, name, schema);
                        _context9.next = 9;
                        return collection.prepare();

                    case 9:
                        return _context9.abrupt('return', collection);

                    case 10:
                    case 'end':
                        return _context9.stop();
                }
            }
        }, _callee9, this);
    }));

    return function create(_x7, _x8, _x9) {
        return _ref9.apply(this, arguments);
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
                                _context.next = 2;
                                return Promise.all(this.schema.indexes.map(function (indexAr) {
                                    return _this2.pouch.createIndex({
                                        index: {
                                            fields: indexAr
                                        }
                                    });
                                }));

                            case 2:
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
         * returns observable
         */

    }, {
        key: 'insert',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(json) {
                var _this3 = this;

                var encPaths, swappedDoc, insertResult, newDocData, newDoc, emitEvent;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!json._id) {
                                    _context2.next = 2;
                                    break;
                                }

                                throw new Error('do not provide ._id, it will be generated');

                            case 2:

                                //console.log('RxCollection.insert():');
                                //console.dir(json);

                                json = (0, _clone2.default)(json);
                                json._id = util.generate_id();

                                this.schema.validate(json);

                                // handle encrypted fields
                                encPaths = this.schema.getEncryptedPaths();

                                Object.keys(encPaths).map(function (path) {
                                    var value = _objectPath2.default.get(json, path);
                                    var encrypted = _this3.database._encrypt(value);
                                    _objectPath2.default.set(json, path, encrypted);
                                });

                                // primary swap
                                swappedDoc = this.schema.swapPrimaryToId(json);
                                _context2.next = 10;
                                return this.pouch.put(swappedDoc);

                            case 10:
                                insertResult = _context2.sent;
                                newDocData = json;

                                newDocData._id = insertResult.id;
                                newDocData._rev = insertResult.rev;
                                newDoc = RxDocument.create(this, newDocData, {});

                                // event

                                emitEvent = RxChangeEvent.create('RxCollection.insert', this.database, this, newDoc, newDocData);

                                this.$emit(emitEvent);

                                return _context2.abrupt('return', newDoc);

                            case 18:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function insert(_x2) {
                return _ref2.apply(this, arguments);
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
            query.exec = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
                var queryJSON, docs, ret;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                queryJSON = query.toJSON();
                                _context3.next = 3;
                                return _this4.pouch.find(queryJSON);

                            case 3:
                                docs = _context3.sent;
                                ret = RxDocument.createAr(_this4, docs.docs, queryJSON);
                                return _context3.abrupt('return', ret);

                            case 6:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, _this4);
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

            query.exec = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
                var queryJSON, docs, doc, ret;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                queryJSON = query.toJSON();

                                queryJSON.limit = 1;
                                _context4.next = 4;
                                return _this5.pouch.find(queryJSON);

                            case 4:
                                docs = _context4.sent;

                                if (!(docs.docs.length === 0)) {
                                    _context4.next = 7;
                                    break;
                                }

                                return _context4.abrupt('return', null);

                            case 7:
                                doc = docs.docs.shift();
                                ret = RxDocument.create(_this5, doc, queryJSON);
                                return _context4.abrupt('return', ret);

                            case 10:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, _this5);
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
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5() {
                var _this6 = this;

                var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
                var json, docs;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                json = {
                                    name: this.name,
                                    schemaHash: this.schema.hash(),
                                    encrypted: false,
                                    passwordHash: null,
                                    docs: []
                                };


                                if (this.database.password) {
                                    json.passwordHash = util.hash(this.database.password);
                                    if (decrypted) json.encrypted = false;else json.encrypted = true;
                                }

                                _context5.next = 4;
                                return this.find().exec();

                            case 4:
                                docs = _context5.sent;

                                docs.map(function (doc) {
                                    var useData = doc.rawData;
                                    if (_this6.database.password && decrypted) useData = Object.assign(doc.rawData, doc.data);

                                    delete useData._rev;
                                    json.docs.push(useData);
                                });
                                return _context5.abrupt('return', json);

                            case 7:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function dump() {
                return _ref5.apply(this, arguments);
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
            var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(exportedJSON) {
                var _this7 = this;

                var decDocs, fns;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                if (!(exportedJSON.schemaHash != this.schema.hash())) {
                                    _context6.next = 2;
                                    break;
                                }

                                throw new Error('the imported json relies on a different schema');

                            case 2:
                                if (!(exportedJSON.encrypted && exportedJSON.passwordHash != util.hash(this.database.password))) {
                                    _context6.next = 4;
                                    break;
                                }

                                throw new Error('json.passwordHash does not match the own');

                            case 4:

                                // decrypt docs
                                decDocs = [];

                                exportedJSON.docs.map(function (docData) {
                                    docData = (0, _clone2.default)(docData);
                                    if (exportedJSON.encrypted) {
                                        var encPaths = _this7.schema.getEncryptedPaths();
                                        Object.keys(encPaths).map(function (path) {
                                            var encrypted = _objectPath2.default.get(docData, path);
                                            if (!encrypted) return;
                                            var decrypted = _this7.database._decrypt(encrypted);
                                            _objectPath2.default.set(docData, path, decrypted);
                                        });
                                    }
                                    decDocs.push(docData);
                                });

                                // check if docs match schema
                                decDocs.map(function (decDoc) {
                                    _this7.schema.validate(decDoc);
                                });

                                // import
                                fns = [];

                                exportedJSON.docs.map(function (decDocs) {
                                    fns.push(_this7.pouch.put(decDocs));
                                });
                                _context6.next = 11;
                                return Promise.all(fns);

                            case 11:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function importDump(_x4) {
                return _ref6.apply(this, arguments);
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
            var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(serverURL) {
                var _this8 = this;

                var alsoIfNotLeader = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
                var sync;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                if (!(typeof this.pouch.sync !== 'function')) {
                                    _context7.next = 2;
                                    break;
                                }

                                throw new Error('RxCollection.sync needs \'pouchdb-replication\'. Code:\n                 RxDB.plugin(require(\'pouchdb-replication\')); ');

                            case 2:
                                if (alsoIfNotLeader) {
                                    _context7.next = 5;
                                    break;
                                }

                                _context7.next = 5;
                                return this.database.waitForLeadership();

                            case 5:

                                if (!this.synced) {
                                    (function () {
                                        /**
                                         * this will grap the changes and publish them to the rx-stream
                                         * this is to ensure that changes from 'synced' dbs will be published
                                         */
                                        var sendChanges = {};
                                        var pouch$ = util.Rx.Observable.fromEvent(_this8.pouch.changes({
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
                                            _this8.$emit(RxChangeEvent.fromPouchChange(doc, _this8));
                                        });
                                        _this8.subs.push(pouch$);

                                        var ob2 = _this8.$.map(function (cE) {
                                            return cE.data.v;
                                        }).map(function (doc) {
                                            if (sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
                                        }).subscribe();
                                        _this8.subs.push(ob2);
                                    })();
                                }
                                this.synced = true;
                                sync = this.pouch.sync(serverURL, {
                                    live: true,
                                    retry: true
                                }).on('error', function (err) {
                                    console.log('sync error:');
                                    console.log(JSON.stringify(err));
                                    throw new Error(err);
                                });

                                this.pouchSyncs.push(sync);
                                return _context7.abrupt('return', sync);

                            case 10:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function sync(_x5) {
                return _ref7.apply(this, arguments);
            }

            return sync;
        }()
    }, {
        key: 'destroy',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
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
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function destroy() {
                return _ref8.apply(this, arguments);
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