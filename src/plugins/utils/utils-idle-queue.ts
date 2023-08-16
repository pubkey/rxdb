// types
type PromiseExecutor = (value?: (PromiseLike<void> | void)) => void;
type IdleDeadline  = {didTimeout: boolean; timeRemaining: () => number;};
type IdleCallback = (deadline: IdleDeadline) => void;
type IdleOptions  = {timeout: number;};

type TimeoutHandle = NodeJS.Timeout | number;

type RequestIdleCallback = (callback: IdleCallback, options?: IdleOptions) => TimeoutHandle;
type CancelIdleCallback = (handle: TimeoutHandle) => void;

type IdleCall = Promise<void> & {_manualResolve: () => void; _timeoutHandle: TimeoutHandle;};

// variables
const _iC: Set<IdleCall> = new Set();
let _iCHandle: TimeoutHandle | undefined;

// requestIdleCallback/cancelIdleCallback polyfill
const _requestIdleCallback: RequestIdleCallback = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : function(callback: IdleCallback) {
        const startTime = Date.now();
        const deadline: IdleDeadline = {
            didTimeout: false,
            timeRemaining() {
                return Math.max(0, 50 - (Date.now() - startTime));
            }
        };

        return setTimeout(function () {
            callback(deadline);
        }, 1);
    };

const _cancelIdleCallback: CancelIdleCallback = typeof cancelIdleCallback === 'function'
    ? cancelIdleCallback as CancelIdleCallback
    : function(handle: TimeoutHandle) {
        clearTimeout(handle as number);
    };

/**
 *
 */
function requestIdlePromise(options?: IdleOptions): Promise<void> {
    let resolve: PromiseExecutor;

    const prom = new Promise(res => resolve = res) as IdleCall;

    prom._manualResolve = () => {
        _removeIdleCall(prom);
        resolve();
    };

    if (options && options.timeout) {
        // if timeout has passed, resolve promise even if not idle
        prom._timeoutHandle = setTimeout(() => {
            prom._manualResolve();
        }, options.timeout as number);
    }

    _iC.add(prom);

    _tryIdleCall();

    return prom;
}

/**
 * Removes the promise so it will never be resolved.
 */
function cancelIdlePromise(promise: IdleCall): void {
    _removeIdleCall(promise);
}

/**
 * Clears and resets everything
 */
function clear(): void {
    // remove all non-cleared
    _iC.forEach(promise => cancelIdlePromise(promise));

    _iC.clear();

    // cancels a callback previously scheduled
    if(_iCHandle) {
        _cancelIdleCallback(_iCHandle);
        _iCHandle = undefined;
    }
}

/**
 * Removes the promise from the queue.
 */
function _removeIdleCall(promise: IdleCall): void {
    if (!promise) return;

    // remove timeout if exists
    if (promise._timeoutHandle)
        clearTimeout(promise._timeoutHandle);

    // remove from queue
    _iC.delete(promise);
}

/**
 * Tries to run idle calls from idleCalls-queue.
 */
function _tryIdleCall(): void {
    // request an idle callback if not already flushing queue
    if (_iCHandle) return;

    _iCHandle = _requestIdleCallback(_runIdleCallQueue);
}

/**
 * Resolve the enqueued idle calls when the browser determines there's enough idle time available to let us do some work.
 */
function _runIdleCallQueue(deadline: IdleDeadline): void {
    const iterator = _iC.values();

    // Run idle calls from idleCalls-queue until running out of time (i.e. the idle period ended) or finished
    while (
        (deadline.timeRemaining() > 0 || deadline.didTimeout) && _iC.size) {
        // processes the oldest call of the idleCalls-queue
        const oldestPromise = iterator.next().value;

        oldestPromise._manualResolve();
    }

    // null out callback id
    _iCHandle = undefined;

    // If out of time before idle calls are finished, request more time.
    // This way, the idle calls are processed only during the idle period (i.e. they are processed as background tasks).
    if (_iC.size) {
        _tryIdleCall();
    }
}

// NOTE: for now wrap these functions in a object to avoid the collisions (see the requestIdlePromise from utils-promise)
const IdleQueue = {
    requestIdlePromise,
    cancelIdlePromise,
    clear
};

export {
    IdleQueue
};
