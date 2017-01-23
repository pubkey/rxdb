'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxSchema = exports.create = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var create = exports.create = function () {
    var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(prefix, adapter, password) {
        var multiInstance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
        var db;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        if (!(typeof prefix !== 'string')) {
                            _context9.next = 2;
                            break;
                        }

                        throw new TypeError('given prefix is no string ');

                    case 2:
                        if (!(typeof adapter == 'string')) {
                            _context9.next = 7;
                            break;
                        }

                        if (!(!_PouchDB2.default.adapters || !_PouchDB2.default.adapters[adapter])) {
                            _context9.next = 5;
                            break;
                        }

                        throw new Error('Adapter ' + adapter + ' not added.\n                 Use RxDB.plugin(require(\'pouchdb-adapter-' + adapter + '\');');

                    case 5:
                        _context9.next = 10;
                        break;

                    case 7:
                        util.isLevelDown(adapter);

                        if (!(!_PouchDB2.default.adapters || !_PouchDB2.default.adapters.leveldb)) {
                            _context9.next = 10;
                            break;
                        }

                        throw new Error('To use leveldown-adapters, you have to add the leveldb-plugin.\n                 Use RxDB.plugin(require(\'pouchdb-adapter-leveldb\'));');

                    case 10:
                        if (!(password && typeof password !== 'string')) {
                            _context9.next = 12;
                            break;
                        }

                        throw new TypeError('password is no string');

                    case 12:
                        if (!(password && password.length < RxDatabase.settings.minPassLength)) {
                            _context9.next = 14;
                            break;
                        }

                        throw new Error('password must have at least ' + RxDatabase.settings.minPassLength + ' chars');

                    case 14:
                        db = new RxDatabase(prefix, adapter, password, multiInstance);
                        _context9.next = 17;
                        return db.prepare();

                    case 17:
                        return _context9.abrupt('return', db);

                    case 18:
                    case 'end':
                        return _context9.stop();
                }
            }
        }, _callee9, this);
    }));

    return function create(_x10, _x11, _x12) {
        return _ref9.apply(this, arguments);
    };
}();

var _randomToken = require('random-token');

var _randomToken2 = _interopRequireDefault(_randomToken);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxCollection = require('./RxCollection');

var RxCollection = _interopRequireWildcard(_RxCollection);

var _RxSchema = require('./RxSchema');

var RxSchema = _interopRequireWildcard(_RxSchema);

var _Database = require('./Database.schemas');

var DatabaseSchemas = _interopRequireWildcard(_Database);

var _RxChangeEvent = require('./RxChangeEvent');

var RxChangeEvent = _interopRequireWildcard(_RxChangeEvent);

var _Socket = require('./Socket');

var Socket = _interopRequireWildcard(_Socket);

var _LeaderElector = require('./LeaderElector');

var LeaderElector = _interopRequireWildcard(_LeaderElector);

var _PouchDB = require('./PouchDB');

