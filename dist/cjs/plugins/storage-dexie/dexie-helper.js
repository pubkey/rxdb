"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_STORAGE_NAME_DEXIE = exports.DEXIE_PIPE_SUBSTITUTE = exports.DEXIE_DOCS_TABLE_NAME = exports.DEXIE_CHANGES_TABLE_NAME = exports.DEXIE_ATTACHMENTS_TABLE_NAME = void 0;
exports.attachmentObjectId = attachmentObjectId;
exports.closeDexieDb = closeDexieDb;
exports.dexieReplaceIfStartsWithPipe = dexieReplaceIfStartsWithPipe;
exports.dexieReplaceIfStartsWithPipeRevert = dexieReplaceIfStartsWithPipeRevert;
exports.fromDexieToStorage = fromDexieToStorage;
exports.fromDexieToStorageField = fromDexieToStorageField;
exports.fromStorageToDexie = fromStorageToDexie;
exports.fromStorageToDexieField = fromStorageToDexieField;
exports.getBooleanIndexes = getBooleanIndexes;
exports.getDexieDbWithTables = getDexieDbWithTables;
exports.getDexieStoreSchema = getDexieStoreSchema;
exports.getDocsInDb = getDocsInDb;
var _dexie = require("dexie");
var _index = require("../utils/index.js");
var _rxSchemaHelper = require("../../rx-schema-helper.js");
var DEXIE_DOCS_TABLE_NAME = exports.DEXIE_DOCS_TABLE_NAME = 'docs';
var DEXIE_CHANGES_TABLE_NAME = exports.DEXIE_CHANGES_TABLE_NAME = 'changes';
var DEXIE_ATTACHMENTS_TABLE_NAME = exports.DEXIE_ATTACHMENTS_TABLE_NAME = 'attachments';
var RX_STORAGE_NAME_DEXIE = exports.RX_STORAGE_NAME_DEXIE = 'dexie';
var DEXIE_STATE_DB_BY_NAME = new Map();
var REF_COUNT_PER_DEXIE_DB = new Map();
function getDexieDbWithTables(databaseName, collectionName, settings, schema) {
  var dexieDbName = 'rxdb-dexie-' + databaseName + '--' + schema.version + '--' + collectionName;
  var state = (0, _index.getFromMapOrCreate)(DEXIE_STATE_DB_BY_NAME, dexieDbName, () => {
    var value = (async () => {
      /**
       * IndexedDB was not designed for dynamically adding tables on the fly,
       * so we create one dexie database per RxDB storage instance.
       * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
       */
      var useSettings = (0, _index.flatClone)(settings);
      useSettings.autoOpen = false;
      var dexieDb = new _dexie.Dexie(dexieDbName, useSettings);
      if (settings.onCreate) {
        await settings.onCreate(dexieDb, dexieDbName);
      }
      var dexieStoresSettings = {
        [DEXIE_DOCS_TABLE_NAME]: getDexieStoreSchema(schema),
        [DEXIE_CHANGES_TABLE_NAME]: '++sequence, id',
        [DEXIE_ATTACHMENTS_TABLE_NAME]: 'id'
      };
      dexieDb.version(1).stores(dexieStoresSettings);
      await dexieDb.open();
      return {
        dexieDb,
        dexieTable: dexieDb[DEXIE_DOCS_TABLE_NAME],
        dexieAttachmentsTable: dexieDb[DEXIE_ATTACHMENTS_TABLE_NAME],
        booleanIndexes: getBooleanIndexes(schema)
      };
    })();
    DEXIE_STATE_DB_BY_NAME.set(dexieDbName, state);
    REF_COUNT_PER_DEXIE_DB.set(state, 0);
    return value;
  });
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

/**
 * It is not possible to set non-javascript-variable-syntax
 * keys as IndexedDB indexes. So we have to substitute the pipe-char
 * which comes from the key-compression plugin.
 */
var DEXIE_PIPE_SUBSTITUTE = exports.DEXIE_PIPE_SUBSTITUTE = '__';
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
 * IndexedDB does not support boolean indexing.
 * So we have to replace true/false with '1'/'0'
 * @param d 
 */
function fromStorageToDexie(booleanIndexes, inputDoc) {
  if (!inputDoc) {
    return inputDoc;
  }
  var d = (0, _index.flatClone)(inputDoc);
  d = fromStorageToDexieField(d);
  booleanIndexes.forEach(idx => {
    var val = (0, _index.getProperty)(inputDoc, idx);
    var newVal = val ? '1' : '0';
    var useIndex = dexieReplaceIfStartsWithPipe(idx);
    (0, _index.setProperty)(d, useIndex, newVal);
  });
  return d;
}
function fromDexieToStorage(booleanIndexes, d) {
  if (!d) {
    return d;
  }
  d = (0, _index.flatClone)(d);
  d = fromDexieToStorageField(d);
  booleanIndexes.forEach(idx => {
    var val = (0, _index.getProperty)(d, idx);
    var newVal = val === '1' ? true : false;
    (0, _index.setProperty)(d, idx, newVal);
  });
  return d;
}

/**
 * @recursive
 */
function fromStorageToDexieField(documentData) {
  if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
    return documentData;
  } else if (Array.isArray(documentData)) {
    return documentData.map(row => fromStorageToDexieField(row));
  } else if (typeof documentData === 'object') {
    var ret = {};
    Object.entries(documentData).forEach(([key, value]) => {
      if (typeof value === 'object') {
        value = fromStorageToDexieField(value);
      }
      ret[dexieReplaceIfStartsWithPipe(key)] = value;
    });
    return ret;
  }
}
function fromDexieToStorageField(documentData) {
  if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
    return documentData;
  } else if (Array.isArray(documentData)) {
    return documentData.map(row => fromDexieToStorageField(row));
  } else if (typeof documentData === 'object') {
    var ret = {};
    Object.entries(documentData).forEach(([key, value]) => {
      if (typeof value === 'object' || Array.isArray(documentData)) {
        value = fromDexieToStorageField(value);
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
  parts.push(['_deleted', primaryKey]);

  // add other indexes
  if (rxJsonSchema.indexes) {
    rxJsonSchema.indexes.forEach(index => {
      var arIndex = (0, _index.toArray)(index);
      parts.push(arIndex);
    });
  }

  // we also need the _meta.lwt+primaryKey index for the getChangedDocumentsSince() method.
  parts.push(['_meta.lwt', primaryKey]);

  // and this one for the cleanup()
  parts.push(['_meta.lwt']);

  /**
   * It is not possible to set non-javascript-variable-syntax
   * keys as IndexedDB indexes. So we have to substitute the pipe-char
   * which comes from the key-compression plugin.
   */
  parts = parts.map(part => {
    return part.map(str => dexieReplaceIfStartsWithPipe(str));
  });
  var dexieSchemaRows = parts.map(part => {
    if (part.length === 1) {
      return part[0];
    } else {
      return '[' + part.join('+') + ']';
    }
  });
  dexieSchemaRows = dexieSchemaRows.filter((elem, pos, arr) => arr.indexOf(elem) === pos); // unique;

  var dexieSchema = dexieSchemaRows.join(', ');
  return dexieSchema;
}

/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
async function getDocsInDb(internals, docIds) {
  var state = await internals;
  var docsInDb = await state.dexieTable.bulkGet(docIds);
  return docsInDb.map(d => fromDexieToStorage(state.booleanIndexes, d));
}
function attachmentObjectId(documentId, attachmentId) {
  return documentId + '||' + attachmentId;
}
function getBooleanIndexes(schema) {
  var checkedFields = new Set();
  var ret = [];
  if (!schema.indexes) {
    return ret;
  }
  schema.indexes.forEach(index => {
    var fields = (0, _index.toArray)(index);
    fields.forEach(field => {
      if (checkedFields.has(field)) {
        return;
      }
      checkedFields.add(field);
      var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema, field);
      if (schemaObj.type === 'boolean') {
        ret.push(field);
      }
    });
  });
  ret.push('_deleted');
  return (0, _index.uniqueArray)(ret);
}
//# sourceMappingURL=dexie-helper.js.map