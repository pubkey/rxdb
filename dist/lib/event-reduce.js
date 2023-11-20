"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RXQUERY_QUERY_PARAMS_CACHE = void 0;
exports.calculateNewResults = calculateNewResults;
exports.getQueryParams = getQueryParams;
exports.getSortFieldsOfQuery = getSortFieldsOfQuery;
var _eventReduceJs = require("event-reduce-js");
var _rxChangeEvent = require("./rx-change-event");
var _utils = require("./plugins/utils");
var _rxQueryHelper = require("./rx-query-helper");
function getSortFieldsOfQuery(primaryKey, query) {
  if (!query.sort || query.sort.length === 0) {
    return [primaryKey];
  } else {
    return query.sort.map(part => Object.keys(part)[0]);
  }
}
var RXQUERY_QUERY_PARAMS_CACHE = exports.RXQUERY_QUERY_PARAMS_CACHE = new WeakMap();
function getQueryParams(rxQuery) {
  return (0, _utils.getFromMapOrCreate)(RXQUERY_QUERY_PARAMS_CACHE, rxQuery, () => {
    var collection = rxQuery.collection;
    var normalizedMangoQuery = (0, _rxQueryHelper.normalizeMangoQuery)(collection.storageInstance.schema, (0, _utils.clone)(rxQuery.mangoQuery));
    var primaryKey = collection.schema.primaryPath;

    /**
     * Create a custom sort comparator
     * that uses the hooks to ensure
     * we send for example compressed documents to be sorted by compressed queries.
     */
    var sortComparator = (0, _rxQueryHelper.getSortComparator)(collection.schema.jsonSchema, normalizedMangoQuery);
    var useSortComparator = (docA, docB) => {
      var sortComparatorData = {
        docA,
        docB,
        rxQuery
      };
      return sortComparator(sortComparatorData.docA, sortComparatorData.docB);
    };

    /**
     * Create a custom query matcher
     * that uses the hooks to ensure
     * we send for example compressed documents to match compressed queries.
     */
    var queryMatcher = (0, _rxQueryHelper.getQueryMatcher)(collection.schema.jsonSchema, normalizedMangoQuery);
    var useQueryMatcher = doc => {
      var queryMatcherData = {
        doc,
        rxQuery
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
    return ret;
  });
}

// This catches a specific case where we have a limit query (of say LIMIT items), and then
// a document is removed from the result set by the current change. In this case,
// the event-reduce library (rightly) tells us we need to recompute the query to get a
// full result set of LIMIT items.
// However, if we have a "limit buffer", we can instead fill in the missing result from there.
// For more info, see the rx-query.test tests under "Limit Buffer".
// This function checks if we are actually in the specific case where the limit buffer can be used.
function canFillResultSetFromLimitBuffer(s) {
  // We figure out if this event is our special case using the same "state resolve" functions that event-reduce uses:
  // https://github.com/pubkey/event-reduce/blob/fcb46947b29eac97c97dcb05e08af337f362fe5c/javascript/src/states/index.ts#L87
  // (we also keep the state resolve functions in the same order they're defined in event-reduce.js)
  return !(0, _eventReduceJs.isInsert)(s) && (
  // inserts can never cause
  (0, _eventReduceJs.isUpdate)(s) || (0, _eventReduceJs.isDelete)(s)) &&
  // both updates and deletes can remove a doc from our results
  (0, _eventReduceJs.hasLimit)(s) &&
  // only limit queries
  !(0, _eventReduceJs.isFindOne)(s) &&
  // if it's a findOne, we have no buffer and have to re-compute
  !(0, _eventReduceJs.hasSkip)(s) &&
  // we could potentially make skip queries work later, but for now ignore them -- too hard
  !(0, _eventReduceJs.wasResultsEmpty)(s) &&
  // this should never happen
  !(0, _eventReduceJs.previousUnknown)(s) &&
  // we need to have had the prev result set
  (0, _eventReduceJs.wasLimitReached)(s) &&
  // if not, the event reducer shouldn't have a problem
  // any value of wasFirst(s), position is not relevant for this case, as wasInResults
  // any value of wasLast(s) , position is not relevant for this case, as wasInResults
  // any value of sortParamsChanged(s), eg a doc could be archived but also have last_status_update changed
  (0, _eventReduceJs.wasInResult)(s) &&
  // we only care about docs already in the results set being removed
  // any value of wasSortedBeforeFirst(s) -- this is true when the doc is first in the results set
  !(0, _eventReduceJs.wasSortedAfterLast)(s) &&
  // I don't think this could be true anyways, but whatever
  // any value of isSortedBeforeFirst(s) -- this is true when the doc is first in order (but it could still be filtered out)
  // any value of isSortedAfterLast(s)
  (0, _eventReduceJs.wasMatching)(s) &&
  // it couldn't have been wasInResult unless it was also matching
  !(0, _eventReduceJs.doesMatchNow)(s) // Limit buffer only cares rn when the changed doc was indeed removed (so no longer matching)
  ;
}

function calculateNewResults(rxQuery, rxChangeEvents) {
  if (!rxQuery.collection.database.eventReduce) {
    return {
      runFullQueryAgain: true
    };
  }
  var queryParams = getQueryParams(rxQuery);
  var previousResults = (0, _utils.ensureNotFalsy)(rxQuery._result).docsData.slice(0);
  var previousResultsMap = (0, _utils.ensureNotFalsy)(rxQuery._result).docsDataMap;
  var changed = false;
  var eventReduceEvents = rxChangeEvents.map(cE => (0, _rxChangeEvent.rxChangeEventToEventReduceChangeEvent)(cE)).filter(_utils.arrayFilterNotEmpty);
  var foundNonOptimizeable = eventReduceEvents.find(eventReduceEvent => {
    var stateResolveFunctionInput = {
      queryParams,
      changeEvent: eventReduceEvent,
      previousResults,
      keyDocumentMap: previousResultsMap
    };
    var actionName = (0, _eventReduceJs.calculateActionName)(stateResolveFunctionInput);
    if (actionName === 'runFullQueryAgain') {
      if (canFillResultSetFromLimitBuffer(stateResolveFunctionInput) && rxQuery._limitBufferResults !== null && rxQuery._limitBufferResults.length > 0) {
        // replace the missing item with an item from our limit buffer!
        var replacementItem = rxQuery._limitBufferResults.shift();
        if (replacementItem === undefined) {
          return true;
        }
        changed = true;
        (0, _eventReduceJs.runAction)('removeExisting', queryParams, eventReduceEvent, previousResults, previousResultsMap);
        previousResults.push(replacementItem);
        if (previousResultsMap) {
          // We have to assume the primaryKey value is a string. According to the rxdb docs, this is always the case:
          // https://github.com/pubkey/rxdb/blob/c8162c25c7b033fa9f70191512ee84d44d0dd913/docs/rx-schema.html#L2523
          previousResultsMap.set(replacementItem[rxQuery.collection.schema.primaryPath], replacementItem);
        }
        return false;
      }
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
      changed,
      newResults: previousResults
    };
  }
}
//# sourceMappingURL=event-reduce.js.map