var _PouchDB2 = _interopRequireDefault(_PouchDB);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RxDatabase = function () {
    function RxDatabase(prefix, adapter, password) {
        var multiInstance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
        (0, _classCallCheck3.default)(this, RxDatabase);

        this.prefix = prefix;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;

        this.token = (0, _randomToken2.default)(10);

        this.subs = [];
        this.destroyed = false;

        // cache for collection-objects
        this.collections = {};

        // rx
        this.subject = new util.Rx.Subject();
        this.observable$ = this.subject.asObservable().filter(function (cEvent) {
            return cEvent.constructor.name == 'RxChangeEvent';
        });
    }

    /**
     * make the async things for this database
     */


    (0, _createClass3.default)(RxDatabase, [{
        key: 'prepare',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                var _this = this;

                var pwHashDoc;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return Promise.all([
                                // create admin-collection
                                RxCollection.create(this, '_admin', DatabaseSchemas.administration, {
                                    auto_compaction: false, // no compaction because this only stores local documents
                                    revs_limit: 1
                                }).then(function (col) {
                                    return _this.administrationCollection = col;
                                }),
                                // create collections-collection
                                RxCollection.create(this, '_collections', DatabaseSchemas.collections).then(function (col) {
                                    return _this.collectionsCollection = col;
                                })]);

                            case 2:
                                if (!this.password) {
                                    _context.next = 22;
                                    break;
                                }

                                pwHashDoc = null;
                                _context.prev = 4;
                                _context.next = 7;
                                return this.administrationCollection.pouch.get('_local/pwHash');

                            case 7:
                                pwHashDoc = _context.sent;
                                _context.next = 12;
                                break;

                            case 10:
                                _context.prev = 10;
                                _context.t0 = _context['catch'](4);

                            case 12:
                                if (pwHashDoc) {
                                    _context.next = 20;
                                    break;
                                }

                                _context.prev = 13;
                                _context.next = 16;
                                return this.administrationCollection.pouch.put({
                                    _id: '_local/pwHash',
                                    value: util.hash(this.password)
                                });

                            case 16:
                                _context.next = 20;
                                break;

                            case 18:
                                _context.prev = 18;
                                _context.t1 = _context['catch'](13);

                            case 20:
                                if (!(pwHashDoc && this.password && util.hash(this.password) != pwHashDoc.value)) {
                                    _context.next = 22;
                                    break;
                                }

                                throw new Error('another instance on this adapter has a different password');

                            case 22:
                                if (!this.multiInstance) {
                                    _context.next = 27;
                                    break;
                                }

                                _context.next = 25;
                                return Socket.create(this);

                            case 25:
                                this.socket = _context.sent;


                                //TODO only subscribe when sth is listening to the event-chain
                                this.socket.messages$.subscribe(function (cE) {
                                    return _this.$emit(cE);
                                });

                            case 27:
                                _context.next = 29;
                                return LeaderElector.create(this);

                            case 29:
                                this.leaderElector = _context.sent;

                            case 30:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[4, 10], [13, 18]]);
            }));

            function prepare() {
                return _ref.apply(this, arguments);
            }

            return prepare;
        }()
    }, {
        key: 'waitForLeadership',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (this.multiInstance) {
                                    _context2.next = 2;
                                    break;
                                }

                                return _context2.abrupt('return', true);

                            case 2:
                                return _context2.abrupt('return', this.leaderElector.waitForLeadership());

                            case 3:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function waitForLeadership() {
                return _ref2.apply(this, arguments);
            }

            return waitForLeadership;
        }()
    }, {
        key: 'writeToSocket',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(changeEvent) {
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (!(this.multiInstance && !changeEvent.isIntern() && this.socket)) {
                                    _context3.next = 4;
                                    break;
                                }

                                _context3.next = 3;
                                return this.socket.write(changeEvent);

                            case 3:
                                return _context3.abrupt('return', true);

                            case 4:
                                return _context3.abrupt('return', false);

                            case 5:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function writeToSocket(_x2) {
                return _ref3.apply(this, arguments);
            }

            return writeToSocket;
        }()

        /**
         * throw a new event into the event-cicle
         */

    }, {
        key: '$emit',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(changeEvent) {
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                if (changeEvent) {
                                    _context4.next = 2;
                                    break;
                                }

                                return _context4.abrupt('return');

                            case 2:

                                // throw in own cycle
                                this.subject.next(changeEvent);

                                // write to socket if event was created by self
                                if (changeEvent.data.it == this.token) this.writeToSocket(changeEvent);

                            case 4:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function $emit(_x3) {
                return _ref4.apply(this, arguments);
            }

            return $emit;
        }()

        /**
         * @return {Observable} observable
         */

    }, {
        key: 'collection',


        /**
         * create or fetch a collection
         * @return {Collection}
         */
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(name, schema) {
                var pouchSettings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

                var schemaHash, collectionDoc, _collection, cEvent;

                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                if (!(name.charAt(0) == '_')) {
                                    _context5.next = 2;
                                    break;
                                }

                                throw new Error('collection(' + name + '): collection-names cannot start with underscore _');

                            case 2:

                                if (schema && schema.constructor.name != 'RxSchema') schema = RxSchema.create(schema);

                                if (this.collections[name]) {
                                    _context5.next = 36;
                                    break;
                                }

                                // check schemaHash
                                schemaHash = schema.hash();
                                collectionDoc = null;
                                _context5.prev = 6;
                                _context5.next = 9;
                                return this.collectionsCollection.pouch.get(name);

                            case 9:
                                collectionDoc = _context5.sent;
                                _context5.next = 14;
                                break;

                            case 12:
                                _context5.prev = 12;
                                _context5.t0 = _context5['catch'](6);

                            case 14:
                                if (!(collectionDoc && collectionDoc.schemaHash != schemaHash)) {
                                    _context5.next = 16;
                                    break;
                                }

                                throw new Error('collection(' + name + '): another instance created this collection with a different schema');

                            case 16:
                                _context5.next = 18;
                                return RxCollection.create(this, name, schema, pouchSettings);

                            case 18:
                                _collection = _context5.sent;

                                if (!(Object.keys(_collection.schema.getEncryptedPaths()).length > 0 && !this.password)) {
                                    _context5.next = 21;
                                    break;
                                }

                                throw new Error('collection(' + name + '): schema encrypted but no password given');

                            case 21:
                                if (collectionDoc) {
                                    _context5.next = 29;
                                    break;
                                }

                                _context5.prev = 22;
                                _context5.next = 25;
                                return this.collectionsCollection.pouch.put({
                                    _id: name,
                                    schemaHash: schemaHash
                                });

                            case 25:
                                _context5.next = 29;
                                break;

                            case 27:
                                _context5.prev = 27;
                                _context5.t1 = _context5['catch'](22);

                            case 29:
                                cEvent = RxChangeEvent.create('RxDatabase.collection', this);

                                cEvent.data.v = _collection.name;
                                cEvent.data.col = '_collections';
                                this.$emit(cEvent);

                                this.collections[name] = _collection;
                                _context5.next = 38;
                                break;

                            case 36:
                                if (!(schema && schema.hash() != this.collections[name].schema.hash())) {
                                    _context5.next = 38;
                                    break;
                                }

                                throw new Error('collection(' + name + '): already has a different schema');

                            case 38:
                                return _context5.abrupt('return', this.collections[name]);

                            case 39:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this, [[6, 12], [22, 27]]);
            }));

            function collection(_x4, _x5) {
                return _ref5.apply(this, arguments);
            }

            return collection;
        }()

        /**
         * export to json
         * @param {boolean} decrypted
         * @param {?string[]} collections array with collectionNames or null if all
         */

    }, {
        key: 'dump',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
                var _this2 = this;

                var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
                var collections = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var json, useCollections;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                json = {
                                    name: this.prefix,
                                    instanceToken: this.token,
                                    encrypted: false,
                                    passwordHash: null,
                                    collections: []
                                };


                                if (this.password) {
                                    json.passwordHash = util.hash(this.password);
                                    if (decrypted) json.encrypted = false;else json.encrypted = true;
                                }

                                useCollections = Object.keys(this.collections).filter(function (colName) {
                                    return !collections || collections.includes(colName);
                                }).filter(function (colName) {
                                    return colName.charAt(0) != '_';
                                }).map(function (colName) {
                                    return _this2.collections[colName];
                                });
                                _context6.next = 5;
                                return Promise.all(useCollections.map(function (col) {
                                    return col.dump(decrypted);
                                }));

                            case 5:
                                json.collections = _context6.sent;
                                return _context6.abrupt('return', json);

                            case 7:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function dump() {
                return _ref6.apply(this, arguments);
            }

            return dump;
        }()

        /**
         * import json
         * @param {Object} dump
         */

    }, {
        key: 'importDump',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(dump) {
                var _this3 = this;

                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                return _context7.abrupt('return', Promise.all(dump.collections.filter(function (colDump) {
                                    return _this3.collections[colDump.name];
                                }).map(function (colDump) {
                                    return _this3.collections[colDump.name].importDump(colDump);
                                })));

                            case 1:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function importDump(_x9) {
                return _ref7.apply(this, arguments);
            }

            return importDump;
        }()
    }, {
        key: 'destroy',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
                var _this4 = this;

                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                if (!this.destroyed) {
                                    _context8.next = 2;
                                    break;
                                }

                                return _context8.abrupt('return');

                            case 2:
                                this.destroyed = true;
                                this.socket && this.socket.destroy();
                                _context8.next = 6;
                                return this.leaderElector.destroy();

                            case 6:
                                this.subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });
                                Object.keys(this.collections).map(function (key) {
                                    return _this4.collections[key];
                                }).map(function (col) {
                                    return col.destroy();
                                });

                            case 8:
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
        key: 'isLeader',
        get: function get() {
            if (!this.multiInstance) return true;
            return this.leaderElector.isLeader;
        }
    }, {
        key: '$',
        get: function get() {
            return this.observable$;
        }
    }]);
    return RxDatabase;
}();

RxDatabase.settings = {
    minPassLength: 8
};
exports.RxSchema = RxSchema;