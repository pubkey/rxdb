'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxSchema = exports.removeDatabase = exports.create = exports.RxDatabase = undefined;

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
    var _ref13 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee12(_ref12) {
        var name = _ref12.name,
            adapter = _ref12.adapter,
            password = _ref12.password,
            _ref12$multiInstance = _ref12.multiInstance,
            multiInstance = _ref12$multiInstance === undefined ? true : _ref12$multiInstance;
        var db;
        return _regenerator2['default'].wrap(function _callee12$(_context12) {
            while (1) {
                switch (_context12.prev = _context12.next) {
                    case 0:
                        util.validateCouchDBString(name);

                        // check if pouchdb-adapter

                        if (!(typeof adapter == 'string')) {
                            _context12.next = 6;
                            break;
                        }

                        if (!(!_PouchDB2['default'].adapters || !_PouchDB2['default'].adapters[adapter])) {
                            _context12.next = 4;
                            break;
                        }

                        throw new Error('Adapter ' + adapter + ' not added.\n                 Use RxDB.plugin(require(\'pouchdb-adapter-' + adapter + '\');');

                    case 4:
                        _context12.next = 9;
                        break;

                    case 6:
                        util.isLevelDown(adapter);

                        if (!(!_PouchDB2['default'].adapters || !_PouchDB2['default'].adapters.leveldb)) {
                            _context12.next = 9;
                            break;
                        }

                        throw new Error('To use leveldown-adapters, you have to add the leveldb-plugin.\n                 Use RxDB.plugin(require(\'pouchdb-adapter-leveldb\'));');

                    case 9:
                        if (!(password && typeof password !== 'string')) {
                            _context12.next = 11;
                            break;
                        }

                        throw new TypeError('password is no string');

                    case 11:
                        if (!(password && password.length < SETTINGS.minPassLength)) {
                            _context12.next = 13;
                            break;
                        }

                        throw new Error('password must have at least ' + SETTINGS.minPassLength + ' chars');

                    case 13:
                        db = new RxDatabase(name, adapter, password, multiInstance);
                        _context12.next = 16;
                        return db.prepare();

                    case 16:
                        return _context12.abrupt('return', db);

                    case 17:
                    case 'end':
                        return _context12.stop();
                }
            }
        }, _callee12, this);
    }));

    return function create(_x11) {
        return _ref13.apply(this, arguments);
    };
}();

/**
 * transforms the given adapter into a pouch-compatible object
 * @return {Object} adapterObject
 */


var removeDatabase = exports.removeDatabase = function () {
    var _ref14 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee13(databaseName, adapter) {
        var internalPouch, collectionsPouch, collectionsData;
        return _regenerator2['default'].wrap(function _callee13$(_context13) {
            while (1) {
                switch (_context13.prev = _context13.next) {
                    case 0:
                        internalPouch = _internalPouchDbs(databaseName, adapter);
                        collectionsPouch = internalPouch._collectionsPouch;
                        _context13.next = 4;
                        return collectionsPouch.allDocs({
                            include_docs: true
                        });

                    case 4:
                        collectionsData = _context13.sent;


                        // remove collections
                        Promise.all(collectionsData.rows.map(function (colDoc) {
                            return colDoc.id;
                        }).map(function (id) {
                            var split = id.split('-');
                            var name = split[0];
                            var version = parseInt(split[1], 10);
                            var pouch = _spawnPouchDB2(databaseName, adapter, name, version);
                            return pouch.destroy();
                        }));

                        // remove internals
                        _context13.next = 8;
                        return Promise.all(Object.values(internalPouch).map(function (pouch) {
                            return pouch.destroy();
                        }));

                    case 8:
                    case 'end':
                        return _context13.stop();
                }
            }
        }, _callee13, this);
    }));

    return function removeDatabase(_x13, _x14) {
        return _ref14.apply(this, arguments);
    };
}();

exports.properties = properties;

var _randomToken = require('random-token');

var _randomToken2 = _interopRequireDefault(_randomToken);

var _PouchDB = require('./PouchDB');

var _PouchDB2 = _interopRequireDefault(_PouchDB);

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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var SETTINGS = {
    minPassLength: 8
};

