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
 * @link https://github.com/aheckmann/mquery/commit/792e69fd0a7281a0300be5cade5a6d7c1d468ad4
 */
var SPECIAL_PROPERTIES = ['__proto__', 'constructor', 'prototype'];
/**
 * Merges 'from' into 'to' without overwriting existing properties.
 */

function merge(to, from) {
  Object.keys(from).forEach(function (key) {
    if (SPECIAL_PROPERTIES.includes(key)) {
      return;
    }

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