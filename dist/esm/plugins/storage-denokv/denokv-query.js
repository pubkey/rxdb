import { changeIndexableStringByOneQuantum, getStartIndexStringFromLowerBound, getStartIndexStringFromUpperBound } from "../../custom-index.js";
import { ensureNotFalsy } from "../../plugins/utils/index.js";
import { getQueryMatcher, getSortComparator } from "../../rx-query-helper.js";
import { DENOKV_DOCUMENT_ROOT_PATH, getDenoKVIndexName } from "./denokv-helper.js";
export async function queryDenoKV(instance, preparedQuery) {
  var queryPlan = preparedQuery.queryPlan;
  var query = preparedQuery.query;
  var skip = query.skip ? query.skip : 0;
  var limit = query.limit ? query.limit : Infinity;
  var skipPlusLimit = skip + limit;
  var queryPlanFields = queryPlan.index;
  var mustManuallyResort = !queryPlan.sortSatisfiedByIndex;
  var queryMatcher = false;
  if (!queryPlan.selectorSatisfiedByIndex) {
    queryMatcher = getQueryMatcher(instance.schema, preparedQuery.query);
  }
  var kv = await instance.kvPromise;
  var indexForName = queryPlanFields.slice(0);
  var indexName = getDenoKVIndexName(indexForName);
  var indexMeta = ensureNotFalsy(instance.internals.indexes[indexName]);
  var lowerBound = queryPlan.startKeys;
  var lowerBoundString = getStartIndexStringFromLowerBound(instance.schema, indexForName, lowerBound);
  if (!queryPlan.inclusiveStart) {
    lowerBoundString = changeIndexableStringByOneQuantum(lowerBoundString, 1);
  }
  var upperBound = queryPlan.endKeys;
  var upperBoundString = getStartIndexStringFromUpperBound(instance.schema, indexForName, upperBound);
  if (queryPlan.inclusiveEnd) {
    upperBoundString = changeIndexableStringByOneQuantum(upperBoundString, +1);
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
      var docDataResult = await kv.get([instance.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], instance.kvOptions);
      var docData = ensureNotFalsy(docDataResult.value);
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
    var _docDataResult = await kv.get([instance.keySpace, DENOKV_DOCUMENT_ROOT_PATH, _docId], instance.kvOptions);
    var _docData = ensureNotFalsy(_docDataResult.value);
    if (!queryMatcher || queryMatcher(_docData)) {
      result.push(_docData);
    }
    if (!mustManuallyResort && result.length === skipPlusLimit) {
      break;
    }
  }
  if (mustManuallyResort) {
    var sortComparator = getSortComparator(instance.schema, preparedQuery.query);
    result = result.sort(sortComparator);
  }

  // apply skip and limit boundaries.
  result = result.slice(skip, skipPlusLimit);
  return {
    documents: result
  };
}
//# sourceMappingURL=denokv-query.js.map