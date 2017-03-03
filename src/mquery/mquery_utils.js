/**
 * this is copied from
 * @link https://github.com/aheckmann/mquery/blob/master/lib/utils.js
 */

import {
    default as clone
} from 'clone';



/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

const merge = exports.merge = function merge(to, from) {
    const keys = Object.keys(from);
    let i = keys.length;
    let key;

    while (i--) {
        key = keys[i];
        if ('undefined' === typeof to[key])
            to[key] = from[key];
        else {
            if (exports.isObject(from[key]))
                merge(to[key], from[key]);
            else
                to[key] = from[key];
        }
    }
};

/**
 * Same as merge but clones the assigned values.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */
const mergeClone = exports.mergeClone = function mergeClone(to, from) {
    const keys = Object.keys(from);
    let i = keys.length;
    let key;

    while (i--) {
        key = keys[i];
        if ('undefined' === typeof to[key]) {
            // make sure to retain key order here because of a bug handling the $each
            // operator in mongodb 2.4.4
            to[key] = clone(from[key], {
                retainKeyOrder: 1
            });
        } else {
            if (exports.isObject(from[key]))
                mergeClone(to[key], from[key]);
            else {
                // make sure to retain key order here because of a bug handling the
                // $each operator in mongodb 2.4.4
                to[key] = clone(from[key], {
                    retainKeyOrder: 1
                });
            }
        }
    }
};


/**
 * Object.prototype.toString.call helper
 */

const _toString = Object.prototype.toString;
const toString = exports.toString = function(arg) {
    return _toString.call(arg);
};

/**
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @return {Boolean}
 */

const isObject = exports.isObject = function(arg) {
    return '[object Object]' == exports.toString(arg);
};


exports.create = Object.create;


/**
 * inheritance
 */
exports.inherits = function(ctor, superCtor) {
    ctor.prototype = exports.create(superCtor.prototype);
    ctor.prototype.constructor = ctor;
};


/**
 * Check if this object is an arguments object
 *
 * @param {Any} v
 * @return {Boolean}
 */

exports.isArgumentsObject = function(v) {
    return Object.prototype.toString.call(v) === '[object Arguments]';
};
