'use strict';

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

var merge = exports.merge = function merge(to, from) {
    var keys = Object.keys(from);
    var i = keys.length;
    var key = void 0;

    while (i--) {
        key = keys[i];
        if ('undefined' === typeof to[key]) to[key] = from[key];else {
            if (exports.isObject(from[key])) merge(to[key], from[key]);else to[key] = from[key];
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
/**
 * this is copied from
 * @link https://github.com/aheckmann/mquery/blob/master/lib/utils.js
 */

var mergeClone = exports.mergeClone = function mergeClone(to, from) {
    var keys = Object.keys(from);
    var i = keys.length;
    var key = void 0;

    while (i--) {
        key = keys[i];
        if ('undefined' === typeof to[key]) {
            // make sure to retain key order here because of a bug handling the $each
            // operator in mongodb 2.4.4
            to[key] = (0, _clone2.default)(from[key], {
                retainKeyOrder: 1
            });
        } else {
            if (exports.isObject(from[key])) mergeClone(to[key], from[key]);else {
                // make sure to retain key order here because of a bug handling the
                // $each operator in mongodb 2.4.4
                to[key] = (0, _clone2.default)(from[key], {
                    retainKeyOrder: 1
                });
            }
        }
    }
};

/**
 * Object.prototype.toString.call helper
 */

var _toString = Object.prototype.toString;
var toString = exports.toString = function (arg) {
    return _toString.call(arg);
};

/**
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @return {Boolean}
 */

var isObject = exports.isObject = function (arg) {
    return '[object Object]' == exports.toString(arg);
};

exports.create = Object.create;

/**
 * inheritance
 */
exports.inherits = function (ctor, superCtor) {
    ctor.prototype = exports.create(superCtor.prototype);
    ctor.prototype.constructor = ctor;
};

/**
 * Check if this object is an arguments object
 *
 * @param {Any} v
 * @return {Boolean}
 */

exports.isArgumentsObject = function (v) {
    return Object.prototype.toString.call(v) === '[object Arguments]';
};