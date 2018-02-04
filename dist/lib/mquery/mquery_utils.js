'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.merge = merge;
exports.mergeClone = mergeClone;
exports.isObject = isObject;

var _util = require('../util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {object} to
 * @param {object} from
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
 * @param {object} to
 * @param {object} from
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
            to[key] = util.clone(from[key], {
                retainKeyOrder: 1
            });
        } else {
            if (isObject(from[key])) mergeClone(to[key], from[key]);else {
                // make sure to retain key order here because of a bug handling the
                // $each operator in mongodb 2.4.4
                to[key] = util.clone(from[key], {
                    retainKeyOrder: 1
                });
            }
        }
    }
};

/**
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @return {Boolean}
 */
function isObject(arg) {
    return '[object Object]' === arg.toString();
};
