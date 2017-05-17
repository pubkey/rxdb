'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.create = undefined;
exports.merge = merge;
exports.mergeClone = mergeClone;
exports.toString = toString;
exports.isObject = isObject;
exports.inherits = inherits;
exports.isArgumentsObject = isArgumentsObject;

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

function merge(to, from) {
    var keys = Object.keys(from);
    var i = keys.length;
    var key = void 0;

    while (i--) {
        key = keys[i];
        if ('undefined' === typeof to[key]) to[key] = from[key];else {
            if (isObject(from[key])) merge(to[key], from[key]);else to[key] = from[key];
        }
    }
} /**
   * this is copied from
   * @link https://github.com/aheckmann/mquery/blob/master/lib/utils.js
   */

;

/**
 * Same as merge but clones the assigned values.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */
function mergeClone(to, from) {
    var keys = Object.keys(from);
    var i = keys.length;
    var key = void 0;

    while (i--) {
        key = keys[i];
        if ('undefined' === typeof to[key]) {
            // make sure to retain key order here because of a bug handling the $each
            // operator in mongodb 2.4.4
            to[key] = (0, _clone2['default'])(from[key], {
                retainKeyOrder: 1
            });
        } else {
            if (isObject(from[key])) mergeClone(to[key], from[key]);else {
                // make sure to retain key order here because of a bug handling the
                // $each operator in mongodb 2.4.4
                to[key] = (0, _clone2['default'])(from[key], {
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
function toString(arg) {
    return _toString.call(arg);
};

/**
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @return {Boolean}
 */

function isObject(arg) {
    return '[object Object]' == toString(arg);
};

var create = exports.create = Object.create;

/**
 * inheritance
 */
function inherits(ctor, superCtor) {
    ctor.prototype = create(superCtor.prototype);
    ctor.prototype.constructor = ctor;
};

/**
 * Check if this object is an arguments object
 *
 * @param {Any} v
 * @return {Boolean}
 */

function isArgumentsObject(v) {
    return Object.prototype.toString.call(v) === '[object Arguments]';
};
