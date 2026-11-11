
/**
 * Copied from the fast-deep-equal package
 * because it does not support es modules and causes optimization bailouts.
 * TODO use the npm package again when this is merged:
 * @link https://github.com/epoberezkin/fast-deep-equal/pull/105
 */
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (a && b && typeof a == 'object' && typeof b == 'object') {
        if (a.constructor !== b.constructor) return false;

        let length;
        let i;
        if (Array.isArray(a)) {
            length = a.length;
            if (length !== b.length) return false;
            for (i = length; i-- !== 0;)
                if (!deepEqual(a[i], b[i])) return false;
            return true;
        }


        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        /**
         * Plain data objects can have fields named 'valueOf' or 'toString'
         * that contain non-function values, these must be compared like any other field.
         */
        const valueOf = a.valueOf;
        if (
            valueOf !== Object.prototype.valueOf &&
            typeof valueOf === 'function' &&
            typeof b.valueOf === 'function'
        ) return a.valueOf() === b.valueOf();
        const toString = a.toString;
        if (
            toString !== Object.prototype.toString &&
            typeof toString === 'function' &&
            typeof b.toString === 'function'
        ) return a.toString() === b.toString();

        const keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;

        // Single combined loop: check key existence AND deep-compare in one pass.
        for (i = length; i-- !== 0;) {
            const key = keys[i];
            if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) return false;
        }

        return true;
    }

    // true if both NaN, false otherwise
    return a !== a && b !== b;
}
