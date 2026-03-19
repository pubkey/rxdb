/**
 * Optimized binary search functions for the memory storage.
 * Based on https://github.com/mikolalysenko/binary-search-bounds
 * but with performance improvements:
 * - Removed unnecessary undefined checks for comparator
 * - Inlined the norm() wrapper to avoid extra function calls
 * - Added string-specialized variants to avoid temporary array allocations
 */

type Compare<T> = ((a: T, b: T) => number | null | undefined);

export function boundGE<T>(a: T[], y: T, c: Compare<T>, lo?: any, hi?: any): number {
    let l: number = lo === undefined ? 0 : lo | 0;
    let h: number = hi === undefined ? a.length - 1 : hi | 0;
    let i: number = h + 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        if ((c(a[m], y) as number) >= 0) {
            i = m; h = m - 1;
        } else {
            l = m + 1;
        }
    }
    return i;
}

export function boundGT<T>(a: T[], y: T, c: Compare<T>, lo?: any, hi?: any): number {
    let l: number = lo === undefined ? 0 : lo | 0;
    let h: number = hi === undefined ? a.length - 1 : hi | 0;
    let i = h + 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        if ((c(a[m], y) as number) > 0) {
            i = m; h = m - 1;
        } else {
            l = m + 1;
        }
    }
    return i;
}

export function boundLT<T>(a: T[], y: T, c: Compare<T>, lo?: any, hi?: any): number {
    let l: number = lo === undefined ? 0 : lo | 0;
    let h: number = hi === undefined ? a.length - 1 : hi | 0;
    let i = l - 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        if ((c(a[m], y) as number) < 0) {
            i = m; l = m + 1;
        } else {
            h = m - 1;
        }
    }
    return i;
}

export function boundLE<T>(a: T[], y: T, c: Compare<T>, lo?: any, hi?: any): number {
    let l: number = lo === undefined ? 0 : lo | 0;
    let h: number = hi === undefined ? a.length - 1 : hi | 0;
    let i = l - 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        if ((c(a[m], y) as number) <= 0) {
            i = m; l = m + 1;
        } else {
            h = m - 1;
        }
    }
    return i;
}

export function boundEQ<T>(a: T[], y: T, c: Compare<T>, lo?: any, hi?: any): number {
    let l: number = lo === undefined ? 0 : lo | 0;
    let h: number = hi === undefined ? a.length - 1 : hi | 0;
    while (l <= h) {
        const m = (l + h) >>> 1;
        const p = c(a[m], y) as number;
        if (p === 0) {
            return m;
        }
        if (p <= 0) {
            l = m + 1;
        } else {
            h = m - 1;
        }
    }
    return -1;
}

/**
 * Specialized binary search functions that compare DocWithIndexString
 * entries directly against an index string, avoiding temporary array allocations.
 * Used in query() and count() hot paths.
 */
export function boundGEByIndexString<T extends [string, ...any[]]>(a: T[], indexString: string): number {
    let l = 0;
    let h = a.length - 1;
    let i: number = h + 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        if (a[m][0] >= indexString) {
            i = m; h = m - 1;
        } else {
            l = m + 1;
        }
    }
    return i;
}

export function boundGTByIndexString<T extends [string, ...any[]]>(a: T[], indexString: string): number {
    let l = 0;
    let h = a.length - 1;
    let i = h + 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        if (a[m][0] > indexString) {
            i = m; h = m - 1;
        } else {
            l = m + 1;
        }
    }
    return i;
}

export function boundEQByIndexString<T extends [string, ...any[]]>(a: T[], indexString: string): number {
    let l = 0;
    let h = a.length - 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        const s = a[m][0];
        if (s === indexString) {
            return m;
        }
        if (s < indexString) {
            l = m + 1;
        } else {
            h = m - 1;
        }
    }
    return -1;
}

export function boundLTByIndexString<T extends [string, ...any[]]>(a: T[], indexString: string): number {
    let l = 0;
    let h = a.length - 1;
    let i = l - 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        if (a[m][0] < indexString) {
            i = m; l = m + 1;
        } else {
            h = m - 1;
        }
    }
    return i;
}

export function boundLEByIndexString<T extends [string, ...any[]]>(a: T[], indexString: string): number {
    let l = 0;
    let h = a.length - 1;
    let i = l - 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        if (a[m][0] <= indexString) {
            i = m; l = m + 1;
        } else {
            h = m - 1;
        }
    }
    return i;
}
