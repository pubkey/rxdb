import type {
    DeepReadonlyObject
} from '../../types/index.d.ts';

export function deepFreeze<T>(o: T): T {
    Object.freeze(o);
    Object.getOwnPropertyNames(o).forEach(function (prop) {
        if (
            Object.prototype.hasOwnProperty.call(o, prop) &&
            (o as any)[prop] !== null &&
            (
                typeof (o as any)[prop] === 'object'
                ||
                typeof (o as any)[prop] === 'function'
            ) &&
            !Object.isFrozen((o as any)[prop])
        ) {
            deepFreeze((o as any)[prop]);
        }
    });
    return o;
}



/**
 * To get specific nested path values from objects,
 * RxDB normally uses the 'dot-prop' npm module.
 * But when performance is really relevant, this is not fast enough.
 * Instead we use a monad that can prepare some stuff up front
 * and we can reuse the generated function.
 */
export type ObjectPathMonadFunction<T, R = any> = (obj: T) => R;

/**
 * Cache for objectPathMonad to avoid re-creating closures
 * and re-splitting strings for the same paths.
 */
const objectPathMonadCache = new Map<string, ObjectPathMonadFunction<any>>();

export function objectPathMonad<T, R = any>(objectPath: string): ObjectPathMonadFunction<T, R> {
    let fn = objectPathMonadCache.get(objectPath);
    if (fn) {
        return fn;
    }

    const split = objectPath.split('.');

    // reuse this variable for better performance.
    const splitLength = split.length;

    /**
     * Performance shortcut,
     * if no nested path is used,
     * directly return the field of the object.
     */
    if (splitLength === 1) {
        fn = (obj: T) => (obj as any)[objectPath];
    } else if (splitLength === 2) {
        /**
         * Fast path for 2-segment paths (e.g. 'nested.field').
         * Avoids the loop overhead for the most common nested case.
         */
        const key0 = split[0];
        const key1 = split[1];
        fn = (obj: T) => {
            const v = (obj as any)[key0];
            return v === undefined ? v : v[key1];
        };
    } else if (splitLength === 3) {
        /**
         * Fast path for 3-segment paths (e.g. 'deep.deeper.deepNr').
         * Common in index fields and nested document properties.
         */
        const key0 = split[0];
        const key1 = split[1];
        const key2 = split[2];
        fn = (obj: T) => {
            const v = (obj as any)[key0];
            if (v === undefined) return v;
            const v2 = v[key1];
            return v2 === undefined ? v2 : v2[key2];
        };
    } else if (splitLength === 4) {
        /**
         * Fast path for 4-segment paths.
         * Avoids loop overhead for deeper nested properties.
         */
        const key0 = split[0];
        const key1 = split[1];
        const key2 = split[2];
        const key3 = split[3];
        fn = (obj: T) => {
            const v = (obj as any)[key0];
            if (v === undefined) return v;
            const v2 = v[key1];
            if (v2 === undefined) return v2;
            const v3 = v2[key2];
            return v3 === undefined ? v3 : v3[key3];
        };
    } else if (splitLength === 5) {
        /**
         * Fast path for 5-segment paths.
         * Avoids loop overhead for deeply nested properties.
         */
        const key0 = split[0];
        const key1 = split[1];
        const key2 = split[2];
        const key3 = split[3];
        const key4 = split[4];
        fn = (obj: T) => {
            const v = (obj as any)[key0];
            if (v === undefined) return v;
            const v2 = v[key1];
            if (v2 === undefined) return v2;
            const v3 = v2[key2];
            if (v3 === undefined) return v3;
            const v4 = v3[key3];
            return v4 === undefined ? v4 : v4[key4];
        };
    } else {
        fn = (obj: T) => {
            let currentVal: any = obj;
            for (let i = 0; i < splitLength; ++i) {
                currentVal = currentVal[split[i]];
                if (currentVal === undefined) {
                    return currentVal;
                }
            }
            return currentVal;
        };
    }

    objectPathMonadCache.set(objectPath, fn);
    return fn;
}


export function getFromObjectOrThrow<V>(
    obj: { [k: string]: V; },
    key: string
): V {
    const val = obj[key];
    if (!val) {
        throw new Error('missing value from object ' + key);
    }
    return val;
}

/**
 * returns a flattened object
 * @link https://gist.github.com/penguinboy/762197
 */
