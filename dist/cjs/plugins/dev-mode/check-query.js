"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.areSelectorsSatisfiedByIndex = areSelectorsSatisfiedByIndex;
exports.checkMangoQuery = checkMangoQuery;
exports.checkQuery = checkQuery;
exports.ensureObjectDoesNotContainRegExp = ensureObjectDoesNotContainRegExp;
exports.isQueryAllowed = isQueryAllowed;
var _rxError = require("../../rx-error.js");
var _index = require("../utils/index.js");
var _rxQueryHelper = require("../../rx-query-helper.js");
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
  ensureObjectDoesNotContainRegExp(args.queryObj);
}
function checkMangoQuery(args) {
  var schema = args.rxQuery.collection.schema.jsonSchema;
  var undefinedFieldPath = (0, _index.findUndefinedPath)(args.mangoQuery);
  if (undefinedFieldPath) {
    throw (0, _rxError.newRxError)('QU19', {
      field: undefinedFieldPath,
      query: args.mangoQuery
    });
  }

  /**
   * Ensure that all top level fields are included in the schema.
   * TODO this check can be augmented to also check sub-fields.
   */
  var massagedSelector = args.mangoQuery.selector;
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
    var isInSchema = schemaIndexes.find(schemaIndex => (0, _index.deepEqual)(schemaIndex, index));
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

  // Do not allow RexExp instances
  ensureObjectDoesNotContainRegExp(args.mangoQuery);
}
function areSelectorsSatisfiedByIndex(schema, query) {
  var preparedQuery = (0, _rxQueryHelper.prepareQuery)(schema, query);
  return preparedQuery.queryPlan.selectorSatisfiedByIndex;
}

/**
 * Ensures that the selector does not contain any RegExp instance.
 * @recursive
 */
function ensureObjectDoesNotContainRegExp(selector) {
  if (typeof selector !== 'object' || selector === null) {
    return;
  }
  var keys = Object.keys(selector);
  keys.forEach(key => {
    var value = selector[key];
    if (value instanceof RegExp) {
      throw (0, _rxError.newRxError)('QU16', {
        field: key,
        query: selector
      });
    } else if (Array.isArray(value)) {
      value.forEach(item => ensureObjectDoesNotContainRegExp(item));
    } else {
      ensureObjectDoesNotContainRegExp(value);
    }
  });
}

/**
 * People often use queries wrong
 * so we have some checks here.
 * For example people use numbers as primary keys
 * which is not allowed.
 */
function isQueryAllowed(args) {
  if (args.op === 'findOne') {
    if (typeof args.queryObj === 'number' || Array.isArray(args.queryObj)) {
      throw (0, _rxError.newRxTypeError)('COL6', {
        collection: args.collection.name,
        queryObj: args.queryObj
      });
    }
  } else if (args.op === 'find') {
    if (typeof args.queryObj === 'string') {
      throw (0, _rxError.newRxError)('COL5', {
        collection: args.collection.name,
        queryObj: args.queryObj
      });
    }
  }
}
//# sourceMappingURL=check-query.js.map