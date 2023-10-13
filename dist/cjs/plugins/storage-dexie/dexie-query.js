"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dexieCount = dexieCount;
exports.dexieQuery = dexieQuery;
exports.getKeyRangeByQueryPlan = getKeyRangeByQueryPlan;
exports.mapKeyForKeyRange = mapKeyForKeyRange;
var _queryPlanner = require("../../query-planner.js");
var _rxQueryHelper = require("../../rx-query-helper.js");
var _dexieHelper = require("./dexie-helper.js");
function mapKeyForKeyRange(k) {
  if (k === _queryPlanner.INDEX_MIN) {
    return -Infinity;
  } else {
    return k;
  }
}
function getKeyRangeByQueryPlan(queryPlan, IDBKeyRange) {
  if (!IDBKeyRange) {
    if (typeof window === 'undefined') {
      throw new Error('IDBKeyRange missing');
    } else {
      IDBKeyRange = window.IDBKeyRange;
    }
  }
  var startKeys = queryPlan.startKeys.map(mapKeyForKeyRange);
  var endKeys = queryPlan.endKeys.map(mapKeyForKeyRange);
  var ret;
  /**
   * If index has only one field,
   * we have to pass the keys directly, not the key arrays.
   */
  if (queryPlan.index.length === 1) {
    var equalKeys = startKeys[0] === endKeys[0];
    ret = IDBKeyRange.bound(startKeys[0], endKeys[0], equalKeys ? false : !queryPlan.inclusiveStart, equalKeys ? false : !queryPlan.inclusiveEnd);
  } else {
    ret = IDBKeyRange.bound(startKeys, endKeys, !queryPlan.inclusiveStart, !queryPlan.inclusiveEnd);
  }
  return ret;
}

/**
 * Runs mango queries over the Dexie.js database.
 */
async function dexieQuery(instance, preparedQuery) {
  var state = await instance.internals;
  var query = preparedQuery.query;
  var skip = query.skip ? query.skip : 0;
  var limit = query.limit ? query.limit : Infinity;
  var skipPlusLimit = skip + limit;
  var queryPlan = preparedQuery.queryPlan;
  var queryMatcher = false;
  if (!queryPlan.selectorSatisfiedByIndex) {
    queryMatcher = (0, _rxQueryHelper.getQueryMatcher)(instance.schema, preparedQuery.query);
  }
  var keyRange = getKeyRangeByQueryPlan(queryPlan, state.dexieDb._options.IDBKeyRange);
  var queryPlanFields = queryPlan.index;
  var rows = [];
  await state.dexieDb.transaction('r', state.dexieTable, async dexieTx => {
    /**
     * TODO here we use the native IndexedDB transaction
     * to get the cursor.
     * Instead we should not leave Dexie.js API and find
     * a way to create the cursor with Dexie.js.
     */
    var tx = dexieTx.idbtrans;

    // const nativeIndexedDB = state.dexieDb.backendDB();
    // const trans = nativeIndexedDB.transaction([DEXIE_DOCS_TABLE_NAME], 'readonly');

    var store = tx.objectStore(_dexieHelper.DEXIE_DOCS_TABLE_NAME);
    var index;
    if (queryPlanFields.length === 1 && queryPlanFields[0] === instance.primaryPath) {
      index = store;
    } else {
      var indexName;
      if (queryPlanFields.length === 1) {
        indexName = (0, _dexieHelper.dexieReplaceIfStartsWithPipe)(queryPlanFields[0]);
      } else {
        indexName = '[' + queryPlanFields.map(field => (0, _dexieHelper.dexieReplaceIfStartsWithPipe)(field)).join('+') + ']';
      }
      index = store.index(indexName);
    }
    var cursorReq = index.openCursor(keyRange);
    await new Promise(res => {
      cursorReq.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          // We have a record in cursor.value
          var docData = (0, _dexieHelper.fromDexieToStorage)(cursor.value);
          if (!docData._deleted && (!queryMatcher || queryMatcher(docData))) {
            rows.push(docData);
          }

          /**
           * If we do not have to manually sort
           * and have enough documents,
           * we can abort iterating over the cursor
           * because we already have every relevant document.
           */
          if (queryPlan.sortFieldsSameAsIndexFields && rows.length === skipPlusLimit) {
            res();
          } else {
            cursor.continue();
          }
        } else {
          // Iteration complete
          res();
        }
      };
    });
  });
  if (!queryPlan.sortFieldsSameAsIndexFields) {
    var sortComparator = (0, _rxQueryHelper.getSortComparator)(instance.schema, preparedQuery.query);
    rows = rows.sort(sortComparator);
  }

  // apply skip and limit boundaries.
  rows = rows.slice(skip, skipPlusLimit);

  /**
   * Comment this in for debugging to check all fields in the database.
   */
  // const docsInDb = await state.dexieTable.filter(queryMatcher).toArray();
  // let documents = docsInDb
  //     .map(docData => stripDexieKey(docData))
  //     .sort(sortComparator);
  // if (preparedQuery.skip) {
  //     documents = documents.slice(preparedQuery.skip);
  // }
  // if (preparedQuery.limit && documents.length > preparedQuery.limit) {
  //     documents = documents.slice(0, preparedQuery.limit);
  // }

  return {
    documents: rows
  };
}
async function dexieCount(instance, preparedQuery) {
  var state = await instance.internals;
  var queryPlan = preparedQuery.queryPlan;
  var queryPlanFields = queryPlan.index;
  var keyRange = getKeyRangeByQueryPlan(queryPlan, state.dexieDb._options.IDBKeyRange);
  var count = -1;
  await state.dexieDb.transaction('r', state.dexieTable, async dexieTx => {
    var tx = dexieTx.idbtrans;
    var store = tx.objectStore(_dexieHelper.DEXIE_DOCS_TABLE_NAME);
    var index;
    if (queryPlanFields.length === 1 && queryPlanFields[0] === instance.primaryPath) {
      index = store;
    } else {
      var indexName;
      if (queryPlanFields.length === 1) {
        indexName = (0, _dexieHelper.dexieReplaceIfStartsWithPipe)(queryPlanFields[0]);
      } else {
        indexName = '[' + queryPlanFields.map(field => (0, _dexieHelper.dexieReplaceIfStartsWithPipe)(field)).join('+') + ']';
      }
      index = store.index(indexName);
    }
    var request = index.count(keyRange);
    count = await new Promise((res, rej) => {
      request.onsuccess = function () {
        res(request.result);
      };
      request.onerror = err => rej(err);
    });
  });
  return count;
}
//# sourceMappingURL=dexie-query.js.map