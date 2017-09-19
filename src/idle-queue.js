/**
 * this queue tracks the currently running database-interactions
 * so we know when the database is in idle-state and can call
 * requestIdlePromise for semi-important actions
 */

import * as util from './util';

const PROMISE_RESOLVE_MAP = new WeakMap();

export class IdleQueue {
    constructor() {
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
    lock() {
        this._queueCounter++;
        const unlock = (() => this._unLock()).bind(this);
        return unlock;
    }

    _unLock() {
        this._queueCounter--;
        this._tryIdleCall();
    }

    /**
     * wraps a function with lock/unlock and runs it
     * @param  {function}  fun
     * @return {Promise<any>}
     */
    async wrapFunctionWithLocking(fun) {
        const unlock = this.lock();
        let ret;
        try {
            ret = await fun();
        } catch (err) {
            // not sucessfull -> unlock before throwing
            unlock();
            throw err;
        }
        // sucessfull -> unlock before return
        unlock();
        return ret;
    }


    /**
     * removes the given idle-call-promise from the queue
     * @param {Promise} prom from this.requestIdlePromise()
     */
    _removeIdleCall(prom) {
        const index = this._idleCalls.indexOf(prom);
        this._idleCalls.splice(index, 1);
    }

    /**
     * use this to run things when the database has nothing to do
     * @param {?number} timeout in ms (optional). After this time the promise resolves even if db not in idle
     * @return {Promise} promise that resolves when the database is in idle-mode
     */
    requestIdlePromise(timeout) {
        let timeoutObj;
        let resolve;

        const prom = new Promise(res => resolve = res);
        const resolveFromOutside = () => {
            timeoutObj && clearTimeout(timeoutObj);
            this._removeIdleCall(prom);
            resolve();
        };
        PROMISE_RESOLVE_MAP.set(prom, resolveFromOutside);

        if (timeout) { // if timeout has passed, resolve promise even if not idle
            timeoutObj = setTimeout(() => {
                PROMISE_RESOLVE_MAP.get(prom)();
            }, timeout);
        }

        this._idleCalls.unshift(prom);

        this._tryIdleCall();
        return prom;
    }

    /**
     * resolves the last entry of this._idleCalls
     * but only if the queue is empty
     */
    async _tryIdleCall() {
        // ensure this does not run in parallel
        if (this._tryIdleCallRunning || this._idleCalls.length === 0)
            return;
        this._tryIdleCallRunning = true;

        // w8 one tick
        await util.nextTick();

        // check if queue empty
        if (this._queueCounter !== 0) {
            this._tryIdleCallRunning = false;
            return;
        };

        /**
         * wait 1 tick here
         * because many functions do IO->CPU->IO
         * which means the queue is empty for a short time
         * but the db is not idle
         */
        await util.nextTick();
        // check if queue still empty
        if (this._queueCounter !== 0) {
            this._tryIdleCallRunning = false;
            return;
        }

        // db is idle
        this._resolveOneIdleCall();
        this._tryIdleCallRunning = false;
    }

    /**
     * processes the oldest call of the idleCalls-queue
     */
    async _resolveOneIdleCall() {
        if (this._idleCalls.length === 0) return;

        const oldestPromise = this._idleCalls[this._idleCalls.length - 1];
        const resolveFun = PROMISE_RESOLVE_MAP.get(oldestPromise);
        resolveFun();
        await util.nextTick();

        // try to call the next
        this._tryIdleCall();
    }
}

export function create() {
    return new IdleQueue();
}

export default {
    IdleQueue,
    create
};