var RxDatabase = exports.RxDatabase = function () {
    function RxDatabase(name, adapter, password, multiInstance) {
        (0, _classCallCheck3['default'])(this, RxDatabase);

        this.name = name;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;

        this.token = (0, _randomToken2['default'])(10);

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


    (0, _createClass3['default'])(RxDatabase, [{
        key: 'prepare',
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee() {
                var _this = this;

                var internalPouch, pwHashDoc;
                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:

                                // rx
                                this.subject = new util.Rx.Subject();
                                this.observable$ = this.subject.asObservable().filter(function (cEvent) {
                                    return RxChangeEvent.isInstanceOf(cEvent);
                                });

                                // create internal collections
                                internalPouch = _internalPouchDbs(this.name, this.adapter);

                                this._adminPouch = internalPouch._adminPouch;
                                this._collectionsPouch = internalPouch._collectionsPouch;

                                // validate/insert password-hash

                                if (!this.password) {
                                    _context.next = 25;
                                    break;
                                }

                                pwHashDoc = null;
                                _context.prev = 7;
                                _context.next = 10;
                                return this._adminPouch.get('_local/pwHash');

                            case 10:
                                pwHashDoc = _context.sent;
                                _context.next = 15;
                                break;

                            case 13:
                                _context.prev = 13;
                                _context.t0 = _context['catch'](7);

                            case 15:
                                if (pwHashDoc) {
                                    _context.next = 23;
                                    break;
                                }

                                _context.prev = 16;
                                _context.next = 19;
                                return this._adminPouch.put({
                                    _id: '_local/pwHash',
                                    value: util.hash(this.password)
                                });

                            case 19:
                                _context.next = 23;
                                break;

                            case 21:
                                _context.prev = 21;
                                _context.t1 = _context['catch'](16);

                            case 23:
                                if (!(pwHashDoc && this.password && util.hash(this.password) != pwHashDoc.value)) {
                                    _context.next = 25;
                                    break;
                                }

                                throw new Error('another instance on this adapter has a different password');

                            case 25:
                                if (!this.multiInstance) {
                                    _context.next = 30;
                                    break;
                                }

                                _context.next = 28;
                                return Socket.create(this);

                            case 28:
                                this.socket = _context.sent;


                                //TODO only subscribe when sth is listening to the event-chain
                                this.socket.messages$.subscribe(function (cE) {
                                    return _this.$emit(cE);
                                });

                            case 30:
                                _context.next = 32;
                                return LeaderElector.create(this);

                            case 32:
                                this.leaderElector = _context.sent;

                            case 33:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[7, 13], [16, 21]]);
            }));

            function prepare() {
                return _ref.apply(this, arguments);
            }

            return prepare;
        }()

        /**
         * spawns a new pouch-instance
         * @param {string} collectionName
         * @param {string} schemaVersion
         * @param {Object} [pouchSettings={}] pouchSettings
         * @type {Object}
         */

    }, {
        key: '_spawnPouchDB',
        value: function _spawnPouchDB(collectionName, schemaVersion) {
            var pouchSettings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            return _spawnPouchDB2(this.name, this.adapter, collectionName, schemaVersion, pouchSettings = {});
        }
    }, {
        key: 'waitForLeadership',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee2() {
                return _regenerator2['default'].wrap(function _callee2$(_context2) {
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
            var _ref3 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee3(changeEvent) {
                return _regenerator2['default'].wrap(function _callee3$(_context3) {
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
            var _ref4 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee4(name, schema) {
                var docId, doc;
                return _regenerator2['default'].wrap(function _callee4$(_context4) {
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
         * removes all internal docs of a given collection
         * @param  {string}  collectionName
         * @return {Promise<string[]>} resolves all known collection-versions
         */

    }, {
        key: '_removeAllOfCollection',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee5(collectionName) {
                var _this2 = this;

                var data, relevantDocs;
                return _regenerator2['default'].wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this._collectionsPouch.allDocs({
                                    include_docs: true
                                });

                            case 2:
                                data = _context5.sent;
                                relevantDocs = data.rows.map(function (row) {
                                    return row.doc;
                                }).filter(function (doc) {
                                    var name = doc._id.split('-')[0];
                                    return name == collectionName;
                                });
                                _context5.next = 6;
                                return Promise.all(relevantDocs.map(function (doc) {
                                    return _this2._collectionsPouch.remove(doc);
                                }));

                            case 6:
                                return _context5.abrupt('return', relevantDocs.map(function (doc) {
                                    return doc.version;
                                }));

                            case 7:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function _removeAllOfCollection(_x5) {
                return _ref5.apply(this, arguments);
            }

            return _removeAllOfCollection;
        }()

        /**
         * create or fetch a collection
         * @param {{name: string, schema: Object, pouchSettings = {}, migrationStrategies = {}}} args
         * @return {Collection}
         */

    }, {
        key: 'collection',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee6(args) {
                var _this3 = this;

                var internalPrimary, schemaHash, collectionDoc, collection, cEvent;
                return _regenerator2['default'].wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                args.database = this;

                                if (!(args.name.charAt(0) == '_')) {
                                    _context6.next = 3;
                                    break;
                                }

                                throw new Error('collection(' + args.name + '): collection-names cannot start with underscore _');

                            case 3:
                                if (!this.collections[args.name]) {
                                    _context6.next = 5;
                                    break;
                                }

                                throw new Error('collection(' + args.name + ') already exists. use myDatabase.' + args.name + ' to get it');

                            case 5:
                                if (args.schema) {
                                    _context6.next = 7;
                                    break;
                                }

                                throw new Error('collection(' + args.name + '): schema is missing');

                            case 7:

                                if (!RxSchema.isInstanceOf(args.schema)) args.schema = RxSchema.create(args.schema);

                                internalPrimary = this._collectionNamePrimary(args.name, args.schema);

                                // check unallowed collection-names

                                if (!properties().includes(args.name)) {
                                    _context6.next = 11;
                                    break;
                                }

                                throw new Error('Collection-name ' + args.name + ' not allowed');

                            case 11:

                                // check schemaHash
                                schemaHash = args.schema.hash;
                                collectionDoc = null;
                                _context6.prev = 13;
                                _context6.next = 16;
                                return this._collectionsPouch.get(internalPrimary);

                            case 16:
                                collectionDoc = _context6.sent;
                                _context6.next = 21;
                                break;

                            case 19:
                                _context6.prev = 19;
                                _context6.t0 = _context6['catch'](13);

                            case 21:
                                if (!(collectionDoc && collectionDoc.schemaHash != schemaHash)) {
                                    _context6.next = 23;
                                    break;
                                }

                                throw new Error('collection(' + args.name + '): another instance created this collection with a different schema');

                            case 23:
                                _context6.next = 25;
                                return RxCollection.create(args);

                            case 25:
                                collection = _context6.sent;

                                if (!(Object.keys(collection.schema.encryptedPaths).length > 0 && !this.password)) {
                                    _context6.next = 28;
                                    break;
                                }

                                throw new Error('collection(' + args.name + '): schema encrypted but no password given');

                            case 28:
                                if (collectionDoc) {
                                    _context6.next = 36;
                                    break;
                                }

                                _context6.prev = 29;
                                _context6.next = 32;
                                return this._collectionsPouch.put({
                                    _id: internalPrimary,
                                    schemaHash: schemaHash,
                                    schema: collection.schema.normalized,
                                    version: collection.schema.version
                                });

                            case 32:
                                _context6.next = 36;
                                break;

                            case 34:
                                _context6.prev = 34;
                                _context6.t1 = _context6['catch'](29);

                            case 36:
                                cEvent = RxChangeEvent.create('RxDatabase.collection', this);

                                cEvent.data.v = collection.name;
                                cEvent.data.col = '_collections';
                                this.$emit(cEvent);

                                this.collections[args.name] = collection;
                                this.__defineGetter__(args.name, function () {
                                    return _this3.collections[args.name];
                                });

                                return _context6.abrupt('return', collection);

                            case 43:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this, [[13, 19], [29, 34]]);
            }));

            function collection(_x6) {
                return _ref6.apply(this, arguments);
            }

            return collection;
        }()

        /**
         * delete all data of the collection and its previous versions
         * @param  {string}  collectionName
         * @return {Promise}
         */

    }, {
        key: 'removeCollection',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee7(collectionName) {
                var _this4 = this;

                var knownVersions, pouches;
                return _regenerator2['default'].wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                if (!this.collections[collectionName]) {
                                    _context7.next = 3;
                                    break;
                                }

                                _context7.next = 3;
                                return this.collections[collectionName].destroy();

                            case 3:
                                _context7.next = 5;
                                return this._removeAllOfCollection(collectionName);

                            case 5:
                                knownVersions = _context7.sent;

                                // get all relevant pouchdb-instances
                                pouches = knownVersions.map(function (v) {
                                    return _this4._spawnPouchDB(collectionName, v);
                                });

                                // remove documents

                                _context7.next = 9;
                                return Promise.all(pouches.map(function (pouch) {
                                    return pouch.destroy();
                                }));

                            case 9:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function removeCollection(_x7) {
                return _ref7.apply(this, arguments);
            }

            return removeCollection;
        }()

        /**
         * export to json
         * @param {boolean} decrypted
         * @param {?string[]} collections array with collectionNames or null if all
         */

    }, {
        key: 'dump',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee8() {
                var _this5 = this;

                var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
                var collections = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var json, useCollections;
                return _regenerator2['default'].wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
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
                                    return _this5.collections[colName];
                                });
                                _context8.next = 5;
                                return Promise.all(useCollections.map(function (col) {
                                    return col.dump(decrypted);
                                }));

                            case 5:
                                json.collections = _context8.sent;
                                return _context8.abrupt('return', json);

                            case 7:
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
         * import json
         * @param {Object} dump
         */

    }, {
        key: 'importDump',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee9(dump) {
                var _this6 = this;

                return _regenerator2['default'].wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                return _context9.abrupt('return', Promise.all(dump.collections.filter(function (colDump) {
                                    return _this6.collections[colDump.name];
                                }).map(function (colDump) {
                                    return _this6.collections[colDump.name].importDump(colDump);
                                })));

                            case 1:
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
    }, {
        key: 'destroy',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee10() {
                var _this7 = this;

                return _regenerator2['default'].wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                if (!this.destroyed) {
                                    _context10.next = 2;
                                    break;
                                }

                                return _context10.abrupt('return');

                            case 2:
                                this.destroyed = true;
                                this.socket && this.socket.destroy();
                                _context10.next = 6;
                                return this.leaderElector.destroy();

                            case 6:
                                this.subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });
                                Object.keys(this.collections).map(function (key) {
                                    return _this7.collections[key];
                                }).map(function (col) {
                                    return col.destroy();
                                });

                            case 8:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this);
            }));

            function destroy() {
                return _ref10.apply(this, arguments);
            }

            return destroy;
        }()
    }, {
        key: 'remove',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee11() {
                return _regenerator2['default'].wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                _context11.next = 2;
                                return this.destroy();

                            case 2:
                                _context11.next = 4;
                                return removeDatabase(this.name, this.adapter);

                            case 4:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function remove() {
                return _ref11.apply(this, arguments);
            }

            return remove;
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

/**
 * returns all possible properties of a RxDatabase-instance
 * @return {string[]} property-names
 */


var _properties = null;
function properties() {
    if (!_properties) {
        var pseudoInstance = new RxDatabase();
        var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
        _properties = [].concat((0, _toConsumableArray3['default'])(ownProperties), (0, _toConsumableArray3['default'])(prototypeProperties));
    }
    return _properties;
}

function _adapterObject(adapter) {
    var adapterObj = {
        db: adapter
    };
    if (typeof adapter === 'string') {
        adapterObj = {
            adapter: adapter
        };
    }
    return adapterObj;
}

function _spawnPouchDB2(dbName, adapter, collectionName, schemaVersion) {
    var pouchSettings = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    var pouchLocation = dbName + '-rxdb-' + schemaVersion + '-' + collectionName;
    return new _PouchDB2['default'](pouchLocation, _adapterObject(adapter), pouchSettings);
}

function _internalPouchDbs(dbName, adapter) {
    var ret = {};
    // create internal collections
    // - admin-collection
    ret._adminPouch = _spawnPouchDB2(dbName, adapter, '_admin', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    });
    // - collections-collection
    ret._collectionsPouch = _spawnPouchDB2(dbName, adapter, '_collections', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    });
    return ret;
}

exports.RxSchema = RxSchema;
