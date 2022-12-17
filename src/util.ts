import type {
    BlobBuffer,
    DeepReadonlyObject,
    MaybeReadonly,
    PlainJsonError,
    RxDocumentData,
    RxDocumentMeta,
    RxError,
    RxTypeError,
    StringKeys
} from './types';
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
 * This is a very fast hash method
 * but it is not cryptographically secure.
 * For each run it will append a number between 0 and 2147483647 (=biggest 32 bit int).
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @return a string as hash-result
 */
export function fastUnsecureHash(
    inputString: string,
    // used to test the polyfill
    doNotUseTextEncoder?: boolean
): string {
    let hashValue = 0,
        i, chr, len;

    /**
     * For better performance we first transform all
     * chars into their ascii numbers at once.
     *
     * This is what makes the murmurhash implementation such fast.
     * @link https://github.com/perezd/node-murmurhash/blob/master/murmurhash.js#L4
     */
    let encoded: Uint8Array | number[];

    /**
     * All modern browsers support the TextEncoder
     * @link https://caniuse.com/textencoder
     * But to make RxDB work in other JavaScript runtimes,
     * like when using it in flutter or QuickJS, we need to
     * make it work even when there is no TextEncoder.
     */
    if (typeof TextEncoder !== 'undefined' && !doNotUseTextEncoder) {
        encoded = new TextEncoder().encode(inputString);
    } else {
        encoded = [];
        for (let j = 0; j < inputString.length; j++) {
            encoded.push(inputString.charCodeAt(j));
        }
    }

    for (i = 0, len = inputString.length; i < len; i++) {
        chr = encoded[i];
        hashValue = ((hashValue << 5) - hashValue) + chr;
        hashValue |= 0; // Convert to 32bit integer
    }
    if (hashValue < 0) {
        hashValue = hashValue * -1;
    }

    /**
     * To make the output smaller
     * but still have it to represent the same value,
     * we use the biggest radix of 36 instead of just
     * transforming it into a hex string.
     */
    return hashValue.toString(36);
}


/**
 * Default hash method used to create revision hashes
 * that do not have to be cryptographically secure.
 * IMPORTANT: Changing the default hashing method
 * requires a BREAKING change!
 */
export function defaultHashFunction(input: string): string {
    return fastUnsecureHash(input);
}

/**
 * Returns the current unix time in milliseconds (with two decmials!)
 * Because the accuracy of getTime() in javascript is bad,
 * and we cannot rely on performance.now() on all platforms,
 * this method implements a way to never return the same value twice.
 * This ensures that when now() is called often, we do not loose the information
 * about which call came first and which came after.
 *
 * We had to move from having no decimals, to having two decimal
 * because it turned out that some storages are such fast that
 * calling this method too often would return 'the future'.
 */
let _lastNow: number = 0;
/**
 * Returns the current time in milliseconds,
 * also ensures to not return the same value twice.
 */
