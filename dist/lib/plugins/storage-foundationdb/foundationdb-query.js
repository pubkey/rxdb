"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.queryFoundationDB = queryFoundationDB;
var _customIndex = require("../../custom-index");
var _utils = require("../../plugins/utils");
var _storageDexie = require("../storage-dexie");
var _foundationdbHelpers = require("./foundationdb-helpers");
async function queryFoundationDB(instance, preparedQuery) {
  var queryPlan = preparedQuery.queryPlan;
  var query = preparedQuery.query;
  var skip = query.skip ? query.skip : 0;
  var limit = query.limit ? query.limit : Infinity;
  var skipPlusLimit = skip + limit;
  var queryPlanFields = queryPlan.index;
  var mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
  var queryMatcher = false;
  if (!queryPlan.selectorSatisfiedByIndex) {
    queryMatcher = _storageDexie.RxStorageDexieStatics.getQueryMatcher(instance.schema, preparedQuery);
  }
  var dbs = await instance.internals.dbsPromise;
  var indexForName = queryPlanFields.slice(0);
  indexForName.unshift('_deleted');
  var indexName = (0, _foundationdbHelpers.getFoundationDBIndexName)(indexForName);
  var indexDB = (0, _utils.ensureNotFalsy)(dbs.indexes[indexName]).db;
  var lowerBound = queryPlan.startKeys;
  lowerBound = [false].concat(lowerBound);
  var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(instance.schema, indexForName, lowerBound, queryPlan.inclusiveStart);
  var upperBound = queryPlan.endKeys;
  upperBound = [false].concat(upperBound);
  var upperBoundString = (0, _customIndex.getStartIndexStringFromUpperBound)(instance.schema, indexForName, upperBound, queryPlan.inclusiveEnd);
  var result = await dbs.root.doTransaction(async tx => {
    var innerResult = [];
    var indexTx = tx.at(indexDB.subspace);
    var mainTx = tx.at(dbs.main.subspace);
    var range = indexTx.getRangeBatch(lowerBoundString, upperBoundString, {
      // TODO these options seem to be broken in the foundationdb node bindings
      // limit: instance.settings.batchSize,
      // streamingMode: StreamingMode.Exact
    });
    var done = false;
    while (!done) {
      var next = await range.next();
      if (next.done) {
        done = true;
        break;
      }
      var docIds = next.value.map(row => row[1]);
      var docsData = await Promise.all(docIds.map(docId => mainTx.get(docId)));
      docsData.forEach(docData => {
        if (!done) {
          if (!queryMatcher || queryMatcher(docData)) {
            innerResult.push(docData);
          }
        }
        if (!mustManuallyResort && innerResult.length === skipPlusLimit) {
          done = true;
          range.return();
        }
      });
    }
    return innerResult;
  });
  if (mustManuallyResort) {
    var sortComparator = _storageDexie.RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);
    result = result.sort(sortComparator);
  }

  // apply skip and limit boundaries.
  result = result.slice(skip, skipPlusLimit);
  return {
    documents: result
  };
}
//# sourceMappingURL=foundationdb-query.js.map