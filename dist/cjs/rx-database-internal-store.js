"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.STORAGE_TOKEN_DOCUMENT_KEY = exports.STORAGE_TOKEN_DOCUMENT_ID = exports.INTERNAL_STORE_SCHEMA_TITLE = exports.INTERNAL_STORE_SCHEMA = exports.INTERNAL_CONTEXT_STORAGE_TOKEN = exports.INTERNAL_CONTEXT_PIPELINE_CHECKPOINT = exports.INTERNAL_CONTEXT_MIGRATION_STATUS = exports.INTERNAL_CONTEXT_COLLECTION = void 0;
exports._collectionNamePrimary = _collectionNamePrimary;
exports.addConnectedStorageToCollection = addConnectedStorageToCollection;
exports.ensureStorageTokenDocumentExists = ensureStorageTokenDocumentExists;
exports.getAllCollectionDocuments = getAllCollectionDocuments;
exports.getPrimaryKeyOfInternalDocument = getPrimaryKeyOfInternalDocument;
exports.isDatabaseStateVersionCompatibleWithDatabaseCode = isDatabaseStateVersionCompatibleWithDatabaseCode;
exports.removeConnectedStorageFromCollection = removeConnectedStorageFromCollection;
var _rxError = require("./rx-error.js");
var _rxSchemaHelper = require("./rx-schema-helper.js");
var _rxStorageHelper = require("./rx-storage-helper.js");
var _index = require("./plugins/utils/index.js");
var _rxQueryHelper = require("./rx-query-helper.js");
var INTERNAL_CONTEXT_COLLECTION = exports.INTERNAL_CONTEXT_COLLECTION = 'collection';
var INTERNAL_CONTEXT_STORAGE_TOKEN = exports.INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';
var INTERNAL_CONTEXT_MIGRATION_STATUS = exports.INTERNAL_CONTEXT_MIGRATION_STATUS = 'rx-migration-status';
var INTERNAL_CONTEXT_PIPELINE_CHECKPOINT = exports.INTERNAL_CONTEXT_PIPELINE_CHECKPOINT = 'rx-pipeline-checkpoint';

