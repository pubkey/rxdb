export function runXTimes(xTimes, fn) {
  new Array(xTimes).fill(0).forEach((_v, idx) => fn(idx));
}
export function ensureNotFalsy(obj) {
  if (!obj) {
    throw new Error('ensureNotFalsy() is falsy');
  }
  return obj;
}
export function ensureInteger(obj) {
  if (!Number.isInteger(obj)) {
    throw new Error('ensureInteger() is falsy');
  }
  return obj;
}
export function getFromMapOrThrow(map, key) {
  var val = map.get(key);
  if (typeof val === 'undefined') {
    throw new Error('missing value from map ' + key);
  }
  return val;
}
export function getFromMapOrFill(map, key, fillerFunction) {
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
export var RXJS_SHARE_REPLAY_DEFAULTS = {
  bufferSize: 1,
  refCount: true
};
//# sourceMappingURL=utils-other.js.map