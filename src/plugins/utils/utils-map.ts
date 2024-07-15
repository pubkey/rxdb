export function getFromMapOrThrow<K, V>(map: Map<K, V> | WeakMap<any, V>, key: K): V {
    const val = map.get(key);
    if (typeof val === 'undefined') {
        throw new Error('missing value from map ' + key);
    }
    return val;
}

export function getFromMapOrCreate<MapIndex, MapValue>(
    map: Map<MapIndex, MapValue> | WeakMap<any, MapValue>,
    index: MapIndex,
    creator: () => MapValue,
    ifWasThere?: (value: MapValue) => void
): MapValue {
    let value = map.get(index);
    if (typeof value === 'undefined') {
        value = creator();
        map.set(index, value);
    } else if (ifWasThere) {
        ifWasThere(value);
    }
    return value;
}
