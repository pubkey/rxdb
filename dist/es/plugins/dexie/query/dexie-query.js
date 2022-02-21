import { getPrimaryFieldOfPrimaryKey } from '../../../rx-schema';
import { clone, ensureNotFalsy } from '../../../util';
import { getPouchIndexDesignDocNameByIndex, POUCHDB_DESIGN_PREFIX, pouchSwapIdToPrimaryString } from '../../pouchdb';
import { preparePouchDbQuery } from '../../pouchdb/pouch-statics';
import { DEXIE_DOCS_TABLE_NAME } from '../dexie-helper';
import { RxStorageDexieStatics } from '../rx-storage-dexie';
import { generateKeyRange } from './pouchdb-find-query-planer/indexeddb-find';
import { planQuery } from './pouchdb-find-query-planer/query-planner';
/**
 * Use the pouchdb query planner to determine which index
 * must be used to get the correct documents.
 * @link https://www.bennadel.com/blog/3258-understanding-the-query-plan-explained-by-the-find-plugin-in-pouchdb-6-2-0.htm
 * 
 * 
 * TODO use batched cursor
 * @link https://nolanlawson.com/2021/08/22/speeding-up-indexeddb-reads-and-writes/
 */

/**
 * Runs mango queries over the Dexie.js database.
 */