/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */
var INTERNAL_STORE_SCHEMA_TITLE = exports.INTERNAL_STORE_SCHEMA_TITLE = 'RxInternalDocument';
var INTERNAL_STORE_SCHEMA = exports.INTERNAL_STORE_SCHEMA = (0, _rxSchemaHelper.fillWithDefaultSettings)({
  version: 0,
  title: INTERNAL_STORE_SCHEMA_TITLE,
  primaryKey: {
    key: 'id',
    fields: ['context', 'key'],
    separator: '|'
  },
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 200
    },
    key: {
      type: 'string'
    },
    context: {
      type: 'string',
      enum: [INTERNAL_CONTEXT_COLLECTION, INTERNAL_CONTEXT_STORAGE_TOKEN, INTERNAL_CONTEXT_MIGRATION_STATUS, INTERNAL_CONTEXT_PIPELINE_CHECKPOINT, 'OTHER']
    },
    data: {
      type: 'object',
      additionalProperties: true
    }
  },
  indexes: [],
  required: ['key', 'context', 'data'],
  additionalProperties: false,
  /**
   * If the sharding plugin is used,
   * it must not shard on the internal RxStorageInstance
   * because that one anyway has only a small amount of documents
   * and also its creation is in the hot path of the initial page load,
   * so we should spend less time creating multiple RxStorageInstances.
   */
  sharding: {
    shards: 1,
    mode: 'collection'
  }
});
function getPrimaryKeyOfInternalDocument(key, context) {
  return (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(INTERNAL_STORE_SCHEMA, {
    key,
    context
  });
}

/**
 * Returns all internal documents
 * with context 'collection'
 */
async function getAllCollectionDocuments(storageInstance) {
  var getAllQueryPrepared = (0, _rxQueryHelper.prepareQuery)(storageInstance.schema, {
    selector: {
      context: INTERNAL_CONTEXT_COLLECTION,
      _deleted: {
        $eq: false
      }
    },
    sort: [{
      id: 'asc'
    }],
    skip: 0
  });
  var queryResult = await storageInstance.query(getAllQueryPrepared);
  var allDocs = queryResult.documents;
  return allDocs;
}

/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
var STORAGE_TOKEN_DOCUMENT_KEY = exports.STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
var STORAGE_TOKEN_DOCUMENT_ID = exports.STORAGE_TOKEN_DOCUMENT_ID = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
async function ensureStorageTokenDocumentExists(rxDatabase) {
  /**
   * To have less read-write cycles,
   * we just try to insert a new document
   * and only fetch the existing one if a conflict happened.
   */
  var storageToken = (0, _index.randomToken)(10);
  var passwordHash = rxDatabase.password ? await rxDatabase.hashFunction(JSON.stringify(rxDatabase.password)) : undefined;
  var docData = {
    id: STORAGE_TOKEN_DOCUMENT_ID,
    context: INTERNAL_CONTEXT_STORAGE_TOKEN,
    key: STORAGE_TOKEN_DOCUMENT_KEY,
    data: {
      rxdbVersion: rxDatabase.rxdbVersion,
      token: storageToken,
      /**
       * We add the instance token here
       * to be able to detect if a given RxDatabase instance
       * is the first instance that was ever created
       * or if databases have existed earlier on that storage
       * with the same database name.
       */
      instanceToken: rxDatabase.token,
      passwordHash
    },
    _deleted: false,
    _meta: (0, _index.getDefaultRxDocumentMeta)(),
    _rev: (0, _index.getDefaultRevision)(),
    _attachments: {}
  };
  var writeRows = [{
    document: docData
  }];
  var writeResult = await rxDatabase.internalStore.bulkWrite(writeRows, 'internal-add-storage-token');
  if (!writeResult.error[0]) {
    return (0, _rxStorageHelper.getWrittenDocumentsFromBulkWriteResponse)('id', writeRows, writeResult)[0];
  }

  /**
   * If we get a 409 error,
   * it means another instance already inserted the storage token.
   * So we get that token from the database and return that one.
   */
  var error = (0, _index.ensureNotFalsy)(writeResult.error[0]);
  if (error.isError && (0, _rxError.isBulkWriteConflictError)(error)) {
    var conflictError = error;
    if (!isDatabaseStateVersionCompatibleWithDatabaseCode(conflictError.documentInDb.data.rxdbVersion, rxDatabase.rxdbVersion)) {
      throw (0, _rxError.newRxError)('DM5', {
        args: {
          database: rxDatabase.name,
          databaseStateVersion: conflictError.documentInDb.data.rxdbVersion,
          codeVersion: rxDatabase.rxdbVersion
        }
      });
    }
    if (passwordHash && passwordHash !== conflictError.documentInDb.data.passwordHash) {
      throw (0, _rxError.newRxError)('DB1', {
        passwordHash,
        existingPasswordHash: conflictError.documentInDb.data.passwordHash
      });
    }
    var storageTokenDocInDb = conflictError.documentInDb;
    return (0, _index.ensureNotFalsy)(storageTokenDocInDb);
  }
  throw error;
}
function isDatabaseStateVersionCompatibleWithDatabaseCode(databaseStateVersion, codeVersion) {
  if (!databaseStateVersion) {
    return false;
  }
  var stateMajor = databaseStateVersion.split('.')[0];
  var codeMajor = codeVersion.split('.')[0];

  /**
   * Version v15 data must be upwards compatible to v16
   */
  if (stateMajor === '15' && codeMajor === '16') {
    return true;
  }
  if (stateMajor !== codeMajor) {
    return false;
  }
  return true;
}
async function addConnectedStorageToCollection(collection, storageCollectionName, schema) {
  if (collection.schema.version !== schema.version) {
    throw (0, _rxError.newRxError)('SNH', {
      schema,
      version: collection.schema.version,
      name: collection.name,
      collection,
      args: {
        storageCollectionName
      }
    });
  }
  var collectionNameWithVersion = _collectionNamePrimary(collection.name, collection.schema.jsonSchema);
  var collectionDocId = getPrimaryKeyOfInternalDocument(collectionNameWithVersion, INTERNAL_CONTEXT_COLLECTION);
  while (true) {
    var collectionDoc = await (0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, collectionDocId);
    var saveData = (0, _index.clone)((0, _index.ensureNotFalsy)(collectionDoc));

    // do nothing if already in array
    var alreadyThere = saveData.data.connectedStorages.find(row => row.collectionName === storageCollectionName && row.schema.version === schema.version);
    if (alreadyThere) {
      return;
    }

    // otherwise add to array and save
    saveData.data.connectedStorages.push({
      collectionName: storageCollectionName,
      schema
    });
    try {
      await (0, _rxStorageHelper.writeSingle)(collection.database.internalStore, {
        previous: (0, _index.ensureNotFalsy)(collectionDoc),
        document: saveData
      }, 'add-connected-storage-to-collection');
    } catch (err) {
      if (!(0, _rxError.isBulkWriteConflictError)(err)) {
        throw err;
      }
      // retry on conflict
    }
  }
}
async function removeConnectedStorageFromCollection(collection, storageCollectionName, schema) {
  if (collection.schema.version !== schema.version) {
    throw (0, _rxError.newRxError)('SNH', {
      schema,
      version: collection.schema.version,
      name: collection.name,
      collection,
      args: {
        storageCollectionName
      }
    });
  }
  var collectionNameWithVersion = _collectionNamePrimary(collection.name, collection.schema.jsonSchema);
  var collectionDocId = getPrimaryKeyOfInternalDocument(collectionNameWithVersion, INTERNAL_CONTEXT_COLLECTION);
  while (true) {
    var collectionDoc = await (0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, collectionDocId);
    var saveData = (0, _index.clone)((0, _index.ensureNotFalsy)(collectionDoc));

    // do nothing if not there
    var isThere = saveData.data.connectedStorages.find(row => row.collectionName === storageCollectionName && row.schema.version === schema.version);
    if (!isThere) {
      return;
    }

    // otherwise remove from array and save
    saveData.data.connectedStorages = saveData.data.connectedStorages.filter(item => item.collectionName !== storageCollectionName);
    try {
      await (0, _rxStorageHelper.writeSingle)(collection.database.internalStore, {
        previous: (0, _index.ensureNotFalsy)(collectionDoc),
        document: saveData
      }, 'remove-connected-storage-from-collection');
    } catch (err) {
      if (!(0, _rxError.isBulkWriteConflictError)(err)) {
        throw err;
      }
      // retry on conflict
    }
  }
}

/**
 * returns the primary for a given collection-data
 * used in the internal store of a RxDatabase
 */
function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}
//# sourceMappingURL=rx-database-internal-store.js.map