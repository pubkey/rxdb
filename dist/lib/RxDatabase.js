'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxSchema = exports.create = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var create = exports.create = function () {
    var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(_ref10) {
        var name = _ref10.name,
            adapter = _ref10.adapter,
            password = _ref10.password,
            _ref10$multiInstance = _ref10.multiInstance,
            multiInstance = _ref10$multiInstance === undefined ? true : _ref10$multiInstance;
        var db;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        util.validateCouchDBString(name);

                        // check if pouchdb-adapter

                        if (!(typeof adapter == 'string')) {
                            _context9.next = 6;
                            break;
                        }

                        if (!(!_PouchDB2.default.adapters || !_PouchDB2.default.adapters[adapter])) {
                            _context9.next = 4;
                            break;
                        }

                        throw new Error('Adapter ' + adapter + ' not added.\n                 Use RxDB.plugin(require(\'pouchdb-adapter-' + adapter + '\');');

                    case 4:
                        _context9.next = 9;
                        break;

                    case 6:
                        util.isLevelDown(adapter);

                        if (!(!_PouchDB2.default.adapters || !_PouchDB2.default.adapters.leveldb)) {
                            _context9.next = 9;
                            break;
                        }

                        throw new Error('To use leveldown-adapters, you have to add the leveldb-plugin.\n                 Use RxDB.plugin(require(\'pouchdb-adapter-leveldb\'));');

                    case 9:
                        if (!(password && typeof password !== 'string')) {
                            _context9.next = 11;
                            break;
                        }

                        throw new TypeError('password is no string');

                    case 11:
                        if (!(password && password.length < RxDatabase.settings.minPassLength)) {
                            _context9.next = 13;
                            break;
                        }

                        throw new Error('password must have at least ' + RxDatabase.settings.minPassLength + ' chars');

                    case 13:
                        db = new RxDatabase(name, adapter, password, multiInstance);
                        _context9.next = 16;
                        return db.prepare();

                    case 16:
                        return _context9.abrupt('return', db);

                    case 17:
                    case 'end':
                        return _context9.stop();
                }
            }
        }, _callee9, this);
    }));

    return function create(_x9) {
        return _ref9.apply(this, arguments);
    };
}();

exports.properties = properties;

var _randomToken = require('random-token');

var _randomToken2 = _interopRequireDefault(_randomToken);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxCollection = require('./RxCollection');

var RxCollection = _interopRequireWildcard(_RxCollection);

var _RxSchema = require('./RxSchema');