export function flattenObject(ob: any) {
    const toReturn: any = {};

    for (const i in ob) {
        if (!Object.prototype.hasOwnProperty.call(ob, i)) continue;
        if ((typeof ob[i]) === 'object') {
            const flatObject = flattenObject(ob[i]);
            for (const x in flatObject) {
                if (!Object.prototype.hasOwnProperty.call(flatObject, x)) continue;
                toReturn[i + '.' + x] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}


/**
 * does a flat copy on the objects,
 * is about 3 times faster than using deepClone.
 * Using the spread operator instead of Object.assign
 * because V8 optimizes spread for plain objects (~4x faster).
 */
export function flatClone<T>(obj: T | DeepReadonlyObject<T> | Readonly<T>): T {
    return { ...obj } as any;
}

/**
 * @link https://stackoverflow.com/a/11509718/3443137
 */
export function firstPropertyNameOfObject(obj: any): string {
    return Object.keys(obj)[0];
}
export function firstPropertyValueOfObject<T>(obj: { [k: string]: T; }): T {
    const key = Object.keys(obj)[0];
    return obj[key];
}


/**
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object if no-array-sort not set
 */
export function sortObject(obj: any, noArraySort = false): any {
    if (!obj) return obj; // do not sort null, false or undefined

    // array
    if (!noArraySort && Array.isArray(obj)) {
        return obj
            .sort((a, b) => {
                if (typeof a === 'string' && typeof b === 'string')
                    return a.localeCompare(b);

                if (typeof a === 'object') return 1;
                else return -1;
            })
            .map(i => sortObject(i, noArraySort));
    }

    // object
    // array is also of type object
    if (typeof obj === 'object' && !Array.isArray(obj)) {
        const out: any = {};
        Object.keys(obj)
            .sort((a, b) => a.localeCompare(b))
            .forEach(key => {
                out[key] = sortObject(obj[key], noArraySort);
            });
        return out;
    }

    // everything else
    return obj;
}



/**
 * Deep clone a plain json object.
 * Does not work with recursive stuff
 * or non-plain-json.
 * IMPORTANT: Performance of this is very important,
 * do not change it without running performance tests!
 *
 * @link https://github.com/zxdong262/deep-copy/blob/master/src/index.ts
 */
function deepClone<T>(src: T | DeepReadonlyObject<T>): T {
    if (!src || typeof src !== 'object') {
        return src;
    }
    if (Array.isArray(src)) {
        const ret = new Array(src.length);
        let i = ret.length;
        while (i--) {
            ret[i] = deepClone(src[i]);
        }
        return ret as any;
    }
    // Blobs are immutable — pass through without cloning, otherwise it gets converted into a normal object, which breaks things.
    if (typeof Blob !== 'undefined' && src instanceof Blob) {
        return src as any;
    }
    const dest: any = {};
    // eslint-disable-next-line guard-for-in
    for (const key in src) {
        dest[key] = deepClone(src[key]);
    }
    return dest;
}
export const clone = deepClone;



/**
 * overwrites the getter with the actual value
 * Mostly used for caching stuff on the first run.
 *
 * Using a value descriptor instead of a getter descriptor
 * so that subsequent property accesses are direct value lookups
 * instead of function calls, which is ~37% faster for reads.
 */
export function overwriteGetterForCaching<ValueType = any>(
    obj: any,
    getterName: string,
    value: ValueType
): ValueType {
    Object.defineProperty(obj, getterName, {
        value
    });
    return value;
}


export function hasDeepProperty(obj: any, property: string): boolean {
    if (obj.hasOwnProperty(property)) {
        return true;
    }

    if (Array.isArray(obj)) {
        const has = !!obj.find(item => hasDeepProperty(item, property));
        return has;
    }

    // Recursively check for property in nested objects
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (hasDeepProperty(obj[key], property)) {
                return true;
            }
        }
    }

    // Return false if 'foobar' is not found at any level
    return false;
}


/**
 * Deeply checks if an object contains any property
 * with the value of undefined
 * If yes, returns the path to it.
 */
export function findUndefinedPath(obj: unknown, parentPath = ''): string | false {
    // If `obj` is not an object or is null, we can't go deeper, so return false
    if (typeof obj !== "object" || obj === null) {
        return false;
    }

    for (const key of Object.keys(obj)) {
        const value = (obj as Record<string, unknown>)[key];
        // Build the full path. For the root level, it's just the key;
        // for nested levels, prepend the parent path followed by a dot.
        const currentPath = parentPath ? `${parentPath}.${key}` : key;

        // If the value is undefined, return the path
        if (typeof value === 'undefined') {
            return currentPath;
        }

        // If the value is an object, recurse to check deeper
        if (typeof value === "object" && value !== null) {
            const result = findUndefinedPath(value, currentPath);
            // If a path was found in the nested object, return it
            if (result) {
                return result;
            }
        }
    }

    // If no property with undefined was found
    return false;
}
