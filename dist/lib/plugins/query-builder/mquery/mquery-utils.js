"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = merge;
exports.isObject = isObject;

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
 * Determines if `arg` is an object.
 */


function isObject(arg) {
  return '[object Object]' === arg.toString();
}

//# sourceMappingURL=mquery-utils.js.map