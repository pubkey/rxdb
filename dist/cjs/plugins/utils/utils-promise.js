"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PROMISE_RESOLVE_VOID = exports.PROMISE_RESOLVE_TRUE = exports.PROMISE_RESOLVE_NULL = exports.PROMISE_RESOLVE_FALSE = void 0;
exports.isPromise = isPromise;
exports.nextTick = nextTick;
exports.promiseSeries = promiseSeries;
exports.promiseWait = promiseWait;
exports.requestIdleCallbackIfAvailable = requestIdleCallbackIfAvailable;
exports.requestIdlePromise = requestIdlePromise;
exports.requestIdlePromiseNoQueue = requestIdlePromiseNoQueue;
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

/**
 * returns true if promise is given
 */
function isPromise(value) {
  if (typeof value !== 'undefined' && typeof value.then === 'function') {
    return true;
  }
  return false;
}

/**
 * Reusing resolved promises has a better
 * performance than creating new ones each time.
 */
var PROMISE_RESOLVE_TRUE = exports.PROMISE_RESOLVE_TRUE = Promise.resolve(true);
var PROMISE_RESOLVE_FALSE = exports.PROMISE_RESOLVE_FALSE = Promise.resolve(false);
var PROMISE_RESOLVE_NULL = exports.PROMISE_RESOLVE_NULL = Promise.resolve(null);
var PROMISE_RESOLVE_VOID = exports.PROMISE_RESOLVE_VOID = Promise.resolve();
function requestIdlePromiseNoQueue(
/**
 * We always set a timeout!
 * RxDB might be used on the server side where the
 * server runs 24/4 on 99% CPU. So without a timeout
 * this would never resolve which could cause a memory leak.
 */
timeout = 10000) {
  /**
   * Do not use window.requestIdleCallback
   * because some javascript runtimes like react-native,
   * do not have a window object, but still have a global
   * requestIdleCallback function.
   * @link https://github.com/pubkey/rxdb/issues/4804
  */
  if (typeof requestIdleCallback === 'function') {
    return new Promise(res => {
      requestIdleCallback(() => res(), {
        timeout
      });
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
var idlePromiseQueue = PROMISE_RESOLVE_VOID;
function requestIdlePromise(timeout = undefined) {
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
function requestIdleCallbackIfAvailable(fun) {
  /**
   * Do not use window.requestIdleCallback
   * because some javascript runtimes like react-native,
   * do not have a window object, but still have a global
   * requestIdleCallback function.
   * @link https://github.com/pubkey/rxdb/issues/4804
  */
  if (typeof requestIdleCallback === 'function') {
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
function promiseSeries(tasks, initial) {
  return tasks.reduce((current, next) => current.then(next), Promise.resolve(initial));
}
//# sourceMappingURL=utils-promise.js.map