"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFromMapOrCreate = getFromMapOrCreate;
exports.getFromMapOrThrow = getFromMapOrThrow;
function getFromMapOrThrow(map, key) {
  var val = map.get(key);
  if (typeof val === 'undefined') {
    throw new Error('missing value from map ' + key);
  }
  return val;
}
function getFromMapOrCreate(map, index, creator, ifWasThere) {
  var value = map.get(index);
  if (typeof value === 'undefined') {
    value = creator();
    map.set(index, value);
  } else if (ifWasThere) {
    ifWasThere(value);
  }
  return value;
}
//# sourceMappingURL=utils-map.js.map