import type { BlobBuffer, DeepReadonlyObject } from './types';
import {
    default as deepClone
} from 'clone';

/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
export function pluginMissing(
    pluginKey: string
): Error {
    const keyParts = pluginKey.split('-');
    let pluginName = 'RxDB';
    keyParts.forEach(part => {
        pluginName += ucfirst(part);
    });
    pluginName += 'Plugin';
    return new Error(
        `You are using a function which must be overwritten by a plugin.
        You should either prevent the usage of this function or add the plugin via:
            import { ${pluginName} } from 'rxdb/plugins/${pluginKey}';
            addRxPlugin(${pluginName});
        `
    );
}

/**
 * this is a very fast hashing but its unsecure
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @return a number as hash-result
 */
export function fastUnsecureHash(obj: any): number {
    if (typeof obj !== 'string') obj = JSON.stringify(obj);
    let hashValue = 0,
        i, chr, len;
    if (obj.length === 0) return hashValue;
    for (i = 0, len = obj.length; i < len; i++) {
        chr = obj.charCodeAt(i);
        // tslint:disable-next-line
        hashValue = ((hashValue << 5) - hashValue) + chr;
        // tslint:disable-next-line
        hashValue |= 0; // Convert to 32bit integer
    }
    if (hashValue < 0) hashValue = hashValue * -1;
    return hashValue;
}

/**
 * Does a RxDB-specific hashing of the given data.
 * We use a static salt so using a rainbow-table
 * or google-ing the hash will not work.
 *
 * spark-md5 is used here
 * because pouchdb uses the same
 * and build-size could be reduced by 9kb
 */
import Md5 from 'spark-md5';
export const RXDB_HASH_SALT = 'rxdb-specific-hash-salt';
export function hash(msg: string | any): string {
    if (typeof msg !== 'string') {
        msg = JSON.stringify(msg);
    }
    return Md5.hash(RXDB_HASH_SALT + msg);
}

/**
 * Returns the current unix time in milliseconds
 * Because the accuracy of getTime() in javascript is bad,
 * and we cannot rely on performance.now() on all plattforms,
 * this method implements a way to never return the same value twice.
 * This ensures that when now() is called often, we do not loose the information
 * about which call came first and which came after.
 * Caution: Do not call this too often in a short timespan
 * because it might return 'the future'
 */
let _lastNow: number = 0;
/**
 * Returns the current time in milliseconds,
 * also ensures to not return the same value twice.
 */
export function now(): number {
    let ret = new Date().getTime();
    if (ret <= _lastNow) {
        ret = _lastNow + 1;
    }
    _lastNow = ret;
    return ret;
}

/**
 * returns a promise that resolves on the next tick
 */
export function nextTick(): Promise<void> {
    return new Promise(res => setTimeout(res, 0));
}

export function promiseWait(ms: number = 0): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
}

export function toPromise<T>(maybePromise: Promise<T> | T): Promise<T> {
    if (maybePromise && typeof (maybePromise as any).then === 'function') {
        // is promise
        return maybePromise as any;
    } else {
        return Promise.resolve(maybePromise);
    }
}

export const PROMISE_RESOLVE_TRUE: Promise<true> = Promise.resolve(true);
export const PROMISE_RESOLVE_FALSE: Promise<false> = Promise.resolve(false);
export const PROMISE_RESOLVE_NULL: Promise<null> = Promise.resolve(null);
export const PROMISE_RESOLVE_VOID: Promise<void> = Promise.resolve();

export function requestIdlePromise(timeout: number | null = null) {
    if (
        typeof window === 'object' &&
        (window as any)['requestIdleCallback']
    ) {
        return new Promise(
            res => (window as any)['requestIdleCallback'](res, {
                timeout
            })
        );
    } else {
        return promiseWait(0);
    }
}


/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
 */
export function promiseSeries(
    tasks: Function[],
    initial?: any
): Promise<any[]> {
    return tasks
        .reduce(
            (current, next) => (current as any).then(next),
            Promise.resolve(initial)
        );
}

/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 */
export function requestIdleCallbackIfAvailable(fun: Function): void {
    if (
        typeof window === 'object' &&
        (window as any)['requestIdleCallback']
    ) (window as any)['requestIdleCallback'](fun);
}

/**
 * uppercase first char
 */
export function ucfirst(str: string): string {
    str += '';
    const f = str.charAt(0)
        .toUpperCase();
    return f + str.substr(1);
}

/**
 * removes trailing and ending dots from the string
 */
export function trimDots(str: string): string {
    // start
    while (str.charAt(0) === '.')
        str = str.substr(1);

    // end
    while (str.slice(-1) === '.')
        str = str.slice(0, -1);

    return str;
}


