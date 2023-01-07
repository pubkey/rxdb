"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageDexieStatics = exports.RX_STORAGE_NAME_DEXIE = exports.DEXIE_PIPE_SUBSTITUTE = exports.DEXIE_DOCS_TABLE_NAME = exports.DEXIE_DELETED_DOCS_TABLE_NAME = exports.DEXIE_CHANGES_TABLE_NAME = void 0;
exports.closeDexieDb = closeDexieDb;
exports.dexieReplaceIfStartsWithPipe = dexieReplaceIfStartsWithPipe;
exports.dexieReplaceIfStartsWithPipeRevert = dexieReplaceIfStartsWithPipeRevert;
exports.ensureNoBooleanIndex = ensureNoBooleanIndex;
exports.fromDexieToStorage = fromDexieToStorage;
exports.fromStorageToDexie = fromStorageToDexie;
exports.getDexieDbWithTables = getDexieDbWithTables;
exports.getDexieStoreSchema = getDexieStoreSchema;
exports.getDocsInDb = getDocsInDb;
var _dexie = require("dexie");
var _utils = require("../utils");
var _rxError = require("../../rx-error");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageStatics = require("../../rx-storage-statics");
var DEXIE_DOCS_TABLE_NAME = 'docs';
exports.DEXIE_DOCS_TABLE_NAME = DEXIE_DOCS_TABLE_NAME;
var DEXIE_DELETED_DOCS_TABLE_NAME = 'deleted-docs';
exports.DEXIE_DELETED_DOCS_TABLE_NAME = DEXIE_DELETED_DOCS_TABLE_NAME;
var DEXIE_CHANGES_TABLE_NAME = 'changes';
exports.DEXIE_CHANGES_TABLE_NAME = DEXIE_CHANGES_TABLE_NAME;
var RX_STORAGE_NAME_DEXIE = 'dexie';
exports.RX_STORAGE_NAME_DEXIE = RX_STORAGE_NAME_DEXIE;
var RxStorageDexieStatics = _rxStorageStatics.RxStorageDefaultStatics;
exports.RxStorageDexieStatics = RxStorageDexieStatics;
var DEXIE_STATE_DB_BY_NAME = new Map();
var REF_COUNT_PER_DEXIE_DB = new Map();
function getDexieDbWithTables(databaseName, collectionName, settings, schema) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  var dexieDbName = 'rxdb-dexie-' + databaseName + '--' + schema.version + '--' + collectionName;
  var state = DEXIE_STATE_DB_BY_NAME.get(dexieDbName);
  if (!state) {
    state = (async () => {
      /**
       * IndexedDB was not designed for dynamically adding tables on the fly,
       * so we create one dexie database per RxDB storage instance.
       * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
       */
      var useSettings = (0, _utils.flatClone)(settings);
      useSettings.autoOpen = false;
      var dexieDb = new _dexie.Dexie(dexieDbName, useSettings);
      var dexieStoresSettings = {
        [DEXIE_DOCS_TABLE_NAME]: getDexieStoreSchema(schema),
        [DEXIE_CHANGES_TABLE_NAME]: '++sequence, id',
        /**
         * Instead of adding {deleted: false} to every query we run over the document store,
         * we move deleted documents into a separate store where they can only be queried
         * by primary key.
         * This increases performance because it is way easier for the query planner to select
         * a good index and we also do not have to add the _deleted field to every index.
         *
         * We also need the [_meta.lwt+' + primaryPath + '] index for getChangedDocumentsSince()
         */
        [DEXIE_DELETED_DOCS_TABLE_NAME]: primaryPath + ',_meta.lwt,[_meta.lwt+' + primaryPath + ']'
      };
      dexieDb.version(1).stores(dexieStoresSettings);
      await dexieDb.open();
      return {
        dexieDb,
        dexieTable: dexieDb[DEXIE_DOCS_TABLE_NAME],
        dexieDeletedTable: dexieDb[DEXIE_DELETED_DOCS_TABLE_NAME]
      };
    })();
    DEXIE_STATE_DB_BY_NAME.set(dexieDbName, state);
    REF_COUNT_PER_DEXIE_DB.set(state, 0);
  }
  return state;
}
async function closeDexieDb(statePromise) {
  var state = await statePromise;
  var prevCount = REF_COUNT_PER_DEXIE_DB.get(statePromise);
  var newCount = prevCount - 1;
  if (newCount === 0) {
    state.dexieDb.close();
    REF_COUNT_PER_DEXIE_DB.delete(statePromise);
  } else {
    REF_COUNT_PER_DEXIE_DB.set(statePromise, newCount);
  }
}
function ensureNoBooleanIndex(schema) {
  if (!schema.indexes) {
    return;
  }
  var checkedFields = new Set();
  schema.indexes.forEach(index => {
    var fields = (0, _utils.toArray)(index);
    fields.forEach(field => {
      if (checkedFields.has(field)) {
        return;
      }
      checkedFields.add(field);
      var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema, field);
      if (schemaObj.type === 'boolean') {
        throw (0, _rxError.newRxError)('DXE1', {
          schema,
          index,
          field
        });
      }
    });
  });
}

