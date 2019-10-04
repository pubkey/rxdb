"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = merge;
exports.mergeClone = mergeClone;
exports.isObject = isObject;

var _util = require("../util");

/**
 * this is copied from
 * @link https://github.com/aheckmann/mquery/blob/master/lib/utils.js
 */

/**
 * Merges 'from' into 'to' without overwriting existing properties.
 */
function merge(to, from) {
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
 */


function mergeClone(to, from) {
  Object.keys(from).forEach(function (key) {
    if ('undefined' === typeof to[key]) {
      // make sure to retain key order here because of a bug handling the $each
      // operator in mongodb 2.4.4
      to[key] = (0, _util.clone)(from[key]);
    } else {
      if (isObject(from[key])) mergeClone(to[key], from[key]);else {
        // make sure to retain key order here because of a bug handling the
        // $each operator in mongodb 2.4.4
        to[key] = (0, _util.clone)(from[key]);
      }
    }
  });
}
/**
 * Determines if `arg` is an object.
 */


function isObject(arg) {
  return '[object Object]' === arg.toString();
}

//# sourceMappingURL=mquery_utils.js.map