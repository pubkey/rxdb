import type {
    DeepReadonlyObject
} from '../../types';

export function deepFreeze<T>(o: T): T {
    Object.freeze(o);
    Object.getOwnPropertyNames(o).forEach(function (prop) {
        if (
            (o as any).hasOwnProperty(prop)
            &&
            (o as any)[prop] !== null
            &&
            (
                typeof (o as any)[prop] === 'object'
                ||
                typeof (o as any)[prop] === 'function'
            )
            &&
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
 * and we can re-use the generated function.
 */
export type ObjectPathMonadFunction<T, R = any> = (obj: T) => R;
export function objectPathMonad<T, R = any>(objectPath: string): ObjectPathMonadFunction<T, R> {
    const split = objectPath.split('.');

    /**
     * Performance shortcut,
     * if no nested path is used,
     * directly return the field of the object.
     */
    if (split.length === 1) {
        return (obj: T) => (obj as any)[objectPath];
    }


    return (obj: T) => {
        let currentVal: any = obj;
        let t = 0;
        while (t < split.length) {
            const subPath = split[t];
            currentVal = currentVal[subPath];
            if (typeof currentVal === 'undefined') {
                return currentVal;
            }
            t++;
        }
        return currentVal;
    };
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
        if (!ob.hasOwnProperty(i)) continue;

        if ((typeof ob[i]) === 'object') {
            const flatObject = flattenObject(ob[i]);
            for (const x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;

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
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
export function flatClone<T>(obj: T | DeepReadonlyObject<T> | Readonly<T>): T {
    return Object.assign({}, obj) as any;
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
        if (obj instanceof RegExp) {
            return obj;
        }

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
 * IMPORANT: Performance of this is very important,
 * do not change it without running performance tests!
 *
 * @link https://github.com/zxdong262/deep-copy/blob/master/src/index.ts
 */
function deepClone<T>(src: T | DeepReadonlyObject<T>): T {
    if (!src) {
        return src;
    }
    if (src === null || typeof (src) !== 'object') {
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
    const dest: any = {};
    // eslint-disable-next-line guard-for-in
    for (const key in src) {
        // TODO we should not be required to deep clone RegEx objects,
        // this must be fixed in RxDB.
        if (src[key] instanceof RegExp) {
            dest[key] = src[key];
        } else {
            dest[key] = deepClone(src[key]);
        }
    }
    return dest;
}
export const clone = deepClone;



/**
 * overwrites the getter with the actual value
 * Mostly used for caching stuff on the first run
 */
export function overwriteGetterForCaching<ValueType = any>(
    obj: any,
    getterName: string,
    value: ValueType
): ValueType {
    Object.defineProperty(obj, getterName, {
        get: function () {
            return value;
        }
    });
    return value;
}



/**
 * used to JSON.stringify() objects that contain a regex
 * @link https://stackoverflow.com/a/33416684 thank you Fabian Jakobs!
 */
export function stringifyFilter(key: string, value: any) {
    if (value instanceof RegExp) {
        return value.toString();
    }
    return value;
}


