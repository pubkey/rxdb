import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
export var INDEX_MAX = String.fromCharCode(65535);
export var INDEX_MIN = -Infinity;

/**
 * Returns the query plan which contains
 * information about how to run the query
 * and which indexes to use.
 *
 * This is used in some storage like Memory, dexie.js and IndexedDB.
 */
export function getQueryPlan(schema, query) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var selector = query.selector;
  var indexes = schema.indexes ? schema.indexes.slice(0) : [];
  if (query.index) {
    indexes = [query.index];
  } else {
    indexes.push([primaryPath]);
  }
  var optimalSortIndex = query.sort.map(sortField => Object.keys(sortField)[0]);
  var optimalSortIndexCompareString = optimalSortIndex.join(',');
  /**
   * Most storages do not support descending indexes
   * so having a 'desc' in the sorting, means we always have to re-sort the results.
   */
  var hasDescSorting = !!query.sort.find(sortField => Object.values(sortField)[0] === 'desc');
  var currentBestQuality = -1;
  var currentBestQueryPlan;
  indexes.forEach(index => {
    var inclusiveEnd = true;
    var inclusiveStart = true;
    var opts = index.map(indexField => {
      var matcher = selector[indexField];
      var operators = matcher ? Object.keys(matcher) : [];
      var matcherOpts = {};
      if (!matcher || !operators.length) {
        matcherOpts = {
          startKey: inclusiveStart ? INDEX_MIN : INDEX_MAX,
          endKey: inclusiveEnd ? INDEX_MAX : INDEX_MIN,
          inclusiveStart: true,
          inclusiveEnd: true
        };
      } else {
        operators.forEach(operator => {
          if (LOGICAL_OPERATORS.has(operator)) {
            var operatorValue = matcher[operator];
            var partialOpts = getMatcherQueryOpts(operator, operatorValue);
            matcherOpts = Object.assign(matcherOpts, partialOpts);
          }
        });
      }

      // fill missing attributes
      if (typeof matcherOpts.startKey === 'undefined') {
        matcherOpts.startKey = INDEX_MIN;
      }
      if (typeof matcherOpts.endKey === 'undefined') {
        matcherOpts.endKey = INDEX_MAX;
      }
      if (typeof matcherOpts.inclusiveStart === 'undefined') {
        matcherOpts.inclusiveStart = true;
      }
      if (typeof matcherOpts.inclusiveEnd === 'undefined') {
        matcherOpts.inclusiveEnd = true;
      }
      if (inclusiveStart && !matcherOpts.inclusiveStart) {
        inclusiveStart = false;
      }
      if (inclusiveEnd && !matcherOpts.inclusiveEnd) {
        inclusiveEnd = false;
      }
      return matcherOpts;
    });
    var queryPlan = {
      index,
      startKeys: opts.map(opt => opt.startKey),
      endKeys: opts.map(opt => opt.endKey),
      inclusiveEnd,
      inclusiveStart,
      sortFieldsSameAsIndexFields: !hasDescSorting && optimalSortIndexCompareString === index.join(','),
      selectorSatisfiedByIndex: isSelectorSatisfiedByIndex(index, query.selector)
    };
    var quality = rateQueryPlan(schema, query, queryPlan);
    if (quality > 0 && quality > currentBestQuality || query.index) {
      currentBestQuality = quality;
      currentBestQueryPlan = queryPlan;
    }
  });

  /**
   * No index found, use the default index
   */
  if (!currentBestQueryPlan) {
    currentBestQueryPlan = {
      index: [primaryPath],
      startKeys: [INDEX_MIN],
      endKeys: [INDEX_MAX],
      inclusiveEnd: true,
      inclusiveStart: true,
      sortFieldsSameAsIndexFields: !hasDescSorting && optimalSortIndexCompareString === primaryPath,
      selectorSatisfiedByIndex: isSelectorSatisfiedByIndex([primaryPath], query.selector)
    };
  }
  return currentBestQueryPlan;
}
export var LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte']);
export var LOWER_BOUND_LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte']);
export var UPPER_BOUND_LOGICAL_OPERATORS = new Set(['$eq', '$lt', '$lte']);
export function isSelectorSatisfiedByIndex(index, selector) {
  var selectorEntries = Object.entries(selector);
  var hasNonMatchingOperator = selectorEntries.find(([fieldName, operation]) => {
    if (!index.includes(fieldName)) {
      return true;
    }
    var hasNonLogicOperator = Object.entries(operation).find(([op, _value]) => !LOGICAL_OPERATORS.has(op));
    return hasNonLogicOperator;
  });
  if (hasNonMatchingOperator) {
    return false;
  }
  var prevLowerBoundaryField;
  var hasMoreThenOneLowerBoundaryField = index.find(fieldName => {
    var operation = selector[fieldName];
    if (!operation) {
      return false;
    }
    var hasLowerLogicOp = Object.keys(operation).find(key => LOWER_BOUND_LOGICAL_OPERATORS.has(key));
    if (prevLowerBoundaryField && hasLowerLogicOp) {
      return true;
    } else if (hasLowerLogicOp !== '$eq') {
      prevLowerBoundaryField = hasLowerLogicOp;
    }
    return false;
  });
  if (hasMoreThenOneLowerBoundaryField) {
    return false;
  }
  var prevUpperBoundaryField;
  var hasMoreThenOneUpperBoundaryField = index.find(fieldName => {
    var operation = selector[fieldName];
    if (!operation) {
      return false;
    }
    var hasUpperLogicOp = Object.keys(operation).find(key => UPPER_BOUND_LOGICAL_OPERATORS.has(key));
    if (prevUpperBoundaryField && hasUpperLogicOp) {
      return true;
    } else if (hasUpperLogicOp !== '$eq') {
      prevUpperBoundaryField = hasUpperLogicOp;
    }
    return false;
  });
  if (hasMoreThenOneUpperBoundaryField) {
    return false;
  }
  return true;
}
export function getMatcherQueryOpts(operator, operatorValue) {
  switch (operator) {
    case '$eq':
      return {
        startKey: operatorValue,
        endKey: operatorValue
      };
    case '$lte':
      return {
        endKey: operatorValue
      };
    case '$gte':
      return {
        startKey: operatorValue
      };
    case '$lt':
      return {
        endKey: operatorValue,
        inclusiveEnd: false
      };
    case '$gt':
      return {
        startKey: operatorValue,
        inclusiveStart: false
      };
    default:
      throw new Error('SNH');
  }
}

/**
 * Returns a number that determines the quality of the query plan.
 * Higher number means better query plan.
 */
export function rateQueryPlan(schema, query, queryPlan) {
  var quality = 0;
  var pointsPerMatchingKey = 10;
  var idxOfFirstMinStartKey = queryPlan.startKeys.findIndex(keyValue => keyValue === INDEX_MIN);
  if (idxOfFirstMinStartKey > 0) {
    quality = quality + idxOfFirstMinStartKey * pointsPerMatchingKey;
  }
  var idxOfFirstMaxEndKey = queryPlan.endKeys.findIndex(keyValue => keyValue === INDEX_MAX);
  if (idxOfFirstMaxEndKey > 0) {
    quality = quality + idxOfFirstMaxEndKey * pointsPerMatchingKey;
  }
  var pointsIfNoReSortMustBeDone = 5;
  if (queryPlan.sortFieldsSameAsIndexFields) {
    quality = quality + pointsIfNoReSortMustBeDone;
  }
  return quality;
}
//# sourceMappingURL=query-planner.js.map