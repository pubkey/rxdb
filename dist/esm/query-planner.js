import { countUntilNotMatching } from "./plugins/utils/index.js";
import { newRxError } from "./rx-error.js";
import { getSchemaByObjectPath } from "./rx-schema-helper.js";
export var INDEX_MAX = String.fromCharCode(65535);

/**
 * Do not use -Infinity here because it would be
 * transformed to null on JSON.stringify() which can break things
 * when the query plan is send to the storage as json.
 * @link https://stackoverflow.com/a/16644751
 * Notice that for IndexedDB IDBKeyRange we have
 * to transform the value back to -Infinity
 * before we can use it in IDBKeyRange.bound.
 */
export var INDEX_MIN = Number.MIN_SAFE_INTEGER;

/**
 * Returns the query plan which contains
 * information about how to run the query
 * and which indexes to use.
 *
 * This is used in some storage like Memory, dexie.js and IndexedDB.
 */
export function getQueryPlan(schema, query) {
  var selector = query.selector;
  var indexes = schema.indexes ? schema.indexes.slice(0) : [];
  if (query.index) {
    indexes = [query.index];
  }

  /**
   * Most storages do not support descending indexes
   * so having a 'desc' in the sorting, means we always have to re-sort the results.
   */
  var hasDescSorting = !!query.sort.find(sortField => Object.values(sortField)[0] === 'desc');

  /**
   * Some fields can be part of the selector while not being relevant for sorting
   * because their selector operators specify that in all cases all matching docs
   * would have the same value.
   * For example the boolean field _deleted.
   * TODO similar thing could be done for enums.
   */
  var sortIrrelevevantFields = new Set();
  Object.keys(selector).forEach(fieldName => {
    var schemaPart = getSchemaByObjectPath(schema, fieldName);
    if (schemaPart && schemaPart.type === 'boolean' && Object.prototype.hasOwnProperty.call(selector[fieldName], '$eq')) {
      sortIrrelevevantFields.add(fieldName);
    }
  });
  var optimalSortIndex = query.sort.map(sortField => Object.keys(sortField)[0]);
  var optimalSortIndexCompareString = optimalSortIndex.filter(f => !sortIrrelevevantFields.has(f)).join(',');
  var currentBestQuality = -1;
  var currentBestQueryPlan;

  /**
   * Calculate one query plan for each index
   * and then test which of the plans is best.
   */
  indexes.forEach(index => {
    var inclusiveEnd = true;
    var inclusiveStart = true;
    var opts = index.map(indexField => {
      var matcher = selector[indexField];
      var operators = matcher ? Object.keys(matcher) : [];
      var matcherOpts = {};
      if (!matcher || !operators.length) {
        var startKey = inclusiveStart ? INDEX_MIN : INDEX_MAX;
        matcherOpts = {
          startKey,
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
    var startKeys = opts.map(opt => opt.startKey);
    var endKeys = opts.map(opt => opt.endKey);
    var queryPlan = {
      index,
      startKeys,
      endKeys,
      inclusiveEnd,
      inclusiveStart,
      sortSatisfiedByIndex: !hasDescSorting && optimalSortIndexCompareString === index.filter(f => !sortIrrelevevantFields.has(f)).join(','),
      selectorSatisfiedByIndex: isSelectorSatisfiedByIndex(index, query.selector, startKeys, endKeys)
    };
    var quality = rateQueryPlan(schema, query, queryPlan);
    if (quality >= currentBestQuality || query.index) {
      currentBestQuality = quality;
      currentBestQueryPlan = queryPlan;
    }
  });

  /**
   * In all cases and index must be found
   */
  if (!currentBestQueryPlan) {
    throw newRxError('SNH', {
      query
    });
  }
  return currentBestQueryPlan;
}
export var LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte']);
export var LOWER_BOUND_LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte']);
export var UPPER_BOUND_LOGICAL_OPERATORS = new Set(['$eq', '$lt', '$lte']);
export function isSelectorSatisfiedByIndex(index, selector, startKeys, endKeys) {
  /**
   * Not satisfied if one or more operators are non-logical
   * operators that can never be satisfied by an index.
   */
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

  /**
   * Not satisfied if contains $and or $or operations.
   */
  if (selector.$and || selector.$or) {
    return false;
  }

  // ensure all lower bound in index
  var satisfieldLowerBound = [];
  var lowerOperatorFieldNames = new Set();
  for (var [fieldName, operation] of Object.entries(selector)) {
    if (!index.includes(fieldName)) {
      return false;
    }

    // If more then one logic op on the same field, we have to selector-match.
    var lowerLogicOps = Object.keys(operation).filter(key => LOWER_BOUND_LOGICAL_OPERATORS.has(key));
    if (lowerLogicOps.length > 1) {
      return false;
    }
    var hasLowerLogicOp = lowerLogicOps[0];
    if (hasLowerLogicOp) {
      lowerOperatorFieldNames.add(fieldName);
    }
    if (hasLowerLogicOp !== '$eq') {
      if (satisfieldLowerBound.length > 0) {
        return false;
      } else {
        satisfieldLowerBound.push(hasLowerLogicOp);
      }
    }
  }

  // ensure all upper bound in index
  var satisfieldUpperBound = [];
  var upperOperatorFieldNames = new Set();
  for (var [_fieldName, _operation] of Object.entries(selector)) {
    if (!index.includes(_fieldName)) {
      return false;
    }

    // If more then one logic op on the same field, we have to selector-match.
    var upperLogicOps = Object.keys(_operation).filter(key => UPPER_BOUND_LOGICAL_OPERATORS.has(key));
    if (upperLogicOps.length > 1) {
      return false;
    }
    var hasUperLogicOp = upperLogicOps[0];
    if (hasUperLogicOp) {
      upperOperatorFieldNames.add(_fieldName);
    }
    if (hasUperLogicOp !== '$eq') {
      if (satisfieldUpperBound.length > 0) {
        return false;
      } else {
        satisfieldUpperBound.push(hasUperLogicOp);
      }
    }
  }

  /**
   * If the index contains a non-relevant field between
   * the relevant fields, then the index is not satisfying.
   */
  var i = 0;
  for (var _fieldName2 of index) {
    for (var set of [lowerOperatorFieldNames, upperOperatorFieldNames]) {
      if (!set.has(_fieldName2) && set.size > 0) {
        return false;
      }
      set.delete(_fieldName2);
    }
    var startKey = startKeys[i];
    var endKey = endKeys[i];
    if (startKey !== endKey && lowerOperatorFieldNames.size > 0 && upperOperatorFieldNames.size > 0) {
      return false;
    }
    i++;
  }
  return true;
}
export function getMatcherQueryOpts(operator, operatorValue) {
  switch (operator) {
    case '$eq':
      return {
        startKey: operatorValue,
        endKey: operatorValue,
        inclusiveEnd: true,
        inclusiveStart: true
      };
    case '$lte':
      return {
        endKey: operatorValue,
        inclusiveEnd: true
      };
    case '$gte':
      return {
        startKey: operatorValue,
        inclusiveStart: true
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
  var addQuality = value => {
    if (value > 0) {
      quality = quality + value;
    }
  };
  var pointsPerMatchingKey = 10;
  var nonMinKeyCount = countUntilNotMatching(queryPlan.startKeys, keyValue => keyValue !== INDEX_MIN && keyValue !== INDEX_MAX);
  addQuality(nonMinKeyCount * pointsPerMatchingKey);
  var nonMaxKeyCount = countUntilNotMatching(queryPlan.startKeys, keyValue => keyValue !== INDEX_MAX && keyValue !== INDEX_MIN);
  addQuality(nonMaxKeyCount * pointsPerMatchingKey);
  var equalKeyCount = countUntilNotMatching(queryPlan.startKeys, (keyValue, idx) => {
    if (keyValue === queryPlan.endKeys[idx]) {
      return true;
    } else {
      return false;
    }
  });
  addQuality(equalKeyCount * pointsPerMatchingKey * 1.5);
  var pointsIfNoReSortMustBeDone = queryPlan.sortSatisfiedByIndex ? 5 : 0;
  addQuality(pointsIfNoReSortMustBeDone);
  return quality;
}
//# sourceMappingURL=query-planner.js.map