export function ensureNotFalsy<T>(obj: T | false | undefined | null): T {
    if (!obj) {
        throw new Error('ensureNotFalsy() is falsy');
    }
    return obj;
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
        if (obj instanceof RegExp)
            return obj;

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
 * used to JSON.stringify() objects that contain a regex
 * @link https://stackoverflow.com/a/33416684 thank you Fabian Jakobs!
 */
export function stringifyFilter(key: string, value: any) {
    if (value instanceof RegExp) {
        return value.toString();
    }
    return value;
}

/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 */
export function randomCouchString(length: number = 10): string {
    let text = '';
    const possible = 'abcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

/**
 * A random string that is never inside of any storage
 */
export const RANDOM_STRING = 'Fz7SZXPmYJujkzjY1rpXWvlWBqoGAfAX';


export function lastOfArray<T>(ar: T[]): T {
    return ar[ar.length - 1];
}

/**
 * shuffle the given array
 */
export function shuffleArray<T>(arr: T[]): T[] {
    return arr.sort(() => (Math.random() - 0.5));
}

/**
 * Split array with items into smaller arrays with items
 * @link https://stackoverflow.com/a/7273794/3443137
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
    array = array.slice(0);
    const ret: T[][] = [];
    while (array.length) {
        const batch = array.splice(0, batchSize);
        ret.push(batch);
    }
    return ret;
}


/**
 * @link https://stackoverflow.com/a/15996017
 */
export function removeOneFromArrayIfMatches<T>(ar: T[], condition: (x: T) => boolean): T[] {
    ar = ar.slice();
    let i = ar.length;
    let done = false;
    while (i-- && !done) {
        if (condition(ar[i])) {
            done = true;
            ar.splice(i, 1);
        }
    }
    return ar;
}


/**
 * transforms the given adapter into a pouch-compatible object
 */
export function adapterObject(adapter: any): any {
    let adapterObj: any = {
        db: adapter
    };
    if (typeof adapter === 'string') {
        adapterObj = {
            adapter,
            db: undefined,
        };
    }
    return adapterObj;
}


function recursiveDeepCopy<T>(o: T | DeepReadonlyObject<T>): T {
    if (!o) return o;
    return deepClone(o, false) as any;
}
export const clone = recursiveDeepCopy;

/**
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
export function flatClone<T>(obj: T | DeepReadonlyObject<T>): T {
    return Object.assign({}, obj) as any;
}

/**
 * @link https://stackoverflow.com/a/11509718/3443137
 */
export function firstPropertyNameOfObject(obj: any): string {
    return obj[Object.keys(obj)[0]];
}

import isElectron from 'is-electron';
export const isElectronRenderer = isElectron();


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


export function parseRevision(revision: string): { height: number; hash: string } {
    const split = revision.split('-');
    return {
        height: parseInt(split[0], 10),
        hash: split[1]
    }
}

export function getHeightOfRevision(revision: string): number {
    return parseRevision(revision).height;
}

/**
 * Creates a revision string that does NOT include the revision height
 * Copied and adapted from pouchdb-utils/src/rev.js
 * 
 * We use our own function so RxDB usage without pouchdb RxStorage
 * does not include pouchdb code in the bundle.
 */
export function createRevision(docData: any): string {
    const docWithoutRev = Object.assign({}, docData, {
        _rev_tree: undefined
    });

    const diggestString = JSON.stringify(docWithoutRev);
    return Md5.hash(diggestString);
}

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
        get: function () { return value; }
    });
    return value;
}

/**
 * returns true if the given name is likely a folder path
 */
export function isFolderPath(name: string) {
    // do not check, if foldername is given
    if (
        name.includes('/') || // unix
        name.includes('\\') // windows
    ) {
        return true;
    } else {
        return false;
    }
}

export function getFromMapOrThrow<K, V>(map: Map<K, V> | WeakMap<any, V>, key: K): V {
    const val = map.get(key);
    if (!val) {
        throw new Error('missing value from map ' + key);
    }
    return val;
}

export const blobBufferUtil = {
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    createBlobBuffer(
        data: string,
        type: string
    ): BlobBuffer {
        let blobBuffer: any;
        if (isElectronRenderer) {
            // if we are inside of electron-renderer, always use the node-buffer
            return Buffer.from(data, {
                type
            } as any);
        }

        try {
            // for browsers
            blobBuffer = new Blob([data], {
                type
            } as any);
        } catch (e) {
            // for node
            blobBuffer = Buffer.from(data, {
                type
            } as any);
        }

        return blobBuffer;
    },
    isBlobBuffer(data: any): boolean {
        if ((typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) || data instanceof Blob) {
            return true;
        } else {
            return false;
        }
    },
    toString(blobBuffer: BlobBuffer): Promise<string> {
        if (typeof Buffer !== 'undefined' && blobBuffer instanceof Buffer) {
            // node
            return nextTick()
                .then(() => blobBuffer.toString());
        }
        return new Promise(res => {
            // browsers
            const reader = new FileReader();
            reader.addEventListener('loadend', e => {
                const text = (e.target as any).result;
                res(text);
            });

            const blobBufferType = Object.prototype.toString.call(blobBuffer);

            /**
             * in the electron-renderer we have a typed array insteaf of a blob
             * so we have to transform it.
             * @link https://github.com/pubkey/rxdb/issues/1371
             */
            if (blobBufferType === '[object Uint8Array]') {
                blobBuffer = new Blob([blobBuffer]);
            }

            reader.readAsText(blobBuffer as any);
        });
    }
};
