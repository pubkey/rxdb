"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.queryDenoKV = queryDenoKV;
var _customIndex = require("../../custom-index.js");
var _index = require("../../plugins/utils/index.js");
var _rxQueryHelper = require("../../rx-query-helper.js");
var _denokvHelper = require("./denokv-helper.js");
async function queryDenoKV(instance, preparedQuery) {
  var queryPlan = preparedQuery.queryPlan;
  var query = preparedQuery.query;
  var skip = query.skip ? query.skip : 0;
  var limit = query.limit ? query.limit : Infinity;
  var skipPlusLimit = skip + limit;
  var queryPlanFields = queryPlan.index;
  var mustManuallyResort = !queryPlan.sortSatisfiedByIndex;
  var queryMatcher = false;
  if (!queryPlan.selectorSatisfiedByIndex) {
    queryMatcher = (0, _rxQueryHelper.getQueryMatcher)(instance.schema, preparedQuery.query);
  }
  var kv = await instance.kvPromise;
  var indexForName = queryPlanFields.slice(0);
  var indexName = (0, _denokvHelper.getDenoKVIndexName)(indexForName);
  var indexMeta = (0, _index.ensureNotFalsy)(instance.internals.indexes[indexName]);
  var lowerBound = queryPlan.startKeys;
  var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(instance.schema, indexForName, lowerBound);
  if (!queryPlan.inclusiveStart) {
    lowerBoundString = (0, _customIndex.changeIndexableStringByOneQuantum)(lowerBoundString, 1);
  }
  var upperBound = queryPlan.endKeys;
  var upperBoundString = (0, _customIndex.getStartIndexStringFromUpperBound)(instance.schema, indexForName, upperBound);
  if (queryPlan.inclusiveEnd) {
    upperBoundString = (0, _customIndex.changeIndexableStringByOneQuantum)(upperBoundString, +1);
  }
  var result = [];

  /**
   * TODO for whatever reason the keySelectors like firstGreaterThan etc.
   * do not work properly. So we have to hack here to find the correct
   * document in case lowerBoundString===upperBoundString.
   * This likely must be fixed in the foundationdb library.
   * When it is fixed, we do not need this if-case and instead
   * can rely on .getRangeBatch() in all cases.
   */
  if (lowerBoundString === upperBoundString) {
    var singleDocResult = await kv.get([instance.keySpace, indexMeta.indexId, lowerBoundString], instance.kvOptions);
    if (singleDocResult.value) {
      var docId = singleDocResult.value;
      var docDataResult = await kv.get([instance.keySpace, _denokvHelper.DENOKV_DOCUMENT_ROOT_PATH, docId], instance.kvOptions);
      var docData = (0, _index.ensureNotFalsy)(docDataResult.value);
      if (!queryMatcher || queryMatcher(docData)) {
        result.push(docData);
      }
    }
    return {
      documents: result
    };
  }
  var range = kv.list({
    start: [instance.keySpace, indexMeta.indexId, lowerBoundString],
    end: [instance.keySpace, indexMeta.indexId, upperBoundString]
  }, {
    consistency: instance.settings.consistencyLevel,
    limit: !mustManuallyResort && queryPlan.selectorSatisfiedByIndex ? skipPlusLimit : undefined,
    batchSize: instance.settings.batchSize
  });
  for await (var indexDocEntry of range) {
    var _docId = indexDocEntry.value;
    var _docDataResult = await kv.get([instance.keySpace, _denokvHelper.DENOKV_DOCUMENT_ROOT_PATH, _docId], instance.kvOptions);
    var _docData = (0, _index.ensureNotFalsy)(_docDataResult.value);
    if (!queryMatcher || queryMatcher(_docData)) {
      result.push(_docData);
    }
    if (!mustManuallyResort && result.length === skipPlusLimit) {
      break;
    }
  }
  if (mustManuallyResort) {
    var sortComparator = (0, _rxQueryHelper.getSortComparator)(instance.schema, preparedQuery.query);
    result = result.sort(sortComparator);
  }

  // apply skip and limit boundaries.
  result = result.slice(skip, skipPlusLimit);
  return {
    documents: result
  };
}
//# sourceMappingURL=denokv-query.js.map