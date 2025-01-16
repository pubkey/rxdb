"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RXJS_SHARE_REPLAY_DEFAULTS = void 0;
exports.customFetchWithFixedHeaders = customFetchWithFixedHeaders;
exports.ensureInteger = ensureInteger;
exports.ensureNotFalsy = ensureNotFalsy;
exports.nameFunction = nameFunction;
exports.runXTimes = runXTimes;
function runXTimes(xTimes, fn) {
  new Array(xTimes).fill(0).forEach((_v, idx) => fn(idx));
}
function ensureNotFalsy(obj, message) {
  if (!obj) {
    if (!message) {
      message = '';
    }
    throw new Error('ensureNotFalsy() is falsy: ' + message);
  }
  return obj;
}
function ensureInteger(obj) {
  if (!Number.isInteger(obj)) {
    throw new Error('ensureInteger() is falsy');
  }
  return obj;
}

/**
 * Using shareReplay() without settings will not unsubscribe
 * if there are no more subscribers.
 * So we use these defaults.
 * @link https://cartant.medium.com/rxjs-whats-changed-with-sharereplay-65c098843e95
 */
var RXJS_SHARE_REPLAY_DEFAULTS = exports.RXJS_SHARE_REPLAY_DEFAULTS = {
  bufferSize: 1,
  refCount: true
};

/**
 * Dynamically add a name to a function
 * so that it can later be found in the stack.
 * @link https://stackoverflow.com/a/41854075/3443137
 */
function nameFunction(name, body) {
  // @ts-ignore
  return {
    [name](...args) {
      return body.apply(this, args);
    }
  }[name];
}
function customFetchWithFixedHeaders(headers) {
  function customFetch(url, options = {}) {
    // Ensure options object exists and headers property is initialized
    options.headers = {
      ...headers,
      // include default custom headers
      ...(options.headers || {}) // merge any headers passed in the function call
    };

    // Call the original fetch with the modified options
    return fetch(url, options);
  }
  return customFetch;
}
//# sourceMappingURL=utils-other.js.map