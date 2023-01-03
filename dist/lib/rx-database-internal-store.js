"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.STORAGE_TOKEN_DOCUMENT_KEY = exports.STORAGE_TOKEN_DOCUMENT_ID = exports.INTERNAL_STORE_SCHEMA_TITLE = exports.INTERNAL_STORE_SCHEMA = exports.INTERNAL_CONTEXT_STORAGE_TOKEN = exports.INTERNAL_CONTEXT_COLLECTION = void 0;
exports._collectionNamePrimary = _collectionNamePrimary;
exports.addConnectedStorageToCollection = addConnectedStorageToCollection;
exports.ensureStorageTokenDocumentExists = ensureStorageTokenDocumentExists;
exports.getAllCollectionDocuments = getAllCollectionDocuments;
exports.getPrimaryKeyOfInternalDocument = getPrimaryKeyOfInternalDocument;
var _rxError = require("./rx-error");
var _rxSchemaHelper = require("./rx-schema-helper");
var _rxStorageHelper = require("./rx-storage-helper");
var _utils = require("./plugins/utils");
var INTERNAL_CONTEXT_COLLECTION = 'collection';
exports.INTERNAL_CONTEXT_COLLECTION = INTERNAL_CONTEXT_COLLECTION;
var INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';

/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */
exports.INTERNAL_CONTEXT_STORAGE_TOKEN = INTERNAL_CONTEXT_STORAGE_TOKEN;
var INTERNAL_STORE_SCHEMA_TITLE = 'RxInternalDocument';
exports.INTERNAL_STORE_SCHEMA_TITLE = INTERNAL_STORE_SCHEMA_TITLE;
var INTERNAL_STORE_SCHEMA = (0, _rxSchemaHelper.fillWithDefaultSettings)({
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
      enum: [INTERNAL_CONTEXT_COLLECTION, INTERNAL_CONTEXT_STORAGE_TOKEN, 'OTHER']
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
exports.INTERNAL_STORE_SCHEMA = INTERNAL_STORE_SCHEMA;
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
async function getAllCollectionDocuments(storageStatics, storageInstance) {
  var getAllQueryPrepared = storageStatics.prepareQuery(storageInstance.schema, {
    selector: {
      context: INTERNAL_CONTEXT_COLLECTION
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
var STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
exports.STORAGE_TOKEN_DOCUMENT_KEY = STORAGE_TOKEN_DOCUMENT_KEY;
var STORAGE_TOKEN_DOCUMENT_ID = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
exports.STORAGE_TOKEN_DOCUMENT_ID = STORAGE_TOKEN_DOCUMENT_ID;
async function ensureStorageTokenDocumentExists(rxDatabase) {
  /**
   * To have less read-write cycles,
   * we just try to insert a new document
   * and only fetch the existing one if a conflict happened.
   */
  var storageToken = (0, _utils.randomCouchString)(10);
  var passwordHash = rxDatabase.password ? (0, _utils.fastUnsecureHash)(rxDatabase.password) : undefined;
  var docData = {
    id: STORAGE_TOKEN_DOCUMENT_ID,
    context: INTERNAL_CONTEXT_STORAGE_TOKEN,
    key: STORAGE_TOKEN_DOCUMENT_KEY,
    data: {
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
    _meta: (0, _utils.getDefaultRxDocumentMeta)(),
    _rev: (0, _utils.getDefaultRevision)(),
    _attachments: {}
  };
  var writeResult = await rxDatabase.internalStore.bulkWrite([{
    document: docData
  }], 'internal-add-storage-token');
  if (writeResult.success[STORAGE_TOKEN_DOCUMENT_ID]) {
    return writeResult.success[STORAGE_TOKEN_DOCUMENT_ID];
  }

  /**
   * If we get a 409 error,
   * it means another instance already inserted the storage token.
   * So we get that token from the database and return that one.
   */
  var error = (0, _utils.ensureNotFalsy)(writeResult.error[STORAGE_TOKEN_DOCUMENT_ID]);
  if (error.isError && error.status === 409) {
    var conflictError = error;
    if (passwordHash && passwordHash !== conflictError.documentInDb.data.passwordHash) {
      throw (0, _rxError.newRxError)('DB1', {
        passwordHash,
        existingPasswordHash: conflictError.documentInDb.data.passwordHash
      });
    }
    var storageTokenDocInDb = conflictError.documentInDb;
    return (0, _utils.ensureNotFalsy)(storageTokenDocInDb);
  }
  throw error;
}
async function addConnectedStorageToCollection(collection, storageCollectionName, schema) {
  var collectionNameWithVersion = _collectionNamePrimary(collection.name, collection.schema.jsonSchema);
  var collectionDocId = getPrimaryKeyOfInternalDocument(collectionNameWithVersion, INTERNAL_CONTEXT_COLLECTION);
  while (true) {
    var collectionDoc = await (0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, collectionDocId);
    var saveData = (0, _utils.clone)((0, _utils.ensureNotFalsy)(collectionDoc));
    /**
     * Add array if not exist for backwards compatibility
     * TODO remove this in 2023
     */
    if (!saveData.data.connectedStorages) {
      saveData.data.connectedStorages = [];
    }

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
        previous: (0, _utils.ensureNotFalsy)(collectionDoc),
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

/**
 * returns the primary for a given collection-data
 * used in the internal store of a RxDatabase
 */
function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}
//# sourceMappingURL=rx-database-internal-store.js.map