"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAllDocuments = exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = exports.INTERNAL_STORAGE_NAME = void 0;
exports.getAttachmentSize = getAttachmentSize;
exports.getSingleDocument = void 0;
exports.getWrappedStorageInstance = getWrappedStorageInstance;
exports.hashAttachmentData = hashAttachmentData;
exports.storageChangeEventToRxChangeEvent = storageChangeEventToRxChangeEvent;
exports.throwIfIsStorageWriteError = throwIfIsStorageWriteError;
exports.writeSingle = void 0;

var _operators = require("rxjs/operators");

var _hooks = require("./hooks");

var _overwritable = require("./overwritable");

var _rxError = require("./rx-error");

var _rxSchemaHelper = require("./rx-schema-helper");

var _util = require("./util");

/**
 * Helper functions for accessing the RxStorage instances.
 */

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
 * Returns all non-deleted documents
 * of the storage.
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
var RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';
exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = RX_DATABASE_LOCAL_DOCS_STORAGE_NAME;

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

function hashAttachmentData(attachmentBase64String, storageStatics) {
  return storageStatics.hash(atob(attachmentBase64String));
}

function getAttachmentSize(attachmentBase64String) {
  return atob(attachmentBase64String).length;
}
/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */


function getWrappedStorageInstance(database, storageInstance,
/**
 * The original RxJsonSchema
 * before it was mutated by hooks.
 */
rxJsonSchema) {
  _overwritable.overwritable.deepFreezeWhenDevMode(rxJsonSchema);

  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(rxJsonSchema.primaryKey);

  function transformDocumentDataFromRxDBToRxStorage(writeRow) {
    var data = (0, _util.flatClone)(writeRow.document);
    data._meta = (0, _util.flatClone)(data._meta); // ensure primary key has not been changed

    if (_overwritable.overwritable.isDevMode()) {
      data = (0, _rxSchemaHelper.fillPrimaryKey)(primaryPath, rxJsonSchema, data);
    }

    data._meta.lwt = new Date().getTime();
    var hookParams = {
      database: database,
      primaryPath: primaryPath,
      schema: rxJsonSchema,
      doc: data
    };
    /**
     * Run the hooks once for the previous doc,
     * once for the new write data
     */

    var previous = writeRow.previous;

    if (previous) {
      hookParams.doc = previous;
      (0, _hooks.runPluginHooks)('preWriteToStorageInstance', hookParams);
      previous = hookParams.doc;
    }

    hookParams.doc = data;
    (0, _hooks.runPluginHooks)('preWriteToStorageInstance', hookParams);
    data = hookParams.doc;
    /**
     * Update the revision after the hooks have run.
     * Do not update the revision if no previous is given,
     * because the migration plugin must be able to do an insert
     * with a pre-created revision.
     */

    if (writeRow.previous || !data._rev) {
      data._rev = (0, _util.createRevision)(data, writeRow.previous);
    }

    return {
      document: data,
      previous: previous
    };
  }

  function transformDocumentDataFromRxStorageToRxDB(data) {
    var hookParams = {
      database: database,
      primaryPath: primaryPath,
      schema: rxJsonSchema,
      doc: data
    };
    (0, _hooks.runPluginHooks)('postReadFromInstance', hookParams);
    return hookParams.doc;
  }

  var ret = {
    schema: storageInstance.schema,
    internals: storageInstance.internals,
    collectionName: storageInstance.collectionName,
    databaseName: storageInstance.databaseName,
    options: storageInstance.options,
    bulkWrite: function bulkWrite(rows) {
      var toStorageWriteRows = rows.map(function (row) {
        return transformDocumentDataFromRxDBToRxStorage(row);
      });
      return database.lockedRun(function () {
        return storageInstance.bulkWrite((0, _util.clone)(toStorageWriteRows));
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
          ret.success[k] = transformDocumentDataFromRxStorageToRxDB(v);
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
            return transformDocumentDataFromRxStorageToRxDB(doc);
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
          ret[key] = transformDocumentDataFromRxStorageToRxDB(doc);
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
                doc: event.change.doc ? transformDocumentDataFromRxStorageToRxDB(event.change.doc) : undefined,
                previous: event.change.previous ? transformDocumentDataFromRxStorageToRxDB(event.change.previous) : undefined
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
//# sourceMappingURL=rx-storage-helper.js.map