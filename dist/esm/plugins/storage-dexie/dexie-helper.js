import { Dexie } from 'dexie';
import { flatClone, getFromMapOrCreate, getProperty, setProperty, toArray, uniqueArray } from "../utils/index.js";
import { getPrimaryFieldOfPrimaryKey, getSchemaByObjectPath } from "../../rx-schema-helper.js";
export var DEXIE_DOCS_TABLE_NAME = 'docs';
export var DEXIE_CHANGES_TABLE_NAME = 'changes';
export var DEXIE_ATTACHMENTS_TABLE_NAME = 'attachments';
export var RX_STORAGE_NAME_DEXIE = 'dexie';
var DEXIE_STATE_DB_BY_NAME = new Map();
var REF_COUNT_PER_DEXIE_DB = new Map();
export function getDexieDbWithTables(databaseName, collectionName, settings, schema) {
  var dexieDbName = 'rxdb-dexie-' + databaseName + '--' + schema.version + '--' + collectionName;
  var state = getFromMapOrCreate(DEXIE_STATE_DB_BY_NAME, dexieDbName, () => {
    var value = (async () => {
      /**
       * IndexedDB was not designed for dynamically adding tables on the fly,
       * so we create one dexie database per RxDB storage instance.
       * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
       */
      var useSettings = flatClone(settings);
      useSettings.autoOpen = false;
      var dexieDb = new Dexie(dexieDbName, useSettings);
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
export async function closeDexieDb(statePromise) {
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
export var DEXIE_PIPE_SUBSTITUTE = '__';
export function dexieReplaceIfStartsWithPipe(str) {
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
export function dexieReplaceIfStartsWithPipeRevert(str) {
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
export function fromStorageToDexie(booleanIndexes, inputDoc) {
  if (!inputDoc) {
    return inputDoc;
  }
  var d = flatClone(inputDoc);
  d = fromStorageToDexieField(d);
  booleanIndexes.forEach(idx => {
    var val = getProperty(inputDoc, idx);
    var newVal = val ? '1' : '0';
    var useIndex = dexieReplaceIfStartsWithPipe(idx);
    setProperty(d, useIndex, newVal);
  });
  return d;
}
export function fromDexieToStorage(booleanIndexes, d) {
  if (!d) {
    return d;
  }
  d = flatClone(d);
  d = fromDexieToStorageField(d);
  booleanIndexes.forEach(idx => {
    var val = getProperty(d, idx);
    var newVal = val === '1' ? true : false;
    setProperty(d, idx, newVal);
  });
  return d;
}

/**
 * @recursive
 */
export function fromStorageToDexieField(documentData) {
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
export function fromDexieToStorageField(documentData) {
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
export function getDexieStoreSchema(rxJsonSchema) {
  var parts = [];

  /**
   * First part must be the primary key
   * @link https://github.com/dexie/Dexie.js/issues/1307#issuecomment-846590912
   */
  var primaryKey = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);
  parts.push([primaryKey]);
  parts.push(['_deleted', primaryKey]);

  // add other indexes
  if (rxJsonSchema.indexes) {
    rxJsonSchema.indexes.forEach(index => {
      var arIndex = toArray(index);
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
export async function getDocsInDb(internals, docIds) {
  var state = await internals;
  var docsInDb = await state.dexieTable.bulkGet(docIds);
  return docsInDb.map(d => fromDexieToStorage(state.booleanIndexes, d));
}
export function attachmentObjectId(documentId, attachmentId) {
  return documentId + '||' + attachmentId;
}
export function getBooleanIndexes(schema) {
  var checkedFields = new Set();
  var ret = [];
  if (!schema.indexes) {
    return ret;
  }
  schema.indexes.forEach(index => {
    var fields = toArray(index);
    fields.forEach(field => {
      if (checkedFields.has(field)) {
        return;
      }
      checkedFields.add(field);
      var schemaObj = getSchemaByObjectPath(schema, field);
      if (schemaObj.type === 'boolean') {
        ret.push(field);
      }
    });
  });
  ret.push('_deleted');
  return uniqueArray(ret);
}
//# sourceMappingURL=dexie-helper.js.map