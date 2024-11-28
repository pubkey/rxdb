import { INDEX_MAX, INDEX_MIN } from "../../query-planner.js";
import { getQueryMatcher, getSortComparator } from "../../rx-query-helper.js";
import { dexieReplaceIfStartsWithPipe, DEXIE_DOCS_TABLE_NAME, fromDexieToStorage } from "./dexie-helper.js";
export function mapKeyForKeyRange(k) {
  if (k === INDEX_MIN) {
    return -Infinity;
  } else {
    return k;
  }
}
function rangeFieldToBooleanSubstitute(booleanIndexes, fieldName, value) {
  if (booleanIndexes.includes(fieldName)) {
    var newValue = value === INDEX_MAX || value === true ? '1' : '0';
    return newValue;
  } else {
    return value;
  }
}
export function getKeyRangeByQueryPlan(booleanIndexes, queryPlan, IDBKeyRange) {
  if (!IDBKeyRange) {
    if (typeof window === 'undefined') {
      throw new Error('IDBKeyRange missing');
    } else {
      IDBKeyRange = window.IDBKeyRange;
    }
  }
  var startKeys = queryPlan.startKeys.map((v, i) => {
    var fieldName = queryPlan.index[i];
    return rangeFieldToBooleanSubstitute(booleanIndexes, fieldName, v);
  }).map(mapKeyForKeyRange);
  var endKeys = queryPlan.endKeys.map((v, i) => {
    var fieldName = queryPlan.index[i];
    return rangeFieldToBooleanSubstitute(booleanIndexes, fieldName, v);
  }).map(mapKeyForKeyRange);
  var keyRange = IDBKeyRange.bound(startKeys, endKeys, !queryPlan.inclusiveStart, !queryPlan.inclusiveEnd);
  return keyRange;
}

/**
 * Runs mango queries over the Dexie.js database.
 */
export async function dexieQuery(instance, preparedQuery) {
  var state = await instance.internals;
  var query = preparedQuery.query;
  var skip = query.skip ? query.skip : 0;
  var limit = query.limit ? query.limit : Infinity;
  var skipPlusLimit = skip + limit;
  var queryPlan = preparedQuery.queryPlan;
  var queryMatcher = false;
  if (!queryPlan.selectorSatisfiedByIndex) {
    queryMatcher = getQueryMatcher(instance.schema, preparedQuery.query);
  }
  var keyRange = getKeyRangeByQueryPlan(state.booleanIndexes, queryPlan, state.dexieDb._options.IDBKeyRange);
  var queryPlanFields = queryPlan.index;
  var rows = [];
  await state.dexieDb.transaction('r', state.dexieTable, async dexieTx => {
    /**
     * Here we use the native IndexedDB transaction
     * to get the cursor.
     * Maybe we should not leave Dexie.js API and find
     * a way to create the cursor with Dexie.js.
     */
    var tx = dexieTx.idbtrans;

    // const nativeIndexedDB = state.dexieDb.backendDB();
    // const trans = nativeIndexedDB.transaction([DEXIE_DOCS_TABLE_NAME], 'readonly');

    var store = tx.objectStore(DEXIE_DOCS_TABLE_NAME);
    var index;
    var indexName;
    indexName = '[' + queryPlanFields.map(field => dexieReplaceIfStartsWithPipe(field)).join('+') + ']';
    index = store.index(indexName);
    var cursorReq = index.openCursor(keyRange);
    await new Promise(res => {
      cursorReq.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          // We have a record in cursor.value
          var docData = fromDexieToStorage(state.booleanIndexes, cursor.value);
          if (!queryMatcher || queryMatcher(docData)) {
            rows.push(docData);
          }

          /**
           * If we do not have to manually sort
           * and have enough documents,
           * we can abort iterating over the cursor
           * because we already have every relevant document.
           */
          if (queryPlan.sortSatisfiedByIndex && rows.length === skipPlusLimit) {
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
  if (!queryPlan.sortSatisfiedByIndex) {
    var sortComparator = getSortComparator(instance.schema, preparedQuery.query);
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
export async function dexieCount(instance, preparedQuery) {
  var state = await instance.internals;
  var queryPlan = preparedQuery.queryPlan;
  var queryPlanFields = queryPlan.index;
  var keyRange = getKeyRangeByQueryPlan(state.booleanIndexes, queryPlan, state.dexieDb._options.IDBKeyRange);
  var count = -1;
  await state.dexieDb.transaction('r', state.dexieTable, async dexieTx => {
    var tx = dexieTx.idbtrans;
    var store = tx.objectStore(DEXIE_DOCS_TABLE_NAME);
    var index;
    var indexName;
    indexName = '[' + queryPlanFields.map(field => dexieReplaceIfStartsWithPipe(field)).join('+') + ']';
    index = store.index(indexName);
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