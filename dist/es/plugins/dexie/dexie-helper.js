import mingo from 'mingo';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { Dexie } from 'dexie';
import { flatClone } from '../../util';

/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
export var getDocsInDb = function getDocsInDb(internals, docIds) {
  return Promise.resolve(internals).then(function (state) {
    return Promise.resolve(Promise.all([state.dexieTable.bulkGet(docIds), state.dexieDeletedTable.bulkGet(docIds)])).then(function (_ref) {
      var nonDeletedDocsInDb = _ref[0],
          deletedDocsInDb = _ref[1];
      var docsInDb = deletedDocsInDb.slice(0);
      nonDeletedDocsInDb.forEach(function (doc, idx) {
        if (doc) {
          docsInDb[idx] = doc;
        }
      });
      return docsInDb;
    });
  });
};
export var closeDexieDb = function closeDexieDb(statePromise) {
  return Promise.resolve(statePromise).then(function (state) {
    var prevCount = REF_COUNT_PER_DEXIE_DB.get(statePromise);
    var newCount = prevCount - 1;

    if (newCount === 0) {
      state.dexieDb.close();
      REF_COUNT_PER_DEXIE_DB["delete"](statePromise);
    } else {
      REF_COUNT_PER_DEXIE_DB.set(statePromise, newCount);
    }
  });
};
export var DEXIE_DOCS_TABLE_NAME = 'docs';
export var DEXIE_DELETED_DOCS_TABLE_NAME = 'deleted-docs';
export var DEXIE_CHANGES_TABLE_NAME = 'changes';
var DEXIE_STATE_DB_BY_NAME = new Map();
var REF_COUNT_PER_DEXIE_DB = new Map();
export function getDexieDbWithTables(databaseName, collectionName, settings, schema) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var dexieDbName = 'rxdb-dexie-' + databaseName + '--' + collectionName;
  var state = DEXIE_STATE_DB_BY_NAME.get(dexieDbName);

  if (!state) {
    state = function () {
      try {
        var _dexieDb$version$stor;

        /**
         * IndexedDB was not designed for dynamically adding tables on the fly,
         * so we create one dexie database per RxDB storage instance.
         * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
         */
        var useSettings = flatClone(settings);
        useSettings.autoOpen = false;
        var dexieDb = new Dexie(dexieDbName, useSettings);
        dexieDb.version(1).stores((_dexieDb$version$stor = {}, _dexieDb$version$stor[DEXIE_DOCS_TABLE_NAME] = getDexieStoreSchema(schema), _dexieDb$version$stor[DEXIE_CHANGES_TABLE_NAME] = '++sequence, id', _dexieDb$version$stor[DEXIE_DELETED_DOCS_TABLE_NAME] = primaryPath + ',$lastWriteAt', _dexieDb$version$stor));
        return Promise.resolve(dexieDb.open()).then(function () {
          return {
            dexieDb: dexieDb,
            dexieTable: dexieDb[DEXIE_DOCS_TABLE_NAME],
            dexieDeletedTable: dexieDb[DEXIE_DELETED_DOCS_TABLE_NAME],
            dexieChangesTable: dexieDb[DEXIE_CHANGES_TABLE_NAME]
          };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }();

    DEXIE_STATE_DB_BY_NAME.set(dexieDbName, state);
    REF_COUNT_PER_DEXIE_DB.set(state, 0);
  }

  return state;
}

function sortDirectionToMingo(direction) {
  if (direction === 'asc') {
    return 1;
  } else {
    return -1;
  }
}
/**
 * This function is at dexie-helper
 * because we need it in multiple places.
 */


export function getDexieSortComparator(schema, query) {
  var primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
  var mingoSortObject = {};
  var wasPrimaryInSort = false;

  if (query.sort) {
    query.sort.forEach(function (sortBlock) {
      var key = Object.keys(sortBlock)[0];

      if (key === primaryKey) {
        wasPrimaryInSort = true;
      }

      var direction = Object.values(sortBlock)[0];
      mingoSortObject[key] = sortDirectionToMingo(direction);
    });
  } // TODO ensuring that the primaryKey is in the sorting, should be done by RxDB, not by the storage.


  if (!wasPrimaryInSort) {
    mingoSortObject[primaryKey] = 1;
  }

  var fun = function fun(a, b) {
    var sorted = mingo.find([a, b], {}).sort(mingoSortObject);
    var first = sorted.next();

    if (first === a) {
      return -1;
    } else {
      return 1;
    }
  };

  return fun;
}
/**
 * It is not possible to set non-javascript-variable-syntax
 * keys as IndexedDB indexes. So we have to substitute the pipe-char
 * which comes from the key-compression plugin.
 */

export var DEXIE_PIPE_SUBSTITUTE = 'RxDBSubstPIPE';
export function dexieReplaceIfStartsWithPipe(str) {
  if (str.startsWith('|')) {
    var withoutFirst = str.substring(1);
    return DEXIE_PIPE_SUBSTITUTE + withoutFirst;
  } else {
    return str;
  }
}
/**
 * Creates a string that can be used to create the dexie store.
 * @link https://dexie.org/docs/API-Reference#quick-reference
 */

export function getDexieStoreSchema(rxJsonSchema) {
  var parts = [];
  /**
   * First part must be the primary key
   * @link https://github.com/dexie/Dexie.js/issues/1307#issuecomment-846590912
   */

  var primaryKey = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);
  parts.push([primaryKey]); // add other indexes

  if (rxJsonSchema.indexes) {
    rxJsonSchema.indexes.forEach(function (index) {
      var arIndex = Array.isArray(index) ? index : [index];
      parts.push(arIndex);
    });
  }
  /**
   * It is not possible to set non-javascript-variable-syntax
   * keys as IndexedDB indexes. So we have to substitute the pipe-char
   * which comes from the key-compression plugin.
   */


  parts = parts.map(function (part) {
    return part.map(function (str) {
      return dexieReplaceIfStartsWithPipe(str);
    });
  });
  return parts.map(function (part) {
    if (part.length === 1) {
      return part[0];
    } else {
      return '[' + part.join('+') + ']';
    }
  }).join(', ');
}
export function getDexieEventKey(isLocal, primary, revision) {
  var prefix = isLocal ? 'local' : 'non-local';
  var eventKey = prefix + '|' + primary + '|' + revision;
  return eventKey;
}
/**
 * Removes all internal fields from the document data
 */

export function stripDexieKey(docData) {
  var cloned = flatClone(docData);
  delete cloned.$lastWriteAt;
  return cloned;
}
//# sourceMappingURL=dexie-helper.js.map