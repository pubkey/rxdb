import type { DeepReadonlyObject } from '../../types/index.d.ts';
export declare function deepFreeze<T>(o: T): T;
/**
 * To get specific nested path values from objects,
 * RxDB normally uses the 'dot-prop' npm module.
 * But when performance is really relevant, this is not fast enough.
 * Instead we use a monad that can prepare some stuff up front
 * and we can reuse the generated function.
 */
export type ObjectPathMonadFunction<T, R = any> = (obj: T) => R;
export declare function objectPathMonad<T, R = any>(objectPath: string): ObjectPathMonadFunction<T, R>;
export declare function getFromObjectOrThrow<V>(obj: {
    [k: string]: V;
}, key: string): V;
/**
 * returns a flattened object
 * @link https://gist.github.com/penguinboy/762197
 */
export declare function flattenObject(ob: any): any;
/**
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
export declare function flatClone<T>(obj: T | DeepReadonlyObject<T> | Readonly<T>): T;
/**
 * @link https://stackoverflow.com/a/11509718/3443137
 */
export declare function firstPropertyNameOfObject(obj: any): string;
export declare function firstPropertyValueOfObject<T>(obj: {
    [k: string]: T;
}): T;
/**
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object if no-array-sort not set
 */
export declare function sortObject(obj: any, noArraySort?: boolean): any;
/**
 * Deep clone a plain json object.
 * Does not work with recursive stuff
 * or non-plain-json.
 * IMPORTANT: Performance of this is very important,
 * do not change it without running performance tests!
 *
 * @link https://github.com/zxdong262/deep-copy/blob/master/src/index.ts
 */
declare function deepClone<T>(src: T | DeepReadonlyObject<T>): T;
export declare const clone: typeof deepClone;
/**
 * overwrites the getter with the actual value
 * Mostly used for caching stuff on the first run
 */
export declare function overwriteGetterForCaching<ValueType = any>(obj: any, getterName: string, value: ValueType): ValueType;
export declare function hasDeepProperty(obj: any, property: string): boolean;
/**
 * Deeply checks if an object contains any property
 * with the value of undefined
 * If yes, returns the path to it.
 */
export declare function findUndefinedPath(obj: unknown, parentPath?: string): string | false;
export {};
