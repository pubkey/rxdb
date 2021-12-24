"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSingleDocument = exports.getBatch = exports.getAllDocuments = exports.findLocalDocument = exports.countAllUndeleted = exports.INTERNAL_STORAGE_NAME = void 0;
exports.storageChangeEventToRxChangeEvent = storageChangeEventToRxChangeEvent;
exports.writeSingleLocal = exports.writeSingle = void 0;

var _hooks = require("./hooks");

var _overwritable = require("./overwritable");

var _rxError = require("./rx-error");

var _util = require("./util");

/**
 * Helper functions for accessing the RxStorage instances.
 */
var findLocalDocument = function findLocalDocument(instance, id) {
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

exports.findLocalDocument = findLocalDocument;

/**
 * Writes a single local document,
 * throws RxStorageBulkWriteError on failure
 */
var writeSingleLocal = function writeSingleLocal(instance, writeRow) {
  try {
    return Promise.resolve(instance.bulkWrite([writeRow])).then(function (writeResult) {
      if (Object.keys(writeResult.error).length > 0) {
        var error = (0, _util.firstPropertyValueOfObject)(writeResult.error);
        throw error;
      } else {
        var ret = (0, _util.firstPropertyValueOfObject)(writeResult.success);
        return ret;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.writeSingleLocal = writeSingleLocal;

/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
var writeSingle = function writeSingle(instance, writeRow) {
  try {
    return Promise.resolve(instance.bulkWrite([writeRow])).then(function (writeResult) {
      if (Object.keys(writeResult.error).length > 0) {
        var error = (0, _util.firstPropertyValueOfObject)(writeResult.error);
        throw error;
      } else {
        var ret = (0, _util.firstPropertyValueOfObject)(writeResult.success);
        return ret;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.writeSingle = writeSingle;

/**
 * get a batch of documents from the storage-instance
 */
var getBatch = function getBatch(storage, storageInstance, limit) {
  try {
    if (limit <= 1) {
      throw (0, _rxError.newRxError)('P1', {
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

exports.getBatch = getBatch;

/**
 * get the number of all undeleted documents
 */
var countAllUndeleted = function countAllUndeleted(storage, storageInstance) {
  return Promise.resolve(getAllDocuments(storage, storageInstance)).then(function (docs) {
    return docs.length;
  });
};

exports.countAllUndeleted = countAllUndeleted;

var getSingleDocument = function getSingleDocument(storageInstance, documentId) {
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

exports.getSingleDocument = getSingleDocument;

/**
 * returns all NON-LOCAL documents
 * TODO this is pouchdb specific should not be needed
 */
var getAllDocuments = function getAllDocuments(storage, storageInstance) {
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

exports.getAllDocuments = getAllDocuments;
var INTERNAL_STORAGE_NAME = '_rxdb_internal';
exports.INTERNAL_STORAGE_NAME = INTERNAL_STORAGE_NAME;

function storageChangeEventToRxChangeEvent(isLocal, rxStorageChangeEvent, rxCollection) {
  var documentData;

  if (rxStorageChangeEvent.change.operation !== 'DELETE') {
    if (!rxCollection) {
      documentData = rxStorageChangeEvent.change.doc;
    } else {
      var hookParams = {
        collection: rxCollection,
        doc: rxStorageChangeEvent.change.doc
      };
      (0, _hooks.runPluginHooks)('postReadFromInstance', hookParams);
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
      (0, _hooks.runPluginHooks)('postReadFromInstance', _hookParams);
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
    documentData: _overwritable.overwritable.deepFreezeWhenDevMode(documentData),
    previousDocumentData: _overwritable.overwritable.deepFreezeWhenDevMode(previousDocumentData)
  };
  return ret;
}
//# sourceMappingURL=rx-storage-helper.js.map