import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
/**
 * this queue tracks the currently running database-interactions
 * so we know when the database is in idle-state and can call
 * requestIdlePromise for semi-important actions
 */

import * as util from './util';

var PROMISE_RESOLVE_MAP = new WeakMap();

export var IdleQueue = function () {
    function IdleQueue() {
        _classCallCheck(this, IdleQueue);

        /**
         * each lock() increased this number
         * each unlock() decreases this number
         * If _queueCounter==0, the state is in idle
         * @type {Number}
         */
        this._queueCounter = 0;

        /**
         * contains all functions that where added via requestIdlePromise()
         * and not have been run
         * @type {Array<function>} with oldest promise last
         */
        this._idleCalls = [];
    }

    /**
     * creates a lock in the queue
     * and creates an unlock-function to remove the lock from the queue
     * @return {function} unlock function than must be called afterwards
     */


    IdleQueue.prototype.lock = function lock() {
        var _this = this;

        this._queueCounter++;
        var unlock = function () {
            return _this._unLock();
        }.bind(this);
        return unlock;
    };

    IdleQueue.prototype._unLock = function _unLock() {
        this._queueCounter--;
        this._tryIdleCall();
    };

    /**
     * wraps a function with lock/unlock and runs it
     * @param  {function}  fun
     * @return {Promise<any>}
     */


    IdleQueue.prototype.wrapFunctionWithLocking = function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(fun) {
            var unlock, ret;
            return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            unlock = this.lock();
                            ret = void 0;
                            _context.prev = 2;
                            _context.next = 5;
                            return fun();

                        case 5:
                            ret = _context.sent;
                            _context.next = 12;
                            break;

                        case 8:
                            _context.prev = 8;
                            _context.t0 = _context['catch'](2);

                            // not sucessfull -> unlock before throwing
                            unlock();
                            throw _context.t0;

                        case 12:
                            // sucessfull -> unlock before return
                            unlock();
                            return _context.abrupt('return', ret);

                        case 14:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this, [[2, 8]]);
        }));

        function wrapFunctionWithLocking(_x) {
            return _ref.apply(this, arguments);
        }

        return wrapFunctionWithLocking;
    }();

    /**
     * removes the given idle-call-promise from the queue
     * @param {Promise} prom from this.requestIdlePromise()
     */


    IdleQueue.prototype._removeIdleCall = function _removeIdleCall(prom) {
        var index = this._idleCalls.indexOf(prom);
        this._idleCalls.splice(index, 1);
    };

    /**
     * use this to run things when the database has nothing to do
     * @param {?number} timeout in ms (optional). After this time the promise resolves even if db not in idle
     * @return {Promise} promise that resolves when the database is in idle-mode
     */


    IdleQueue.prototype.requestIdlePromise = function requestIdlePromise(timeout) {
        var _this2 = this;

        var timeoutObj = void 0;
        var resolve = void 0;

        var prom = new Promise(function (res) {
            return resolve = res;
        });
        var resolveFromOutside = function resolveFromOutside() {
            timeoutObj && clearTimeout(timeoutObj);
            _this2._removeIdleCall(prom);
            resolve();
        };
        PROMISE_RESOLVE_MAP.set(prom, resolveFromOutside);

        if (timeout) {
            // if timeout has passed, resolve promise even if not idle
            timeoutObj = setTimeout(function () {
                PROMISE_RESOLVE_MAP.get(prom)();
            }, timeout);
        }

        this._idleCalls.unshift(prom);

        this._tryIdleCall();
        return prom;
    };

    /**
     * resolves the last entry of this._idleCalls
     * but only if the queue is empty
     */


    IdleQueue.prototype._tryIdleCall = function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            if (!(this._tryIdleCallRunning || this._idleCalls.length === 0)) {
                                _context2.next = 2;
                                break;
                            }

                            return _context2.abrupt('return');

                        case 2:
                            this._tryIdleCallRunning = true;

                            // w8 one tick
                            _context2.next = 5;
                            return util.nextTick();

                        case 5:
                            if (!(this._queueCounter !== 0)) {
                                _context2.next = 8;
                                break;
                            }

                            this._tryIdleCallRunning = false;
                            return _context2.abrupt('return');

                        case 8:
                            ;

                            /**
                             * wait 1 tick here
                             * because many functions do IO->CPU->IO
                             * which means the queue is empty for a short time
                             * but the db is not idle
                             */
                            _context2.next = 11;
                            return util.nextTick();

                        case 11:
                            if (!(this._queueCounter !== 0)) {
                                _context2.next = 14;
                                break;
                            }

                            this._tryIdleCallRunning = false;
                            return _context2.abrupt('return');

                        case 14:

                            // db is idle
                            this._resolveOneIdleCall();
                            this._tryIdleCallRunning = false;

                        case 16:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        function _tryIdleCall() {
            return _ref2.apply(this, arguments);
        }

        return _tryIdleCall;
    }();

    /**
     * processes the oldest call of the idleCalls-queue
     */


    IdleQueue.prototype._resolveOneIdleCall = function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
            var oldestPromise, resolveFun;
            return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            if (!(this._idleCalls.length === 0)) {
                                _context3.next = 2;
                                break;
                            }

                            return _context3.abrupt('return');

                        case 2:
                            oldestPromise = this._idleCalls[this._idleCalls.length - 1];
                            resolveFun = PROMISE_RESOLVE_MAP.get(oldestPromise);

                            resolveFun();
                            _context3.next = 7;
                            return util.nextTick();

                        case 7:

                            // try to call the next
                            this._tryIdleCall();

                        case 8:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this);
        }));

        function _resolveOneIdleCall() {
            return _ref3.apply(this, arguments);
        }

        return _resolveOneIdleCall;
    }();

    return IdleQueue;
}();

export function create() {
    return new IdleQueue();
}

export default {
    IdleQueue: IdleQueue,
    create: create
};