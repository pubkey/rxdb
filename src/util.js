/**
 * this contains a mapping to basic dependencies
 * which should be easy to change
 */



import {
    default as randomToken
} from 'random-token';
import {
    Validator
} from 'jsonschema';


// rxjs cherry-pick
import {
    Observable
} from 'rxjs/Observable';
import {
    Subject
} from 'rxjs/Subject';
import {
    BehaviorSubject
} from 'rxjs/BehaviorSubject';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/timeout';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/distinctUntilChanged';

export const Rx = {
    Observable,
    Subject,
    BehaviorSubject
};



// crypto-js
import * as crypto_AES from 'crypto-js/aes';
import * as crypto_enc from 'crypto-js/enc-utf8';
export function encrypt(value, password) {
    const encrypted = crypto_AES.encrypt(value, password);
    return encrypted.toString();
}
export function decrypt(ciphertext, password) {
    const decrypted = crypto_AES.decrypt(ciphertext, password);
    return decrypted.toString(crypto_enc);
}


/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
export function isLevelDown(adapter) {
    if (!adapter ||
        typeof adapter.super_ !== 'function' ||
        typeof adapter.destroy !== 'function')
        throw new Error('given leveldown is no valid adapter');
}


export async function assertThrowsAsync(test, error) {
    try {
        await test();
    } catch (e) {
        if (!error || e instanceof error)
            return 'util.assertThrowsAsync(): everything is fine';
    }
    throw new Error(
        'util.assertThrowsAsync(): Missing rejection' +
        (error ? ' with ' + error.name : '')
    );
}

/**
 * this is a very fast hashing but its unsecure
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @param  {object} obj
 * @return {number} a number as hash-result
 */
export function fastUnsecureHash(obj) {
    if (typeof obj !== 'string') obj = JSON.stringify(obj);
    let hash = 0,
        i, chr, len;
    if (obj.length === 0) return hash;
    for (i = 0, len = obj.length; i < len; i++) {
        chr = obj.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    if (hash < 0) hash = hash * -1;
    return hash;
}


/**
 *  spark-md5 is used here
 *  because pouchdb uses the same
 *  and build-size could be reduced by 9kb
 *  TODO update spark-md5 to 2.0.2 after pouchdb-find does
 *  @link https://github.com/nolanlawson/pouchdb-find/pull/233
 */
const Md5 = require('spark-md5');
export function hash(obj) {
    const salt = 'dW8a]Qsà<<>0lW6{3Fqxp3IdößBh:Fot';
    let msg = obj;
    if (typeof obj !== 'string') msg = JSON.stringify(obj);
    return Md5.hash(msg);
}



/**
 * generate a new _id as db-primary-key
 * @return {string}
 */
export function generate_id() {
    return randomToken(10) + ':' + new Date().getTime();
}

let VALIDATOR;
export function jsonSchemaValidate(schema, obj) {
    if (!VALIDATOR) VALIDATOR = new Validator();

    const valid = VALIDATOR.validate(obj, schema);
    if (valid.errors.length > 0) {
        throw new Error(JSON.stringify({
            name: 'object does not match schema',
            errors: valid.errors,
            object: obj,
            schema: schema
        }));
    }
}

/**
 * [promiseWait description]
 * @param  {Number}  [ms=0]
 * @return {Promise}
 */
export async function promiseWait(ms = 0) {
    return new Promise(res => setTimeout(res, ms));
}


/**
 * this returns a promise and the resolve-function
 * which can be called to resolve before the timeout
 * @param  {Number}  [ms=0] [description]
 */
export function promiseWaitResolveable(ms = 0) {
    const ret = {};
    ret.promise = new Promise(res => {
        ret.resolve = () => res();
        setTimeout(res, ms);
    });
    return ret;
}



export function filledArray(size = 0) {
    const ret = [];
    while (ret.length < size)
        ret.push(ret.lenght);
    return ret;
}

/**
 * uppercase first char
 * @param  {string} str
 * @return {string} Str
 */
export function ucfirst(str) {
    str += '';
    const f = str.charAt(0)
        .toUpperCase();
    return f + str.substr(1);
}


/**
 * @link https://de.wikipedia.org/wiki/Base58
 * this does not start with the numbers to generate valid variable-names
 */
const base58Chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789';
const base58Length = base58Chars.length;

/**
 * transform a number to a string by using only base58 chars
 * @link https://github.com/matthewmueller/number-to-letter/blob/master/index.js
 * @param {number} nr                                       | 10000000
 * @return {string} the string-representation of the number | '2oMX'
 */
export function numberToLetter(nr) {
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
 * @param  {string} str
 * @return {string} str without wrapping dots
 */
export function trimDots(str) {
    // start
    while (str.charAt(0) == '.')
        str = str.substr(1);

    // end
    while (str.slice(-1) == '.')
        str = str.slice(0, -1);

    return str;
}
