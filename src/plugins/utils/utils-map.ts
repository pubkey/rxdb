

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
