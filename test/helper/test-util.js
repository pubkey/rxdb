/**
 * util-functions that are only used at the tests
 */

import clone from 'clone';
import randomToken from 'random-token';
import * as util from '../../dist/lib/util';

/**
 * async version of assert.throws
 * @param  {function}  test
 * @param  {Error|TypeError|string} [error=Error] error
 * @param  {?string} [contains=''] contains
 * @return {Promise}       [description]
 */
export async function assertThrowsAsync(test, error = Error, contains = '') {
    const shouldErrorName = typeof error === 'string' ? error : error.name;

    try {
        await test();
    } catch (e) {

        // wrong type
        if (e.constructor.name != shouldErrorName) {
            throw new Error(`
             util.assertThrowsAsync(): Wrong Error-type
             - is    : ${e.constructor.name}
             - should: ${shouldErrorName}
             - error: ${e.toString()}
             `);
        }

        // check if contains
        if (contains != '' && !e.toString().includes(contains)) {
            throw new Error(`
               util.assertThrowsAsync(): Error does not contain
               - should contain: ${contains}
               - is string: ${e.toString()}
             `);
        }
        // all is ok
        return 'util.assertThrowsAsync(): everything is fine';
    }
    throw new Error(
        'util.assertThrowsAsync(): Missing rejection' +
        (error ? ' with ' + error.name : '')
    );
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


/**
 * waits until the given function returns true
 * @param  {function}  fun
 * @return {Promise}
 */
export async function waitUntil(fun) {
    let ok = false;
    while (!ok) {
        await util.promiseWait(1);
        ok = await fun();
    }
}

export function filledArray(size = 0) {
    return new Array(size).fill(0);
}

/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 * @param {number} [length=10] length
 * @return {string}
 */
export function randomCouchString(length = 10) {
    let text = '';
    const possible = 'abcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

export function shuffleArray(arr) {
    return arr.sort(() => (Math.random() - 0.5));
};