var RxSchema = _interopRequireWildcard(_RxSchema);

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
    function RxDatabase(name, adapter, password, multiInstance) {
        (0, _classCallCheck3.default)(this, RxDatabase);

        this.name = name;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;

        this.token = (0, _randomToken2.default)(10);

        this.subs = [];
        this.destroyed = false;

        // cache for collection-objects
        this.collections = {};

        // this is needed to preserver attribute-name
        this.subject = null;
        this.observable$ = null;
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

                                // rx
                                this.subject = new util.Rx.Subject();
                                this.observable$ = this.subject.asObservable().filter(function (cEvent) {
                                    return cEvent.constructor.name == 'RxChangeEvent';
                                });

                                // create internal collections
                                // - admin-collection
                                this._adminPouch = this._spawnPouchDB('_admin', 0, {
                                    auto_compaction: false, // no compaction because this only stores local documents
                                    revs_limit: 1
                                });
                                // - collections-collection
                                this._collectionsPouch = this._spawnPouchDB('_collections', 0, {
                                    auto_compaction: false, // no compaction because this only stores local documents
                                    revs_limit: 1
                                });

                                // validate/insert password-hash

                                if (!this.password) {
                                    _context.next = 24;
                                    break;
                                }

                                pwHashDoc = null;
                                _context.prev = 6;
                                _context.next = 9;
                                return this._adminPouch.get('_local/pwHash');

                            case 9:
                                pwHashDoc = _context.sent;
                                _context.next = 14;
                                break;

                            case 12:
                                _context.prev = 12;
                                _context.t0 = _context['catch'](6);

                            case 14:
                                if (pwHashDoc) {
                                    _context.next = 22;
                                    break;
                                }

                                _context.prev = 15;
                                _context.next = 18;
                                return this._adminPouch.put({
                                    _id: '_local/pwHash',
                                    value: util.hash(this.password)
                                });

                            case 18:
                                _context.next = 22;
                                break;

                            case 20:
                                _context.prev = 20;
                                _context.t1 = _context['catch'](15);

                            case 22:
                                if (!(pwHashDoc && this.password && util.hash(this.password) != pwHashDoc.value)) {
                                    _context.next = 24;
                                    break;
                                }

                                throw new Error('another instance on this adapter has a different password');

                            case 24:
                                if (!this.multiInstance) {
                                    _context.next = 29;
                                    break;
                                }

                                _context.next = 27;
                                return Socket.create(this);

                            case 27:
                                this.socket = _context.sent;


                                //TODO only subscribe when sth is listening to the event-chain
                                this.socket.messages$.subscribe(function (cE) {
                                    return _this.$emit(cE);
                                });

                            case 29:
                                _context.next = 31;
                                return LeaderElector.create(this);

                            case 31:
                                this.leaderElector = _context.sent;

                            case 32:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[6, 12], [15, 20]]);
            }));

            function prepare() {
                return _ref.apply(this, arguments);
            }

            return prepare;
        }()

        /**
         * transforms the given adapter into a pouch-compatible object
         * @return {Object} adapterObject
         */

    }, {
        key: '_spawnPouchDB',


        /**
         * spawns a new pouch-instance
         * @param {string} collectionName
         * @param {string} schemaVersion
         * @param {Object} [pouchSettings={}] pouchSettings
         * @type {Object}
         */
        value: function _spawnPouchDB(collectionName, schemaVersion) {
            var pouchSettings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            var pouchLocation = this.name + '-rxdb-' + schemaVersion + '-' + collectionName;
            return new _PouchDB2.default(pouchLocation, this._adapterObj, pouchSettings);
        }
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
        value: function $emit(changeEvent) {
            if (!changeEvent) return;

            // throw in own cycle
            this.subject.next(changeEvent);

            // write to socket if event was created by self
            if (changeEvent.data.it == this.token) this.writeToSocket(changeEvent);
        }

        /**
         * @return {Observable} observable
         */

    }, {
        key: '_collectionNamePrimary',


        /**
         * returns the primary for a given collection-data
         * used in the internal pouchdb-instances
         * @param {string} name
         * @param {RxSchema} schema
         */
        value: function _collectionNamePrimary(name, schema) {
            return name + '-' + schema.version;
        }

        /**
         * removes the collection-doc from this._collectionsPouch
         * @return {Promise}
         */

    }, {
        key: 'removeCollectionDoc',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(name, schema) {
                var docId, doc;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                docId = this._collectionNamePrimary(name, schema);
                                _context4.next = 3;
                                return this._collectionsPouch.get(docId);

                            case 3:
                                doc = _context4.sent;
                                return _context4.abrupt('return', this._collectionsPouch.remove(doc));

                            case 5:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function removeCollectionDoc(_x3, _x4) {
                return _ref4.apply(this, arguments);
            }

            return removeCollectionDoc;
        }()

        /**
         * create or fetch a collection
         * @param {{name: string, schema: Object, pouchSettings = {}, migrationStrategies = {}}} args
         * @return {Collection}
         */

    }, {
        key: 'collection',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(args) {
                var _this2 = this;

                var internalPrimary, schemaHash, collectionDoc, collection, cEvent;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                args.database = this;

                                if (!(args.name.charAt(0) == '_')) {
                                    _context5.next = 3;
                                    break;
                                }

                                throw new Error('collection(' + args.name + '): collection-names cannot start with underscore _');

                            case 3:
                                if (!this.collections[args.name]) {
                                    _context5.next = 5;
                                    break;
                                }

                                throw new Error('collection(' + args.name + ') already exists. use myDatabase.' + args.name + ' to get it');

                            case 5:
                                if (args.schema) {
                                    _context5.next = 7;
                                    break;
                                }

                                throw new Error('collection(' + args.name + '): schema is missing');

                            case 7:

                                if (args.schema.constructor.name != 'RxSchema') args.schema = RxSchema.create(args.schema);

                                internalPrimary = this._collectionNamePrimary(args.name, args.schema);

                                // check unallowd collection-names

                                if (!properties().includes(args.name)) {
                                    _context5.next = 11;
                                    break;
                                }

                                throw new Error('Collection-name ' + args.name + ' not allowed');

                            case 11:

                                // check schemaHash
                                schemaHash = args.schema.hash;
                                collectionDoc = null;
                                _context5.prev = 13;
                                _context5.next = 16;
                                return this._collectionsPouch.get(internalPrimary);

                            case 16:
                                collectionDoc = _context5.sent;
                                _context5.next = 21;
                                break;

                            case 19:
                                _context5.prev = 19;
                                _context5.t0 = _context5['catch'](13);

                            case 21:
                                if (!(collectionDoc && collectionDoc.schemaHash != schemaHash)) {
                                    _context5.next = 23;
                                    break;
                                }

                                throw new Error('collection(' + args.name + '): another instance created this collection with a different schema');

                            case 23:
                                _context5.next = 25;
                                return RxCollection.create(args);

                            case 25:
                                collection = _context5.sent;

                                if (!(Object.keys(collection.schema.encryptedPaths).length > 0 && !this.password)) {
                                    _context5.next = 28;
                                    break;
                                }

                                throw new Error('collection(' + args.name + '): schema encrypted but no password given');

                            case 28:
                                if (collectionDoc) {
                                    _context5.next = 36;
                                    break;
                                }

                                _context5.prev = 29;
                                _context5.next = 32;
                                return this._collectionsPouch.put({
                                    _id: internalPrimary,
                                    schemaHash: schemaHash,
                                    schema: collection.schema.normalized,
                                    version: collection.schema.version
                                });

                            case 32:
                                _context5.next = 36;
                                break;

                            case 34:
                                _context5.prev = 34;
                                _context5.t1 = _context5['catch'](29);

                            case 36:
                                cEvent = RxChangeEvent.create('RxDatabase.collection', this);

                                cEvent.data.v = collection.name;
                                cEvent.data.col = '_collections';
                                this.$emit(cEvent);

                                this.collections[args.name] = collection;
                                this.__defineGetter__(args.name, function () {
                                    return _this2.collections[args.name];
                                });

                                return _context5.abrupt('return', collection);

                            case 43:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this, [[13, 19], [29, 34]]);
            }));

            function collection(_x5) {
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
                var _this3 = this;

                var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
                var collections = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var json, useCollections;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                json = {
                                    name: this.name,
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
                                    return _this3.collections[colName];
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
                var _this4 = this;

                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                return _context7.abrupt('return', Promise.all(dump.collections.filter(function (colDump) {
                                    return _this4.collections[colDump.name];
                                }).map(function (colDump) {
                                    return _this4.collections[colDump.name].importDump(colDump);
                                })));

                            case 1:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function importDump(_x8) {
                return _ref7.apply(this, arguments);
            }

            return importDump;
        }()
    }, {
        key: 'destroy',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
                var _this5 = this;

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
                                    return _this5.collections[key];
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
        key: '_adapterObj',
        get: function get() {
            var adapterObj = {
                db: this.adapter
            };
            if (typeof this.adapter === 'string') {
                adapterObj = {
                    adapter: this.adapter
                };
            }
            return adapterObj;
        }
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

/**
 * returns all possible properties of a RxDatabase-instance
 * @return {string[]} property-names
 */


RxDatabase.settings = {
    minPassLength: 8
};
var _properties = null;
function properties() {
    if (!_properties) {
        var pseudoInstance = new RxDatabase();
        var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
        _properties = [].concat((0, _toConsumableArray3.default)(ownProperties), (0, _toConsumableArray3.default)(prototypeProperties));
    }
    return _properties;
}

exports.RxSchema = RxSchema;