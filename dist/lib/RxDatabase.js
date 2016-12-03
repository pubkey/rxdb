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

    return function create(_x12, _x13, _x14, _x15) {
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

var _PouchDB = require('./PouchDB');

var _PouchDB2 = _interopRequireDefault(_PouchDB);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RxDatabase = function () {
    function RxDatabase(prefix, adapter, password) {
        var _this = this;

        var multiInstance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
        (0, _classCallCheck3.default)(this, RxDatabase);
        this._cleanSocket_running = false;

        this.prefix = prefix;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;

        this.token = (0, _randomToken2.default)(10);

        // cache for collection-objects
        this.collections = {};

        // rx
        this.pull$Count = 0;
        this.subject = new util.Rx.Subject();
        this.observable$ = this.subject.asObservable().filter(function (cEvent) {
            return cEvent.constructor.name == 'RxChangeEvent';
        });

        this.isPulling = false;
        this.lastPull = new Date().getTime();
        this.recievedEvents = {};
        this.autoPull$;
        if (this.multiInstance) {

            var pullTime = 200;

            // BroadcastChannel
            if (util.hasBroadcastChannel()) {
                pullTime = 1000;
                this.bc$ = new BroadcastChannel('RxDB:' + this.prefix);
                this.bc$.onmessage = function (msg) {
                    if (msg.data != _this.token) _this.$pull();
                };
            }

            // pull on intervall
            this.autoPull$ = util.Rx.Observable.interval(pullTime) // TODO evaluate pullTime value or make it settable
            .subscribe(function (x) {
                return _this.$pull();
            });
        }
    }

    /**
     * make the async things for this database
     */


    (0, _createClass3.default)(RxDatabase, [{
        key: 'prepare',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                var _this2 = this;

                var pwHashDoc;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return Promise.all([
                                // create admin-collection
                                RxCollection.create(this, '_admin', DatabaseSchemas.administration, {
                                    auto_compaction: true
                                }).then(function (col) {
                                    return _this2.administrationCollection = col;
                                }),
                                // create collections-collection
                                RxCollection.create(this, '_collections', DatabaseSchemas.collections).then(function (col) {
                                    return _this2.collectionsCollection = col;
                                }),
                                // create socket-collection
                                RxCollection.create(this, '_socket', DatabaseSchemas.socket).then(function (col) {
                                    return _this2.socketCollection = col;
                                })]);

                            case 2:
                                _context.next = 4;
                                return this.administrationCollection.findOne({
                                    key: 'pwHash'
                                }).exec();

                            case 4:
                                pwHashDoc = _context.sent;

                                if (!(!pwHashDoc && this.password)) {
                                    _context.next = 8;
                                    break;
                                }

                                _context.next = 8;
                                return this.administrationCollection.insert({
                                    key: 'pwHash',
                                    value: util.hash(this.password)
                                });

                            case 8:
                                if (!(pwHashDoc && this.password && util.hash(this.password) != pwHashDoc.get('value'))) {
                                    _context.next = 10;
                                    break;
                                }

                                throw new Error('another instance on this adapter has a different password');

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
        }()
    }, {
        key: '$emit',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(changeEvent) {
                var _this3 = this;

                var socketDoc, decideHash, decidedVal;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (changeEvent) {
                                    _context2.next = 2;
                                    break;
                                }

                                return _context2.abrupt('return');

                            case 2:

                                // throw in own cycle
                                this.subject.next(changeEvent);

                                // write to socket
                                if (this.multiInstance && !changeEvent.isIntern() && changeEvent.data.it == this.token) {
                                    socketDoc = changeEvent.toJSON();

                                    delete socketDoc.db;

                                    if (socketDoc.v) {
                                        if (this.password) socketDoc.v = this._encrypt(socketDoc.v);else socketDoc.v = JSON.stringify(socketDoc.v);
                                    }

                                    this.socketCollection.insert(socketDoc).then(function () {
                                        _this3.bc$ && _this3.bc$.postMessage(_this3.token);
                                    });

                                    /**
                                     * check if the cleanup of _socket should be run
                                     * this is decided with the hash to prevent that 2 instances
                                     * cleanup at the same time (not prevent but make more unlikely)
                                     */
                                    decideHash = util.fastUnsecureHash(this.token + changeEvent.hash());
                                    decidedVal = decideHash % 10;

                                    if (decidedVal == 0) this._cleanSocket();
                                }

                            case 4:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function $emit(_x2) {
                return _ref2.apply(this, arguments);
            }

            return $emit;
        }()

        /**
         * @return {Observable} observable
         */

    }, {
        key: '_cleanSocket',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
                var maxTime, socketDocs;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (!this._cleanSocket_running) {
                                    _context3.next = 2;
                                    break;
                                }

                                return _context3.abrupt('return');

                            case 2:
                                this._cleanSocket_running = true;

                                maxTime = new Date().getTime() - 1200;
                                _context3.next = 6;
                                return this.socketCollection.find({
                                    t: {
                                        $lt: maxTime
                                    }
                                }).exec();

                            case 6:
                                socketDocs = _context3.sent;
                                _context3.next = 9;
                                return Promise.all(socketDocs.map(function (doc) {
                                    return doc.remove();
                                }));

                            case 9:

                                this._cleanSocket_running = false;

                            case 10:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function _cleanSocket() {
                return _ref3.apply(this, arguments);
            }

            return _cleanSocket;
        }()

        /**
         * triggers the grabbing of new events from other instances
         * from the socket
         */

    }, {
        key: '$pull',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
                var _this4 = this;

                var minTime;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                this.pull$Count++;
                                //        console.log('.....');

                                if (!(!this.subject || !this.socketCollection)) {
                                    _context4.next = 3;
                                    break;
                                }

                                return _context4.abrupt('return');

                            case 3:
                                if (!this.isPulling) {
                                    _context4.next = 6;
                                    break;
                                }

                                /**
                                 * if pull is called again while running,
                                 * it can happen that the change wont be noticed until the next
                                 * pull-cycle. This will ensure than in this case pull$ is called again
                                 */
                                this._repull = true;
                                return _context4.abrupt('return');

                            case 6:
                                this.isPulling = true;

                                minTime = this.lastPull - 50; // TODO evaluate this value (50)

                                _context4.next = 10;
                                return this.socketCollection.find({
                                    it: {
                                        $ne: this.token
                                    },
                                    t: {
                                        $gt: minTime
                                    }
                                }).exec()
                                // sort docs by timestamp
                                .then(function (docs) {
                                    return docs.sort(function (a, b) {
                                        if (a.data.t > b.data.t) return 1;
                                        return -1;
                                    });
                                }).then(function (eventDocs) {
                                    eventDocs.map(function (doc) {
                                        return RxChangeEvent.fromJSON(doc.data);
                                    })
                                    // make sure the same event is not emitted twice
                                    .filter(function (cE) {
                                        if (_this4.recievedEvents[cE.hash()]) return false;
                                        return _this4.recievedEvents[cE.hash()] = new Date().getTime();
                                    })
                                    // prevent memory leak of this.recievedEvents
                                    .filter(function (cE) {
                                        return setTimeout(function () {
                                            return delete _this4.recievedEvents[cE.hash()];
                                        }, 20 * 1000);
                                    })
                                    // decrypt if data.v is encrypted
                                    .map(function (cE) {
                                        if (cE.data.v) {
                                            if (_this4.password) cE.data.v = _this4._decrypt(cE.data.v);else cE.data.v = JSON.parse(cE.data.v);
                                        }
                                        return cE;
                                    }).forEach(function (cE) {
                                        return _this4.$emit(cE);
                                    });
                                });

                            case 10:

                                this.lastPull = new Date().getTime();
                                this.isPulling = false;

                                if (this._repull) {
                                    this._repull = false;
                                    this.$pull();
                                }
                                return _context4.abrupt('return', true);

                            case 14:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function $pull() {
                return _ref4.apply(this, arguments);
            }

            return $pull;
        }()
    }, {
        key: '_encrypt',
        value: function _encrypt(value) {
            if (!this.password) throw new Error('no passord given');
            return util.encrypt(JSON.stringify(value), this.password);
        }
    }, {
        key: '_decrypt',
        value: function _decrypt(encValue) {
            if (!this.password) throw new Error('no passord given');
            var decrypted = util.decrypt(encValue, this.password);
            return JSON.parse(decrypted);
        }

        /**
         * create or fetch a collection
         * @return {Collection}
         */

    }, {
        key: 'collection',
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
                                    _context5.next = 25;
                                    break;
                                }

                                // check schemaHash
                                schemaHash = schema.hash();
                                _context5.next = 7;
                                return this.collectionsCollection.findOne({
                                    name: name
                                }).exec();

                            case 7:
                                collectionDoc = _context5.sent;

                                if (!(collectionDoc && collectionDoc.get('schemaHash') != schemaHash)) {
                                    _context5.next = 10;
                                    break;
                                }

                                throw new Error('collection(' + name + '): another instance created this collection with a different schema');

                            case 10:
                                _context5.next = 12;
                                return RxCollection.create(this, name, schema, pouchSettings);

                            case 12:
                                _collection = _context5.sent;

                                if (!(Object.keys(_collection.schema.getEncryptedPaths()).length > 0 && !this.password)) {
                                    _context5.next = 15;
                                    break;
                                }

                                throw new Error('collection(' + name + '): schema encrypted but no password given');

                            case 15:
                                if (collectionDoc) {
                                    _context5.next = 18;
                                    break;
                                }

                                _context5.next = 18;
                                return this.collectionsCollection.insert({
                                    name: name,
                                    schemaHash: schemaHash
                                });

                            case 18:
                                cEvent = RxChangeEvent.create('RxDatabase.collection', this);

                                cEvent.data.v = _collection.name;
                                cEvent.data.col = '_collections';
                                this.$emit(cEvent);

                                this.collections[name] = _collection;
                                _context5.next = 27;
                                break;

                            case 25:
                                if (!(schema && schema.hash() != this.collections[name].schema.hash())) {
                                    _context5.next = 27;
                                    break;
                                }

                                throw new Error('collection(' + name + '): already has a different schema');

                            case 27:
                                return _context5.abrupt('return', this.collections[name]);

                            case 28:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function collection(_x3, _x4, _x5) {
                return _ref5.apply(this, arguments);
            }

            return collection;
        }()
    }, {
        key: 'destroy',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                this.bc$.close();

                            case 1:
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
         * export to json
         * @param {boolean} decrypted
         * @param {?string[]} collections array with collectionNames or null if all
         */

    }, {
        key: 'dump',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7() {
                var _this5 = this;

                var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
                var collections = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var json, useCollections;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
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
                                    return _this5.collections[colName];
                                });
                                _context7.next = 5;
                                return Promise.all(useCollections.map(function (col) {
                                    return col.dump(decrypted);
                                }));

                            case 5:
                                json.collections = _context7.sent;
                                return _context7.abrupt('return', json);

                            case 7:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function dump(_x7, _x8) {
                return _ref7.apply(this, arguments);
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
            var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8(dump) {
                var _this6 = this;

                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                return _context8.abrupt('return', Promise.all(dump.collections.filter(function (colDump) {
                                    return _this6.collections[colDump.name];
                                }).map(function (colDump) {
                                    return _this6.collections[colDump.name].importDump(colDump);
                                })));

                            case 1:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function importDump(_x11) {
                return _ref8.apply(this, arguments);
            }

            return importDump;
        }()
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