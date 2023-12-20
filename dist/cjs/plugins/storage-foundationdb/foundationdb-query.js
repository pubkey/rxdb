"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.queryFoundationDB = queryFoundationDB;
var _customIndex = require("../../custom-index.js");
var _index = require("../../plugins/utils/index.js");
var _foundationdbHelpers = require("./foundationdb-helpers.js");
var _rxQueryHelper = require("../../rx-query-helper.js");
async function queryFoundationDB(instance, preparedQuery) {
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
  var dbs = await instance.internals.dbsPromise;
  var indexForName = queryPlanFields.slice(0);
  var indexName = (0, _foundationdbHelpers.getFoundationDBIndexName)(indexForName);
  var indexDB = (0, _index.ensureNotFalsy)(dbs.indexes[indexName]).db;
  var lowerBound = queryPlan.startKeys;
  var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(instance.schema, indexForName, lowerBound);
  var upperBound = queryPlan.endKeys;
  var upperBoundString = (0, _customIndex.getStartIndexStringFromUpperBound)(instance.schema, indexForName, upperBound);
  var result = await dbs.root.doTransaction(async tx => {
    var innerResult = [];
    var indexTx = tx.at(indexDB.subspace);
    var mainTx = tx.at(dbs.main.subspace);

    /**
     * TODO for whatever reason the keySelectors like firstGreaterThan etc.
     * do not work properly. So we have to hack here to find the correct
     * document in case lowerBoundString===upperBoundString.
     * This likely must be fixed in the foundationdb library.
     * When it is fixed, we do not need this if-case and instead
     * can rely on .getRangeBatch() in all cases.
     */
    if (lowerBoundString === upperBoundString) {
      var docId = await indexTx.get(lowerBoundString);
      if (docId) {
        var docData = await mainTx.get(docId);
        if (!queryMatcher || queryMatcher(docData)) {
          innerResult.push(docData);
        }
      }
      return innerResult;
    }
    if (!queryPlan.inclusiveStart) {
      lowerBoundString = (0, _customIndex.changeIndexableStringByOneQuantum)(lowerBoundString, 1);
    }
    if (queryPlan.inclusiveEnd) {
      upperBoundString = (0, _customIndex.changeIndexableStringByOneQuantum)(upperBoundString, +1);
    }
    var range = indexTx.getRangeBatch(lowerBoundString, upperBoundString,
    // queryPlan.inclusiveStart ? keySelector.firstGreaterThan(lowerBoundString) : keySelector.firstGreaterOrEqual(lowerBoundString),
    // queryPlan.inclusiveEnd ? keySelector.lastLessOrEqual(upperBoundString) : keySelector.lastLessThan(upperBoundString),
    {
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
      var rows = next.value;
      if (!queryPlan.inclusiveStart) {
        var firstRow = rows[0];
        if (firstRow && firstRow[0] === lowerBoundString) {
          rows.shift();
        }
      }
      if (!queryPlan.inclusiveEnd) {
        var lastRow = (0, _index.lastOfArray)(rows);
        if (lastRow && lastRow[0] === upperBoundString) {
          rows.pop();
        }
      }
      var docIds = rows.map(row => row[1]);
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
    var sortComparator = (0, _rxQueryHelper.getSortComparator)(instance.schema, preparedQuery.query);
    result = result.sort(sortComparator);
  }

  // apply skip and limit boundaries.
  result = result.slice(skip, skipPlusLimit);
  return {
    documents: result
  };
}
//# sourceMappingURL=foundationdb-query.js.map