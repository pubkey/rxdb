'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxSchema = exports.checkAdapter = exports.removeDatabase = exports.create = exports.RxDatabase = undefined;

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
    var _ref8 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee7(_ref7) {
        var name = _ref7.name,
            adapter = _ref7.adapter,
            password = _ref7.password,
            _ref7$multiInstance = _ref7.multiInstance,
            multiInstance = _ref7$multiInstance === undefined ? true : _ref7$multiInstance,
            _ref7$ignoreDuplicate = _ref7.ignoreDuplicate,
            ignoreDuplicate = _ref7$ignoreDuplicate === undefined ? false : _ref7$ignoreDuplicate,
            _ref7$options = _ref7.options,
            options = _ref7$options === undefined ? {} : _ref7$options;
        var db;
        return _regenerator2['default'].wrap(function _callee7$(_context7) {
            while (1) {
                switch (_context7.prev = _context7.next) {
                    case 0:
                        util.validateCouchDBString(name);

                        // check if pouchdb-adapter

                        if (!(typeof adapter === 'string')) {
                            _context7.next = 6;
                            break;
                        }

                        if (!(!_pouchDb2['default'].adapters || !_pouchDb2['default'].adapters[adapter])) {
                            _context7.next = 4;
                            break;
                        }

                        throw _rxError2['default'].newRxError('DB9', {
                            adapter: adapter
                        });

                    case 4:
                        _context7.next = 9;
                        break;

                    case 6:
                        util.isLevelDown(adapter);

                        if (!(!_pouchDb2['default'].adapters || !_pouchDb2['default'].adapters.leveldb)) {
                            _context7.next = 9;
                            break;
                        }

                        throw _rxError2['default'].newRxError('DB10', {
                            adapter: adapter
                        });

                    case 9:

                        if (password) _overwritable2['default'].validatePassword(password);

                        // check if combination already used
                        if (!ignoreDuplicate) _isNameAdapterUsed(name, adapter);

                        // add to used_map
                        if (!USED_COMBINATIONS[name]) USED_COMBINATIONS[name] = [];
                        USED_COMBINATIONS[name].push(adapter);

                        db = new RxDatabase(name, adapter, password, multiInstance, options);
                        _context7.next = 16;
                        return db.prepare();

                    case 16:

                        (0, _hooks.runPluginHooks)('createRxDatabase', db);
                        return _context7.abrupt('return', db);

                    case 18:
                    case 'end':
                        return _context7.stop();
                }
            }
        }, _callee7, this);
    }));

    return function create(_x5) {
        return _ref8.apply(this, arguments);
    };
}();

var removeDatabase = exports.removeDatabase = function () {
    var _ref9 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee8(databaseName, adapter) {
        var adminPouch, socketPouch, collectionsPouch, collectionsData;
        return _regenerator2['default'].wrap(function _callee8$(_context8) {
            while (1) {
                switch (_context8.prev = _context8.next) {
                    case 0:
                        adminPouch = _internalAdminPouch(databaseName, adapter);
                        socketPouch = _spawnPouchDB2(databaseName, adapter, '_socket', 0);
                        collectionsPouch = _internalCollectionsPouch(databaseName, adapter);
                        _context8.next = 5;
                        return collectionsPouch.allDocs({
                            include_docs: true
                        });

                    case 5:
                        collectionsData = _context8.sent;


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
                        _context8.next = 9;
                        return Promise.all([collectionsPouch.destroy(), adminPouch.destroy(), socketPouch.destroy()]);

                    case 9:
                    case 'end':
                        return _context8.stop();
                }
            }
        }, _callee8, this);
    }));

    return function removeDatabase(_x7, _x8) {
        return _ref9.apply(this, arguments);
    };
}();

/**
 * check is the given adapter can be used
 */


var checkAdapter = exports.checkAdapter = function () {
    var _ref10 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee9(adapter) {
        return _regenerator2['default'].wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        _context9.next = 2;
                        return _overwritable2['default'].checkAdapter(adapter);

                    case 2:
                        return _context9.abrupt('return', _context9.sent);

                    case 3:
                    case 'end':
                        return _context9.stop();
                }
            }
        }, _callee9, this);
    }));

    return function checkAdapter(_x9) {
        return _ref10.apply(this, arguments);
    };
}();

