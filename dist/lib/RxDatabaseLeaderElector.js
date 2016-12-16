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
    var _ref10 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10(database) {
        var elector;
        return _regenerator2.default.wrap(function _callee10$(_context10) {
            while (1) {
                switch (_context10.prev = _context10.next) {
                    case 0:
                        elector = new RxDatabaseLeaderElector(database);
                        _context10.next = 3;
                        return elector.prepare();

                    case 3:
                        return _context10.abrupt('return', elector);

                    case 4:
                    case 'end':
                        return _context10.stop();
                }
            }
        }, _callee10, this);
    }));

    return function create(_x2) {
        return _ref10.apply(this, arguments);
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
        (0, _classCallCheck3.default)(this, RxDatabaseLeaderElector);


        // things that must be cleared ondestroy
        this.subs = [];
        this.unloads = [];

        this.database = database;
        this.id = this.database.token;

        this.isLeader = false;
        this.becomeLeader$ = new util.Rx.BehaviorSubject(this.isLeader);
        this.isDead = false;
        this.isApplying = false;
        this.isWaiting = false;

        this.signalTime = 500; // TODO evaluate this time
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
    }, {
        key: 'createLeaderObject',
        value: function createLeaderObject() {
            return {
                _id: 'leader',
                is: '', // token of leader-instance
                apply: '', // token of applying instance
                t: 0 // time when the leader send a signal the last time
            };
        }
    }, {
        key: 'getLeaderObject',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
                var obj, ret;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                obj = void 0;
                                _context2.prev = 1;
                                _context2.next = 4;
                                return this.database.administrationCollection.pouch.get('leader');

                            case 4:
                                obj = _context2.sent;
                                _context2.next = 14;
                                break;

                            case 7:
                                _context2.prev = 7;
                                _context2.t0 = _context2['catch'](1);

                                obj = this.createLeaderObject();
                                _context2.next = 12;
                                return this.database.administrationCollection.pouch.put(obj);

                            case 12:
                                ret = _context2.sent;

                                obj._rev = ret.rev;

                            case 14:
                                return _context2.abrupt('return', obj);

                            case 15:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this, [[1, 7]]);
            }));

            function getLeaderObject() {
                return _ref2.apply(this, arguments);
            }

            return getLeaderObject;
        }()
    }, {
        key: 'setLeaderObject',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(newObj) {
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.database.administrationCollection.pouch.put(newObj);

                            case 2:
                                return _context3.abrupt('return');

                            case 3:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function setLeaderObject(_x) {
                return _ref3.apply(this, arguments);
            }

            return setLeaderObject;
        }()

        /**
         * starts applying for leadership
         */

    }, {
        key: 'applyOnce',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
                var leaderObj, minTime;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                if (!this.isLeader) {
                                    _context4.next = 2;
                                    break;
                                }

                                return _context4.abrupt('return', false);

                            case 2:
                                if (!this.isDead) {
                                    _context4.next = 4;
                                    break;
                                }

                                return _context4.abrupt('return', false);

                            case 4:
                                if (!this.isApplying) {
                                    _context4.next = 6;
                                    break;
                                }

                                return _context4.abrupt('return', false);

                            case 6:
                                this.isApplying = true;

                                //        console.log('start applying');

                                _context4.prev = 7;
                                _context4.next = 10;
                                return this.getLeaderObject();

                            case 10:
                                leaderObj = _context4.sent;
                                minTime = new Date().getTime() - this.signalTime * 2;

                                if (!(leaderObj.t >= minTime)) {
                                    _context4.next = 14;
                                    break;
                                }

                                throw new Error('someone else is applying/leader');

                            case 14:

                                // write applying to db
                                leaderObj.apply = this.id;
                                leaderObj.t = new Date().getTime();
                                _context4.next = 18;
                                return this.setLeaderObject(leaderObj);

                            case 18:
                                _context4.next = 20;
                                return util.promiseWait(this.signalTime * 0.5);

                            case 20:
                                _context4.next = 22;
                                return this.getLeaderObject();

                            case 22:
                                leaderObj = _context4.sent;

                                if (!(leaderObj.apply != this.id)) {
                                    _context4.next = 25;
                                    break;
                                }

                                throw new Error('someone else overwrote apply');

                            case 25:

                                // write once again to ensure no update-conflict
                                leaderObj.t = new Date().getTime();
                                _context4.next = 28;
                                return this.setLeaderObject(leaderObj);

                            case 28:
                                _context4.next = 30;
                                return this.beLeader();

                            case 30:
                                _context4.next = 34;
                                break;

                            case 32:
                                _context4.prev = 32;
                                _context4.t0 = _context4['catch'](7);

                            case 34:
                                this.isApplying = false;
                                return _context4.abrupt('return', true);

                            case 36:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this, [[7, 32]]);
            }));

            function applyOnce() {
                return _ref4.apply(this, arguments);
            }

            return applyOnce;
        }()
    }, {
        key: 'leaderSignal',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5() {
                var success, leaderObj;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                success = false;

                            case 1:
                                if (success) {
                                    _context5.next = 18;
                                    break;
                                }

                                _context5.prev = 2;
                                _context5.next = 5;
                                return this.getLeaderObject();

                            case 5:
                                leaderObj = _context5.sent;

                                leaderObj.is = this.id;
                                leaderObj.apply = this.id;
                                leaderObj.t = new Date().getTime();
                                _context5.next = 11;
                                return this.setLeaderObject(leaderObj);

                            case 11:
                                success = true;
                                _context5.next = 16;
                                break;

                            case 14:
                                _context5.prev = 14;
                                _context5.t0 = _context5['catch'](2);

                            case 16:
                                _context5.next = 1;
                                break;

                            case 18:
                                return _context5.abrupt('return');

                            case 19:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this, [[2, 14]]);
            }));

            function leaderSignal() {
                return _ref5.apply(this, arguments);
            }

            return leaderSignal;
        }()

        /**
         * assigns leadership to this instance
         */

    }, {
        key: 'beLeader',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
                var _this = this;

                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                if (!this.isDead) {
                                    _context6.next = 2;
                                    break;
                                }

                                return _context6.abrupt('return', false);

                            case 2:
                                if (!this.isLeader) {
                                    _context6.next = 4;
                                    break;
                                }

                                return _context6.abrupt('return', false);

                            case 4:
                                this.isLeader = true;
                                this.becomeLeader$.next(true);

                                this.applyInterval && this.applyInterval.unsubscribe();

                                _context6.next = 9;
                                return this.leaderSignal();

                            case 9:
                                this.signalLeadership = util.Rx.Observable.interval(this.signalTime).subscribe(function () {
                                    _this.leaderSignal();
                                });
                                this.subs.push(this.signalLeadership);
                                return _context6.abrupt('return', true);

                            case 12:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function beLeader() {
                return _ref6.apply(this, arguments);
            }

            return beLeader;
        }()
    }, {
        key: 'die',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7() {
                var success, leaderObj;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                if (this.isLeader) {
                                    _context7.next = 2;
                                    break;
                                }

                                return _context7.abrupt('return', false);

                            case 2:
                                if (!this.isDead) {
                                    _context7.next = 4;
                                    break;
                                }

                                return _context7.abrupt('return', false);

                            case 4:
                                this.isDead = true;
                                this.isLeader = false;
                                this.signalLeadership.unsubscribe();

                                // force.write to db
                                success = false;

                            case 8:
                                if (success) {
                                    _context7.next = 23;
                                    break;
                                }

                                _context7.prev = 9;
                                _context7.next = 12;
                                return this.getLeaderObject();

                            case 12:
                                leaderObj = _context7.sent;

                                leaderObj.t = 0;
                                _context7.next = 16;
                                return this.setLeaderObject(leaderObj);

                            case 16:
                                success = true;
                                _context7.next = 21;
                                break;

                            case 19:
                                _context7.prev = 19;
                                _context7.t0 = _context7['catch'](9);

                            case 21:
                                _context7.next = 8;
                                break;

                            case 23:
                                return _context7.abrupt('return', true);

                            case 24:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this, [[9, 19]]);
            }));

            function die() {
                return _ref7.apply(this, arguments);
            }

            return die;
        }()

        /**
         * @return {Promise} promise which resolve when the instance becomes leader
         */

    }, {
        key: 'waitForLeadership',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
                var _this2 = this;

                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                if (!this.isLeader) {
                                    _context8.next = 2;
                                    break;
                                }

                                return _context8.abrupt('return', Promise.resolve(true));

                            case 2:
                                if (!this.isWaiting) {
                                    this.isWaiting = true;
                                    // TODO emit socketMessage on die() and subscribe here to it

                                    // apply on interval
                                    this.applyInterval = util.Rx.Observable.interval(this.signalTime).subscribe(function (x) {
                                        return _this2.applyOnce();
                                    });
                                    this.subs.push(this.applyInterval);

                                    // apply now
                                    this.applyOnce();
                                }

                                return _context8.abrupt('return', new Promise(function (res) {
                                    _this2.becomeSub = _this2.becomeLeader$.filter(function (i) {
                                        return i == true;
                                    }).subscribe(function (i) {
                                        return res();
                                    });
                                    _this2.subs.push(_this2.becomeSub);
                                }));

                            case 4:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function waitForLeadership() {
                return _ref8.apply(this, arguments);
            }

            return waitForLeadership;
        }()
    }, {
        key: 'destroy',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9() {
                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                this.subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });
                                this.unloads.map(function (fn) {
                                    return fn();
                                });
                                _context9.next = 4;
                                return this.die();

                            case 4:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function destroy() {
                return _ref9.apply(this, arguments);
            }

            return destroy;
        }()
    }]);
    return RxDatabaseLeaderElector;
}();