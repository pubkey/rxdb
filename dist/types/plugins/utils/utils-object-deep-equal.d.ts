/**
 * Copied from the fast-deep-equal package
 * because it does not support es modules and causes optimization bailouts.
 * TODO use the npm package again when this is merged:
 * @link https://github.com/epoberezkin/fast-deep-equal/pull/105
 */
export declare function deepEqual(a: any, b: any): boolean;