export var dexieQuery = function dexieQuery(instance, preparedQuery) {
  try {
    return Promise.resolve(instance.internals).then(function (state) {
      var queryMatcher = RxStorageDexieStatics.getQueryMatcher(instance.schema, preparedQuery);
      var sortComparator = RxStorageDexieStatics.getSortComparator(instance.schema, preparedQuery);
      var skip = preparedQuery.skip ? preparedQuery.skip : 0;
      var limit = preparedQuery.limit ? preparedQuery.limit : Infinity;
      var skipPlusLimit = skip + limit;
      var queryPlan = preparedQuery.pouchQueryPlan;
      var keyRange = getDexieKeyRange(queryPlan, Number.NEGATIVE_INFINITY, state.dexieDb._maxKey, state.dexieDb._options.IDBKeyRange);
      var queryPlanFields = queryPlan.index.def.fields.map(function (fieldObj) {
        return Object.keys(fieldObj)[0];
      }).map(function (field) {
        return pouchSwapIdToPrimaryString(instance.primaryPath, field);
      });
      var sortFields = ensureNotFalsy(preparedQuery.sort).map(function (sortPart) {
        return Object.keys(sortPart)[0];
      });
      /**
       * If the cursor iterated over the same index that
       * would be used for sorting, we do not have to sort the results.
       */

      var sortFieldsSameAsIndexFields = queryPlanFields.join(',') === sortFields.join(',');
      /**
       * Also manually sort if one part of the sort is in descending order
       * because all our indexes are ascending.
       * TODO should we be able to define descending indexes?
       */

      var isOneSortDescending = preparedQuery.sort.find(function (sortPart) {
        return Object.values(sortPart)[0] === 'desc';
      });
      var mustManuallyResort = isOneSortDescending || !sortFieldsSameAsIndexFields;
      var rows = [];
      return Promise.resolve(state.dexieDb.transaction('r', state.dexieTable, function (dexieTx) {
        try {
          /**
           * TODO here we use the native IndexedDB transaction
           * to get the cursor.
           * Instead we should not leave Dexie.js API and find
           * a way to create the cursor with Dexie.js.
           */
          var tx = dexieTx.idbtrans; // const nativeIndexedDB = state.dexieDb.backendDB();
          // const trans = nativeIndexedDB.transaction([DEXIE_DOCS_TABLE_NAME], 'readonly');

          var store = tx.objectStore(DEXIE_DOCS_TABLE_NAME);
          var index;

          if (queryPlanFields.length === 1 && queryPlanFields[0] === instance.primaryPath) {
            index = store;
          } else {
            var indexName;

            if (queryPlanFields.length === 1) {
              indexName = queryPlanFields[0];
            } else {
              indexName = '[' + queryPlanFields.join('+') + ']';
            }

            index = store.index(indexName);
          }

          var cursorReq = index.openCursor(keyRange);
          return Promise.resolve(new Promise(function (res) {
            cursorReq.onsuccess = function (e) {
              var cursor = e.target.result;

              if (cursor) {
                // We have a record in cursor.value
                var docData = cursor.value;

                if (queryMatcher(docData)) {
                  rows.push(cursor.value);
                }
                /**
                 * If we do not have to manually sort
                 * and have enough documents,
                 * we can abort iterating over the cursor
                 * because we already have every relevant document.
                 */


                if (!mustManuallyResort && rows.length === skipPlusLimit) {
                  res();
                } else {
                  cursor["continue"]();
                }
              } else {
                // Iteration complete
                res();
              }
            };
          })).then(function () {});
        } catch (e) {
          return Promise.reject(e);
        }
      })).then(function () {
        if (mustManuallyResort) {
          rows = rows.sort(sortComparator);
        } // apply skip and limit boundaries.


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
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export function getPouchQueryPlan(schema, query) {
  var primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  /**
   * Store the query plan together with the prepared query
   * to improve performance
   * We use the query planner of pouchdb-find.
   */

  var pouchCompatibleIndexes = [// the primary key is always a free index
  {
    ddoc: null,
    name: '_all_docs',
    type: 'special',
    def: {
      fields: [{
        '_id': 'asc'
      }]
    }
  }];

  if (schema.indexes) {
    schema.indexes.forEach(function (index) {
      index = Array.isArray(index) ? index : [index];
      var pouchIndex = index.map(function (indexPart) {
        if (indexPart === primaryKey) {
          return '_id';
        } else {
          return indexPart;
        }
      });
      var indexName = getPouchIndexDesignDocNameByIndex(pouchIndex);
      pouchCompatibleIndexes.push({
        ddoc: POUCHDB_DESIGN_PREFIX + indexName,
        name: indexName,
        type: 'json',
        def: {
          fields: index.map(function (indexPart) {
            var _ref;

            var useKey = indexPart === primaryKey ? '_id' : indexPart;
            return _ref = {}, _ref[useKey] = 'asc', _ref;
          })
        }
      });
    });
  }
  /**
   * Because pouchdb-find is buggy AF,
   * we have to apply the same hacks to the query
   * as we do with the PouchDB RxStorage.
   * Only then we can use that monkeypatched
   * query with the query planner.
   */


  var pouchdbCompatibleQuery = preparePouchDbQuery(schema, clone(query));
  var pouchQueryPlan = planQuery(pouchdbCompatibleQuery, pouchCompatibleIndexes); // transform back _id to primaryKey

  pouchQueryPlan.index.def.fields = pouchQueryPlan.index.def.fields.map(function (field) {
    var _Object$entries$ = Object.entries(field)[0],
        fieldName = _Object$entries$[0],
        value = _Object$entries$[1];

    if (fieldName === '_id') {
      var _ref2;

      return _ref2 = {}, _ref2[primaryKey] = value, _ref2;
    } else {
      var _ref3;

      return _ref3 = {}, _ref3[fieldName] = value, _ref3;
    }
  });
  return pouchQueryPlan;
}
export function getDexieKeyRange(queryPlan, low, height,
/**
 * The window.IDBKeyRange object.
 * Can be swapped out in other environments
 */
IDBKeyRange) {
  if (!IDBKeyRange) {
    if (typeof window === 'undefined') {
      throw new Error('IDBKeyRange missing');
    } else {
      IDBKeyRange = window.IDBKeyRange;
    }
  }

  return generateKeyRange(queryPlan.queryOpts, IDBKeyRange, low, height);
}
//# sourceMappingURL=dexie-query.js.map