'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PULL_TIME = exports.EVENT_TTL = exports.create = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var create = exports.create = function () {
    var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(database) {
        var socket;
        return _regenerator2.default.wrap(function _callee6$(_context6) {
            while (1) {
                switch (_context6.prev = _context6.next) {
                    case 0:
                        socket = new Socket(database);
                        _context6.next = 3;
                        return socket.prepare();

                    case 3:
                        return _context6.abrupt('return', socket);

                    case 4:
                    case 'end':
                        return _context6.stop();
                }
            }
        }, _callee6, this);
    }));

    return function create(_x3) {
        return _ref6.apply(this, arguments);
    };
}();

var _Database = require('./Database.schemas');

var DatabaseSchemas = _interopRequireWildcard(_Database);

var _RxCollection = require('./RxCollection');

var RxCollection = _interopRequireWildcard(_RxCollection);

var _RxChangeEvent = require('./RxChangeEvent');

var RxChangeEvent = _interopRequireWildcard(_RxChangeEvent);

var _RxBroadcastChannel = require('./RxBroadcastChannel');

var RxBroadcastChannel = _interopRequireWildcard(_RxBroadcastChannel);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EVENT_TTL = 5000; // after this age, events will be deleted
var PULL_TIME = RxBroadcastChannel.canIUse() ? EVENT_TTL / 2 : 200;

