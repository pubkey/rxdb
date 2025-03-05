import { LOGICAL_OPERATORS, getQueryPlan } from "./query-planner.js";
import { getPrimaryFieldOfPrimaryKey } from "./rx-schema-helper.js";
import { clone, firstPropertyNameOfObject, toArray, isMaybeReadonlyArray, flatClone, objectPathMonad } from "./plugins/utils/index.js";
import { compare as mingoSortComparator } from 'mingo/util';
import { newRxError } from "./rx-error.js";
import { getMingoQuery } from "./rx-query-mingo.js";

/**
 * Normalize the query to ensure we have all fields set
 * and queries that represent the same query logic are detected as equal by the caching.
 */
export function normalizeMangoQuery(schema, mangoQuery) {
  var primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  mangoQuery = flatClone(mangoQuery);
  var normalizedMangoQuery = clone(mangoQuery);
  if (typeof normalizedMangoQuery.skip !== 'number') {
    normalizedMangoQuery.skip = 0;
  }
  if (!normalizedMangoQuery.selector) {
    normalizedMangoQuery.selector = {};
  } else {
    normalizedMangoQuery.selector = normalizedMangoQuery.selector;
    /**
     * In mango query, it is possible to have an
     * equals comparison by directly assigning a value
     * to a property, without the '$eq' operator.
     * Like:
     * selector: {
     *   foo: 'bar'
     * }
     * For normalization, we have to normalize this
     * so our checks can perform properly.
     *
     *
     * TODO this must work recursive with nested queries that
     * contain multiple selectors via $and or $or etc.
     */
    Object.entries(normalizedMangoQuery.selector).forEach(([field, matcher]) => {
      if (typeof matcher !== 'object' || matcher === null) {
        normalizedMangoQuery.selector[field] = {
          $eq: matcher
        };
      }
    });
  }

  /**
   * Ensure that if an index is specified,
   * the primaryKey is inside of it.
   */
  if (normalizedMangoQuery.index) {
    var indexAr = toArray(normalizedMangoQuery.index);
    if (!indexAr.includes(primaryKey)) {
      indexAr.push(primaryKey);
    }
    normalizedMangoQuery.index = indexAr;
  }

  /**
   * To ensure a deterministic sorting,
   * we have to ensure the primary key is always part
   * of the sort query.
   * Primary sorting is added as last sort parameter,
   * similar to how we add the primary key to indexes that do not have it.
   *
   */
  if (!normalizedMangoQuery.sort) {
    /**
     * If no sort is given at all,
     * we can assume that the user does not care about sort order at al.
     *
     * we cannot just use the primary key as sort parameter
     * because it would likely cause the query to run over the primary key index
     * which has a bad performance in most cases.
     */
    if (normalizedMangoQuery.index) {
      normalizedMangoQuery.sort = normalizedMangoQuery.index.map(field => {
        return {
          [field]: 'asc'
        };
      });
    } else {
      /**
       * Find the index that best matches the fields with the logical operators
       */
      if (schema.indexes) {
        var fieldsWithLogicalOperator = new Set();
        Object.entries(normalizedMangoQuery.selector).forEach(([field, matcher]) => {
          var hasLogical = false;
          if (typeof matcher === 'object' && matcher !== null) {
            hasLogical = !!Object.keys(matcher).find(operator => LOGICAL_OPERATORS.has(operator));
          } else {
            hasLogical = true;
          }
          if (hasLogical) {
            fieldsWithLogicalOperator.add(field);
          }
        });
        var currentFieldsAmount = -1;
        var currentBestIndexForSort;
        schema.indexes.forEach(index => {
          var useIndex = isMaybeReadonlyArray(index) ? index : [index];
          var firstWrongIndex = useIndex.findIndex(indexField => !fieldsWithLogicalOperator.has(indexField));
          if (firstWrongIndex > 0 && firstWrongIndex > currentFieldsAmount) {
            currentFieldsAmount = firstWrongIndex;
            currentBestIndexForSort = useIndex;
          }
        });
        if (currentBestIndexForSort) {
          normalizedMangoQuery.sort = currentBestIndexForSort.map(field => {
            return {
              [field]: 'asc'
            };
          });
        }
      }

      /**
       * If no good index was found as default sort-order,
       * just use the first index of the schema.
       * If no index is in the schema, use the default-index which
       * is created by RxDB ONLY if there is no other index defined.
       */
      if (!normalizedMangoQuery.sort) {
        if (schema.indexes && schema.indexes.length > 0) {
          var firstIndex = schema.indexes[0];
          var useIndex = isMaybeReadonlyArray(firstIndex) ? firstIndex : [firstIndex];
          normalizedMangoQuery.sort = useIndex.map(field => ({
            [field]: 'asc'
          }));
        } else {
          normalizedMangoQuery.sort = [{
            [primaryKey]: 'asc'
          }];
        }
      }
    }
  } else {
    var isPrimaryInSort = normalizedMangoQuery.sort.find(p => firstPropertyNameOfObject(p) === primaryKey);
    if (!isPrimaryInSort) {
      normalizedMangoQuery.sort = normalizedMangoQuery.sort.slice(0);
      normalizedMangoQuery.sort.push({
        [primaryKey]: 'asc'
      });
    }
  }
  return normalizedMangoQuery;
}

/**
 * Returns the sort-comparator,
 * which is able to sort documents in the same way
 * a query over the db would do.
 */
export function getSortComparator(schema, query) {
  if (!query.sort) {
    throw newRxError('SNH', {
      query
    });
  }
  var sortParts = [];
  query.sort.forEach(sortBlock => {
    var key = Object.keys(sortBlock)[0];
    var direction = Object.values(sortBlock)[0];
    sortParts.push({
      key,
      direction,
      getValueFn: objectPathMonad(key)
    });
  });
  var fun = (a, b) => {
    for (var i = 0; i < sortParts.length; ++i) {
      var sortPart = sortParts[i];
      var valueA = sortPart.getValueFn(a);
      var valueB = sortPart.getValueFn(b);
      if (valueA !== valueB) {
        var ret = sortPart.direction === 'asc' ? mingoSortComparator(valueA, valueB) : mingoSortComparator(valueB, valueA);
        return ret;
      }
    }
  };
  return fun;
}

/**
 * Returns a function
 * that can be used to check if a document
 * matches the query.
 */
export function getQueryMatcher(_schema, query) {
  if (!query.sort) {
    throw newRxError('SNH', {
      query
    });
  }
  var mingoQuery = getMingoQuery(query.selector);
  var fun = doc => {
    return mingoQuery.test(doc);
  };
  return fun;
}
export async function runQueryUpdateFunction(rxQuery, fn) {
  var docs = await rxQuery.exec();
  if (!docs) {
    // only findOne() queries can return null
    return null;
  }
  if (Array.isArray(docs)) {
    return Promise.all(docs.map(doc => fn(doc)));
  } else if (docs instanceof Map) {
    return Promise.all([...docs.values()].map(doc => fn(doc)));
  } else {
    // via findOne()
    var result = await fn(docs);
    return result;
  }
}

/**
 * @returns a format of the query that can be used with the storage
 * when calling RxStorageInstance().query()
 */
export function prepareQuery(schema, mutateableQuery) {
  if (!mutateableQuery.sort) {
    throw newRxError('SNH', {
      query: mutateableQuery
    });
  }

  /**
   * Store the query plan together with the
   * prepared query to save performance.
   */
  var queryPlan = getQueryPlan(schema, mutateableQuery);
  return {
    query: mutateableQuery,
    queryPlan
  };
}
//# sourceMappingURL=rx-query-helper.js.map