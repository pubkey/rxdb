"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UPPER_BOUND_LOGICAL_OPERATORS = exports.LOWER_BOUND_LOGICAL_OPERATORS = exports.LOGICAL_OPERATORS = exports.INDEX_MIN = exports.INDEX_MAX = void 0;
exports.getMatcherQueryOpts = getMatcherQueryOpts;
exports.getQueryPlan = getQueryPlan;
exports.isSelectorSatisfiedByIndex = isSelectorSatisfiedByIndex;
exports.rateQueryPlan = rateQueryPlan;
var _utils = require("./plugins/utils");
var _rxSchemaHelper = require("./rx-schema-helper");
var INDEX_MAX = exports.INDEX_MAX = String.fromCharCode(65535);

/**
 * Do not use -Infinity here because it would be
 * transformed to null on JSON.stringify() which can break things
 * when the query plan is send to the storage as json.
 * @link https://stackoverflow.com/a/16644751
 * Notice that for IndexedDB IDBKeyRange we have
 * to transform the value back to -Infinity
 * before we can use it in IDBKeyRange.bound.
 *
 */
var INDEX_MIN = exports.INDEX_MIN = Number.MIN_VALUE;

/**
 * Returns the query plan which contains
 * information about how to run the query
 * and which indexes to use.
 *
 * This is used in some storage like Memory, dexie.js and IndexedDB.
 */
function getQueryPlan(schema, query) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
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
var LOGICAL_OPERATORS = exports.LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte']);
var LOWER_BOUND_LOGICAL_OPERATORS = exports.LOWER_BOUND_LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte']);
var UPPER_BOUND_LOGICAL_OPERATORS = exports.UPPER_BOUND_LOGICAL_OPERATORS = new Set(['$eq', '$lt', '$lte']);
function isSelectorSatisfiedByIndex(index, selector) {
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
function getMatcherQueryOpts(operator, operatorValue) {
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
function rateQueryPlan(schema, query, queryPlan) {
  var quality = 0;
  var addQuality = value => {
    if (value > 0) {
      quality = quality + value;
    }
  };
  var pointsPerMatchingKey = 10;
  var nonMinKeyCount = (0, _utils.countUntilNotMatching)(queryPlan.startKeys, keyValue => keyValue !== INDEX_MIN && keyValue !== INDEX_MAX);
  addQuality(nonMinKeyCount * pointsPerMatchingKey);
  var nonMaxKeyCount = (0, _utils.countUntilNotMatching)(queryPlan.startKeys, keyValue => keyValue !== INDEX_MAX && keyValue !== INDEX_MIN);
  addQuality(nonMaxKeyCount * pointsPerMatchingKey);
  var equalKeyCount = (0, _utils.countUntilNotMatching)(queryPlan.startKeys, (keyValue, idx) => {
    if (keyValue === queryPlan.endKeys[idx]) {
      return true;
    } else {
      return false;
    }
  });
  addQuality(equalKeyCount * pointsPerMatchingKey * 1.5);
  var pointsIfNoReSortMustBeDone = queryPlan.sortFieldsSameAsIndexFields ? 5 : 0;
  addQuality(pointsIfNoReSortMustBeDone);

  // console.log('rateQueryPlan() result:');
  // console.log({
  //     query,
  //     queryPlan,
  //     nonMinKeyCount,
  //     nonMaxKeyCount,
  //     equalKeyCount,
  //     pointsIfNoReSortMustBeDone,
  //     quality
  // });

  return quality;
}
//# sourceMappingURL=query-planner.js.map