export function now(): number {
    let ret = new Date().getTime();
    ret = ret + 0.01;
    if (ret <= _lastNow) {
        ret = _lastNow + 0.01;
    }

    /**
     * Strip the returned number to max two decimals.
     * In theory we would not need this but
     * in practice JavaScript has no such good number precision
     * so rounding errors could add another decimal place.
     */
    const twoDecimals = parseFloat(ret.toFixed(2));

    _lastNow = twoDecimals;
    return twoDecimals;
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


export function lastOfArray<T>(ar: T[]): T | undefined {
    return ar[ar.length - 1];
}

/**
 * shuffle the given array
 */
export function shuffleArray<T>(arr: T[]): T[] {
    return arr.sort(() => (Math.random() - 0.5));
}

export function toArray<T>(input: T | T[] | Readonly<T> | Readonly<T[]>): T[] {
    return Array.isArray(input) ? (input as any[]).slice(0) : [input];
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
    return Object.keys(obj)[0];
}
export function firstPropertyValueOfObject<T>(obj: { [k: string]: T; }): T {
    const key = Object.keys(obj)[0];
    return obj[key];
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


export function parseRevision(revision: string): { height: number; hash: string; } {
    const split = revision.split('-');
    return {
        height: parseInt(split[0], 10),
        hash: split[1]
    };
}

export function getHeightOfRevision(revision: string): number {
    return parseRevision(revision).height;
}

/**
 * Creates the next write revision for a given document.
 */
export function createRevision<RxDocType>(
    databaseInstanceToken: string,
    previousDocData?: RxDocumentData<RxDocType>
): string {
    const previousRevision = previousDocData ? previousDocData._rev : null;
    const previousRevisionHeigth = previousRevision ? parseRevision(previousRevision).height : 0;
    const newRevisionHeight = previousRevisionHeigth + 1;
    return newRevisionHeight + '-' + databaseInstanceToken;
}


/**
 * Faster way to check the equalness of document lists
 * compared to doing a deep-equal.
 * Here we only check the ids and revisions.
 */
export function areRxDocumentArraysEqual<RxDocType>(
    primaryPath: StringKeys<RxDocumentData<RxDocType>>,
    ar1: RxDocumentData<RxDocType>[],
    ar2: RxDocumentData<RxDocType>[]
): boolean {
    if (ar1.length !== ar2.length) {
        return false;
    }
    let i = 0;
    const len = ar1.length;
    while (i < len) {
        const row1 = ar1[i];
        const row2 = ar2[i];
        i++;

        if (
            row1._rev !== row2._rev ||
            row1[primaryPath] !== row2[primaryPath]
        ) {
            return false;
        }
    }
    return true;
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
        get: function () {
            return value;
        }
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
    if (typeof val === 'undefined') {
        throw new Error('missing value from map ' + key);
    }
    return val;
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
 * returns true if the supplied argument is either an Array<T> or a Readonly<Array<T>>
 */
export function isMaybeReadonlyArray(x: any): x is MaybeReadonly<any[]> {
    // While this looks strange, it's a workaround for an issue in TypeScript:
    // https://github.com/microsoft/TypeScript/issues/17002
    //
    // The problem is that `Array.isArray` as a type guard returns `false` for a readonly array,
    // but at runtime the object is an array and the runtime call to `Array.isArray` would return `true`.
    // The type predicate here allows for both `Array<T>` and `Readonly<Array<T>>` to pass a type check while
    // still performing runtime type inspection.
    return Array.isArray(x);
}


/**
 * Use this in array.filter() to remove all empty slots
 * and have the correct typings afterwards.
 * @link https://stackoverflow.com/a/46700791/3443137
 */
export function arrayFilterNotEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    if (value === null || value === undefined) {
        return false;
    }
    return true;
}


/**
 * NO! We cannot just use btoa() and atob()
 * because they do not work correctly with binary data.
 * @link https://stackoverflow.com/q/30106476/3443137
 */
import { encode, decode } from 'js-base64';

/**
 * atob() and btoa() do not work well with non ascii chars,
 * so we have to use these helper methods instead.
 * @link https://stackoverflow.com/a/30106551/3443137
 */
// Encoding UTF8 -> base64
export function b64EncodeUnicode(str: string) {
    return encode(str);
}

// Decoding base64 -> UTF8
export function b64DecodeUnicode(str: string) {
    return decode(str);
}

/**
 * @link https://stackoverflow.com/a/9458996/3443137
 */
export function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}


/**
 * This is an abstraction over the Blob/Buffer data structure.
 * We need this because it behaves different in different JavaScript runtimes.
 * Since RxDB 13.0.0 we switch to Blob-only because Node.js does not support
 * the Blob data structure which is also supported by the browsers.
 */
export const blobBufferUtil = {
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    createBlobBuffer(
        data: string,
        type: string
    ): BlobBuffer {
        const blobBuffer = new Blob([data], {
            type
        });
        return blobBuffer;
    },
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    async createBlobBufferFromBase64(
        base64String: string,
        type: string
    ): Promise<BlobBuffer> {
        const base64Response = await fetch(`data:${type};base64,${base64String}`);
        const blob = await base64Response.blob();
        return blob;

    },
    isBlobBuffer(data: any): boolean {
        if (data instanceof Blob || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
            return true;
        } else {
            return false;
        }
    },
    toString(blobBuffer: BlobBuffer | string): Promise<string> {
        /**
         * in the electron-renderer we have a typed array insteaf of a blob
         * so we have to transform it.
         * @link https://github.com/pubkey/rxdb/issues/1371
         */
        const blobBufferType = Object.prototype.toString.call(blobBuffer);
        if (blobBufferType === '[object Uint8Array]') {
            blobBuffer = new Blob([blobBuffer]);
        }
        if (typeof blobBuffer === 'string') {
            return Promise.resolve(blobBuffer);
        }

        return (blobBuffer as Blob).text();
    },
    async toBase64String(blobBuffer: BlobBuffer | string): Promise<string> {
        if (typeof blobBuffer === 'string') {
            return blobBuffer;
        }

        /**
         * in the electron-renderer we have a typed array insteaf of a blob
         * so we have to transform it.
         * @link https://github.com/pubkey/rxdb/issues/1371
         */
        const blobBufferType = Object.prototype.toString.call(blobBuffer);
        if (blobBufferType === '[object Uint8Array]') {
            blobBuffer = new Blob([blobBuffer]);
        }

        const arrayBuffer = await fetch(URL.createObjectURL(blobBuffer as Blob)).then(res => res.arrayBuffer());
        return arrayBufferToBase64(arrayBuffer);
    },
    size(blobBuffer: BlobBuffer): number {
        return (blobBuffer as Blob).size;
    }
};

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

/**
 * We use 1 as minimum so that the value is never falsy.
 * This const is used in several places because querying
 * with a value lower then the minimum could give false results.
 */
export const RX_META_LWT_MINIMUM = 1;

export function getDefaultRxDocumentMeta(): RxDocumentMeta {
    return {
        /**
         * Set this to 1 to not waste performance
         * while calling new Date()..
         * The storage wrappers will anyway update
         * the lastWrite time while calling transformDocumentDataFromRxDBToRxStorage()
         */
        lwt: RX_META_LWT_MINIMUM
    };
}

/**
 * Returns a revision that is not valid.
 * Use this to have correct typings
 * while the storage wrapper anyway will overwrite the revision.
 */
export function getDefaultRevision(): string {
    /**
     * Use a non-valid revision format,
     * to ensure that the RxStorage will throw
     * when the revision is not replaced downstream.
     */
    return '';
}


export function getSortDocumentsByLastWriteTimeComparator<RxDocType>(primaryPath: string) {
    return (a: RxDocumentData<RxDocType>, b: RxDocumentData<RxDocType>) => {
        if (a._meta.lwt === b._meta.lwt) {
            if ((b as any)[primaryPath] < (a as any)[primaryPath]) {
                return 1;
            } else {
                return -1;
            }
        } else {
            return a._meta.lwt - b._meta.lwt;
        }
    };
}
export function sortDocumentsByLastWriteTime<RxDocType>(
    primaryPath: string,
    docs: RxDocumentData<RxDocType>[]
): RxDocumentData<RxDocType>[] {
    return docs.sort(getSortDocumentsByLastWriteTimeComparator(primaryPath));
}



/**
 * To get specific nested path values from objects,
 * RxDB normally uses the 'object-path' npm module.
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



export function errorToPlainJson(err: Error | TypeError | RxError | RxTypeError): PlainJsonError {
    const ret: PlainJsonError = {
        name: err.name,
        message: err.message,
        rxdb: (err as any).rxdb,
        parameters: (err as RxError).parameters,
        code: (err as RxError).code,
        // stack must be last to make it easier to read the json in a console.
        stack: err.stack
    };
    return ret;
}
