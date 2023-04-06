/**
 * returns a promise that resolves on the next tick
 */
export function nextTick() {
  return new Promise(res => setTimeout(res, 0));
}
export function promiseWait(ms = 0) {
  return new Promise(res => setTimeout(res, ms));
}
export function toPromise(maybePromise) {
  if (maybePromise && typeof maybePromise.then === 'function') {
    // is promise
    return maybePromise;
  } else {
    return Promise.resolve(maybePromise);
  }
}

/**
 * Reusing resolved promises has a better
 * performance than creating new ones each time.
 */
export var PROMISE_RESOLVE_TRUE = Promise.resolve(true);
export var PROMISE_RESOLVE_FALSE = Promise.resolve(false);
export var PROMISE_RESOLVE_NULL = Promise.resolve(null);
export var PROMISE_RESOLVE_VOID = Promise.resolve();

/**
 * If multiple operations wait for an requestIdlePromise
 * we do not want them to resolve all at the same time.
 * So we have to queue the calls.
 */
var idlePromiseQueue = PROMISE_RESOLVE_VOID;
export function requestIdlePromise(timeout = null) {
  return new Promise(res => {
    idlePromiseQueue = idlePromiseQueue.then(() => {
      if (typeof window === 'object' && window['requestIdleCallback']) {
        window['requestIdleCallback'](res, {
          timeout
        });
      } else {
        promiseWait(0).then(res);
      }
    });
  });
}

/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 */
export function requestIdleCallbackIfAvailable(fun) {
  if (typeof window === 'object' && window['requestIdleCallback']) window['requestIdleCallback'](fun);
}

/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
 */
export function promiseSeries(tasks, initial) {
  return tasks.reduce((current, next) => current.then(next), Promise.resolve(initial));
}
//# sourceMappingURL=utils-promise.js.map