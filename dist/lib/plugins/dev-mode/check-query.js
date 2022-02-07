"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkMangoQuery = checkMangoQuery;
exports.checkQuery = checkQuery;

var _fastDeepEqual = _interopRequireDefault(require("fast-deep-equal"));

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

  var validKeys = ['selector', 'limit', 'skip', 'sort', 'index'];
  Object.keys(args.queryObj).forEach(function (key) {
    if (!validKeys.includes(key)) {
      throw (0, _rxError.newRxTypeError)('QU11', {
        op: args.op,
        collection: args.collection.name,
        queryObj: args.queryObj,
        key: key,
        args: {
          validKeys: validKeys
        }
      });
    }
  });
}

function checkMangoQuery(args) {
  /**
   * ensure if custom index is set,
   * it is also defined in the schema
   */
  var schema = args.rxQuery.collection.schema.normalized;
  var schemaIndexes = schema.indexes ? schema.indexes : [];
  var index = args.mangoQuery.index;

  if (index) {
    var isInSchema = schemaIndexes.find(function (schemaIndex) {
      return (0, _fastDeepEqual["default"])(schemaIndex, index);
    });

    if (!isInSchema) {
      throw (0, _rxError.newRxError)('QU12', {
        collection: args.rxQuery.collection.name,
        query: args.mangoQuery,
        schema: schema
      });
    }
  }
}
//# sourceMappingURL=check-query.js.map