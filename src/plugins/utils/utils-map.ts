export function getFromMapOrThrow<K, V>(map: Map<K, V> | WeakMap<any, V>, key: K): V {
    const val = map.get(key);
    if (val !== undefined) {
        return val;
    }
    throw new Error('missing value from map ' + key);
}

export function getFromMapOrCreate<MapIndex, MapValue>(
    map: Map<MapIndex, MapValue> | WeakMap<any, MapValue>,
    index: MapIndex,
    creator: () => MapValue,
): MapValue {
    const val = map.get(index);
    if (val !== undefined) {
        return val;
    }
    const ret = creator();
    map.set(index, ret);
    return ret;
}
