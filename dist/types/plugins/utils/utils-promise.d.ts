/**
 * returns a promise that resolves on the next tick
 */
export declare function nextTick(): Promise<void>;
export declare function promiseWait(ms?: number): Promise<void>;
export declare function toPromise<T>(maybePromise: Promise<T> | T): Promise<T>;
/**
 * returns true if promise is given
 */
export declare function isPromise(value: any): boolean;
/**
 * Reusing resolved promises has a better
 * performance than creating new ones each time.
 */
export declare const PROMISE_RESOLVE_TRUE: Promise<true>;
export declare const PROMISE_RESOLVE_FALSE: Promise<false>;
export declare const PROMISE_RESOLVE_NULL: Promise<null>;
export declare const PROMISE_RESOLVE_VOID: Promise<void>;
export declare function requestIdlePromiseNoQueue(
/**
 * We always set a timeout!
 * RxDB might be used on the server side where the
 * server runs 24/4 on 99% CPU. So without a timeout
 * this would never resolve which could cause a memory leak.
 */
timeout?: number | undefined): Promise<void>;
export declare function requestIdlePromise(timeout?: number | undefined): Promise<void>;
/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 */
export declare function requestIdleCallbackIfAvailable(fun: Function): void;
/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
 */
export declare function promiseSeries(tasks: Function[], initial?: any): Promise<any[]>;
