"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PROMISE_RESOLVE_VOID = exports.PROMISE_RESOLVE_TRUE = exports.PROMISE_RESOLVE_NULL = exports.PROMISE_RESOLVE_FALSE = void 0;
exports.nextTick = nextTick;
exports.promiseSeries = promiseSeries;
exports.promiseWait = promiseWait;
exports.requestIdleCallbackIfAvailable = requestIdleCallbackIfAvailable;
exports.requestIdlePromise = requestIdlePromise;
exports.toPromise = toPromise;
/**
 * returns a promise that resolves on the next tick
 */
function nextTick() {
  return new Promise(res => setTimeout(res, 0));
}
function promiseWait(ms = 0) {
  return new Promise(res => setTimeout(res, ms));
}
function toPromise(maybePromise) {
  if (maybePromise && typeof maybePromise.then === 'function') {
    // is promise
    return maybePromise;
  } else {
    return Promise.resolve(maybePromise);
  }
}
var PROMISE_RESOLVE_TRUE = Promise.resolve(true);
exports.PROMISE_RESOLVE_TRUE = PROMISE_RESOLVE_TRUE;
var PROMISE_RESOLVE_FALSE = Promise.resolve(false);
exports.PROMISE_RESOLVE_FALSE = PROMISE_RESOLVE_FALSE;
var PROMISE_RESOLVE_NULL = Promise.resolve(null);
exports.PROMISE_RESOLVE_NULL = PROMISE_RESOLVE_NULL;
var PROMISE_RESOLVE_VOID = Promise.resolve();
exports.PROMISE_RESOLVE_VOID = PROMISE_RESOLVE_VOID;
function requestIdlePromise(timeout = null) {
  if (typeof window === 'object' && window['requestIdleCallback']) {
    return new Promise(res => window['requestIdleCallback'](res, {
      timeout
    }));
  } else {
    return promiseWait(0);
  }
}

/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 */
function requestIdleCallbackIfAvailable(fun) {
  if (typeof window === 'object' && window['requestIdleCallback']) window['requestIdleCallback'](fun);
}

/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
 */
function promiseSeries(tasks, initial) {
  return tasks.reduce((current, next) => current.then(next), Promise.resolve(initial));
}
//# sourceMappingURL=utils-promise.js.map