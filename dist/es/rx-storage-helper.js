/**
 * Helper functions for accessing the RxStorage instances.
 */
import { runPluginHooks } from './hooks';
import { overwritable } from './overwritable';
import { newRxError } from './rx-error';
import { firstPropertyValueOfObject } from './util';
export var findLocalDocument = function findLocalDocument(instance, id) {
  try {
    return Promise.resolve(instance.findLocalDocumentsById([id])).then(function (docList) {
      var doc = docList[id];

      if (!doc) {
        return null;
      } else {
        return doc;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Writes a single local document,
 * throws RxStorageBulkWriteError on failure
 */
export var writeSingleLocal = function writeSingleLocal(instance, writeRow) {
  try {
    return Promise.resolve(instance.bulkWrite([writeRow])).then(function (writeResult) {
      if (Object.keys(writeResult.error).length > 0) {
        var error = firstPropertyValueOfObject(writeResult.error);
        throw error;
      } else {
        var ret = firstPropertyValueOfObject(writeResult.success);
        return ret;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
export var writeSingle = function writeSingle(instance, writeRow) {
  try {
    return Promise.resolve(instance.bulkWrite([writeRow])).then(function (writeResult) {
      if (Object.keys(writeResult.error).length > 0) {
        var error = firstPropertyValueOfObject(writeResult.error);
        throw error;
      } else {
        var ret = firstPropertyValueOfObject(writeResult.success);
        return ret;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * get a batch of documents from the storage-instance
 */
export var getBatch = function getBatch(storage, storageInstance, limit) {
  try {
    if (limit <= 1) {
      throw newRxError('P1', {
        limit: limit
      });
    }

    var preparedQuery = storage.statics.prepareQuery(storageInstance.schema, {
      selector: {},
      limit: limit
    });
    return Promise.resolve(storageInstance.query(preparedQuery)).then(function (result) {
      return result.documents;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * get the number of all undeleted documents
 */
export var countAllUndeleted = function countAllUndeleted(storage, storageInstance) {
  return Promise.resolve(getAllDocuments(storage, storageInstance)).then(function (docs) {
    return docs.length;
  });
};
export var getSingleDocument = function getSingleDocument(storageInstance, documentId) {
  try {
    return Promise.resolve(storageInstance.findDocumentsById([documentId], false)).then(function (results) {
      var doc = results[documentId];

      if (doc) {
        return doc;
      } else {
        return null;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * returns all NON-LOCAL documents
 * TODO this is pouchdb specific should not be needed
 */
export var getAllDocuments = function getAllDocuments(storage, storageInstance) {
  try {
    var getAllQueryPrepared = storage.statics.prepareQuery(storageInstance.schema, {
      selector: {}
    });
    return Promise.resolve(storageInstance.query(getAllQueryPrepared)).then(function (queryResult) {
      var allDocs = queryResult.documents;
      return allDocs;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var INTERNAL_STORAGE_NAME = '_rxdb_internal';
export function storageChangeEventToRxChangeEvent(isLocal, rxStorageChangeEvent, rxCollection) {
  var documentData;

  if (rxStorageChangeEvent.change.operation !== 'DELETE') {
    if (!rxCollection) {
      documentData = rxStorageChangeEvent.change.doc;
    } else {
      var hookParams = {
        collection: rxCollection,
        doc: rxStorageChangeEvent.change.doc
      };
      runPluginHooks('postReadFromInstance', hookParams);
      documentData = hookParams.doc;
      documentData = rxCollection._crypter.decrypt(documentData);
    }
  }

  var previousDocumentData;

  if (rxStorageChangeEvent.change.operation !== 'INSERT') {
    if (!rxCollection) {
      previousDocumentData = rxStorageChangeEvent.change.previous;
    } else {
      var _hookParams = {
        collection: rxCollection,
        doc: rxStorageChangeEvent.change.previous
      };
      runPluginHooks('postReadFromInstance', _hookParams);
      previousDocumentData = _hookParams.doc;
      previousDocumentData = rxCollection._crypter.decrypt(previousDocumentData);
    }
  }

  var ret = {
    eventId: rxStorageChangeEvent.eventId,
    documentId: rxStorageChangeEvent.documentId,
    collectionName: rxCollection ? rxCollection.name : undefined,
    startTime: rxStorageChangeEvent.startTime,
    endTime: rxStorageChangeEvent.endTime,
    isLocal: isLocal,
    operation: rxStorageChangeEvent.change.operation,
    documentData: overwritable.deepFreezeWhenDevMode(documentData),
    previousDocumentData: overwritable.deepFreezeWhenDevMode(previousDocumentData)
  };
  return ret;
}
//# sourceMappingURL=rx-storage-helper.js.map