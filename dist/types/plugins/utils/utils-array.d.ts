import type { MaybePromise, MaybeReadonly } from '../../types/index.d.ts';
export declare function lastOfArray<T>(ar: T[]): T | undefined;
/**
 * shuffle the given array
 */
export declare function shuffleArray<T>(arr: T[]): T[];
export declare function randomOfArray<T>(arr: T[]): T;
export declare function toArray<T>(input: T | T[] | Readonly<T> | Readonly<T[]>): T[];
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
 * returns true if the supplied argument is either an Array<T> or a Readonly<Array<T>>
 */
export declare function isMaybeReadonlyArray(x: any): x is MaybeReadonly<any[]>;
export declare function isOneItemOfArrayInOtherArray<T>(ar1: T[], ar2: T[]): boolean;
/**
 * Use this in array.filter() to remove all empty slots
 * and have the correct typings afterwards.
 * @link https://stackoverflow.com/a/46700791/3443137
 */
export declare function arrayFilterNotEmpty<TValue>(value: TValue | null | undefined): value is TValue;
export declare function countUntilNotMatching<T>(ar: T[], matchingFn: (v: T, idx: number) => boolean): number;
export declare function asyncFilter<T>(array: T[], predicate: (item: T, index: number, a: T[]) => MaybePromise<boolean>): Promise<T[]>;
/**
 * @link https://stackoverflow.com/a/3762735
 */
export declare function sumNumberArray(array: number[]): number;
export declare function maxOfNumbers(arr: number[]): number;
/**
 * Appends the given documents to the given array.
 * This will mutate the first given array.
 * Mostly used as faster alternative to Array.concat()
 * because .concat() is so slow.
 * @link https://www.measurethat.net/Benchmarks/Show/4223/0/array-concat-vs-spread-operator-vs-push#latest_results_block
 *
 * TODO it turns out that in mid 2024 v8 has optimized Array.concat()
 * so it might be faster to just use concat() again:
 * @link https://jsperf.app/qiqawa/10
 */
export declare function appendToArray<T>(ar: T[], add: T[] | readonly T[]): void;
/**
 * @link https://gist.github.com/telekosmos/3b62a31a5c43f40849bb
 */
export declare function uniqueArray(arrArg: string[]): string[];
export declare function sortByObjectNumberProperty<T>(property: keyof T): (a: T, b: T) => number;
