"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSortFieldsOfQuery = getSortFieldsOfQuery;
exports.getQueryParams = getQueryParams;
exports.calculateNewResults = calculateNewResults;
exports.RXQUERY_QUERY_PARAMS_CACHE = void 0;

var _eventReduceJs = require("event-reduce-js");

function getSortFieldsOfQuery(primaryKey, query) {
  if (!query.sort || query.sort.length === 0) {
    return [primaryKey];
  } else {
    return query.sort.map(function (part) {
      return Object.keys(part)[0];
    });
  }
}

var RXQUERY_QUERY_PARAMS_CACHE = new WeakMap();
exports.RXQUERY_QUERY_PARAMS_CACHE = RXQUERY_QUERY_PARAMS_CACHE;

function getQueryParams(rxQuery) {
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

function calculateNewResults(rxQuery, rxChangeEvents) {
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
    var actionName = (0, _eventReduceJs.calculateActionName)({
      queryParams: queryParams,
      changeEvent: eventReduceEvent,
      previousResults: previousResults,
      keyDocumentMap: previousResultsMap
    });

    if (actionName === 'runFullQueryAgain') {
      return true;
    } else if (actionName !== 'doNothing') {
      changed = true;
      (0, _eventReduceJs.runAction)(actionName, queryParams, eventReduceEvent, previousResults, previousResultsMap);
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