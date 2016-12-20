'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.SIGNAL_TIME = exports.documentID = exports.create = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var create = exports.create = function () {
    var _ref13 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee13(database) {
        var elector;
        return _regenerator2.default.wrap(function _callee13$(_context13) {
            while (1) {
                switch (_context13.prev = _context13.next) {
                    case 0:
                        elector = new LeaderElector(database);
                        _context13.next = 3;
                        return elector.prepare();

                    case 3:
                        return _context13.abrupt('return', elector);

                    case 4:
                    case 'end':
                        return _context13.stop();
                }
            }
        }, _callee13, this);
    }));

    return function create(_x2) {
        return _ref13.apply(this, arguments);
    };
}();

var _unload = require('unload');

var unload = _interopRequireWildcard(_unload);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxChangeEvent = require('./RxChangeEvent');

var RxChangeEvent = _interopRequireWildcard(_RxChangeEvent);

var _RxBroadcastChannel = require('./RxBroadcastChannel');

var RxBroadcastChannel = _interopRequireWildcard(_RxBroadcastChannel);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * this handles the leader-election for the given RxDatabase-instance
 */

var documentID = '_local/leader';
var SIGNAL_TIME = 500; // TODO evaluate this time

var LeaderElector = function () {
    function LeaderElector(database) {
        (0, _classCallCheck3.default)(this, LeaderElector);


        // things that must be cleared on destroy
        this.subs = [];
        this.unloads = [];

        this.database = database;
        this.token = this.database.token;

        this.isLeader = false;
        this.becomeLeader$ = new util.Rx.BehaviorSubject({
            isLeader: false
        });

        this.isDead = false;
        this.isApplying = false;
        this.isWaiting = false;

        this.bc = RxBroadcastChannel.create(this.database, 'leader');
        this.electionChannel = this.bc ? 'broadcast' : 'socket';
    }

    (0, _createClass3.default)(LeaderElector, [{
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
                _id: documentID,
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
                                return this.database.administrationCollection.pouch.get(documentID);

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
                var elected;
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

                                _context4.next = 9;
                                return this['apply_' + this.electionChannel]();

                            case 9:
                                elected = _context4.sent;

                                if (!elected) {
                                    _context4.next = 13;
                                    break;
                                }

                                _context4.next = 13;
                                return this.beLeader();

                            case 13:

                                this.isApplying = false;
                                return _context4.abrupt('return', true);

                            case 15:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function applyOnce() {
                return _ref4.apply(this, arguments);
            }

            return applyOnce;
        }()

        /**
         * apply via socket
         * (critical on chrome with indexedDB due to write-locks)
         */

    }, {
        key: 'apply_socket',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5() {
                var leaderObj, minTime;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.prev = 0;
                                _context5.next = 3;
                                return this.getLeaderObject();

                            case 3:
                                leaderObj = _context5.sent;
                                minTime = new Date().getTime() - SIGNAL_TIME * 2;

                                if (!(leaderObj.t >= minTime)) {
                                    _context5.next = 7;
                                    break;
                                }

                                throw new Error('someone else is applying/leader');

                            case 7:
                                // write applying to db
                                leaderObj.apply = this.token;
                                leaderObj.t = new Date().getTime();
                                _context5.next = 11;
                                return this.setLeaderObject(leaderObj);

                            case 11:
                                _context5.next = 13;
                                return util.promiseWait(SIGNAL_TIME * 0.5);

                            case 13:
                                _context5.next = 15;
                                return this.getLeaderObject();

                            case 15:
                                leaderObj = _context5.sent;

                                if (!(leaderObj.apply != this.token)) {
                                    _context5.next = 18;
                                    break;
                                }

                                throw new Error('someone else overwrote apply');

                            case 18:
                                return _context5.abrupt('return', true);

                            case 21:
                                _context5.prev = 21;
                                _context5.t0 = _context5['catch'](0);
                                return _context5.abrupt('return', false);

                            case 24:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this, [[0, 21]]);
            }));

            function apply_socket() {
                return _ref5.apply(this, arguments);
            }

            return apply_socket;
        }()

        /**
         * apply via BroadcastChannel-API
         * (better performance than socket)
         */

    }, {
        key: 'apply_broadcast',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7() {
                var _this = this;

                var applyTime, subs, errors, whileNoError, ret;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                applyTime = new Date().getTime();
                                subs = [];
                                errors = [];

                                whileNoError = function () {
                                    var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
                                        var circles;
                                        return _regenerator2.default.wrap(function _callee6$(_context6) {
                                            while (1) {
                                                switch (_context6.prev = _context6.next) {
                                                    case 0:
                                                        subs.push(_this.bc.$.filter(function (msg) {
                                                            return !!_this.isApplying;
                                                        }).filter(function (msg) {
                                                            return msg.t >= applyTime;
                                                        }).filter(function (msg) {
                                                            return msg.type == 'apply';
                                                        }).filter(function (msg) {
                                                            if (msg.data < applyTime || msg.data == applyTime && msg.it > _this.token) return true;else return false;
                                                        }).filter(function (msg) {
                                                            return errors.length < 1;
                                                        }).subscribe(function (msg) {
                                                            return errors.push('other is applying:' + msg.it);
                                                        }));
                                                        subs.push(_this.bc.$.filter(function (msg) {
                                                            return !!_this.isApplying;
                                                        }).filter(function (msg) {
                                                            return msg.t >= applyTime;
                                                        }).filter(function (msg) {
                                                            return msg.type == 'tell';
                                                        }).filter(function (msg) {
                                                            return errors.length < 1;
                                                        }).subscribe(function (msg) {
                                                            return errors.push('other is leader' + msg.it);
                                                        }));
                                                        subs.push(_this.bc.$.filter(function (msg) {
                                                            return !!_this.isApplying;
                                                        }).filter(function (msg) {
                                                            return msg.type == 'apply';
                                                        }).filter(function (msg) {
                                                            if (msg.data > applyTime || msg.data == applyTime && msg.it > _this.token) return true;else return false;
                                                        }).subscribe(function (msg) {
                                                            return _this.bc.write('apply', applyTime);
                                                        }));

                                                        circles = 3;

                                                    case 4:
                                                        if (!(circles > 0)) {
                                                            _context6.next = 14;
                                                            break;
                                                        }

                                                        circles--;
                                                        _context6.next = 8;
                                                        return _this.bc.write('apply', applyTime);

                                                    case 8:
                                                        _context6.next = 10;
                                                        return util.promiseWait(300);

                                                    case 10:
                                                        if (!(errors.length > 0)) {
                                                            _context6.next = 12;
                                                            break;
                                                        }

                                                        return _context6.abrupt('return', false);

                                                    case 12:
                                                        _context6.next = 4;
                                                        break;

                                                    case 14:
                                                        return _context6.abrupt('return', true);

                                                    case 15:
                                                    case 'end':
                                                        return _context6.stop();
                                                }
                                            }
                                        }, _callee6, _this);
                                    }));

                                    return function whileNoError() {
                                        return _ref7.apply(this, arguments);
                                    };
                                }();

                                _context7.next = 6;
                                return whileNoError();

                            case 6:
                                ret = _context7.sent;

                                subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });
                                return _context7.abrupt('return', ret);

                            case 9:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function apply_broadcast() {
                return _ref6.apply(this, arguments);
            }

            return apply_broadcast;
        }()
    }, {
        key: 'leaderSignal',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
                var success, leaderObj;
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                if (!this.leaderSignal_run) {
                                    _context8.next = 2;
                                    break;
                                }

                                return _context8.abrupt('return');

                            case 2:
                                this.leaderSignal_run = true;

                                _context8.t0 = this.electionChannel;
                                _context8.next = _context8.t0 === 'broadcast' ? 6 : _context8.t0 === 'socket' ? 9 : 29;
                                break;

                            case 6:
                                _context8.next = 8;
                                return this.bc.write('tell');

                            case 8:
                                return _context8.abrupt('break', 29);

                            case 9:
                                success = false;

                            case 10:
                                if (success) {
                                    _context8.next = 28;
                                    break;
                                }

                                _context8.prev = 11;
                                _context8.next = 14;
                                return this.getLeaderObject();

                            case 14:
                                leaderObj = _context8.sent;

                                leaderObj.is = this.token;
                                leaderObj.apply = this.token;
                                leaderObj.t = new Date().getTime();
                                _context8.next = 20;
                                return this.setLeaderObject(leaderObj);

                            case 20:
                                success = true;
                                _context8.next = 26;
                                break;

                            case 23:
                                _context8.prev = 23;
                                _context8.t1 = _context8['catch'](11);

                                console.dir(_context8.t1);

                            case 26:
                                _context8.next = 10;
                                break;

                            case 28:
                                return _context8.abrupt('break', 29);

                            case 29:

                                this.leaderSignal_run = false;
                                return _context8.abrupt('return');

                            case 31:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this, [[11, 23]]);
            }));

            function leaderSignal() {
                return _ref8.apply(this, arguments);
            }

            return leaderSignal;
        }()

        /**
         * assigns leadership to this instance
         */

    }, {
        key: 'beLeader',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9() {
                var _this2 = this;

                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                if (!this.isDead) {
                                    _context9.next = 2;
                                    break;
                                }

                                return _context9.abrupt('return', false);

                            case 2:
                                if (!this.isLeader) {
                                    _context9.next = 4;
                                    break;
                                }

                                return _context9.abrupt('return', false);

                            case 4:
                                this.isLeader = true;

                                this.becomeLeader$.next({
                                    isLeader: true
                                });

                                this.applyInterval && this.applyInterval.unsubscribe();
                                _context9.next = 9;
                                return this.leaderSignal();

                            case 9:
                                _context9.t0 = this.electionChannel;
                                _context9.next = _context9.t0 === 'broadcast' ? 12 : _context9.t0 === 'socket' ? 15 : 18;
                                break;

                            case 12:
                                this.signalLeadership = this.bc.$.filter(function (m) {
                                    return !!_this2.isLeader;
                                })
                                // BUGFIX: avoids loop-hole when for whatever reason 2 are leader
                                .filter(function (msg) {
                                    return msg.type != 'tell';
                                }).subscribe(function (msg) {
                                    return _this2.leaderSignal();
                                });
                                this.subs.push(this.signalLeadership);
                                return _context9.abrupt('break', 18);

                            case 15:
                                this.signalLeadership = util.Rx.Observable.interval(SIGNAL_TIME).filter(function (m) {
                                    return !!_this2.isLeader;
                                }).subscribe(function () {
                                    return _this2.leaderSignal();
                                });
                                this.subs.push(this.signalLeadership);
                                return _context9.abrupt('break', 18);

                            case 18:

                                // this.die() on unload
                                this.unloads.push(unload.add(function () {
                                    _this2.bc.write('death');
                                    _this2.die();
                                }));
                                return _context9.abrupt('return', true);

                            case 20:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function beLeader() {
                return _ref9.apply(this, arguments);
            }

            return beLeader;
        }()
    }, {
        key: 'die',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10() {
                var success, leaderObj;
                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                if (this.isLeader) {
                                    _context10.next = 2;
                                    break;
                                }

                                return _context10.abrupt('return', false);

                            case 2:
                                if (!this.isDead) {
                                    _context10.next = 4;
                                    break;
                                }

                                return _context10.abrupt('return', false);

                            case 4:
                                this.isDead = true;
                                this.isLeader = false;
                                this.signalLeadership.unsubscribe();

                                // force.write to db
                                _context10.t0 = this.electionChannel;
                                _context10.next = _context10.t0 === 'broadcast' ? 10 : _context10.t0 === 'socket' ? 13 : 30;
                                break;

                            case 10:
                                _context10.next = 12;
                                return this.bc.write('death');

                            case 12:
                                return _context10.abrupt('break', 30);

                            case 13:
                                success = false;

                            case 14:
                                if (success) {
                                    _context10.next = 29;
                                    break;
                                }

                                _context10.prev = 15;
                                _context10.next = 18;
                                return this.getLeaderObject();

                            case 18:
                                leaderObj = _context10.sent;

                                leaderObj.t = 0;
                                _context10.next = 22;
                                return this.setLeaderObject(leaderObj);

                            case 22:
                                success = true;
                                _context10.next = 27;
                                break;

                            case 25:
                                _context10.prev = 25;
                                _context10.t1 = _context10['catch'](15);

                            case 27:
                                _context10.next = 14;
                                break;

                            case 29:
                                return _context10.abrupt('break', 30);

                            case 30:
                                return _context10.abrupt('return', true);

                            case 31:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this, [[15, 25]]);
            }));

            function die() {
                return _ref10.apply(this, arguments);
            }

            return die;
        }()

        /**
         * @return {Promise} promise which resolve when the instance becomes leader
         */

    }, {
        key: 'waitForLeadership',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee11() {
                var _this3 = this;

                var subs;
                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                if (!this.isLeader) {
                                    _context11.next = 2;
                                    break;
                                }

                                return _context11.abrupt('return', Promise.resolve(true));

                            case 2:
                                subs = [];

                                if (this.isWaiting) {
                                    _context11.next = 14;
                                    break;
                                }

                                this.isWaiting = true;

                                // apply now
                                this.applyOnce();

                                _context11.t0 = this.electionChannel;
                                _context11.next = _context11.t0 === 'broadcast' ? 9 : _context11.t0 === 'socket' ? 11 : 14;
                                break;

                            case 9:
                                this.subs.push(this.bc.$.filter(function (msg) {
                                    return msg.type == 'death';
                                }).subscribe(function (msg) {
                                    return _this3.applyOnce();
                                }));
                                return _context11.abrupt('break', 14);

                            case 11:
                                // apply on interval
                                this.applyInterval = util.Rx.Observable.interval(SIGNAL_TIME * 2).subscribe(function (x) {
                                    return _this3.applyOnce();
                                });
                                this.subs.push(this.applyInterval);
                                return _context11.abrupt('break', 14);

                            case 14:
                                return _context11.abrupt('return', new Promise(function (res) {
                                    var sub = _this3.becomeLeader$.asObservable().filter(function (i) {
                                        return i.isLeader == true;
                                    }).first().subscribe(function (i) {
                                        sub.unsubscribe();
                                        res();
                                    });
                                }));

                            case 15:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function waitForLeadership() {
                return _ref11.apply(this, arguments);
            }

            return waitForLeadership;
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
                                this.unloads.map(function (fn) {
                                    return fn();
                                });
                                _context12.next = 4;
                                return this.die();

                            case 4:
                                this.bc && this.bc.destroy();

                            case 5:
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
    }]);
    return LeaderElector;
}();

exports.documentID = documentID;
exports.SIGNAL_TIME = SIGNAL_TIME;