export function getFromMapOrCreate(map, index, creator, ifWasThere) {
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