exports.properties = properties;
exports.isInstanceOf = isInstanceOf;
exports.dbCount = dbCount;

var _randomToken = require('random-token');

var _randomToken2 = _interopRequireDefault(_randomToken);

var _customIdleQueue = require('custom-idle-queue');

var _customIdleQueue2 = _interopRequireDefault(_customIdleQueue);

var _pouchDb = require('./pouch-db');

var _pouchDb2 = _interopRequireDefault(_pouchDb);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _rxCollection = require('./rx-collection');

var _rxCollection2 = _interopRequireDefault(_rxCollection);

var _rxSchema = require('./rx-schema');

var _rxSchema2 = _interopRequireDefault(_rxSchema);

var _rxChangeEvent = require('./rx-change-event');

var _rxChangeEvent2 = _interopRequireDefault(_rxChangeEvent);

var _socket = require('./socket');

var _socket2 = _interopRequireDefault(_socket);

var _overwritable = require('./overwritable');

var _overwritable2 = _interopRequireDefault(_overwritable);

var _hooks = require('./hooks');

var _Subject = require('rxjs/Subject');

var _filter = require('rxjs/operators/filter');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 * @type {Object<string, array>} map with {dbName -> array<adapters>}
 */
var USED_COMBINATIONS = {};

var DB_COUNT = 0;

