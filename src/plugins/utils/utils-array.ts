import type {
    MaybePromise,
    MaybeReadonly
} from '../../types/index.d.ts';

export function lastOfArray<T>(ar: T[]): T | undefined {
    return ar[ar.length - 1];
}

/**
 * shuffle the given array
 */
export function shuffleArray<T>(arr: T[]): T[] {
    return arr.slice(0).sort(() => (Math.random() - 0.5));
}

export function randomOfArray<T>(arr: T[]): T {
    const randomElement = arr[Math.floor(Math.random() * arr.length)];
    return randomElement;
}


export function toArray<T>(input: T | T[] | Readonly<T> | Readonly<T[]>): T[] {
    return Array.isArray(input) ? (input as any[]).slice(0) : ([input] as any);
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



export function isOneItemOfArrayInOtherArray<T>(ar1: T[], ar2: T[]): boolean {
    for (let i = 0; i < ar1.length; i++) {
        const el = ar1[i];
        const has = ar2.includes(el);
        if (has) {
            return true;
        }
    }
    return false;
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

export function countUntilNotMatching<T>(
    ar: T[],
    matchingFn: (v: T, idx: number) => boolean
): number {
    let count = 0;
    let idx = -1;
    for (const item of ar) {
        idx = idx + 1;
        const matching = matchingFn(item, idx);
        if (matching) {
            count = count + 1;
        } else {
            break;
        }
    }
    return count;
}

export async function asyncFilter<T>(array: T[], predicate: (item: T, index: number, a: T[]) => MaybePromise<boolean>): Promise<T[]> {
    const filters = await Promise.all(
        array.map(predicate)
    );

    return array.filter((...[, index]) => filters[index]);
}

/**
 * @link https://stackoverflow.com/a/3762735
 */
export function sumNumberArray(array: number[]): number {
    let count = 0;
    for (let i = array.length; i--;) {
        count += array[i];
    }
    return count;
}

export function maxOfNumbers(arr: number[]): number {
    return Math.max(...arr);
}

/**
 * @link https://gist.github.com/telekosmos/3b62a31a5c43f40849bb
 */
export function uniqueArray(arrArg: string[]): string[] {
    return arrArg.filter(function (elem, pos, arr) {
        return arr.indexOf(elem) === pos;
    });
}


export function sortByObjectNumberProperty<T>(property: keyof T) {
    return (a: T, b: T) => {
        return (b as any)[property] - (a as any)[property];
    }
}
