import { calculateActionName, runAction } from 'event-reduce-js';
import { rxChangeEventToEventReduceChangeEvent } from './rx-change-event';
import { arrayFilterNotEmpty, clone, ensureNotFalsy } from './util';
import { normalizeMangoQuery } from './rx-query-helper';
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
    var collection = rxQuery.collection;
    var preparedQuery = rxQuery.getPreparedQuery();
    var normalizedMangoQuery = normalizeMangoQuery(collection.storageInstance.schema, clone(rxQuery.mangoQuery));
    var primaryKey = collection.schema.primaryPath;

    /**
     * Create a custom sort comparator
     * that uses the hooks to ensure
     * we send for example compressed documents to be sorted by compressed queries.
     */
    var sortComparator = collection.database.storage.statics.getSortComparator(collection.schema.jsonSchema, preparedQuery);
    var useSortComparator = function useSortComparator(docA, docB) {
      var sortComparatorData = {
        docA: docA,
        docB: docB,
        rxQuery: rxQuery
      };
      return sortComparator(sortComparatorData.docA, sortComparatorData.docB);
    };

    /**
     * Create a custom query matcher
     * that uses the hooks to ensure
     * we send for example compressed documents to match compressed queries.
     */
    var queryMatcher = collection.database.storage.statics.getQueryMatcher(collection.schema.jsonSchema, preparedQuery);
    var useQueryMatcher = function useQueryMatcher(doc) {
      var queryMatcherData = {
        doc: doc,
        rxQuery: rxQuery
      };
      return queryMatcher(queryMatcherData.doc);
    };
    var ret = {
      primaryKey: rxQuery.collection.schema.primaryPath,
      skip: normalizedMangoQuery.skip,
      limit: normalizedMangoQuery.limit,
      sortFields: getSortFieldsOfQuery(primaryKey, normalizedMangoQuery),
      sortComparator: useSortComparator,
      queryMatcher: useQueryMatcher
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
  var previousResults = ensureNotFalsy(rxQuery._result).docsData.slice(0);
  var previousResultsMap = ensureNotFalsy(rxQuery._result).docsDataMap;
  var changed = false;
  var eventReduceEvents = rxChangeEvents.map(function (cE) {
    return rxChangeEventToEventReduceChangeEvent(cE);
  }).filter(arrayFilterNotEmpty);
  var foundNonOptimizeable = eventReduceEvents.find(function (eventReduceEvent) {
    var stateResolveFunctionInput = {
      queryParams: queryParams,
      changeEvent: eventReduceEvent,
      previousResults: previousResults,
      keyDocumentMap: previousResultsMap
    };
    var actionName = calculateActionName(stateResolveFunctionInput);
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