var Socket = function () {
    function Socket(database) {
        (0, _classCallCheck3.default)(this, Socket);

        this.database = database;
        this.token = database.token;
        this.collection;
        this.subs = [];

        this.pullCount = 0;
        this.pull_running = false;
        this.lastPull = new Date().getTime();
        this.recievedEvents = {};

        this.bc = RxBroadcastChannel.create(this.database, 'socket');
        this.messages$ = new util.Rx.Subject();
    }

    (0, _createClass3.default)(Socket, [{
        key: 'prepare',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                var _this = this;

                var autoPull;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return RxCollection.create(this.database, '_socket', DatabaseSchemas.socket, {
                                    auto_compaction: false, // this is false because its done manually at .pull()
                                    revs_limit: 1
                                });

                            case 2:
                                this.collection = _context.sent;


                                // pull on BroadcastChannel-message
                                if (this.bc) {
                                    this.subs.push(this.bc.$.filter(function (msg) {
                                        return msg.type == 'pull';
                                    }).subscribe(function (msg) {
                                        return _this.pull();
                                    }));
                                }

                                // pull on intervall
                                autoPull = util.Rx.Observable.interval(PULL_TIME).filter(function (c) {
                                    return _this.messages$.observers.length > 0;
                                }) // TODO replace with subject$.hasObservers() https://github.com/Reactive-Extensions/RxJS/issues/1364
                                .subscribe(function (x) {
                                    return _this.pull();
                                });

                                this.subs.push(autoPull);

                                return _context.abrupt('return');

                            case 7:
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
         * write the given event to the socket
         */

    }, {
        key: 'write',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(changeEvent) {
                var socketDoc;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                socketDoc = changeEvent.toJSON();

                                delete socketDoc.db;
                                if (socketDoc.v) {
                                    if (this.database.password) socketDoc.v = this.database._encrypt(socketDoc.v);else socketDoc.v = JSON.stringify(socketDoc.v);
                                }

                                // TODO find a way to getAll on local documents
                                //  socketDoc._id = '_local/' + util.fastUnsecureHash(socketDoc);
                                socketDoc._id = '' + util.fastUnsecureHash(socketDoc) + socketDoc.t;
                                _context2.next = 6;
                                return this.collection.pouch.put(socketDoc);

                            case 6:
                                _context2.t0 = this.bc;

                                if (!_context2.t0) {
                                    _context2.next = 10;
                                    break;
                                }

                                _context2.next = 10;
                                return this.bc.write('pull');

                            case 10:
                                return _context2.abrupt('return', true);

                            case 11:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function write(_x) {
                return _ref2.apply(this, arguments);
            }

            return write;
        }()

        /**
         * get all docs from the socket-collection
         */

    }, {
        key: 'fetchDocs',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
                var result;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.collection.pouch.allDocs({
                                    include_docs: true
                                });

                            case 2:
                                result = _context3.sent;
                                return _context3.abrupt('return', result.rows.map(function (row) {
                                    return row.doc;
                                }));

                            case 4:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function fetchDocs() {
                return _ref3.apply(this, arguments);
            }

            return fetchDocs;
        }()
    }, {
        key: 'deleteDoc',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(doc) {
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.prev = 0;
                                _context4.next = 3;
                                return this.collection.pouch.remove(doc);

                            case 3:
                                _context4.next = 7;
                                break;

                            case 5:
                                _context4.prev = 5;
                                _context4.t0 = _context4['catch'](0);

                            case 7:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this, [[0, 5]]);
            }));

            function deleteDoc(_x2) {
                return _ref4.apply(this, arguments);
            }

            return deleteDoc;
        }()

        /**
         * grab all new events from the socket-pouchdb
         * and throw them into this.messages$
         */

    }, {
        key: 'pull',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5() {
                var _this2 = this;

                var minTime, docs, maxAge, delDocs;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                if (!this.isPulling) {
                                    _context5.next = 3;
                                    break;
                                }

                                this._repullAfter = true;
                                return _context5.abrupt('return', false);

                            case 3:
                                this.isPulling = true;
                                this.pullCount++;

                                minTime = this.lastPull - 100; // TODO evaluate this value (100)

                                _context5.next = 8;
                                return this.fetchDocs();

                            case 8:
                                docs = _context5.sent;

                                docs.filter(function (doc) {
                                    return doc.it != _this2.token;
                                }) // do not get events emitted by self
                                // do not get events older than minTime
                                .filter(function (doc) {
                                    return doc.t > minTime;
                                })
                                // sort timestamp
                                .sort(function (a, b) {
                                    if (a.t > b.t) return 1;
                                    return -1;
                                }).map(function (doc) {
                                    return RxChangeEvent.fromJSON(doc);
                                })
                                // make sure the same event is not emitted twice
                                .filter(function (cE) {
                                    if (_this2.recievedEvents[cE.hash()]) return false;
                                    return _this2.recievedEvents[cE.hash()] = new Date().getTime();
                                })
                                // prevent memory leak of this.recievedEvents
                                .filter(function (cE) {
                                    return setTimeout(function () {
                                        return delete _this2.recievedEvents[cE.hash()];
                                    }, EVENT_TTL * 3);
                                })
                                // decrypt if data.v is encrypted
                                .map(function (cE) {
                                    if (cE.data.v) {
                                        if (_this2.database.password) cE.data.v = _this2.database._decrypt(cE.data.v);else cE.data.v = JSON.parse(cE.data.v);
                                    }
                                    return cE;
                                })
                                // emit to messages
                                .forEach(function (cE) {
                                    return _this2.messages$.next(cE);
                                });

                                // delete old documents
                                maxAge = new Date().getTime() - EVENT_TTL;
                                delDocs = docs.filter(function (doc) {
                                    return doc.t < maxAge;
                                }).map(function (doc) {
                                    return _this2.deleteDoc(doc);
                                });

                                if (!(delDocs.length > 0)) {
                                    _context5.next = 15;
                                    break;
                                }

                                _context5.next = 15;
                                return this.collection.pouch.compact();

                            case 15:

                                this.lastPull = new Date().getTime();
                                this.isPulling = false;
                                if (this._repull) {
                                    this._repull = false;
                                    this.pull();
                                }
                                return _context5.abrupt('return', true);

                            case 19:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function pull() {
                return _ref5.apply(this, arguments);
            }

            return pull;
        }()
    }, {
        key: 'destroy',
        value: function destroy() {
            this.subs.map(function (sub) {
                return sub.unsubscribe();
            });
            if (this.bc) this.bc.destroy();
            this.collection.destroy();
        }
    }, {
        key: '$',
        get: function get() {
            return this.messages$.asObservable();
        }
    }]);
    return Socket;
}();

exports.EVENT_TTL = EVENT_TTL;
exports.PULL_TIME = PULL_TIME;