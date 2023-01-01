/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 */
export declare function randomCouchString(length?: number): string;
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
 * returns true if the given name is likely a folder path
 */
export declare function isFolderPath(name: string): boolean;
