"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSingleDocument = exports.getAllDocuments = exports.findLocalDocument = exports.INTERNAL_STORAGE_NAME = void 0;
exports.getWrappedKeyObjectInstance = getWrappedKeyObjectInstance;
exports.getWrappedStorageInstance = getWrappedStorageInstance;
exports.storageChangeEventToRxChangeEvent = storageChangeEventToRxChangeEvent;
exports.throwIfIsStorageWriteError = throwIfIsStorageWriteError;
exports.transformDocumentDataFromRxDBToRxStorage = transformDocumentDataFromRxDBToRxStorage;
exports.transformDocumentDataFromRxStorageToRxDB = transformDocumentDataFromRxStorageToRxDB;
exports.transformLocalDocumentDataFromRxDBToRxStorage = transformLocalDocumentDataFromRxDBToRxStorage;
exports.transformLocalDocumentDataFromRxStorageToRxDB = transformLocalDocumentDataFromRxStorageToRxDB;
exports.writeSingleLocal = exports.writeSingle = void 0;

var _operators = require("rxjs/operators");

var _hooks = require("./hooks");

var _overwritable = require("./overwritable");

var _rxError = require("./rx-error");

var _util = require("./util");

/**
 * Helper functions for accessing the RxStorage instances.
 */
var findLocalDocument = function findLocalDocument(instance, id, withDeleted) {
  try {
    return Promise.resolve(instance.findLocalDocumentsById([id], withDeleted)).then(function (docList) {
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
 */
var getAllDocuments = function getAllDocuments(primaryKey, storage, storageInstance) {
  try {
    var _ref;

    var getAllQueryPrepared = storage.statics.prepareQuery(storageInstance.schema, {
      selector: {},
      sort: [(_ref = {}, _ref[primaryKey] = 'asc', _ref)]
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
    documentData = rxStorageChangeEvent.change.doc;
  }

  var previousDocumentData;

  if (rxStorageChangeEvent.change.operation !== 'INSERT') {
    previousDocumentData = rxStorageChangeEvent.change.previous;
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

function transformDocumentDataFromRxDBToRxStorage(col, data, updateLwt) {
  data = (0, _util.flatClone)(data);
  data._meta = (0, _util.flatClone)(data._meta); // ensure primary key has not been changed

  if (_overwritable.overwritable.isDevMode()) {
    col.schema.fillPrimaryKey(data);
  }

  data = col._crypter.encrypt(data);

  if (updateLwt) {
    data._meta.lwt = new Date().getTime();
  }

  var hookParams = {
    collection: col,
    doc: data
  };
  (0, _hooks.runPluginHooks)('preWriteToStorageInstance', hookParams);
  return hookParams.doc;
}

function transformDocumentDataFromRxStorageToRxDB(col, data) {
  var hookParams = {
    collection: col,
    doc: data
  };
  (0, _hooks.runPluginHooks)('postReadFromInstance', hookParams);
  return col._crypter.decrypt(hookParams.doc);
}

function throwIfIsStorageWriteError(collection, documentId, writeData, error) {
  if (error) {
    if (error.status === 409) {
      throw (0, _rxError.newRxError)('COL19', {
        collection: collection.name,
        id: documentId,
        pouchDbError: error,
        data: writeData
      });
    } else {
      throw error;
    }
  }
}
/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */


function getWrappedStorageInstance(collection, storageInstance) {
  var database = collection.database;
  var ret = {
    schema: storageInstance.schema,
    internals: storageInstance.internals,
    collectionName: storageInstance.collectionName,
    databaseName: storageInstance.databaseName,
    options: storageInstance.options,
    bulkAddRevisions: function bulkAddRevisions(documents) {
      var toStorageDocuments = documents.map(function (doc) {
        return transformDocumentDataFromRxDBToRxStorage(collection, doc, true);
      });
      return database.lockedRun(function () {
        return storageInstance.bulkAddRevisions(toStorageDocuments);
      });
    },
    bulkWrite: function bulkWrite(rows) {
      var toStorageWriteRows = rows.map(function (row) {
        return {
          document: transformDocumentDataFromRxDBToRxStorage(collection, row.document, true),
          previous: row.previous ? transformDocumentDataFromRxDBToRxStorage(collection, row.previous, false) : undefined
        };
      });
      return database.lockedRun(function () {
        return storageInstance.bulkWrite(toStorageWriteRows);
      }).then(function (writeResult) {
        var ret = {
          success: {},
          error: {}
        };
        Object.entries(writeResult.error).forEach(function (_ref2) {
          var k = _ref2[0],
              v = _ref2[1];
          ret.error[k] = v;
        });
        Object.entries(writeResult.success).forEach(function (_ref3) {
          var k = _ref3[0],
              v = _ref3[1];
          ret.success[k] = transformDocumentDataFromRxStorageToRxDB(collection, v);
        });
        return ret;
      });
    },
    query: function query(preparedQuery) {
      return database.lockedRun(function () {
        return storageInstance.query(preparedQuery);
      }).then(function (queryResult) {
        return {
          documents: queryResult.documents.map(function (doc) {
            return transformDocumentDataFromRxStorageToRxDB(collection, doc);
          })
        };
      });
    },
    findDocumentsById: function findDocumentsById(ids, deleted) {
      return database.lockedRun(function () {
        return storageInstance.findDocumentsById(ids, deleted);
      }).then(function (findResult) {
        var ret = {};
        Object.entries(findResult).forEach(function (_ref4) {
          var key = _ref4[0],
              doc = _ref4[1];
          ret[key] = transformDocumentDataFromRxStorageToRxDB(collection, doc);
        });
        return ret;
      });
    },
    getAttachmentData: function getAttachmentData(documentId, attachmentId) {
      return database.lockedRun(function () {
        return storageInstance.getAttachmentData(documentId, attachmentId);
      });
    },
    getChangedDocuments: function getChangedDocuments(options) {
      return database.lockedRun(function () {
        return storageInstance.getChangedDocuments(options);
      });
    },
    remove: function remove() {
      return database.lockedRun(function () {
        return storageInstance.remove();
      });
    },
    close: function close() {
      return database.lockedRun(function () {
        return storageInstance.close();
      });
    },
    changeStream: function changeStream() {
      return storageInstance.changeStream().pipe((0, _operators.map)(function (eventBulk) {
        var ret = {
          id: eventBulk.id,
          events: eventBulk.events.map(function (event) {
            return {
              eventId: event.eventId,
              documentId: event.documentId,
              endTime: event.endTime,
              startTime: event.startTime,
              change: {
                id: event.change.id,
                operation: event.change.operation,
                doc: event.change.doc ? transformDocumentDataFromRxStorageToRxDB(collection, event.change.doc) : undefined,
                previous: event.change.previous ? transformDocumentDataFromRxStorageToRxDB(collection, event.change.previous) : undefined
              }
            };
          })
        };
        return ret;
      }));
    }
  };
  return ret;
}

function transformLocalDocumentDataFromRxDBToRxStorage(parent, data, updateLwt) {
  data = (0, _util.flatClone)(data);
  data._meta = (0, _util.flatClone)(data._meta);

  if (updateLwt) {
    data._meta.lwt = new Date().getTime();
  }

  return data;
}

function transformLocalDocumentDataFromRxStorageToRxDB(parent, data) {
  return data;
}
/**
 * Does the same as getWrappedStorageInstance()
 * but for a key->object store.
 */


function getWrappedKeyObjectInstance(parent, keyObjectInstance) {
  var database = parent.database ? parent.database : parent;
  var ret = {
    databaseName: database.name,
    internals: keyObjectInstance.internals,
    options: keyObjectInstance.options,
    bulkWrite: function bulkWrite(rows) {
      var toStorageWriteRows = rows.map(function (row) {
        return {
          document: transformLocalDocumentDataFromRxDBToRxStorage(parent, row.document, true),
          previous: row.previous ? transformLocalDocumentDataFromRxDBToRxStorage(parent, row.previous, false) : undefined
        };
      });
      return database.lockedRun(function () {
        return keyObjectInstance.bulkWrite(toStorageWriteRows);
      }).then(function (writeResult) {
        var ret = {
          success: {},
          error: {}
        };
        Object.entries(writeResult.error).forEach(function (_ref5) {
          var k = _ref5[0],
              v = _ref5[1];
          ret.error[k] = v;
        });
        Object.entries(writeResult.success).forEach(function (_ref6) {
          var k = _ref6[0],
              v = _ref6[1];
          ret.success[k] = transformLocalDocumentDataFromRxStorageToRxDB(parent, v);
        });
        return ret;
      });
    },
    findLocalDocumentsById: function findLocalDocumentsById(ids, withDeleted) {
      return database.lockedRun(function () {
        return keyObjectInstance.findLocalDocumentsById(ids, withDeleted);
      }).then(function (findResult) {
        var ret = {};
        Object.entries(findResult).forEach(function (_ref7) {
          var key = _ref7[0],
              doc = _ref7[1];
          ret[key] = transformLocalDocumentDataFromRxStorageToRxDB(parent, doc);
        });
        return ret;
      });
    },
    changeStream: function changeStream() {
      return keyObjectInstance.changeStream().pipe((0, _operators.map)(function (eventBulk) {
        var ret = {
          id: eventBulk.id,
          events: eventBulk.events.map(function (event) {
            var changeDoc = event.change.doc;

            if (changeDoc && !changeDoc._meta) {
              console.dir(changeDoc);
              console.error('local changeSTream meta is missing'); // process.exit(1);
            }

            return {
              eventId: event.eventId,
              documentId: event.documentId,
              endTime: event.endTime,
              startTime: event.startTime,
              change: {
                id: event.change.id,
                operation: event.change.operation,
                doc: event.change.doc ? transformLocalDocumentDataFromRxStorageToRxDB(parent, event.change.doc) : undefined,
                previous: event.change.previous ? transformLocalDocumentDataFromRxStorageToRxDB(parent, event.change.previous) : undefined
              }
            };
          })
        };
        return ret;
      }));
    },
    remove: function remove() {
      return database.lockedRun(function () {
        return keyObjectInstance.remove();
      });
    },
    close: function close() {
      return database.lockedRun(function () {
        return keyObjectInstance.close();
      });
    }
  };
  return ret;
}
//# sourceMappingURL=rx-storage-helper.js.map