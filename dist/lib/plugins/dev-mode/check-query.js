"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkQuery = checkQuery;

var _rxError = require("../../rx-error");

/**
 * accidentially passing a non-valid object into the query params
 * is very hard to debug especially when queries are observed
 * This is why we do some checks here in dev-mode
 */
function checkQuery(args) {
  var isPlainObject = Object.prototype.toString.call(args.queryObj) === '[object Object]';

  if (!isPlainObject) {
    throw (0, _rxError.newRxTypeError)('QU11', {
      op: args.op,
      collection: args.collection.name,
      queryObj: args.queryObj
    });
  }

  var validKeys = ['selector', 'limit', 'skip', 'sort'];
  Object.keys(args.queryObj).forEach(function (key) {
    if (!validKeys.includes(key)) {
      throw (0, _rxError.newRxTypeError)('QU11', {
        op: args.op,
        collection: args.collection.name,
        queryObj: args.queryObj,
        key: key
      });
    }
  });
}

//# sourceMappingURL=check-query.js.map