import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData } from './rx-schema-helper';
import { writeSingle } from './rx-storage-helper';
import { createRevision, ensureNotFalsy, getDefaultRevision, now, randomCouchString } from './util';

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

export var ensureStorageTokenExists = function ensureStorageTokenExists(rxDatabase) {
  try {
    var storageTokenDocumentId = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
    /**
     * To have less read-write cycles,
     * we just try to insert a new document
     * and only fetch the existing one if a conflict happened.
     */

    var storageToken = randomCouchString(10);
    return Promise.resolve(_catch(function () {
      var docData = {
        id: storageTokenDocumentId,
        context: INTERNAL_CONTEXT_STORAGE_TOKEN,
        key: STORAGE_TOKEN_DOCUMENT_KEY,
        data: {
          token: storageToken
        },
        _deleted: false,
        _meta: {
          lwt: now()
        },
        _rev: getDefaultRevision(),
        _attachments: {}
      };
      docData._rev = createRevision(docData);
      return Promise.resolve(writeSingle(rxDatabase.internalStore, {
        document: docData
      })).then(function () {
        return storageToken;
      });
    }, function (err) {
      /**
       * If we get a 409 error,
       * it means another instance already inserted the storage token.
       * So we get that token from the database and return that one.
       */
      if (err.isError && err.status === 409) {
        var storageTokenDocInDb = err.documentInDb;
        return ensureNotFalsy(storageTokenDocInDb).data.token;
      }

      throw err;
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Returns all internal documents
 * with context 'collection'
 */
export var getAllCollectionDocuments = function getAllCollectionDocuments(storageInstance, storage) {
  try {
    var getAllQueryPrepared = storage.statics.prepareQuery(storageInstance.schema, {
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

export var INTERNAL_CONTEXT_COLLECTION = 'collection';
export var INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';
export var INTERNAL_CONTEXT_ENCRYPTION = 'plugin-encryption';
export var INTERNAL_CONTEXT_REPLICATION_PRIMITIVES = 'plugin-replication-primitives';
export var INTERNAL_STORE_SCHEMA = fillWithDefaultSettings({
  version: 0,
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
export function getPrimaryKeyOfInternalDocument(key, context) {
  return getComposedPrimaryKeyOfDocumentData(INTERNAL_STORE_SCHEMA, {
    key: key,
    context: context
  });
}
export var STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
//# sourceMappingURL=rx-database-internal-store.js.map