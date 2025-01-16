export function runXTimes(xTimes: number, fn: (idx: number) => void) {
    new Array(xTimes).fill(0).forEach((_v, idx) => fn(idx));
}

export function ensureNotFalsy<T>(obj: T | false | undefined | null, message?: string): T {
    if (!obj) {
        if (!message) {
            message = '';
        }
        throw new Error('ensureNotFalsy() is falsy: ' + message);
    }
    return obj;
}

export function ensureInteger(obj: unknown): number {
    if (!Number.isInteger(obj)) {
        throw new Error('ensureInteger() is falsy');
    }
    return obj as number;
}

/**
 * Using shareReplay() without settings will not unsubscribe
 * if there are no more subscribers.
 * So we use these defaults.
 * @link https://cartant.medium.com/rxjs-whats-changed-with-sharereplay-65c098843e95
 */
export const RXJS_SHARE_REPLAY_DEFAULTS = {
    bufferSize: 1,
    refCount: true
};



/**
 * Dynamically add a name to a function
 * so that it can later be found in the stack.
 * @link https://stackoverflow.com/a/41854075/3443137
 */
export function nameFunction<T>(name: string, body: T): T {
    // @ts-ignore
    return { [name](...args) { return body.apply(this, args) } }[name];
}


export function customFetchWithFixedHeaders(headers: any){
    function customFetch(url: string | URL, options: any = {}) {
        // Ensure options object exists and headers property is initialized
        options.headers = {
            ...headers,              // include default custom headers
            ...(options.headers || {})            // merge any headers passed in the function call
        };

        // Call the original fetch with the modified options
        return fetch(url, options);
    }
    return customFetch;
}
