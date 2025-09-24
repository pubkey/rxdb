/**
 * Get a random string which can be used for many things in RxDB.
 * The returned string is guaranteed to be a valid database name or collection name
 * and also to be a valid JavaScript variable name.
 *
 * @link http://stackoverflow.com/a/1349426/3443137
 */
export declare function randomToken(length?: number): string;
/**
 * A random string that is never inside of any storage
 */
export declare const RANDOM_STRING = "Fz7SZXPmYJujkzjY1rpXWvlWBqoGAfAX";
/**
 * uppercase first char
 */
export declare function ucfirst(str: string): string;
/**
 * removes trailing and ending dots from the string
 */
export declare function trimDots(str: string): string;
/**
 * @link https://stackoverflow.com/a/44950500/3443137
 */
export declare function lastCharOfString(str: string): string;
/**
 * returns true if the given name is likely a folder path
 */
export declare function isFolderPath(name: string): boolean;
/**
 * @link https://gist.github.com/andreburgaud/6f73fd2d690b629346b8
 * @link https://stackoverflow.com/a/76240378/3443137
 */
export declare function arrayBufferToString(arrayBuffer: Uint8Array<ArrayBuffer>): string;
export declare function stringToArrayBuffer(str: string): Uint8Array<ArrayBuffer>;
export declare function normalizeString(str: string): string;
