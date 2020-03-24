import { calculateActionName, runAction } from 'event-reduce-js';
export function getSortFieldsOfQuery(primaryKey, query) {
  if (!query.sort || query.sort.length === 0) {
    return [primaryKey];
  } else {
    return query.sort.map(function (part) {
      return Object.keys(part)[0];
    });
  }
}
export var RXQUERY_QUERY_PARAMS_CACHE = new WeakMap();
export function getQueryParams(rxQuery) {
  if (!RXQUERY_QUERY_PARAMS_CACHE.has(rxQuery)) {
    var storage = rxQuery.collection.database.storage;
    var queryJson = rxQuery.toJSON();
    var primaryKey = rxQuery.collection.schema.primaryPath;
    var ret = {
      primaryKey: rxQuery.collection.schema.primaryPath,
      skip: queryJson.skip,
      limit: queryJson.limit,
      sortFields: getSortFieldsOfQuery(primaryKey, queryJson),
      sortComparator: storage.getSortComparator(primaryKey, queryJson),
      queryMatcher: storage.getQueryMatcher(primaryKey, queryJson)
    };
    RXQUERY_QUERY_PARAMS_CACHE.set(rxQuery, ret);
    return ret;
  } else {
    return RXQUERY_QUERY_PARAMS_CACHE.get(rxQuery);
  }
}
export function calculateNewResults(rxQuery, rxChangeEvents) {
  if (!rxQuery.collection.database.eventReduce) {
    return {
      runFullQueryAgain: true
    };
  }

  var queryParams = getQueryParams(rxQuery);

  var previousResults = rxQuery._resultsData.slice();

  var previousResultsMap = rxQuery._resultsDataMap;
  var changed = false;
  var foundNonOptimizeable = rxChangeEvents.find(function (cE) {
    var eventReduceEvent = cE.toEventReduceChangeEvent();
    var actionName = calculateActionName({
      queryParams: queryParams,
      changeEvent: eventReduceEvent,
      previousResults: previousResults,
      keyDocumentMap: previousResultsMap
    });

    if (actionName === 'runFullQueryAgain') {
      return true;
    } else if (actionName !== 'doNothing') {
      changed = true;
      runAction(actionName, queryParams, eventReduceEvent, previousResults, previousResultsMap);
      return false;
    }
  });

  if (foundNonOptimizeable) {
    return {
      runFullQueryAgain: true
    };
  } else {
    return {
      runFullQueryAgain: false,
      changed: changed,
      newResults: previousResults
    };
  }
}
//# sourceMappingURL=event-reduce.js.map