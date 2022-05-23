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

  var optimalSortIndex = query.sort.map(function (sortField) {
    return Object.keys(sortField)[0];
  });
  var optimalSortIndexCompareString = optimalSortIndex.join(',');
  /**
   * Most storages do not support descending indexes
   * so having a 'desc' in the sorting, means we always have to re-sort the results.
   */

  var hasDescSorting = !!query.sort.find(function (sortField) {
    return Object.values(sortField)[0] === 'desc';
  });
  var currentBestQuality = -1;
  var currentBestQueryPlan;
  indexes.forEach(function (index) {
    var opts = index.map(function (indexField) {
      var matcher = selector[indexField];
      var operators = matcher ? Object.keys(matcher) : [];

      if (!matcher || !operators.length) {
        return {
          startKey: INDEX_MIN,
          endKey: INDEX_MAX,
          inclusiveStart: true,
          inclusiveEnd: true
        };
      }

      var matcherOpts = {};
      operators.forEach(function (operator) {
        if (isLogicalOperator(operator)) {
          var operatorValue = matcher[operator];
          var partialOpts = getMatcherQueryOpts(operator, operatorValue);
          matcherOpts = Object.assign(matcherOpts, partialOpts);
        }
      }); // fill missing attributes

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

      return matcherOpts;
    });
    var queryPlan = {
      index: index,
      startKeys: opts.map(function (opt) {
        return opt.startKey;
      }),
      endKeys: opts.map(function (opt) {
        return opt.endKey;
      }),
      inclusiveEnd: !opts.find(function (opt) {
        return !opt.inclusiveEnd;
      }),
      inclusiveStart: !opts.find(function (opt) {
        return !opt.inclusiveStart;
      }),
      sortFieldsSameAsIndexFields: !hasDescSorting && optimalSortIndexCompareString === index.join(',')
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
    return {
      index: [primaryPath],
      startKeys: [INDEX_MIN],
      endKeys: [INDEX_MAX],
      inclusiveEnd: true,
      inclusiveStart: true,
      sortFieldsSameAsIndexFields: !hasDescSorting && optimalSortIndexCompareString === primaryPath
    };
  }

  return currentBestQueryPlan;
}
var LOGICAL_OPERATORS = new Set(['$eq', '$gt', '$gte', '$lt', '$lte']);
export function isLogicalOperator(operator) {
  return LOGICAL_OPERATORS.has(operator);
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
  var idxOfFirstMinStartKey = queryPlan.startKeys.findIndex(function (keyValue) {
    return keyValue === INDEX_MIN;
  });

  if (idxOfFirstMinStartKey > 0) {
    quality = quality + idxOfFirstMinStartKey * pointsPerMatchingKey;
  }

  var idxOfFirstMaxEndKey = queryPlan.endKeys.findIndex(function (keyValue) {
    return keyValue === INDEX_MAX;
  });

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