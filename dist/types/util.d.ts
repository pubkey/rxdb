import type { BlobBuffer, DeepReadonlyObject, HashFunction, MaybeReadonly, PlainJsonError, RxDocumentData, RxDocumentMeta, RxDocumentWriteData, RxError, RxTypeError, StringKeys } from './types';
/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
export declare function pluginMissing(pluginKey: string): Error;
/**
 * This is a very fast hash method
 * but it is not cryptographically secure.
 * For each run it will append a number between 0 and 2147483647 (=biggest 32 bit int).
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @return a string as hash-result
 */
export declare function fastUnsecureHash(inputString: string, doNotUseTextEncoder?: boolean): string;
/**
 * Default hash method used to create revision hashes
 * that do not have to be cryptographically secure.
 * IMPORTANT: Changing the default hashing method
 * requires a BREAKING change!
 */
export declare function defaultHashFunction(input: string): string;
/**
 * Returns the current time in milliseconds,
 * also ensures to not return the same value twice.
 */
export declare function now(): number;
/**
 * returns a promise that resolves on the next tick
 */
export declare function nextTick(): Promise<void>;
export declare function promiseWait(ms?: number): Promise<void>;
export declare function toPromise<T>(maybePromise: Promise<T> | T): Promise<T>;
export declare const PROMISE_RESOLVE_TRUE: Promise<true>;
export declare const PROMISE_RESOLVE_FALSE: Promise<false>;
export declare const PROMISE_RESOLVE_NULL: Promise<null>;
export declare const PROMISE_RESOLVE_VOID: Promise<void>;
export declare function requestIdlePromise(timeout?: number | null): Promise<unknown>;
/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
 */
export declare function promiseSeries(tasks: Function[], initial?: any): Promise<any[]>;
/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 */
export declare function requestIdleCallbackIfAvailable(fun: Function): void;
/**
 * uppercase first char
 */
export declare function ucfirst(str: string): string;
/**
 * removes trailing and ending dots from the string
 */
export declare function trimDots(str: string): string;
export declare function runXTimes(xTimes: number, fn: (idx: number) => void): void;
export declare function ensureNotFalsy<T>(obj: T | false | undefined | null): T;
export declare function ensureInteger(obj: unknown): number;
/**
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object if no-array-sort not set
 */
export declare function sortObject(obj: any, noArraySort?: boolean): any;
/**
 * used to JSON.stringify() objects that contain a regex
 * @link https://stackoverflow.com/a/33416684 thank you Fabian Jakobs!
 */
export declare function stringifyFilter(key: string, value: any): any;
/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 */
export declare function randomCouchString(length?: number): string;
/**
 * A random string that is never inside of any storage
 */
export declare const RANDOM_STRING = "Fz7SZXPmYJujkzjY1rpXWvlWBqoGAfAX";
export declare function lastOfArray<T>(ar: T[]): T | undefined;
/**
 * shuffle the given array
 */
export declare function shuffleArray<T>(arr: T[]): T[];
/**
 * Split array with items into smaller arrays with items
 * @link https://stackoverflow.com/a/7273794/3443137
 */
export declare function batchArray<T>(array: T[], batchSize: number): T[][];
/**
 * @link https://stackoverflow.com/a/15996017
 */
export declare function removeOneFromArrayIfMatches<T>(ar: T[], condition: (x: T) => boolean): T[];
/**
 * transforms the given adapter into a pouch-compatible object
 */
export declare function adapterObject(adapter: any): any;
/**
 * Deep clone a plain json object.
 * Does not work with recursive stuff
 * or non-plain-json.
 * IMPORANT: Performance of this is very important,
 * do not change it without running performance tests!
 *
 * @link https://github.com/zxdong262/deep-copy/blob/master/src/index.ts
 */
declare function deepClone<T>(src: T | DeepReadonlyObject<T>): T;
export declare const clone: typeof deepClone;
/**
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
export declare function flatClone<T>(obj: T | DeepReadonlyObject<T>): T;
/**
 * @link https://stackoverflow.com/a/11509718/3443137
 */
export declare function firstPropertyNameOfObject(obj: any): string;
export declare function firstPropertyValueOfObject<T>(obj: {
    [k: string]: T;
}): T;
/**
 * returns a flattened object
 * @link https://gist.github.com/penguinboy/762197
 */
export declare function flattenObject(ob: any): any;
export declare function parseRevision(revision: string): {
    height: number;
    hash: string;
};
export declare function getHeightOfRevision(revision: string): number;
/**
 * Creates the next write revision for a given document.
 */
