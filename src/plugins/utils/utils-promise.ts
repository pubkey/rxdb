/**
 * returns a promise that resolves on the next tick
 */
export function nextTick(): Promise<void> {
    return new Promise(res => setTimeout(res, 0));
}

export function promiseWait(ms: number = 0): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
}

export function toPromise<T>(maybePromise: Promise<T> | T): Promise<T> {
    if (maybePromise && typeof (maybePromise as any).then === 'function') {
        // is promise
        return maybePromise as any;
    } else {
        return Promise.resolve(maybePromise);
    }
}

/**
 * returns true if promise is given
 */
export function isPromise(value: any): boolean {
    if (
        typeof value !== 'undefined' &&
        typeof value.then === 'function'
    ) {
        return true;
    }
    return false;
}

/**
 * Reusing resolved promises has a better
 * performance than creating new ones each time.
 */
export const PROMISE_RESOLVE_TRUE: Promise<true> = Promise.resolve(true);
export const PROMISE_RESOLVE_FALSE: Promise<false> = Promise.resolve(false);
export const PROMISE_RESOLVE_NULL: Promise<null> = Promise.resolve(null);
export const PROMISE_RESOLVE_VOID: Promise<void> = Promise.resolve();


export function requestIdlePromiseNoQueue(
    /**
     * We always set a timeout!
     * RxDB might be used on the server side where the
     * server runs 24/4 on 99% CPU. So without a timeout
     * this would never resolve which could cause a memory leak.
     */
    timeout: number | undefined = 10000
) {
    /**
     * Do not use window.requestIdleCallback
     * because some javascript runtimes like react-native,
     * do not have a window object, but still have a global
     * requestIdleCallback function.
     * @link https://github.com/pubkey/rxdb/issues/4804
    */
    if (
        typeof requestIdleCallback === 'function'
    ) {
        return new Promise<void>(res => {
            requestIdleCallback(
                () => res(),
                {
                    timeout
                }
            );
        });
    } else {
        return promiseWait(0);
    }
}

/**
 * If multiple operations wait for an requestIdlePromise
 * we do not want them to resolve all at the same time.
 * So we have to queue the calls.
 */
let idlePromiseQueue = PROMISE_RESOLVE_VOID;
export function requestIdlePromise(
    timeout: number | undefined = undefined
) {
    idlePromiseQueue = idlePromiseQueue.then(() => {
        return requestIdlePromiseNoQueue(timeout);
    });
    return idlePromiseQueue;
}


/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 */
export function requestIdleCallbackIfAvailable(fun: Function): void {
    /**
     * Do not use window.requestIdleCallback
     * because some javascript runtimes like react-native,
     * do not have a window object, but still have a global
     * requestIdleCallback function.
     * @link https://github.com/pubkey/rxdb/issues/4804
    */
    if (
        typeof requestIdleCallback === 'function'
    ) {
        requestIdleCallback(() => {
            fun();
        });
    }
}


/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
 */
export function promiseSeries(
    tasks: Function[],
    initial?: any
): Promise<any[]> {
    return tasks
        .reduce(
            (current, next) => (current as any).then(next),
            Promise.resolve(initial)
        );
}
