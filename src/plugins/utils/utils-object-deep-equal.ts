/**
 * Optimized deep-equal comparison for JSON-compatible data
 * as used in RxDB documents, schemas, and queries.
 * Based on fast-deep-equal but stripped of RegExp, valueOf,
 * toString, and constructor checks that are unnecessary for JSON data.
 */
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (a && b && typeof a === 'object' && typeof b === 'object') {
        if (Array.isArray(a)) {
            if (!Array.isArray(b)) return false;
            const length = a.length;
            if (length !== b.length) return false;
            for (let i = length; i-- !== 0;) {
                if (!deepEqual(a[i], b[i])) return false;
            }
            return true;
        } else if (Array.isArray(b)) {
            return false;
        }

        const keys = Object.keys(a);
        const length = keys.length;
        if (length !== Object.keys(b).length) return false;

        for (let i = length; i-- !== 0;) {
            const key = keys[i];
            if (!(key in b) || !deepEqual(a[key], b[key])) return false;
        }

        return true;
    }

    // true if both NaN, false otherwise
    return a !== a && b !== b;
}
