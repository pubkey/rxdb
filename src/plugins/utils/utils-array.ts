import type {
    MaybeReadonly
} from '../../types';

export function lastOfArray<T>(ar: T[]): T | undefined {
    return ar[ar.length - 1];
}

/**
 * shuffle the given array
 */
export function shuffleArray<T>(arr: T[]): T[] {
    return arr.sort(() => (Math.random() - 0.5));
}

export function toArray<T>(input: T | T[] | Readonly<T> | Readonly<T[]>): T[] {
    return Array.isArray(input) ? (input as any[]).slice(0) : [input];
}

/**
 * Split array with items into smaller arrays with items
 * @link https://stackoverflow.com/a/7273794/3443137
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
    array = array.slice(0);
    const ret: T[][] = [];
    while (array.length) {
        const batch = array.splice(0, batchSize);
        ret.push(batch);
    }
    return ret;
}

/**
 * @link https://stackoverflow.com/a/15996017
 */
export function removeOneFromArrayIfMatches<T>(ar: T[], condition: (x: T) => boolean): T[] {
    ar = ar.slice();
    let i = ar.length;
    let done = false;
    while (i-- && !done) {
        if (condition(ar[i])) {
            done = true;
            ar.splice(i, 1);
        }
    }
    return ar;
}

/**
 * returns true if the supplied argument is either an Array<T> or a Readonly<Array<T>>
 */
export function isMaybeReadonlyArray(x: any): x is MaybeReadonly<any[]> {
    // While this looks strange, it's a workaround for an issue in TypeScript:
    // https://github.com/microsoft/TypeScript/issues/17002
    //
    // The problem is that `Array.isArray` as a type guard returns `false` for a readonly array,
    // but at runtime the object is an array and the runtime call to `Array.isArray` would return `true`.
    // The type predicate here allows for both `Array<T>` and `Readonly<Array<T>>` to pass a type check while
    // still performing runtime type inspection.
    return Array.isArray(x);
}





/**
 * Use this in array.filter() to remove all empty slots
 * and have the correct typings afterwards.
 * @link https://stackoverflow.com/a/46700791/3443137
 */
export function arrayFilterNotEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    if (value === null || value === undefined) {
        return false;
    }
    return true;
}
