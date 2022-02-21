"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RXQUERY_QUERY_PARAMS_CACHE = void 0;
exports.calculateNewResults = calculateNewResults;
exports.getQueryParams = getQueryParams;
exports.getSortFieldsOfQuery = getSortFieldsOfQuery;

var _eventReduceJs = require("event-reduce-js");

var _hooks = require("./hooks");

var _rxChangeEvent = require("./rx-change-event");

var _util = require("./util");

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
    var collection = rxQuery.collection;
    var queryJson = rxQuery.getPreparedQuery();
    var primaryKey = collection.schema.primaryPath;
    /**
     * Create a custom sort comparator
     * that uses the hooks to ensure
     * we send for example compressed documents to be sorted by compressed queries.
     */

    var sortComparator = collection.database.storage.statics.getSortComparator(collection.storageInstance.schema, queryJson);

    var useSortComparator = function useSortComparator(docA, docB) {
      var sortComparatorData = {
        docA: docA,
        docB: docB,
        rxQuery: rxQuery
      };
      (0, _hooks.runPluginHooks)('preSortComparator', sortComparatorData);
      return sortComparator(sortComparatorData.docA, sortComparatorData.docB);
    };
    /**
     * Create a custom query matcher
     * that uses the hooks to ensure
     * we send for example compressed documents to match compressed queries.
     */


    var queryMatcher = collection.database.storage.statics.getQueryMatcher(collection.storageInstance.schema, queryJson);

    var useQueryMatcher = function useQueryMatcher(doc) {
      var queryMatcherData = {
        doc: doc,
        rxQuery: rxQuery
      };
      (0, _hooks.runPluginHooks)('preQueryMatcher', queryMatcherData);
      return queryMatcher(queryMatcherData.doc);
    };

    var ret = {
      primaryKey: rxQuery.collection.schema.primaryPath,
      skip: queryJson.skip,
      limit: queryJson.limit,
      sortFields: getSortFieldsOfQuery(primaryKey, rxQuery.mangoQuery),
      sortComparator: useSortComparator,
      queryMatcher: useQueryMatcher
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
  var previousResults = (0, _util.ensureNotFalsy)(rxQuery._result).docsData.slice(0);
  var previousResultsMap = (0, _util.ensureNotFalsy)(rxQuery._result).docsDataMap;
  var changed = false;
  var foundNonOptimizeable = rxChangeEvents.find(function (cE) {
    var eventReduceEvent = (0, _rxChangeEvent.rxChangeEventToEventReduceChangeEvent)(cE);
    var stateResolveFunctionInput = {
      queryParams: queryParams,
      changeEvent: eventReduceEvent,
      previousResults: previousResults,
      keyDocumentMap: previousResultsMap
    };
    var actionName = (0, _eventReduceJs.calculateActionName)(stateResolveFunctionInput);

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