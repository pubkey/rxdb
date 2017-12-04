'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = exports.SIGNAL_TIME = exports.documentID = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

var _unload = require('unload');

var _unload2 = _interopRequireDefault(_unload);

var _util = require('../util');

var util = _interopRequireWildcard(_util);

var _rxBroadcastChannel = require('../rx-broadcast-channel');

var _rxBroadcastChannel2 = _interopRequireDefault(_rxBroadcastChannel);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _BehaviorSubject = require('rxjs/BehaviorSubject');

var _filter = require('rxjs/operators/filter');

var _first = require('rxjs/operators/first');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

var documentID = exports.documentID = '_local/leader';

/**
 * This time defines how 'fast' the communication between the instances is.
 * If this time is too low, it's possible that more than one instance becomes leader
 * If this time is too height, the leader-election takes longer than necessary
 * @type {Number} in milliseconds
 */
var SIGNAL_TIME = exports.SIGNAL_TIME = 500;

var LeaderElector = function () {
    function LeaderElector(database) {
        (0, _classCallCheck3['default'])(this, LeaderElector);

        this.destroyed = false;

        // things that must be cleared on destroy
        this.subs = [];
        this.unloads = [];

        this.database = database;
        this.token = this.database.token;

        this.isLeader = false;
        this.becomeLeader$ = new _BehaviorSubject.BehaviorSubject({
            isLeader: false
        });

        this.isDead = false;
        this.isApplying = false;
        this.isWaiting = false;

        this.bc = _rxBroadcastChannel2['default'].create(this.database, 'leader');
        this.electionChannel = this.bc ? 'broadcast' : 'socket';
    }

    (0, _createClass3['default'])(LeaderElector, [{
        key: 'createLeaderObject',
        value: function createLeaderObject() {
            return {
                _id: documentID,
                is: '', // token of leader-instance
                apply: '', // token of applying instance
                t: 0 // time when the leader send a signal the last time
            };
        }

        /**
         * returns the leader-document from the _adminPouch
         * @return {Promise<any>} leaderDoc
         */

    }, {
        key: 'getLeaderObject',
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                var obj, ret;
                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                obj = void 0;
                                _context.prev = 1;
                                _context.next = 4;
                                return this.database._adminPouch.get(documentID);

                            case 4:
                                obj = _context.sent;
                                _context.next = 14;
                                break;

                            case 7:
                                _context.prev = 7;
                                _context.t0 = _context['catch'](1);

                                obj = this.createLeaderObject();
                                _context.next = 12;
                                return this.database._adminPouch.put(obj);

                            case 12:
                                ret = _context.sent;

                                obj._rev = ret.rev;

                            case 14:
                                return _context.abrupt('return', obj);

                            case 15:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[1, 7]]);
            }));

            function getLeaderObject() {
                return _ref.apply(this, arguments);
            }

            return getLeaderObject;
        }()

        /**
         * saves the leader-object to the internal adminPouch
         * @param {any} newObj [description]
         * @return {Promise}
         */

    }, {
        key: 'setLeaderObject',
        value: function setLeaderObject(newObj) {
            return this.database._adminPouch.put(newObj);
        }
    }, {
        key: 'getApplyFunction',
        value: function getApplyFunction(electionChannel) {
            if (electionChannel === 'socket') return this.applySocket.bind(this);
            if (electionChannel === 'broadcast') return this.applyBroadcast.bind(this);

            throw _rxError2['default'].newRxError('LE1');
        }

        /**
         * starts applying for leadership
         */

    }, {
        key: 'applyOnce',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2() {
                var elected;
                return _regenerator2['default'].wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this.isLeader) {
                                    _context2.next = 2;
                                    break;
                                }

                                return _context2.abrupt('return', false);

                            case 2:
                                if (!this.isDead) {
                                    _context2.next = 4;
                                    break;
                                }

                                return _context2.abrupt('return', false);

                            case 4:
                                if (!this.isApplying) {
                                    _context2.next = 6;
                                    break;
                                }

                                return _context2.abrupt('return', false);

                            case 6:
                                if (!this.destroyed) {
                                    _context2.next = 8;
                                    break;
                                }

                                return _context2.abrupt('return', false);

                            case 8:
                                this.isApplying = true;

                                _context2.next = 11;
                                return this.getApplyFunction(this.electionChannel)();

                            case 11:
                                elected = _context2.sent;

                                if (!elected) {
                                    _context2.next = 15;
                                    break;
                                }

                                _context2.next = 15;
                                return this.beLeader();

                            case 15:

                                this.isApplying = false;
                                return _context2.abrupt('return', true);

                            case 17:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function applyOnce() {
                return _ref2.apply(this, arguments);
            }

            return applyOnce;
        }()

        /**
         * apply via socket
         * (critical on chrome with indexedDB due to write-locks)
         */

    }, {
        key: 'applySocket',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3() {
                var leaderObj, minTime;
                return _regenerator2['default'].wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.prev = 0;
                                _context3.next = 3;
                                return this.getLeaderObject();

                            case 3:
                                leaderObj = _context3.sent;
                                minTime = new Date().getTime() - SIGNAL_TIME * 2;

                                if (!(leaderObj.t >= minTime)) {
                                    _context3.next = 7;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('LE2');

                            case 7:
                                // write applying to db
                                leaderObj.apply = this.token;
                                leaderObj.t = new Date().getTime();
                                _context3.next = 11;
                                return this.setLeaderObject(leaderObj);

                            case 11:
                                _context3.next = 13;
                                return util.promiseWait(SIGNAL_TIME * 0.5);

                            case 13:
                                _context3.next = 15;
                                return this.getLeaderObject();

                            case 15:
                                leaderObj = _context3.sent;

                                if (!(leaderObj.apply !== this.token)) {
                                    _context3.next = 18;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('LE3');

                            case 18:
                                return _context3.abrupt('return', true);

                            case 21:
                                _context3.prev = 21;
                                _context3.t0 = _context3['catch'](0);
                                return _context3.abrupt('return', false);

                            case 24:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this, [[0, 21]]);
            }));

            function applySocket() {
                return _ref3.apply(this, arguments);
            }

            return applySocket;
        }()

        /**
         * apply via BroadcastChannel-API
         * (better performance than socket)
         */

    }, {
        key: 'applyBroadcast',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5() {
                var _this = this;

                var applyTime, subs, errors, whileNoError, ret;
                return _regenerator2['default'].wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                applyTime = new Date().getTime();
                                subs = [];
                                errors = [];

                                whileNoError = function () {
                                    var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4() {
                                        var circles;
                                        return _regenerator2['default'].wrap(function _callee4$(_context4) {
                                            while (1) {
                                                switch (_context4.prev = _context4.next) {
                                                    case 0:
                                                        subs.push(_this.bc.$.pipe((0, _filter.filter)(function () {
                                                            return !!_this.isApplying;
                                                        }), (0, _filter.filter)(function (msg) {
                                                            return msg.t >= applyTime;
                                                        }), (0, _filter.filter)(function (msg) {
                                                            return msg.type === 'apply';
                                                        }), (0, _filter.filter)(function (msg) {
                                                            if (msg.data < applyTime || msg.data === applyTime && msg.it > _this.token) return true;else return false;
                                                        }), (0, _filter.filter)(function () {
                                                            return errors.length < 1;
                                                        })).subscribe(function (msg) {
                                                            return errors.push('other is applying:' + msg.it);
                                                        }));
                                                        subs.push(_this.bc.$.pipe((0, _filter.filter)(function () {
                                                            return !!_this.isApplying;
                                                        }), (0, _filter.filter)(function (msg) {
                                                            return msg.t >= applyTime;
                                                        }), (0, _filter.filter)(function (msg) {
                                                            return msg.type === 'tell';
                                                        }), (0, _filter.filter)(function () {
                                                            return errors.length < 1;
                                                        })).subscribe(function (msg) {
                                                            return errors.push('other is leader' + msg.it);
                                                        }));
                                                        subs.push(_this.bc.$.pipe((0, _filter.filter)(function () {
                                                            return !!_this.isApplying;
                                                        }), (0, _filter.filter)(function (msg) {
                                                            return msg.type === 'apply';
                                                        }), (0, _filter.filter)(function (msg) {
                                                            if (msg.data > applyTime || msg.data === applyTime && msg.it > _this.token) return true;else return false;
                                                        })).subscribe(function () {
                                                            return _this.bc.write('apply', applyTime);
                                                        }));

                                                        circles = 3;

                                                    case 4:
                                                        if (!(circles > 0)) {
                                                            _context4.next = 14;
                                                            break;
                                                        }

                                                        circles--;
                                                        _context4.next = 8;
                                                        return _this.bc.write('apply', applyTime);

                                                    case 8:
                                                        _context4.next = 10;
                                                        return util.promiseWait(300);

                                                    case 10:
                                                        if (!(errors.length > 0)) {
                                                            _context4.next = 12;
                                                            break;
                                                        }

                                                        return _context4.abrupt('return', false);

                                                    case 12:
                                                        _context4.next = 4;
                                                        break;

                                                    case 14:
                                                        return _context4.abrupt('return', true);

                                                    case 15:
                                                    case 'end':
                                                        return _context4.stop();
                                                }
                                            }
                                        }, _callee4, _this);
                                    }));

                                    return function whileNoError() {
                                        return _ref5.apply(this, arguments);
                                    };
                                }();

                                _context5.next = 6;
                                return whileNoError();

                            case 6:
                                ret = _context5.sent;

                                subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });
                                return _context5.abrupt('return', ret);

                            case 9:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function applyBroadcast() {
                return _ref4.apply(this, arguments);
            }

            return applyBroadcast;
        }()
    }, {
        key: 'leaderSignal',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee6() {
                var success, leaderObj;
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
                                if (!this.leaderSignal_run) {
                                    _context6.next = 4;
                                    break;
                                }

                                return _context6.abrupt('return');

                            case 4:
                                this.leaderSignal_run = true;
                                _context6.t0 = this.electionChannel;
                                _context6.next = _context6.t0 === 'broadcast' ? 8 : _context6.t0 === 'socket' ? 11 : 31;
                                break;

                            case 8:
                                _context6.next = 10;
                                return this.bc.write('tell');

                            case 10:
                                return _context6.abrupt('break', 31);

                            case 11:
                                success = false;

                            case 12:
                                if (success) {
                                    _context6.next = 30;
                                    break;
                                }

                                _context6.prev = 13;
                                _context6.next = 16;
                                return this.getLeaderObject();

                            case 16:
                                leaderObj = _context6.sent;

                                leaderObj.is = this.token;
                                leaderObj.apply = this.token;
                                leaderObj.t = new Date().getTime();
                                _context6.next = 22;
                                return this.setLeaderObject(leaderObj);

                            case 22:
                                success = true;
                                _context6.next = 28;
                                break;

                            case 25:
                                _context6.prev = 25;
                                _context6.t1 = _context6['catch'](13);

                                console.dir(_context6.t1);

                            case 28:
                                _context6.next = 12;
                                break;

                            case 30:
                                return _context6.abrupt('break', 31);

                            case 31:
                                this.leaderSignal_run = false;
                                return _context6.abrupt('return');

                            case 33:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this, [[13, 25]]);
            }));

            function leaderSignal() {
                return _ref6.apply(this, arguments);
            }

            return leaderSignal;
        }()

        /**
         * assigns leadership to this instance
         */

    }, {
        key: 'beLeader',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee8() {
                var _this2 = this;

                return _regenerator2['default'].wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                if (!this.isDead) {
                                    _context8.next = 2;
                                    break;
                                }

                                return _context8.abrupt('return', false);

                            case 2:
                                if (!this.isLeader) {
                                    _context8.next = 4;
                                    break;
                                }

                                return _context8.abrupt('return', false);

                            case 4:
                                this.isLeader = true;

                                this.becomeLeader$.next({
                                    isLeader: true
                                });

                                _context8.next = 8;
                                return this.leaderSignal();

                            case 8:
                                _context8.t0 = this.electionChannel;
                                _context8.next = _context8.t0 === 'broadcast' ? 11 : _context8.t0 === 'socket' ? 14 : 16;
                                break;

                            case 11:
                                this.signalLeadership = this.bc.$.pipe((0, _filter.filter)(function () {
                                    return !!_this2.isLeader;
                                }),
                                // BUGFIX: avoids loop-hole when for whatever reason 2 are leader
                                (0, _filter.filter)(function (msg) {
                                    return msg.type !== 'tell';
                                })).subscribe(function () {
                                    return _this2.leaderSignal();
                                });
                                this.subs.push(this.signalLeadership);
                                return _context8.abrupt('break', 16);

                            case 14:
                                (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee7() {
                                    return _regenerator2['default'].wrap(function _callee7$(_context7) {
                                        while (1) {
                                            switch (_context7.prev = _context7.next) {
                                                case 0:
                                                    if (_this2.destroyed) {
                                                        _context7.next = 9;
                                                        break;
                                                    }

                                                    _context7.next = 3;
                                                    return util.promiseWait(SIGNAL_TIME);

                                                case 3:
                                                    if (_this2.isLeader) {
                                                        _context7.next = 5;
                                                        break;
                                                    }

                                                    return _context7.abrupt('return');

                                                case 5:
                                                    _context7.next = 7;
                                                    return _this2.leaderSignal();

                                                case 7:
                                                    _context7.next = 0;
                                                    break;

                                                case 9:
                                                case 'end':
                                                    return _context7.stop();
                                            }
                                        }
                                    }, _callee7, _this2);
                                }))();
                                return _context8.abrupt('break', 16);

                            case 16:

                                // this.die() on unload
                                this.unloads.push(_unload2['default'].add(function () {
                                    _this2.bc && _this2.bc.write('death');
                                    _this2.die();
                                }));
                                return _context8.abrupt('return', true);

                            case 18:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function beLeader() {
                return _ref7.apply(this, arguments);
            }

            return beLeader;
        }()
    }, {
        key: 'die',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee9() {
                var success, leaderObj;
                return _regenerator2['default'].wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                if (this.isLeader) {
                                    _context9.next = 2;
                                    break;
                                }

                                return _context9.abrupt('return', false);

                            case 2:
                                if (!this.isDead) {
                                    _context9.next = 4;
                                    break;
                                }

                                return _context9.abrupt('return', false);

                            case 4:
                                this.isDead = true;
                                this.isLeader = false;

                                if (this.signalLeadership) this.signalLeadership.unsubscribe();

                                // force.write to db
                                _context9.t0 = this.electionChannel;
                                _context9.next = _context9.t0 === 'broadcast' ? 10 : _context9.t0 === 'socket' ? 13 : 30;
                                break;

                            case 10:
                                _context9.next = 12;
                                return this.bc.write('death');

                            case 12:
                                return _context9.abrupt('break', 30);

                            case 13:
                                success = false;

                            case 14:
                                if (success) {
                                    _context9.next = 29;
                                    break;
                                }

                                _context9.prev = 15;
                                _context9.next = 18;
                                return this.getLeaderObject();

                            case 18:
                                leaderObj = _context9.sent;

                                leaderObj.t = 0;
                                _context9.next = 22;
                                return this.setLeaderObject(leaderObj);

                            case 22:
                                success = true;
                                _context9.next = 27;
                                break;

                            case 25:
                                _context9.prev = 25;
                                _context9.t1 = _context9['catch'](15);

                            case 27:
                                _context9.next = 14;
                                break;

                            case 29:
                                return _context9.abrupt('break', 30);

                            case 30:
                                return _context9.abrupt('return', true);

                            case 31:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this, [[15, 25]]);
            }));

            function die() {
                return _ref9.apply(this, arguments);
            }

            return die;
        }()

        /**
         * @return {Promise} promise which resolve when the instance becomes leader
         */

    }, {
        key: 'waitForLeadership',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee11() {
                var _this3 = this;

                var fallbackIntervalTime;
                return _regenerator2['default'].wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                if (!this.isLeader) {
                                    _context11.next = 2;
                                    break;
                                }

                                return _context11.abrupt('return', Promise.resolve(true));

                            case 2:
                                if (this.isWaiting) {
                                    _context11.next = 14;
                                    break;
                                }

                                this.isWaiting = true;

                                // apply now
                                this.applyOnce();

                                fallbackIntervalTime = SIGNAL_TIME * 5;
                                _context11.t0 = this.electionChannel;
                                _context11.next = _context11.t0 === 'broadcast' ? 9 : _context11.t0 === 'socket' ? 11 : 13;
                                break;

                            case 9:
                                // apply when leader dies
                                this.subs.push(this.bc.$.pipe((0, _filter.filter)(function (msg) {
                                    return msg.type === 'death';
                                })).subscribe(function () {
                                    return _this3.applyOnce();
                                }));
                                return _context11.abrupt('break', 13);

                            case 11:
                                // no message via socket, so just use the interval but set it lower
                                fallbackIntervalTime = SIGNAL_TIME * 2;
                                return _context11.abrupt('break', 13);

                            case 13:

                                // apply on interval incase leader dies without notification
                                (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee10() {
                                    return _regenerator2['default'].wrap(function _callee10$(_context10) {
                                        while (1) {
                                            switch (_context10.prev = _context10.next) {
                                                case 0:
                                                    if (!(!_this3.destroyed && !_this3.isLeader)) {
                                                        _context10.next = 16;
                                                        break;
                                                    }

                                                    _context10.next = 3;
                                                    return util.promiseWait(fallbackIntervalTime);

                                                case 3:
                                                    _context10.t0 = _this3.electionChannel;
                                                    _context10.next = _context10.t0 === 'broadcast' ? 6 : _context10.t0 === 'socket' ? 9 : 12;
                                                    break;

                                                case 6:
                                                    _context10.next = 8;
                                                    return util.requestIdlePromise(fallbackIntervalTime);

                                                case 8:
                                                    return _context10.abrupt('break', 12);

                                                case 9:
                                                    _context10.next = 11;
                                                    return _this3.database.requestIdlePromise(fallbackIntervalTime);

                                                case 11:
                                                    return _context10.abrupt('break', 12);

                                                case 12:
                                                    _context10.next = 14;
                                                    return _this3.applyOnce();

                                                case 14:
                                                    _context10.next = 0;
                                                    break;

                                                case 16:
                                                case 'end':
                                                    return _context10.stop();
                                            }
                                        }
                                    }, _callee10, _this3);
                                }))();

                            case 14:
                                return _context11.abrupt('return', this.becomeLeader$.asObservable().pipe((0, _filter.filter)(function (i) {
                                    return i.isLeader === true;
                                }), (0, _first.first)()).toPromise());

                            case 15:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function waitForLeadership() {
                return _ref10.apply(this, arguments);
            }

            return waitForLeadership;
        }()
    }, {
        key: 'destroy',
        value: function () {
            var _ref12 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee12() {
                return _regenerator2['default'].wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                this.destroyed = true;
                                this.subs.map(function (sub) {
                                    return sub.unsubscribe();
                                });
                                this.unloads.map(function (fn) {
                                    return fn();
                                });
                                _context12.next = 5;
                                return this.die();

                            case 5:
                                this.bc && this.bc.destroy();

                            case 6:
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

function create(database) {
    var elector = new LeaderElector(database);
    return elector;
};

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {};
var overwritable = exports.overwritable = {
    createLeaderElector: create
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};
