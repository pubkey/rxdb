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
    var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8(database) {
        var elector;
        return _regenerator2.default.wrap(function _callee8$(_context8) {
            while (1) {
                switch (_context8.prev = _context8.next) {
                    case 0:
                        elector = new RxDatabaseLeaderElector(database);
                        _context8.next = 3;
                        return elector.prepare();

                    case 3:
                        return _context8.abrupt('return', elector);

                    case 4:
                    case 'end':
                        return _context8.stop();
                }
            }
        }, _callee8, this);
    }));

    return function create(_x2) {
        return _ref8.apply(this, arguments);
    };
}();

var _RxChangeEvent = require('./RxChangeEvent');

var RxChangeEvent = _interopRequireWildcard(_RxChangeEvent);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _unload = require('unload');

var unload = _interopRequireWildcard(_unload);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * this handles the leader-election for the given RxDatabase-instance
 */
var RxDatabaseLeaderElector = function () {
    function RxDatabaseLeaderElector(database) {
        var _this = this;

        (0, _classCallCheck3.default)(this, RxDatabaseLeaderElector);


        // things that must be cleared ondestroy
        this.subs = [];
        this.unloads = [];

        this.database = database;
        this.deathLeaders = []; // tokens of death leaders
        this.isLeader = false;
        this.becomeLeader$ = new util.Rx.BehaviorSubject(this.isLeader);
        this.isDead = false;
        this.isApplying = false;
        this.socketMessages$ = database.observable$.filter(function (cEvent) {
            return cEvent.data.it != _this.database.token;
        }).filter(function (cEvent) {
            return cEvent.data.op.startsWith('Leader.');
        }).map(function (cEvent) {
            return {
                type: cEvent.data.op.split('.')[1],
                token: cEvent.data.it,
                time: cEvent.data.t
            };
        })
        // do not handle messages from death leaders
        .filter(function (m) {
            return !_this.deathLeaders.includes(m.token);
        }).do(function (m) {
            if (m.type == 'death') _this.deathLeaders.push(m.token);
        });

        this.tellSub = null;
        this.isWaiting = false;
    }

    (0, _createClass3.default)(RxDatabaseLeaderElector, [{
        key: 'prepare',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
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
         * @return {Promise} promise which resolve when the instance becomes leader
         */

    }, {
        key: 'waitForLeadership',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
                var _this2 = this;

                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this.isLeader) {
                                    _context2.next = 2;
                                    break;
                                }

                                return _context2.abrupt('return', Promise.resolve(true));

                            case 2:
                                if (!this.isWaiting) {
                                    this.isWaiting = true;

                                    // apply on death
                                    this.applySub = this.socketMessages$.filter(function (message) {
                                        return message.type == 'death';
                                    }).filter(function (m) {
                                        return !_this2.isLeader;
                                    }).subscribe(function (message) {
                                        return _this2.applyOnce();
                                    });
                                    this.subs.push(this.applySub);

                                    // apply on interval (backup when leader dies without message)
                                    this.backupApply = util.Rx.Observable.interval(5 * 1000) // TODO evaluate this time
                                    .subscribe(function (x) {
                                        return _this2.applyOnce();
                                    });
                                    this.subs.push(this.backupApply);

                                    // apply now
                                    this.applyOnce();
                                }

                                return _context2.abrupt('return', new Promise(function (res) {
                                    _this2.becomeSub = _this2.becomeLeader$.filter(function (i) {
                                        return i == true;
                                    }).subscribe(function (i) {
                                        return res();
                                    });
                                    _this2.subs.push(_this2.becomeSub);
                                }));

                            case 4:
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
         * send a leader-election message over the socket
         * @param {string} type (apply, death, tell)
         * apply: tells the others I want to be leader
         * death: tells the others I will die and they must elect a new leader
         * tell:  tells the others I am leader and they should not elect a new one
         */

    }, {
        key: 'socketMessage',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(type) {
                var changeEvent;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (['apply', 'death', 'tell'].includes(type)) {
                                    _context3.next = 2;
                                    break;
                                }

                                throw new Error('type ' + type + ' is not valid');

                            case 2:
                                changeEvent = RxChangeEvent.create('Leader.' + type, this.database);
                                _context3.next = 5;
                                return this.database.writeToSocket(changeEvent);

                            case 5:
                                return _context3.abrupt('return', true);

                            case 6:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function socketMessage(_x) {
                return _ref3.apply(this, arguments);
            }

            return socketMessage;
        }()

        /**
         * assigns leadership to this instance
         */

    }, {
        key: 'beLeader',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
                var _this3 = this;

                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                this.isLeader = true;
                                this.becomeLeader$.next(true);

                                // reply to 'apply'-messages
                                this.tellSub = this.socketMessages$.filter(function (message) {
                                    return message.type == 'apply';
                                }).subscribe(function (message) {
                                    return _this3.socketMessage('tell');
                                });
                                this.subs.push(this.tellSub);

                                // send 'death' when process exits
                                this.unloads.push(unload.add(function () {
                                    return _this3.die();
                                }));

                                _context4.next = 7;
                                return this.socketMessage('tell');

                            case 7:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function beLeader() {
                return _ref4.apply(this, arguments);
            }

            return beLeader;
        }()
    }, {
        key: 'die',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5() {
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                if (this.isLeader) {
                                    _context5.next = 2;
                                    break;
                                }

                                return _context5.abrupt('return');

                            case 2:
                                this.isDead = true;
                                this.isLeader = false;
                                this.tellSub.unsubscribe();
                                _context5.next = 7;
                                return this.socketMessage('death');

                            case 7:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function die() {
                return _ref5.apply(this, arguments);
            }

            return die;
        }()

        /**
         * starts applying for leadership
         */

    }, {
        key: 'applyOnce',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
                var _this4 = this;

                var startTime, sub, sub2, tries;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                if (!this.isDead) {
                                    _context6.next = 2;
                                    break;
                                }

                                return _context6.abrupt('return');

                            case 2:
                                if (!this.isLeader) {
                                    _context6.next = 4;
                                    break;
                                }

                                return _context6.abrupt('return');

                            case 4:
                                if (!this.isApplying) {
                                    _context6.next = 6;
                                    break;
                                }

                                return _context6.abrupt('return');

                            case 6:

                                this.isApplying = true;
                                startTime = new Date().getTime();

                                /*        this.socketMessages$.subscribe(m => {
                                            console.log('aaaaa:');
                                            console.dir(m);
                                        });*/

                                // stop applying when other is leader

                                sub = this.socketMessages$.filter(function (m) {
                                    return m.type == 'tell';
                                }).filter(function (m) {
                                    return m.time > startTime;
                                }).subscribe(function (message) {
                                    return _this4.isApplying = false;
                                });

                                // stop applyling when better is applying (higher lexixal token)

                                sub2 = this.socketMessages$.filter(function (m) {
                                    return m.type == 'apply';
                                }).filter(function (m) {
                                    return m.time > startTime;
                                }).filter(function (m) {
                                    return _this4.database.token < m.token;
                                }).subscribe(function (m) {
                                    return _this4.isApplying = false;
                                });
                                tries = 0;

                            case 11:
                                if (!(tries < 3 && this.isApplying)) {
                                    _context6.next = 19;
                                    break;
                                }

                                tries++;
                                _context6.next = 15;
                                return this.socketMessage('apply');

                            case 15:
                                _context6.next = 17;
                                return util.promiseWait(this.database.socketRoundtripTime);

                            case 17:
                                _context6.next = 11;
                                break;

                            case 19:
                                _context6.next = 21;
                                return this.database.$pull();

                            case 21:
                                _context6.next = 23;
                                return util.promiseWait(50);

                            case 23:

                                sub.unsubscribe();
                                sub2.unsubscribe();

                                if (!this.isApplying) {
                                    _context6.next = 28;
                                    break;
                                }

                                _context6.next = 28;
                                return this.beLeader();

                            case 28:
                                this.isApplying = false;

                            case 29:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function applyOnce() {
                return _ref6.apply(this, arguments);
            }

            return applyOnce;
        }()
    }, {
        key: 'destroy',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7() {
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                this.subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });
                                this.unloads.map(function (fn) {
                                    return fn();
                                });
                                this.die();

                            case 3:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function destroy() {
                return _ref7.apply(this, arguments);
            }

            return destroy;
        }()
    }]);
    return RxDatabaseLeaderElector;
}();