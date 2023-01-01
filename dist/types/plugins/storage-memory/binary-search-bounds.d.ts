/**
 * Everything in this file was copied and adapted from
 * @link https://github.com/mikolalysenko/binary-search-bounds
 *
 * TODO We should use the original npm module instead when this bug is fixed:
 * @link https://github.com/mikolalysenko/binary-search-bounds/pull/14
 */
type Compare<T> = ((a: T, b: T) => number | null | undefined);
export declare function boundGE<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): any;
export declare function boundGT<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): any;
export declare function boundLT<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): any;
export declare function boundLE<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): any;
export declare function boundEQ<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): any;
export {};
