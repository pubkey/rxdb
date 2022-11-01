import deepEqual from 'fast-deep-equal';
import { newRxError, newRxTypeError } from '../../rx-error';
import { massageSelector } from 'pouchdb-selector-core';
import { RxStorageDexieStatics } from '../dexie';

/**
 * accidentally passing a non-valid object into the query params
 * is very hard to debug especially when queries are observed
 * This is why we do some checks here in dev-mode
 */
export function checkQuery(args) {
  var isPlainObject = Object.prototype.toString.call(args.queryObj) === '[object Object]';
  if (!isPlainObject) {
    throw newRxTypeError('QU11', {
      op: args.op,
      collection: args.collection.name,
      queryObj: args.queryObj
    });
  }
  var validKeys = ['selector', 'limit', 'skip', 'sort', 'index'];
  Object.keys(args.queryObj).forEach(function (key) {
    if (!validKeys.includes(key)) {
      throw newRxTypeError('QU11', {
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

  // do not allow skip or limit for count queries
  if (args.op === 'count' && (args.queryObj.limit || args.queryObj.skip)) {
    throw newRxError('QU15', {
      collection: args.collection.name,
      query: args.queryObj
    });
  }
}
export function checkMangoQuery(args) {
  var schema = args.rxQuery.collection.schema.jsonSchema;

  /**
   * Ensure that all top level fields are included in the schema.
   * TODO this check can be augmented to also check sub-fields.
   */
  var massagedSelector = massageSelector(args.mangoQuery.selector);
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
      throw newRxError('QU13', {
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
      return deepEqual(schemaIndex, index);
    });
    if (!isInSchema) {
      throw newRxError('QU12', {
        collection: args.rxQuery.collection.name,
        query: args.mangoQuery,
        schema: schema
      });
    }
  }

  /**
   * Ensure that a count() query can only be used
   * with selectors that are fully satisfied by the used index.
   */
  if (args.rxQuery.op === 'count') {
    if (!areSelectorsSatisfiedByIndex(args.rxQuery.collection.schema.jsonSchema, args.mangoQuery) && !args.rxQuery.collection.database.allowSlowCount) {
      throw newRxError('QU14', {
        collection: args.rxQuery.collection,
        query: args.mangoQuery
      });
    }
  }
}
export function areSelectorsSatisfiedByIndex(schema, query) {
  var preparedQuery = RxStorageDexieStatics.prepareQuery(schema, query);
  return preparedQuery.queryPlan.selectorSatisfiedByIndex;
}
//# sourceMappingURL=check-query.js.map