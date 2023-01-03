"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.areSelectorsSatisfiedByIndex = areSelectorsSatisfiedByIndex;
exports.checkMangoQuery = checkMangoQuery;
exports.checkQuery = checkQuery;
var _rxError = require("../../rx-error");
var _pouchdbSelectorCore = require("pouchdb-selector-core");
var _storageDexie = require("../storage-dexie");
var _utils = require("../utils");
/**
 * accidentally passing a non-valid object into the query params
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
  Object.keys(args.queryObj).forEach(key => {
    if (!validKeys.includes(key)) {
      throw (0, _rxError.newRxTypeError)('QU11', {
        op: args.op,
        collection: args.collection.name,
        queryObj: args.queryObj,
        key,
        args: {
          validKeys
        }
      });
    }
  });

  // do not allow skip or limit for count queries
  if (args.op === 'count' && (args.queryObj.limit || args.queryObj.skip)) {
    throw (0, _rxError.newRxError)('QU15', {
      collection: args.collection.name,
      query: args.queryObj
    });
  }
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
  .filter(fieldOrOperator => !fieldOrOperator.startsWith('$'))
  // skip this check on non-top-level fields
  .filter(field => !field.includes('.')).forEach(field => {
    if (!schemaTopLevelFields.includes(field)) {
      throw (0, _rxError.newRxError)('QU13', {
        schema,
        field,
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
    var isInSchema = schemaIndexes.find(schemaIndex => (0, _utils.deepEqual)(schemaIndex, index));
    if (!isInSchema) {
      throw (0, _rxError.newRxError)('QU12', {
        collection: args.rxQuery.collection.name,
        query: args.mangoQuery,
        schema
      });
    }
  }

  /**
   * Ensure that a count() query can only be used
   * with selectors that are fully satisfied by the used index.
   */
  if (args.rxQuery.op === 'count') {
    if (!areSelectorsSatisfiedByIndex(args.rxQuery.collection.schema.jsonSchema, args.mangoQuery) && !args.rxQuery.collection.database.allowSlowCount) {
      throw (0, _rxError.newRxError)('QU14', {
        collection: args.rxQuery.collection,
        query: args.mangoQuery
      });
    }
  }

  /**
   * Ensure that sort only runs on known fields
   * TODO also check nested fields
   */
  if (args.mangoQuery.sort) {
    args.mangoQuery.sort.map(sortPart => Object.keys(sortPart)[0]).filter(field => !field.includes('.')).forEach(field => {
      if (!schemaTopLevelFields.includes(field)) {
        throw (0, _rxError.newRxError)('QU13', {
          schema,
          field,
          query: args.mangoQuery
        });
      }
    });
  }
}
function areSelectorsSatisfiedByIndex(schema, query) {
  var preparedQuery = _storageDexie.RxStorageDexieStatics.prepareQuery(schema, query);
  return preparedQuery.queryPlan.selectorSatisfiedByIndex;
}
//# sourceMappingURL=check-query.js.map