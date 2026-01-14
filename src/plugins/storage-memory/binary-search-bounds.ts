/**
 * Everything in this file was copied and adapted from
 * @link https://github.com/mikolalysenko/binary-search-bounds
 *
 * We should use the original npm module instead when this bug is fixed:
 * @link https://github.com/mikolalysenko/binary-search-bounds/pull/14
 */



type Compare<T> = ((a: T, b: T) => number | null | undefined);

function ge<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): number {
    let i: number = h + 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        const x: any = a[m];
        const p: any = (c !== undefined) ? c(x, y) : (x - (y as any));
        if (p >= 0) {
            i = m; h = m - 1;
        } else {
            l = m + 1;
        }
    }
    return i;
}

function gt<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): number {
    let i = h + 1;
    while (l <= h) {
        const m = (l + h) >>> 1;
        const x = a[m];
        const p: any = (c !== undefined) ? c(x, y) : ((x as any) - (y as any));
        if (p > 0) {
            i = m; h = m - 1;
        } else {
            l = m + 1;
        }
    }
    return i;
}

function lt<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): number {
    let i = l - 1;
    while (l <= h) {
        const m = (l + h) >>> 1, x = a[m];
        const p: any = (c !== undefined) ? c(x, y) : ((x as any) - (y as any));
        if (p < 0) {
            i = m; l = m + 1;
        } else {
            h = m - 1;
        }
    }
    return i;
}

function le<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): number {
    let i = l - 1;
    while (l <= h) {
        const m = (l + h) >>> 1, x = a[m];
        const p: any = (c !== undefined) ? c(x, y) : ((x as any) - (y as any));
        if (p <= 0) {
            i = m; l = m + 1;
        } else {
            h = m - 1;
        }
    }
    return i;
}

function eq<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any): number {
    while (l <= h) {
        const m = (l + h) >>> 1, x = a[m];
        const p: any = (c !== undefined) ? c(x, y) : ((x as any) - (y as any));
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

function norm<T>(a: T[], y: T, c: Compare<T>, l: any, h: any, f: any) {
    return f(a, y, c, (l === undefined) ? 0 : l | 0, (h === undefined) ? a.length - 1 : h | 0);
}


export function boundGE<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any) {
    return norm(a, y, c, l, h, ge);
}
export function boundGT<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any) {
    return norm(a, y, c, l, h, gt);
}
export function boundLT<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any) {
    return norm(a, y, c, l, h, lt);
}
export function boundLE<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any) {
    return norm(a, y, c, l, h, le);
}
export function boundEQ<T>(a: T[], y: T, c: Compare<T>, l?: any, h?: any) {
    return norm(a, y, c, l, h, eq);
}
