/**
 * this is copied from
 * @link https://github.com/aheckmann/mquery/blob/master/lib/utils.js
 */

/**
 * Merges 'from' into 'to' without overwriting existing properties.
 */
export function merge(to: any, from: any): any {
    Object.keys(from)
        .forEach(key => {
            if (typeof to[key] === 'undefined') {
                to[key] = from[key];
            } else {
                if (isObject(from[key]))
                    merge(to[key], from[key]);
                else
                    to[key] = from[key];
            }
        });
}

/**
 * Determines if `arg` is an object.
 */
export function isObject(arg: Object | any[] | String | Function | RegExp | any): boolean {
    return '[object Object]' === arg.toString();
}
