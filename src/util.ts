/**
 * this contains a mapping to basic dependencies
 * which should be easy to change
 */
import randomToken from 'random-token';
import {
    default as deepClone
} from 'clone';
import {
    PouchDBInstance
} from './types';

/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
export function pluginMissing(
    pluginKey: string
): Error {
    return new Error(
        `You are using a function which must be overwritten by a plugin.
        You should either prevent the usage of this function or add the plugin via:
          - es5-require:
            RxDB.plugin(require('rxdb/plugins/${pluginKey}'))
          - es6-import:
            import ${ucfirst(pluginKey)}Plugin from 'rxdb/plugins/${pluginKey}';
            RxDB.plugin(${ucfirst(pluginKey)}Plugin);
        `
    );
}

/**
 * this is a very fast hashing but its unsecure
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @return a number as hash-result
 */
export function fastUnsecureHash(obj: any): number {
    if (typeof obj !== 'string') obj = JSON.stringify(obj);
    let hashValue = 0,
        i, chr, len;
    if (obj.length === 0) return hashValue;
    for (i = 0, len = obj.length; i < len; i++) {
        chr = obj.charCodeAt(i);
        // tslint:disable-next-line
        hashValue = ((hashValue << 5) - hashValue) + chr;
        // tslint:disable-next-line
        hashValue |= 0; // Convert to 32bit integer
    }
    if (hashValue < 0) hashValue = hashValue * -1;
    return hashValue;
}

/**
 *  spark-md5 is used here
 *  because pouchdb uses the same
 *  and build-size could be reduced by 9kb
 */
import Md5 from 'spark-md5';
export function hash(obj: any): string {
    let msg = obj;
    if (typeof obj !== 'string') msg = JSON.stringify(obj);
    return Md5.hash(msg);
}

/**
 * generate a new _id as db-primary-key
 */
export function generateId(): string {
    return randomToken(10) + ':' + new Date().getTime();
}

/**
 * returns a promise that resolves on the next tick
 */
export function nextTick(): Promise<void> {
    return new Promise(res => setTimeout(res, 0));
}

export function promiseWait(ms: number = 0): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
}

export function toPromise<T>(maybePromise: Promise<T> | T): Promise<T> {
    if (maybePromise && typeof (maybePromise as any).then === 'function') {
        // is promise
        return maybePromise as any;
    } else {
        return Promise.resolve(maybePromise);
    }
}

export function requestIdlePromise(timeout = null) {
    if (
        typeof window === 'object' &&
        (window as any)['requestIdleCallback']
    ) {
        return new Promise(
            res => (window as any)['requestIdleCallback'](res, {
                timeout
            })
        );
    } else
        return Promise.resolve();
}


/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
 */
export function promiseSeries(
    tasks: Function[],
    initial?: any
): Promise<any[]> {
    return tasks
        .reduce(
            (current, next) => (current as any).then(next),
            Promise.resolve(initial)
        );
}

/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 */
export function requestIdleCallbackIfAvailable(fun: Function): void {
    if (
        typeof window === 'object' &&
        (window as any)['requestIdleCallback']
    ) (window as any)['requestIdleCallback'](fun);
}

/**
 * uppercase first char
 */
export function ucfirst(str: string): string {
    str += '';
    const f = str.charAt(0)
        .toUpperCase();
    return f + str.substr(1);
}


/**
 * @link https://de.wikipedia.org/wiki/Base58
 * this does not start with the numbers to generate valid variable-names
 */
const base58Chars: string = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789';
const base58Length: number = base58Chars.length;

/**
 * transform a number to a string by using only base58 chars
 * @link https://github.com/matthewmueller/number-to-letter/blob/master/index.js
 * @param nr                                       | 10000000
 * @return the string-representation of the number | '2oMX'
 */
export function numberToLetter(nr: number): string {
    const digits = [];
    do {
        const v = nr % base58Length;
        digits.push(v);
        nr = Math.floor(nr / base58Length);
    } while (nr-- > 0);

    return digits
        .reverse()
        .map(d => base58Chars[d])
        .join('');
}

/**
 * removes trailing and ending dots from the string
 */
export function trimDots(str: string): string {
    // start
    while (str.charAt(0) === '.')
        str = str.substr(1);

    // end
    while (str.slice(-1) === '.')
        str = str.slice(0, -1);

    return str;
}

/**
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object if no-array-sort not set
 */
export function sortObject(obj: any, noArraySort = false): any {
    if (!obj) return obj; // do not sort null, false or undefined

    // array
    if (!noArraySort && Array.isArray(obj)) {
        return obj
            .sort((a, b) => {
                if (typeof a === 'string' && typeof b === 'string')
                    return a.localeCompare(b);

                if (typeof a === 'object') return 1;
                else return -1;
            })
            .map(i => sortObject(i));
    }

    // object
    if (typeof obj === 'object') {
        if (obj instanceof RegExp)
            return obj;

        const out: any = {};
        Object.keys(obj)
            .sort((a, b) => a.localeCompare(b))
            .forEach(key => {
                out[key] = sortObject(obj[key]);
            });
        return out;
    }

    // everything else
    return obj;
}


/**
 * used to JSON.stringify() objects that contain a regex
 * @link https://stackoverflow.com/a/33416684 thank you Fabian Jakobs!
 */
export function stringifyFilter(key: string, value: any) {
    if (value instanceof RegExp)
        return value.toString();
    return value;
}

/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 */
export function randomCouchString(length: number = 10): string {
    let text = '';
    const possible = 'abcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

/**
 * shuffle the given array
 */
export function shuffleArray<T>(arr: T[]): T[] {
    return arr.sort(() => (Math.random() - 0.5));
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
 * transforms the given adapter into a pouch-compatible object
 */
export function adapterObject(adapter: any): any {
    let adapterObj: any = {
        db: adapter
    };
    if (typeof adapter === 'string') {
        adapterObj = {
            adapter
        };
    }
    return adapterObj;
}


function recursiveDeepCopy<T>(o: T): T {
    if (!o) return o;
    return deepClone(o, false);
}
export const clone = recursiveDeepCopy;

/**
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
export function flatClone<T>(obj: T): T {
    return Object.assign({}, obj);
}


import isElectron from 'is-electron';
export const isElectronRenderer = isElectron();


/**
 * returns a flattened object
 * @link https://gist.github.com/penguinboy/762197
 */
export function flattenObject(ob: any) {
    const toReturn: any = {};

    for (const i in ob) {
        if (!ob.hasOwnProperty(i)) continue;

        if ((typeof ob[i]) === 'object') {
            const flatObject = flattenObject(ob[i]);
            for (const x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;

                toReturn[i + '.' + x] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

export function getHeightOfRevision(revString: string): number {
    const first = revString.split('-')[0];
    return parseInt(first, 10);
}


/**
 * prefix of local documents
 * TODO check if this variable exists somewhere else
 */
export const LOCAL_PREFIX: string = '_local/';