var RxDatabase = exports.RxDatabase = function () {
    function RxDatabase(name, adapter, password, multiInstance, options) {
        (0, _classCallCheck3['default'])(this, RxDatabase);

        if (typeof name !== 'undefined') DB_COUNT++;
        this.name = name;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;
        this.options = options;
        this.idleQueue = new _customIdleQueue2['default']();
        this.token = (0, _randomToken2['default'])(10);

        this._subs = [];
        this.destroyed = false;

        // cache for collection-objects
        this.collections = {};

        // rx
        this.subject = new _Subject.Subject();
        this.observable$ = this.subject.asObservable().pipe((0, _filter.filter)(function (cEvent) {
            return _rxChangeEvent2['default'].isInstanceOf(cEvent);
        }));
    }

    (0, _createClass3['default'])(RxDatabase, [{
        key: 'prepare',


        /**
         * do the async things for this database
         */
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                var _this = this;

                var pwHashDoc;
                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (!this.password) {
                                    _context.next = 22;
                                    break;
                                }

                                _context.next = 3;
                                return this.lockedRun(function () {
                                    return _this._adminPouch.info();
                                });

                            case 3:
                                pwHashDoc = null;
                                _context.prev = 4;
                                _context.next = 7;
                                return this.lockedRun(function () {
                                    return _this._adminPouch.get('_local/pwHash');
                                });

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
                                return this.lockedRun(function () {
                                    return _this._adminPouch.put({
                                        _id: '_local/pwHash',
                                        value: util.hash(_this.password)
                                    });
                                });

                            case 16:
                                _context.next = 20;
                                break;

                            case 18:
                                _context.prev = 18;
                                _context.t1 = _context['catch'](13);

                            case 20:
                                if (!(pwHashDoc && this.password && util.hash(this.password) !== pwHashDoc.value)) {
                                    _context.next = 22;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DB1', {
                                    passwordHash: util.hash(this.password),
                                    existingPasswordHash: pwHashDoc.value
                                });

                            case 22:
                                if (!this.multiInstance) {
                                    _context.next = 27;
                                    break;
                                }

                                _context.next = 25;
                                return _socket2['default'].create(this);

                            case 25:
                                this.socket = _context.sent;


                                // TODO only subscribe when sth is listening to the event-chain
                                this._subs.push(this.socket.messages$.subscribe(function (cE) {
                                    return _this.$emit(cE);
                                }));

                            case 27:
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

            return _spawnPouchDB2(this.name, this.adapter, collectionName, schemaVersion, pouchSettings);
        }
    }, {
        key: 'waitForLeadership',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2() {
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

        /**
         * writes the changeEvent to the socket
         * @param  {RxChangeEvent} changeEvent
         * @return {Promise<boolean>}
         */

    }, {
        key: 'writeToSocket',
        value: function writeToSocket(changeEvent) {
            if (this.multiInstance && !changeEvent.isIntern() && this.socket) {
                return this.socket.write(changeEvent).then(function () {
                    return true;
                });
            } else return Promise.resolve(false);
        }

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
            if (changeEvent.data.it === this.token) this.writeToSocket(changeEvent);
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
        value: function removeCollectionDoc(name, schema) {
            var _this2 = this;

            var docId = this._collectionNamePrimary(name, schema);
            return this._collectionsPouch.get(docId).then(function (doc) {
                return _this2.lockedRun(function () {
                    return _this2._collectionsPouch.remove(doc);
                });
            });
        }

        /**
         * removes all internal docs of a given collection
         * @param  {string}  collectionName
         * @return {Promise<string[]>} resolves all known collection-versions
         */

    }, {
        key: '_removeAllOfCollection',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3(collectionName) {
                var _this3 = this;

                var data, relevantDocs;
                return _regenerator2['default'].wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.lockedRun(function () {
                                    return _this3._collectionsPouch.allDocs({
                                        include_docs: true
                                    });
                                });

                            case 2:
                                data = _context3.sent;
                                relevantDocs = data.rows.map(function (row) {
                                    return row.doc;
                                }).filter(function (doc) {
                                    var name = doc._id.split('-')[0];
                                    return name === collectionName;
                                });
                                _context3.next = 6;
                                return Promise.all(relevantDocs.map(function (doc) {
                                    return _this3.lockedRun(function () {
                                        return _this3._collectionsPouch.remove(doc);
                                    });
                                }));

                            case 6:
                                return _context3.abrupt('return', relevantDocs.map(function (doc) {
                                    return doc.version;
                                }));

                            case 7:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function _removeAllOfCollection(_x2) {
                return _ref3.apply(this, arguments);
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
            var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4(args) {
                var _this4 = this;

                var internalPrimary, schemaHash, collectionDoc, pouch, oneDoc, collection, cEvent;
                return _regenerator2['default'].wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                if (!(typeof args === 'string')) {
                                    _context4.next = 2;
                                    break;
                                }

                                return _context4.abrupt('return', this.collections[args]);

                            case 2:

                                args.database = this;

                                if (!(args.name.charAt(0) === '_')) {
                                    _context4.next = 5;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DB2', {
                                    name: args.name
                                });

                            case 5:
                                if (!this.collections[args.name]) {
                                    _context4.next = 7;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DB3', {
                                    name: args.name
                                });

                            case 7:
                                if (args.schema) {
                                    _context4.next = 9;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DB4', {
                                    name: args.name,
                                    args: args
                                });

                            case 9:

                                if (!_rxSchema2['default'].isInstanceOf(args.schema)) args.schema = _rxSchema2['default'].create(args.schema);

                                internalPrimary = this._collectionNamePrimary(args.name, args.schema);

                                // check unallowed collection-names

                                if (!properties().includes(args.name)) {
                                    _context4.next = 13;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DB5', {
                                    name: args.name
                                });

                            case 13:

                                // check schemaHash
                                schemaHash = args.schema.hash;
                                collectionDoc = null;
                                _context4.prev = 15;
                                _context4.next = 18;
                                return this.lockedRun(function () {
                                    return _this4._collectionsPouch.get(internalPrimary);
                                });

                            case 18:
                                collectionDoc = _context4.sent;
                                _context4.next = 23;
                                break;

                            case 21:
                                _context4.prev = 21;
                                _context4.t0 = _context4['catch'](15);

                            case 23:
                                if (!(collectionDoc && collectionDoc.schemaHash !== schemaHash)) {
                                    _context4.next = 30;
                                    break;
                                }

                                // collection already exists with different schema, check if it has documents
                                pouch = this._spawnPouchDB(args.name, args.schema.version, args.pouchSettings);
                                _context4.next = 27;
                                return pouch.find({
                                    selector: {
                                        language: {
                                            $ne: 'query'
                                        }
                                    },
                                    limit: 1
                                });

                            case 27:
                                oneDoc = _context4.sent;

                                if (!(oneDoc.docs.length !== 0)) {
                                    _context4.next = 30;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DB6', {
                                    name: args.name,
                                    previousSchemaHash: collectionDoc.schemaHash,
                                    schemaHash: schemaHash
                                });

                            case 30:
                                _context4.next = 32;
                                return _rxCollection2['default'].create(args);

                            case 32:
                                collection = _context4.sent;

                                if (!(Object.keys(collection.schema.encryptedPaths).length > 0 && !this.password)) {
                                    _context4.next = 35;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DB7', {
                                    name: args.name
                                });

                            case 35:
                                if (collectionDoc) {
                                    _context4.next = 43;
                                    break;
                                }

                                _context4.prev = 36;
                                _context4.next = 39;
                                return this.lockedRun(function () {
                                    return _this4._collectionsPouch.put({
                                        _id: internalPrimary,
                                        schemaHash: schemaHash,
                                        schema: collection.schema.normalized,
                                        version: collection.schema.version
                                    });
                                });

                            case 39:
                                _context4.next = 43;
                                break;

                            case 41:
                                _context4.prev = 41;
                                _context4.t1 = _context4['catch'](36);

                            case 43:
                                cEvent = _rxChangeEvent2['default'].create('RxDatabase.collection', this);

                                cEvent.data.v = collection.name;
                                cEvent.data.col = '_collections';
                                this.$emit(cEvent);

                                this.collections[args.name] = collection;
                                this.__defineGetter__(args.name, function () {
                                    return _this4.collections[args.name];
                                });

                                return _context4.abrupt('return', collection);

                            case 50:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this, [[15, 21], [36, 41]]);
            }));

            function collection(_x3) {
                return _ref4.apply(this, arguments);
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
            var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5(collectionName) {
                var _this5 = this;

                var knownVersions, pouches;
                return _regenerator2['default'].wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                if (!this.collections[collectionName]) {
                                    _context5.next = 3;
                                    break;
                                }

                                _context5.next = 3;
                                return this.collections[collectionName].destroy();

                            case 3:
                                _context5.next = 5;
                                return this._removeAllOfCollection(collectionName);

                            case 5:
                                knownVersions = _context5.sent;

                                // get all relevant pouchdb-instances
                                pouches = knownVersions.map(function (v) {
                                    return _this5._spawnPouchDB(collectionName, v);
                                });

                                // remove documents

                                return _context5.abrupt('return', Promise.all(pouches.map(function (pouch) {
                                    return _this5.lockedRun(function () {
                                        return pouch.destroy();
                                    });
                                })));

                            case 8:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function removeCollection(_x4) {
                return _ref5.apply(this, arguments);
            }

            return removeCollection;
        }()

        /**
         * runs the given function between idleQueue-locking
         * @return {any}
         */

    }, {
        key: 'lockedRun',
        value: function lockedRun(fun) {
            return this.idleQueue.wrapCall(fun);
        }
    }, {
        key: 'requestIdlePromise',
        value: function requestIdlePromise() {
            return this.idleQueue.requestIdlePromise();
        }

        /**
         * export to json
         * @param {boolean} decrypted
         * @param {?string[]} collections array with collectionNames or null if all
         */

    }, {
        key: 'dump',
        value: function dump() {
            throw _rxError2['default'].pluginMissing('json-dump');
        }

        /**
         * import json
         * @param {Object} dump
         */

    }, {
        key: 'importDump',
        value: function importDump() {
            throw _rxError2['default'].pluginMissing('json-dump');
        }

        /**
         * destroys the database-instance and all collections
         * @return {Promise}
         */

    }, {
        key: 'destroy',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee6() {
                var _this6 = this;

                return _regenerator2['default'].wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                if (!this.destroyed) {
                                    _context6.next = 2;
                                    break;
                                }

                                return _context6.abrupt('return');

                            case 2:
                                DB_COUNT--;
                                this.destroyed = true;
                                _context6.t0 = this.socket;

                                if (!_context6.t0) {
                                    _context6.next = 8;
                                    break;
                                }

                                _context6.next = 8;
                                return this.socket.destroy();

                            case 8:
                                if (!this._leaderElector) {
                                    _context6.next = 11;
                                    break;
                                }

                                _context6.next = 11;
                                return this._leaderElector.destroy();

                            case 11:
                                this._subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });

                                // destroy all collections
                                _context6.next = 14;
                                return Promise.all(Object.keys(this.collections).map(function (key) {
                                    return _this6.collections[key];
                                }).map(function (col) {
                                    return col.destroy();
                                }));

                            case 14:

                                // remove combination from USED_COMBINATIONS-map
                                _removeUsedCombination(this.name, this.adapter);

                            case 15:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function destroy() {
                return _ref6.apply(this, arguments);
            }

            return destroy;
        }()

        /**
         * deletes the database and its stored data
         * @return {Promise}
         */

    }, {
        key: 'remove',
        value: function remove() {
            var _this7 = this;

            return this.destroy().then(function () {
                return removeDatabase(_this7.name, _this7.adapter);
            });
        }
    }, {
        key: '_adminPouch',
        get: function get() {
            if (!this.__adminPouch) this.__adminPouch = _internalAdminPouch(this.name, this.adapter);
            return this.__adminPouch;
        }
    }, {
        key: '_collectionsPouch',
        get: function get() {
            if (!this.__collectionsPouch) this.__collectionsPouch = _internalCollectionsPouch(this.name, this.adapter);
            return this.__collectionsPouch;
        }
    }, {
        key: 'leaderElector',
        get: function get() {
            if (!this._leaderElector) this._leaderElector = _overwritable2['default'].createLeaderElector(this);
            return this._leaderElector;
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

/**
 * checks if an instance with same name and adapter already exists
 * @param       {string}  name
 * @param       {any}  adapter
 * @throws {RxError} if used
 */
function _isNameAdapterUsed(name, adapter) {
    if (!USED_COMBINATIONS[name]) return false;

    var used = false;
    USED_COMBINATIONS[name].forEach(function (ad) {
        if (ad === adapter) used = true;
    });
    if (used) {
        throw _rxError2['default'].newRxError('DB8', {
            name: name,
            adapter: adapter,
            link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
        });
    }
}

function _removeUsedCombination(name, adapter) {
    if (!USED_COMBINATIONS[name]) return;

    var index = USED_COMBINATIONS[name].indexOf(adapter);
    USED_COMBINATIONS[name].splice(index, 1);
}

function _spawnPouchDB2(dbName, adapter, collectionName, schemaVersion) {
    var pouchSettings = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    var pouchLocation = dbName + '-rxdb-' + schemaVersion + '-' + collectionName;
    var pouchDbParameters = {
        location: pouchLocation,
        adapter: util.adapterObject(adapter),
        settings: pouchSettings
    };
    (0, _hooks.runPluginHooks)('preCreatePouchDb', pouchDbParameters);
    return new _pouchDb2['default'](pouchDbParameters.location, pouchDbParameters.adapter, pouchDbParameters.settings);
}

function _internalAdminPouch(name, adapter) {
    return _spawnPouchDB2(name, adapter, '_admin', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    });
}

function _internalCollectionsPouch(name, adapter) {
    return _spawnPouchDB2(name, adapter, '_collections', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    });
}

;

function isInstanceOf(obj) {
    return obj instanceof RxDatabase;
}

function dbCount() {
    return DB_COUNT;
}

// TODO is this needed?
exports.RxSchema = _rxSchema2['default'];
exports['default'] = {
    create: create,
    removeDatabase: removeDatabase,
    checkAdapter: checkAdapter,
    isInstanceOf: isInstanceOf,
    RxDatabase: RxDatabase,
    RxSchema: _rxSchema2['default'],
    dbCount: dbCount
};
