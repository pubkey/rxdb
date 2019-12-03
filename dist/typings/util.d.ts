/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
export declare function pluginMissing(pluginKey: string): Error;
/**
 * this is a very fast hashing but its unsecure
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @return a number as hash-result
 */
export declare function fastUnsecureHash(obj: any): number;
export declare function hash(obj: any): string;
/**
 * generate a new _id as db-primary-key
 */
export declare function generateId(): string;
/**
 * returns a promise that resolves on the next tick
 */
export declare function nextTick(): Promise<void>;
export declare function promiseWait(ms?: number): Promise<void>;
export declare function toPromise<T>(maybePromise: Promise<T> | T): Promise<T>;
export declare function requestIdlePromise(timeout?: null): Promise<unknown>;
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
 * transform a number to a string by using only base58 chars
 * @link https://github.com/matthewmueller/number-to-letter/blob/master/index.js
 * @param nr                                       | 10000000
 * @return the string-representation of the number | '2oMX'
 */
export declare function numberToLetter(nr: number): string;
/**
 * removes trailing and ending dots from the string
 */
export declare function trimDots(str: string): string;
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
 * shuffle the given array
 */
export declare function shuffleArray<T>(arr: T[]): T[];
/**
 * @link https://stackoverflow.com/a/15996017
 */
export declare function removeOneFromArrayIfMatches<T>(ar: T[], condition: (x: T) => boolean): T[];
/**
 * transforms the given adapter into a pouch-compatible object
 */
export declare function adapterObject(adapter: any): any;
declare function recursiveDeepCopy<T>(o: T): T;
export declare const clone: typeof recursiveDeepCopy;
/**
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
export declare function flatClone<T>(obj: T): T;
export declare const isElectronRenderer: boolean;
/**
 * returns a flattened object
 * @link https://gist.github.com/penguinboy/762197
 */
export declare function flattenObject(ob: any): any;
export declare function getHeightOfRevision(revString: string): number;
/**
 * prefix of local documents
 * TODO check if this variable exists somewhere else
 */
export declare const LOCAL_PREFIX: string;
export {};
