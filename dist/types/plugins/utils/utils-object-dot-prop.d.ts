/**
 * Copied from
 * @link https://github.com/sindresorhus/dot-prop/blob/main/index.js
 * because it is currently an esm only module.
 * TODO use the npm package again when RxDB is also fully esm.
 */
/**
 * TODO we need some performance tests and improvements here.
 */
export declare function getProperty(object: any, path: string | string[], value?: any): any;
export declare function setProperty(object: any, path: string, value: any): any;
export declare function deleteProperty(object: any, path: string): boolean | undefined;
export declare function hasProperty(object: any, path: string): boolean;
export declare function deepKeys(object: any): any[];
