"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkMangoQuery = checkMangoQuery;
exports.checkQuery = checkQuery;
var _fastDeepEqual = _interopRequireDefault(require("fast-deep-equal"));
var _rxError = require("../../rx-error");
var _pouchdbSelectorCore = require("pouchdb-selector-core");
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
  var schema = args.rxQuery.collection.schema.jsonSchema;

  /**
   * Ensure that all top level fields are included in the schema.
   * TODO this check can be augmented to also check sub-fields.
   */
  var massagedSelector = (0, _pouchdbSelectorCore.massageSelector)(args.mangoQuery.selector);
  var schemaTopLevelFields = Object.keys(schema.properties);
  Object.keys(massagedSelector)
  // do not check operators
  .filter(function (fieldOrOperator) {
    return !fieldOrOperator.startsWith('$');
  })
  // skip this check on non-top-level fields
  .filter(function (field) {
    return !field.includes('.');
  }).forEach(function (field) {
    if (!schemaTopLevelFields.includes(field)) {
      throw (0, _rxError.newRxError)('QU13', {
        schema: schema,
        field: field,
        query: args.mangoQuery
      });
    }
  });

  /**
   * ensure if custom index is set,
   * it is also defined in the schema
   */
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