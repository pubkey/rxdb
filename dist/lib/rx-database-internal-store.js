"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAllCollectionDocuments = exports.ensureStorageTokenExists = exports.STORAGE_TOKEN_DOCUMENT_KEY = exports.INTERNAL_STORE_SCHEMA = exports.INTERNAL_CONTEXT_STORAGE_TOKEN = exports.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES = exports.INTERNAL_CONTEXT_ENCRYPTION = exports.INTERNAL_CONTEXT_COLLECTION = void 0;
exports.getPrimaryKeyOfInternalDocument = getPrimaryKeyOfInternalDocument;

var _rxSchemaHelper = require("./rx-schema-helper");

var _rxStorageHelper = require("./rx-storage-helper");

var _util = require("./util");

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

var ensureStorageTokenExists = function ensureStorageTokenExists(rxDatabase) {
  try {
    var storageTokenDocumentId = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
    /**
     * To have less read-write cycles,
     * we just try to insert a new document
     * and only fetch the existing one if a conflict happened.
     */

    var storageToken = (0, _util.randomCouchString)(10);
    return Promise.resolve(_catch(function () {
      return Promise.resolve((0, _rxStorageHelper.writeSingle)(rxDatabase.internalStore, {
        document: {
          id: storageTokenDocumentId,
          context: INTERNAL_CONTEXT_STORAGE_TOKEN,
          key: STORAGE_TOKEN_DOCUMENT_KEY,
          data: {
            token: storageToken
          },
          _deleted: false,
          _meta: (0, _util.getDefaultRxDocumentMeta)(),
          _attachments: {}
        }
      })).then(function () {
        return storageToken;
      });
    }, function (err) {
      var _exit = false;

      function _temp2(_result) {
        if (_exit) return _result;
        throw err;
      }

      var _temp = function () {
        if (err.isError && err.status === 409) {
          return Promise.resolve((0, _rxStorageHelper.getSingleDocument)(rxDatabase.internalStore, storageTokenDocumentId)).then(function (useStorageTokenDoc) {
            if (useStorageTokenDoc) {
              var _useStorageTokenDoc$d2 = useStorageTokenDoc.data.token;
              _exit = true;
              return _useStorageTokenDoc$d2;
            }
          });
        }
      }();

      /**
       * If we get a 409 error,
       * it means another instance already inserted the storage token.
       * So we get that token from the database and return that one.
       */
      return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.ensureStorageTokenExists = ensureStorageTokenExists;

/**
 * Returns all internal documents
 * with context 'collection'
 */
var getAllCollectionDocuments = function getAllCollectionDocuments(storageInstance, storage) {
  try {
    var getAllQueryPrepared = storage.statics.prepareQuery(storageInstance.schema, {
      selector: {
        context: INTERNAL_CONTEXT_COLLECTION
      },
      sort: [{
        id: 'asc'
      }]
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
exports.INTERNAL_CONTEXT_REPLICATION_PRIMITIVES = INTERNAL_CONTEXT_REPLICATION_PRIMITIVES;
var INTERNAL_STORE_SCHEMA = {
  version: 0,
  primaryKey: {
    key: 'id',
    fields: ['context', 'key'],
    separator: '|'
  },
  type: 'object',
  properties: {
    id: {
      type: 'string'
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
  additionalProperties: false
};
exports.INTERNAL_STORE_SCHEMA = INTERNAL_STORE_SCHEMA;

function getPrimaryKeyOfInternalDocument(key, context) {
  return (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(INTERNAL_STORE_SCHEMA, {
    key: key,
    context: context
  });
}

var STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
exports.STORAGE_TOKEN_DOCUMENT_KEY = STORAGE_TOKEN_DOCUMENT_KEY;
//# sourceMappingURL=rx-database-internal-store.js.map