export declare function createRevision<RxDocType>(hashFunction: HashFunction, docData: RxDocumentWriteData<RxDocType> & {
    /**
     * Passing a revision is optional here,
     * because it is anyway not needed to calculate
     * the new revision.
     */
    _rev?: string;
}, previousDocData?: RxDocumentData<RxDocType>): string;
/**
 * Faster way to check the equalness of document lists
 * compared to doing a deep-equal.
 * Here we only check the ids and revisions.
 */
export declare function areRxDocumentArraysEqual<RxDocType>(primaryPath: StringKeys<RxDocumentData<RxDocType>>, ar1: RxDocumentData<RxDocType>[], ar2: RxDocumentData<RxDocType>[]): boolean;
/**
 * overwrites the getter with the actual value
 * Mostly used for caching stuff on the first run
 */
export declare function overwriteGetterForCaching<ValueType = any>(obj: any, getterName: string, value: ValueType): ValueType;
/**
 * returns true if the given name is likely a folder path
 */
export declare function isFolderPath(name: string): boolean;
export declare function getFromMapOrThrow<K, V>(map: Map<K, V> | WeakMap<any, V>, key: K): V;
export declare function getFromObjectOrThrow<V>(obj: {
    [k: string]: V;
}, key: string): V;
/**
 * returns true if the supplied argument is either an Array<T> or a Readonly<Array<T>>
 */
export declare function isMaybeReadonlyArray(x: any): x is MaybeReadonly<any[]>;
/**
 * Use this in array.filter() to remove all empty slots
 * and have the correct typings afterwards.
 * @link https://stackoverflow.com/a/46700791/3443137
 */
export declare function arrayFilterNotEmpty<TValue>(value: TValue | null | undefined): value is TValue;
/**
 * atob() and btoa() do not work well with non ascii chars,
 * so we have to use these helper methods instead.
 * @link https://stackoverflow.com/a/30106551/3443137
 */
export declare function b64EncodeUnicode(str: string): string;
export declare function b64DecodeUnicode(str: string): string;
/**
 * @link https://stackoverflow.com/a/9458996/3443137
 */
export declare function arrayBufferToBase64(buffer: ArrayBuffer): string;
/**
 * This is an abstraction over the Blob/Buffer data structure.
 * We need this because it behaves different in different JavaScript runtimes.
 * Since RxDB 13.0.0 we switch to Blob-only because Node.js does not support
 * the Blob data structure which is also supported by the browsers.
 */
export declare const blobBufferUtil: {
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    createBlobBuffer(data: string, type: string): BlobBuffer;
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     */
    createBlobBufferFromBase64(base64String: string, type: string): Promise<BlobBuffer>;
    isBlobBuffer(data: any): boolean;
    toString(blobBuffer: BlobBuffer | string): Promise<string>;
    toBase64String(blobBuffer: BlobBuffer | string): Promise<string>;
    size(blobBuffer: BlobBuffer): number;
};
/**
 * Using shareReplay() without settings will not unsubscribe
 * if there are no more subscribers.
 * So we use these defaults.
 * @link https://cartant.medium.com/rxjs-whats-changed-with-sharereplay-65c098843e95
 */
export declare const RXJS_SHARE_REPLAY_DEFAULTS: {
    bufferSize: number;
    refCount: boolean;
};
/**
 * We use 1 as minimum so that the value is never falsy.
 * This const is used in several places because querying
 * with a value lower then the minimum could give false results.
 */
export declare const RX_META_LWT_MINIMUM = 1;
export declare function getDefaultRxDocumentMeta(): RxDocumentMeta;
/**
 * Returns a revision that is not valid.
 * Use this to have correct typings
 * while the storage wrapper anyway will overwrite the revision.
 */
export declare function getDefaultRevision(): string;
export declare function getSortDocumentsByLastWriteTimeComparator<RxDocType>(primaryPath: string): (a: RxDocumentData<RxDocType>, b: RxDocumentData<RxDocType>) => number;
export declare function sortDocumentsByLastWriteTime<RxDocType>(primaryPath: string, docs: RxDocumentData<RxDocType>[]): RxDocumentData<RxDocType>[];
/**
 * To get specific nested path values from objects,
 * RxDB normally uses the 'object-path' npm module.
 * But when performance is really relevant, this is not fast enough.
 * Instead we use a monad that can prepare some stuff up front
 * and we can re-use the generated function.
 */
export declare type ObjectPathMonadFunction<T, R = any> = (obj: T) => R;
export declare function objectPathMonad<T, R = any>(objectPath: string): ObjectPathMonadFunction<T, R>;
export declare function deepFreeze<T>(o: T): T;
export declare function errorToPlainJson(err: Error | TypeError | RxError | RxTypeError): PlainJsonError;
export {};
