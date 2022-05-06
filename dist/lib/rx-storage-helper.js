"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = exports.INTERNAL_STORAGE_NAME = void 0;
exports.categorizeBulkWriteRows = categorizeBulkWriteRows;
exports.getAllDocuments = void 0;
exports.getAttachmentSize = getAttachmentSize;
exports.getSingleDocument = void 0;
exports.getUniqueDeterministicEventKey = getUniqueDeterministicEventKey;
exports.getWrappedStorageInstance = getWrappedStorageInstance;
exports.hashAttachmentData = hashAttachmentData;
exports.storageChangeEventToRxChangeEvent = storageChangeEventToRxChangeEvent;
exports.stripAttachmentsDataFromDocument = stripAttachmentsDataFromDocument;
exports.stripAttachmentsDataFromRow = stripAttachmentsDataFromRow;
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
var getAllDocuments = function getAllDocuments(primaryKey, storageInstance) {
  try {
    var _ref;

    var storage = storageInstance.storage;
    var getAllQueryPrepared = storage.statics.prepareQuery(storageInstance.schema, {
      selector: {},
      sort: [(_ref = {}, _ref[primaryKey] = 'asc', _ref)],
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
/**
 * Analyzes a list of BulkWriteRows and determines
 * which documents must be inserted, updated or deleted
 * and which events must be emitted and which documents cause a conflict
 * and must not be written.
 * Used as helper inside of some RxStorage implementations.
 */


function categorizeBulkWriteRows(storageInstance, primaryPath,
/**
 * Current state of the documents
 * inside of the storage. Used to determine
 * which writes cause conflicts.
 */
docsInDb,
/**
 * The write rows that are passed to
 * RxStorageInstance().bulkWrite().
 */
bulkWriteRows) {
  var hasAttachments = !!storageInstance.schema.attachments;
  var bulkInsertDocs = [];
  var bulkUpdateDocs = [];
  var errors = [];
  var changedDocumentIds = [];
  var eventBulk = {
    id: (0, _util.randomCouchString)(10),
    events: []
  };
  var attachmentsAdd = [];
  var attachmentsRemove = [];
  var attachmentsUpdate = [];
  var startTime = (0, _util.now)();
  bulkWriteRows.forEach(function (writeRow) {
    var id = writeRow.document[primaryPath];
    var documentInDb = docsInDb.get(id);
    var attachmentError;

    if (!documentInDb) {
      /**
       * It is possible to insert already deleted documents,
       * this can happen on replication.
       */
      var insertedIsDeleted = writeRow.document._deleted ? true : false;
      Object.entries(writeRow.document._attachments).forEach(function (_ref2) {
        var attachmentId = _ref2[0],
            attachmentData = _ref2[1];

        if (!attachmentData.data) {
          attachmentError = {
            documentId: id,
            isError: true,
            status: 510,
            writeRow: writeRow
          };
          errors.push(attachmentError);
        } else {
          attachmentsAdd.push({
            documentId: id,
            attachmentId: attachmentId,
            attachmentData: attachmentData
          });
        }
      });

      if (!attachmentError) {
        if (hasAttachments) {
          bulkInsertDocs.push(stripAttachmentsDataFromRow(writeRow));
        } else {
          bulkInsertDocs.push(writeRow);
        }
      }

      if (!insertedIsDeleted) {
        changedDocumentIds.push(id);
        eventBulk.events.push({
          eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow),
          documentId: id,
          change: {
            doc: hasAttachments ? stripAttachmentsDataFromDocument(writeRow.document) : writeRow.document,
            id: id,
            operation: 'INSERT',
            previous: null
          },
          startTime: startTime,
          endTime: (0, _util.now)()
        });
      }
    } else {
      // update existing document
      var revInDb = documentInDb._rev; // inserting a deleted document is possible
      // without sending the previous data.

      if (!writeRow.previous && documentInDb._deleted) {
        writeRow.previous = documentInDb;
      }
      /**
       * Check for conflict
       */


      if (!writeRow.previous && !documentInDb._deleted || !!writeRow.previous && revInDb !== writeRow.previous._rev) {
        // is conflict error
        var err = {
          isError: true,
          status: 409,
          documentId: id,
          writeRow: writeRow,
          documentInDb: documentInDb
        };
        errors.push(err);
        return;
      } // handle attachments data


      if (writeRow.document._deleted) {
        /**
         * Deleted documents must have cleared all their attachments.
         */
        if (writeRow.previous) {
          Object.keys(writeRow.previous._attachments).forEach(function (attachmentId) {
            attachmentsRemove.push({
              documentId: id,
              attachmentId: attachmentId
            });
          });
        }
      } else {
        // first check for errors
        Object.entries(writeRow.document._attachments).find(function (_ref3) {
          var attachmentId = _ref3[0],
              attachmentData = _ref3[1];
          var previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;

          if (!previousAttachmentData && !attachmentData.data) {
            attachmentError = {
              documentId: id,
              documentInDb: documentInDb,
              isError: true,
              status: 510,
              writeRow: writeRow
            };
          }

          return true;
        });

        if (!attachmentError) {
          Object.entries(writeRow.document._attachments).forEach(function (_ref4) {
            var attachmentId = _ref4[0],
                attachmentData = _ref4[1];
            var previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;

            if (!previousAttachmentData) {
              attachmentsAdd.push({
                documentId: id,
                attachmentId: attachmentId,
                attachmentData: attachmentData
              });
            } else {
              attachmentsUpdate.push({
                documentId: id,
                attachmentId: attachmentId,
                attachmentData: attachmentData
              });
            }
          });
        }
      }

      if (attachmentError) {
        errors.push(attachmentError);
      } else {
        if (hasAttachments) {
          bulkUpdateDocs.push(stripAttachmentsDataFromRow(writeRow));
        } else {
          bulkUpdateDocs.push(writeRow);
        }
      }

      var change = null;
      var writeDoc = writeRow.document;

      if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
        change = {
          id: id,
          operation: 'INSERT',
          previous: null,
          doc: hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc
        };
      } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
        change = {
          id: id,
          operation: 'UPDATE',
          previous: writeRow.previous,
          doc: hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc
        };
      } else if (writeRow.previous && !writeRow.previous._deleted && writeDoc._deleted) {
        change = {
          id: id,
          operation: 'DELETE',
          previous: writeRow.previous,
          doc: null
        };
      }

      if (!change) {
        if (writeRow.previous && writeRow.previous._deleted && writeRow.document._deleted) {// deleted doc got overwritten with other deleted doc -> do not send an event
        } else {
          throw (0, _rxError.newRxError)('SNH', {
            args: {
              writeRow: writeRow
            }
          });
        }
      } else {
        changedDocumentIds.push(id);
        eventBulk.events.push({
          eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow),
          documentId: id,
          change: change,
          startTime: startTime,
          endTime: (0, _util.now)()
        });
      }
    }
  });
  return {
    bulkInsertDocs: bulkInsertDocs,
    bulkUpdateDocs: bulkUpdateDocs,
    errors: errors,
    changedDocumentIds: changedDocumentIds,
    eventBulk: eventBulk,
    attachmentsAdd: attachmentsAdd,
    attachmentsRemove: attachmentsRemove,
    attachmentsUpdate: attachmentsUpdate
  };
}