/**
 * It is not possible to set non-javascript-variable-syntax
 * keys as IndexedDB indexes. So we have to substitute the pipe-char
 * which comes from the key-compression plugin.
 */
var DEXIE_PIPE_SUBSTITUTE = '__';
exports.DEXIE_PIPE_SUBSTITUTE = DEXIE_PIPE_SUBSTITUTE;
function dexieReplaceIfStartsWithPipe(str) {
  var split = str.split('.');
  if (split.length > 1) {
    return split.map(part => dexieReplaceIfStartsWithPipe(part)).join('.');
  }
  if (str.startsWith('|')) {
    var withoutFirst = str.substring(1);
    return DEXIE_PIPE_SUBSTITUTE + withoutFirst;
  } else {
    return str;
  }
}
function dexieReplaceIfStartsWithPipeRevert(str) {
  var split = str.split('.');
  if (split.length > 1) {
    return split.map(part => dexieReplaceIfStartsWithPipeRevert(part)).join('.');
  }
  if (str.startsWith(DEXIE_PIPE_SUBSTITUTE)) {
    var withoutFirst = str.substring(DEXIE_PIPE_SUBSTITUTE.length);
    return '|' + withoutFirst;
  } else {
    return str;
  }
}

/**
 * @recursive
 */
function fromStorageToDexie(documentData) {
  if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
    return documentData;
  } else if (Array.isArray(documentData)) {
    return documentData.map(row => fromStorageToDexie(row));
  } else if (typeof documentData === 'object') {
    var ret = {};
    Object.entries(documentData).forEach(([key, value]) => {
      if (typeof value === 'object') {
        value = fromStorageToDexie(value);
      }
      ret[dexieReplaceIfStartsWithPipe(key)] = value;
    });
    return ret;
  }
}
function fromDexieToStorage(documentData) {
  if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
    return documentData;
  } else if (Array.isArray(documentData)) {
    return documentData.map(row => fromDexieToStorage(row));
  } else if (typeof documentData === 'object') {
    var ret = {};
    Object.entries(documentData).forEach(([key, value]) => {
      if (typeof value === 'object' || Array.isArray(documentData)) {
        value = fromDexieToStorage(value);
      }
      ret[dexieReplaceIfStartsWithPipeRevert(key)] = value;
    });
    return ret;
  }
}

/**
 * Creates a string that can be used to create the dexie store.
 * @link https://dexie.org/docs/API-Reference#quick-reference
 */
function getDexieStoreSchema(rxJsonSchema) {
  var parts = [];

  /**
   * First part must be the primary key
   * @link https://github.com/dexie/Dexie.js/issues/1307#issuecomment-846590912
   */
  var primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(rxJsonSchema.primaryKey);
  parts.push([primaryKey]);

  // add other indexes
  if (rxJsonSchema.indexes) {
    rxJsonSchema.indexes.forEach(index => {
      var arIndex = (0, _utils.toArray)(index);
      parts.push(arIndex);
    });
  }

  // we also need the _meta.lwt+primaryKey index for the getChangedDocumentsSince() method.
  parts.push(['_meta.lwt', primaryKey]);

  /**
   * It is not possible to set non-javascript-variable-syntax
   * keys as IndexedDB indexes. So we have to substitute the pipe-char
   * which comes from the key-compression plugin.
   */
  parts = parts.map(part => {
    return part.map(str => dexieReplaceIfStartsWithPipe(str));
  });
  return parts.map(part => {
    if (part.length === 1) {
      return part[0];
    } else {
      return '[' + part.join('+') + ']';
    }
  }).join(', ');
}

/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
async function getDocsInDb(internals, docIds) {
  var state = await internals;
  var [nonDeletedDocsInDb, deletedDocsInDb] = await Promise.all([state.dexieTable.bulkGet(docIds), state.dexieDeletedTable.bulkGet(docIds)]);
  var docsInDb = deletedDocsInDb.slice(0);
  nonDeletedDocsInDb.forEach((doc, idx) => {
    if (doc) {
      docsInDb[idx] = doc;
    }
  });
  return docsInDb;
}
//# sourceMappingURL=dexie-helper.js.map