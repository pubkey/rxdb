"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RXJS_SHARE_REPLAY_DEFAULTS = void 0;
exports.ensureInteger = ensureInteger;
exports.ensureNotFalsy = ensureNotFalsy;
exports.getFromMapOrFill = getFromMapOrFill;
exports.getFromMapOrThrow = getFromMapOrThrow;
exports.runXTimes = runXTimes;
function runXTimes(xTimes, fn) {
  new Array(xTimes).fill(0).forEach((_v, idx) => fn(idx));
}
function ensureNotFalsy(obj) {
  if (!obj) {
    throw new Error('ensureNotFalsy() is falsy');
  }
  return obj;
}
function ensureInteger(obj) {
  if (!Number.isInteger(obj)) {
    throw new Error('ensureInteger() is falsy');
  }
  return obj;
}
function getFromMapOrThrow(map, key) {
  var val = map.get(key);
  if (typeof val === 'undefined') {
    throw new Error('missing value from map ' + key);
  }
  return val;
}
function getFromMapOrFill(map, key, fillerFunction) {
  var value = map.get(key);
  if (!value) {
    value = fillerFunction();
    map.set(key, value);
  }
  return value;
}

/**
 * Using shareReplay() without settings will not unsubscribe
 * if there are no more subscribers.
 * So we use these defaults.
 * @link https://cartant.medium.com/rxjs-whats-changed-with-sharereplay-65c098843e95
 */
var RXJS_SHARE_REPLAY_DEFAULTS = {
  bufferSize: 1,
  refCount: true
};
exports.RXJS_SHARE_REPLAY_DEFAULTS = RXJS_SHARE_REPLAY_DEFAULTS;
//# sourceMappingURL=utils-other.js.map