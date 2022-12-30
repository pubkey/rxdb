export function runXTimes(xTimes: number, fn: (idx: number) => void) {
    new Array(xTimes).fill(0).forEach((_v, idx) => fn(idx));
}

export function ensureNotFalsy<T>(obj: T | false | undefined | null): T {
    if (!obj) {
        throw new Error('ensureNotFalsy() is falsy');
    }
    return obj;
}

export function ensureInteger(obj: unknown): number {
    if (!Number.isInteger(obj)) {
        throw new Error('ensureInteger() is falsy');
    }
    return obj as number;
}


export function getFromMapOrThrow<K, V>(map: Map<K, V> | WeakMap<any, V>, key: K): V {
    const val = map.get(key);
    if (typeof val === 'undefined') {
        throw new Error('missing value from map ' + key);
    }
    return val;
}

export function getFromMapOrFill<K, V>(
    map: Map<K, V> | WeakMap<any, V>,
    key: K,
    fillerFunction: () => V
): V {
    let value = map.get(key);
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
export const RXJS_SHARE_REPLAY_DEFAULTS = {
    bufferSize: 1,
    refCount: true
};
