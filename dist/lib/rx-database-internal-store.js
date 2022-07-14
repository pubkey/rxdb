"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAllCollectionDocuments = exports.ensureStorageTokenDocumentExists = exports.STORAGE_TOKEN_DOCUMENT_KEY = exports.STORAGE_TOKEN_DOCUMENT_ID = exports.INTERNAL_STORE_SCHEMA_TITLE = exports.INTERNAL_STORE_SCHEMA = exports.INTERNAL_CONTEXT_STORAGE_TOKEN = exports.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES = exports.INTERNAL_CONTEXT_ENCRYPTION = exports.INTERNAL_CONTEXT_COLLECTION = void 0;
exports.getPrimaryKeyOfInternalDocument = getPrimaryKeyOfInternalDocument;

var _rxSchemaHelper = require("./rx-schema-helper");

var _util = require("./util");

var ensureStorageTokenDocumentExists = function ensureStorageTokenDocumentExists(rxDatabase) {
  try {
    /**
     * To have less read-write cycles,
     * we just try to insert a new document
     * and only fetch the existing one if a conflict happened.
     */
    var storageToken = (0, _util.randomCouchString)(10);
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
        instanceToken: rxDatabase.token
      },
      _deleted: false,
      _meta: (0, _util.getDefaultRxDocumentMeta)(),
      _rev: (0, _util.getDefaultRevision)(),
      _attachments: {}
    };
    docData._rev = (0, _util.createRevision)(docData);
    return Promise.resolve(rxDatabase.internalStore.bulkWrite([{
      document: docData
    }], 'internal-add-storage-token')).then(function (writeResult) {
      if (writeResult.success[STORAGE_TOKEN_DOCUMENT_ID]) {
        return writeResult.success[STORAGE_TOKEN_DOCUMENT_ID];
      }
      /**
       * If we get a 409 error,
       * it means another instance already inserted the storage token.
       * So we get that token from the database and return that one.
       */


      var error = (0, _util.ensureNotFalsy)(writeResult.error[STORAGE_TOKEN_DOCUMENT_ID]);

      if (error.isError && error.status === 409) {
        var storageTokenDocInDb = error.documentInDb;
        return (0, _util.ensureNotFalsy)(storageTokenDocInDb);
      }

      throw error;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.ensureStorageTokenDocumentExists = ensureStorageTokenDocumentExists;

/**
 * Returns all internal documents
 * with context 'collection'
 */
var getAllCollectionDocuments = function getAllCollectionDocuments(storageInstance) {
  try {
    var getAllQueryPrepared = storageInstance.storage.statics.prepareQuery(storageInstance.schema, {
      selector: {
        context: INTERNAL_CONTEXT_COLLECTION
      },
      sort: [{
        id: 'asc'
      }],
      skip: 0
    });
    return Promise.resolve(storageInstance.query(getAllQueryPrepared)).then(function (queryResult) {
      var allDocs = queryResult.documents;
      return allDocs;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */


exports.getAllCollectionDocuments = getAllCollectionDocuments;
var INTERNAL_CONTEXT_COLLECTION = 'collection';
exports.INTERNAL_CONTEXT_COLLECTION = INTERNAL_CONTEXT_COLLECTION;
var INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';
exports.INTERNAL_CONTEXT_STORAGE_TOKEN = INTERNAL_CONTEXT_STORAGE_TOKEN;
var INTERNAL_CONTEXT_ENCRYPTION = 'plugin-encryption';
exports.INTERNAL_CONTEXT_ENCRYPTION = INTERNAL_CONTEXT_ENCRYPTION;
var INTERNAL_CONTEXT_REPLICATION_PRIMITIVES = 'plugin-replication-primitives';
/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */

exports.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES = INTERNAL_CONTEXT_REPLICATION_PRIMITIVES;
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
      "enum": [INTERNAL_CONTEXT_COLLECTION, INTERNAL_CONTEXT_STORAGE_TOKEN, INTERNAL_CONTEXT_ENCRYPTION, INTERNAL_CONTEXT_REPLICATION_PRIMITIVES, 'OTHER']
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
    key: key,
    context: context
  });
}

var STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
exports.STORAGE_TOKEN_DOCUMENT_KEY = STORAGE_TOKEN_DOCUMENT_KEY;
var STORAGE_TOKEN_DOCUMENT_ID = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
exports.STORAGE_TOKEN_DOCUMENT_ID = STORAGE_TOKEN_DOCUMENT_ID;
//# sourceMappingURL=rx-database-internal-store.js.map