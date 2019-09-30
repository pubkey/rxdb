/**
 * Merges 'from' into 'to' without overwriting existing properties.
 */
export declare function merge(to: any, from: any): any;
/**
 * Same as merge but clones the assigned values.
 */
export declare function mergeClone(to: any, from: any): any;
/**
 * Determines if `arg` is an object.
 */
export declare function isObject(arg: Object | any[] | String | Function | RegExp | any): boolean;
