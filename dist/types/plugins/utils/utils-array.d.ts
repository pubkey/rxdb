import type { MaybeReadonly } from '../../types';
export declare function lastOfArray<T>(ar: T[]): T | undefined;
/**
 * shuffle the given array
 */
export declare function shuffleArray<T>(arr: T[]): T[];
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
/**
 * Use this in array.filter() to remove all empty slots
 * and have the correct typings afterwards.
 * @link https://stackoverflow.com/a/46700791/3443137
 */
export declare function arrayFilterNotEmpty<TValue>(value: TValue | null | undefined): value is TValue;
