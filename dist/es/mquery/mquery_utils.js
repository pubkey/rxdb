/**
 * this is copied from
 * @link https://github.com/aheckmann/mquery/blob/master/lib/utils.js
 */
import { clone } from '../util';
/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {object} to
 * @param {object} from
 */

export function merge(to, from) {
  Object.keys(from).forEach(function (key) {
    if (typeof to[key] === 'undefined') {
      to[key] = from[key];
    } else {
      if (isObject(from[key])) merge(to[key], from[key]);else to[key] = from[key];
    }
  });
}
/**
 * Same as merge but clones the assigned values.
 *
 * @param {object} to
 * @param {object} from
 */

export function mergeClone(to, from) {
  Object.keys(from).forEach(function (key) {
    if ('undefined' === typeof to[key]) {
      // make sure to retain key order here because of a bug handling the $each
      // operator in mongodb 2.4.4
      to[key] = clone(from[key], {
        retainKeyOrder: 1
      });
    } else {
      if (isObject(from[key])) mergeClone(to[key], from[key]);else {
        // make sure to retain key order here because of a bug handling the
        // $each operator in mongodb 2.4.4
        to[key] = clone(from[key], {
          retainKeyOrder: 1
        });
      }
    }
  });
}
/**
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @return {Boolean}
 */

export function isObject(arg) {
  return '[object Object]' === arg.toString();
}