function stripAttachmentsDataFromRow(writeRow) {
  return {
    previous: writeRow.previous,
    document: stripAttachmentsDataFromDocument(writeRow.document)
  };
}

function stripAttachmentsDataFromDocument(doc) {
  var useDoc = (0, _util.flatClone)(doc);
  useDoc._attachments = {};
  Object.entries(doc._attachments).forEach(function (_ref5) {
    var attachmentId = _ref5[0],
        attachmentData = _ref5[1];
    useDoc._attachments[attachmentId] = {
      digest: attachmentData.digest,
      length: attachmentData.length,
      type: attachmentData.type
    };
  });
  return useDoc;
}
/**
 * Each event is labeled with the id
 * to make it easy to filter out duplicates.
 */


function getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow) {
  var docId = writeRow.document[primaryPath];
  var binaryValues = [!!writeRow.previous, writeRow.previous && writeRow.previous._deleted, !!writeRow.document._deleted];
  var binary = binaryValues.map(function (v) {
    return v ? '1' : '0';
  }).join('');
  var eventKey = storageInstance.databaseName + '|' + storageInstance.collectionName + '|' + docId + '|' + '|' + binary + '|' + writeRow.document._rev;
  return eventKey;
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

    data._meta.lwt = (0, _util.now)();
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
    storage: storageInstance.storage,
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
        return storageInstance.bulkWrite(toStorageWriteRows);
      }).then(function (writeResult) {
        var ret = {
          success: {},
          error: {}
        };
        Object.entries(writeResult.error).forEach(function (_ref6) {
          var k = _ref6[0],
              v = _ref6[1];
          ret.error[k] = v;
        });
        Object.entries(writeResult.success).forEach(function (_ref7) {
          var k = _ref7[0],
              v = _ref7[1];
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
        Object.entries(findResult).forEach(function (_ref8) {
          var key = _ref8[0],
              doc = _ref8[1];
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
    getChangedDocumentsSince: function getChangedDocumentsSince(limit, checkpoint) {
      return database.lockedRun(function () {
        return storageInstance.getChangedDocumentsSince(limit, checkpoint);
      }).then(function (result) {
        return result.map(function (row) {
          return {
            checkpoint: row.checkpoint,
            document: transformDocumentDataFromRxStorageToRxDB(row.document)
          };
        });
      });
    },
    cleanup: function cleanup(minDeletedTime) {
      return database.lockedRun(function () {
        return storageInstance.cleanup(minDeletedTime);
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