"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = exports.INTERNAL_STORAGE_NAME = void 0;
exports.attachmentWriteDataToNormalData = attachmentWriteDataToNormalData;
exports.categorizeBulkWriteRows = categorizeBulkWriteRows;
exports.ensureRxStorageInstanceParamsAreCorrect = ensureRxStorageInstanceParamsAreCorrect;
exports.flatCloneDocWithMeta = flatCloneDocWithMeta;
exports.getAttachmentSize = getAttachmentSize;
exports.getNewestOfDocumentStates = getNewestOfDocumentStates;
exports.getSingleDocument = void 0;
exports.getUniqueDeterministicEventKey = getUniqueDeterministicEventKey;
exports.getWrappedStorageInstance = getWrappedStorageInstance;
exports.hasEncryption = hasEncryption;
exports.stackCheckpoints = stackCheckpoints;
exports.storageChangeEventToRxChangeEvent = storageChangeEventToRxChangeEvent;
exports.stripAttachmentsDataFromDocument = stripAttachmentsDataFromDocument;
exports.stripAttachmentsDataFromRow = stripAttachmentsDataFromRow;
exports.throwIfIsStorageWriteError = throwIfIsStorageWriteError;
exports.writeSingle = void 0;
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
var writeSingle = function writeSingle(instance, writeRow, context) {
  try {
    return Promise.resolve(instance.bulkWrite([writeRow], context)).then(function (writeResult) {
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
/**
 * Checkpoints must be stackable over another.
 * This is required form some RxStorage implementations
 * like the sharding plugin, where a checkpoint only represents
 * the document state from some, but not all shards.
 */
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
var INTERNAL_STORAGE_NAME = '_rxdb_internal';
exports.INTERNAL_STORAGE_NAME = INTERNAL_STORAGE_NAME;
var RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';
exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = RX_DATABASE_LOCAL_DOCS_STORAGE_NAME;
function stackCheckpoints(checkpoints) {
  return Object.assign.apply(Object, [{}].concat(checkpoints));
}
function storageChangeEventToRxChangeEvent(isLocal, rxStorageChangeEvent, rxCollection) {
  var documentData = rxStorageChangeEvent.documentData;
  var previousDocumentData = rxStorageChangeEvent.previousDocumentData;
  var ret = {
    eventId: rxStorageChangeEvent.eventId,
    documentId: rxStorageChangeEvent.documentId,
    collectionName: rxCollection ? rxCollection.name : undefined,
    startTime: rxStorageChangeEvent.startTime,
    endTime: rxStorageChangeEvent.endTime,
    isLocal: isLocal,
    operation: rxStorageChangeEvent.operation,
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
        error: error,
        data: writeData
      });
    } else {
      throw error;
    }
  }
}

/**
 * From a list of documents,
 * it will return the document that has the 'newest' state
 * which must be used to create the correct checkpoint
 * for the whole list.
 */
function getNewestOfDocumentStates(primaryPath, docs) {
  var ret = null;
  docs.forEach(function (doc) {
    if (!ret || doc._meta.lwt > ret._meta.lwt || doc._meta.lwt === ret._meta.lwt && doc[primaryPath] > ret[primaryPath]) {
      ret = doc;
    }
  });
  return (0, _util.ensureNotFalsy)(ret);
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
 * This can be a Map for better performance
 * but it can also be an object because some storages
 * need to work with something that is JSON-stringify-able
 * and we do not want to transform a big object into a Map
 * each time we use it.
 */
docsInDb,
/**
 * The write rows that are passed to
 * RxStorageInstance().bulkWrite().
 */
bulkWriteRows, context) {
  var hasAttachments = !!storageInstance.schema.attachments;
  var bulkInsertDocs = [];
  var bulkUpdateDocs = [];
  var errors = {};
  var changedDocumentIds = [];
  var eventBulk = {
    id: (0, _util.randomCouchString)(10),
    events: [],
    checkpoint: null,
    context: context
  };
  var attachmentsAdd = [];
  var attachmentsRemove = [];
  var attachmentsUpdate = [];
  var startTime = (0, _util.now)();
  var docsByIdIsMap = typeof docsInDb.get === 'function';
  bulkWriteRows.forEach(function (writeRow) {
    var id = writeRow.document[primaryPath];
    var documentInDb = docsByIdIsMap ? docsInDb.get(id) : docsInDb[id];
    var attachmentError;
    if (!documentInDb) {
      /**
       * It is possible to insert already deleted documents,
       * this can happen on replication.
       */
      var insertedIsDeleted = writeRow.document._deleted ? true : false;
      Object.entries(writeRow.document._attachments).forEach(function (_ref) {
        var attachmentId = _ref[0],
          attachmentData = _ref[1];
        if (!attachmentData.data) {
          attachmentError = {
            documentId: id,
            isError: true,
            status: 510,
            writeRow: writeRow
          };
          errors[id] = attachmentError;
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
          operation: 'INSERT',
          documentData: hasAttachments ? stripAttachmentsDataFromDocument(writeRow.document) : writeRow.document,
          previousDocumentData: hasAttachments && writeRow.previous ? stripAttachmentsDataFromDocument(writeRow.previous) : writeRow.previous,
          startTime: startTime,
          endTime: (0, _util.now)()
        });
      }
    } else {
      // update existing document
      var revInDb = documentInDb._rev;

      /**
       * Check for conflict
       */
      if (!writeRow.previous || !!writeRow.previous && revInDb !== writeRow.previous._rev) {
        // is conflict error
        var err = {
          isError: true,
          status: 409,
          documentId: id,
          writeRow: writeRow,
          documentInDb: documentInDb
        };
        errors[id] = err;
        return;
      }

      // handle attachments data

      var updatedRow = hasAttachments ? stripAttachmentsDataFromRow(writeRow) : writeRow;
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
        Object.entries(writeRow.document._attachments).find(function (_ref2) {
          var attachmentId = _ref2[0],
            attachmentData = _ref2[1];
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
          Object.entries(writeRow.document._attachments).forEach(function (_ref3) {
            var attachmentId = _ref3[0],
              attachmentData = _ref3[1];
            var previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;
            if (!previousAttachmentData) {
              attachmentsAdd.push({
                documentId: id,
                attachmentId: attachmentId,
                attachmentData: attachmentData
              });
            } else {
              var newDigest = updatedRow.document._attachments[attachmentId].digest;
              if (attachmentData.data &&
              /**
               * Performance shortcut,
               * do not update the attachment data if it did not change.
               */
              previousAttachmentData.digest !== newDigest) {
                attachmentsUpdate.push({
                  documentId: id,
                  attachmentId: attachmentId,
                  attachmentData: attachmentData
                });
              }
            }
          });
        }
      }
      if (attachmentError) {
        errors[id] = attachmentError;
      } else {
        bulkUpdateDocs.push(updatedRow);
      }
      var writeDoc = writeRow.document;
      var eventDocumentData = null;
      var previousEventDocumentData = null;
      var operation = null;
      if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
        operation = 'INSERT';
        eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc;
      } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
        operation = 'UPDATE';
        eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc;
        previousEventDocumentData = writeRow.previous;
      } else if (writeDoc._deleted) {
        operation = 'DELETE';
        eventDocumentData = (0, _util.ensureNotFalsy)(writeRow.document);
        previousEventDocumentData = writeRow.previous;
      } else {
        throw (0, _rxError.newRxError)('SNH', {
          args: {
            writeRow: writeRow
          }
        });
      }
      changedDocumentIds.push(id);
      eventBulk.events.push({
        eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow),
        documentId: id,
        documentData: (0, _util.ensureNotFalsy)(eventDocumentData),
        previousDocumentData: previousEventDocumentData,
        operation: operation,
        startTime: startTime,
        endTime: (0, _util.now)()
      });
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
function getAttachmentSize(attachmentBase64String) {
  return atob(attachmentBase64String).length;
}

/**
 * Used in custom RxStorage implementations.
 */
function attachmentWriteDataToNormalData(writeData) {
  var data = writeData.data;
  if (!data) {
    return writeData;
  }
  var ret = {
    digest: (0, _util.defaultHashFunction)(data),
    length: getAttachmentSize(data),
    type: writeData.type
  };
  return ret;
}
function stripAttachmentsDataFromDocument(doc) {
  var useDoc = (0, _util.flatClone)(doc);
  useDoc._attachments = {};
  Object.entries(doc._attachments).forEach(function (_ref4) {
    var attachmentId = _ref4[0],
      attachmentData = _ref4[1];
    useDoc._attachments[attachmentId] = attachmentWriteDataToNormalData(attachmentData);
  });
  return useDoc;
}

/**
 * Flat clone the document data
 * and also the _meta field.
 * Used many times when we want to change the meta
 * during replication etc.
 */
function flatCloneDocWithMeta(doc) {
  var ret = (0, _util.flatClone)(doc);
  ret._meta = (0, _util.flatClone)(doc._meta);
  return ret;
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
    data._meta = (0, _util.flatClone)(data._meta);

    /**
     * Do some checks in dev-mode
     * that would be too performance expensive
     * in production.
     */
    if (_overwritable.overwritable.isDevMode()) {
      // ensure that the primary key has not been changed
      data = (0, _rxSchemaHelper.fillPrimaryKey)(primaryPath, rxJsonSchema, data);

      /**
       * Ensure that the new revision is higher
       * then the previous one
       */
      if (writeRow.previous) {
        // TODO run this in the dev-mode plugin
        // const prev = parseRevision(writeRow.previous._rev);
        // const current = parseRevision(writeRow.document._rev);
        // if (current.height <= prev.height) {
        //     throw newRxError('SNH', {
        //         dataBefore: writeRow.previous,
        //         dataAfter: writeRow.document,
        //         args: {
        //             prev,
        //             current
        //         }
        //     });
        // }
      }

      /**
       * Ensure that _meta fields have been merged
       * and not replaced.
       * This is important so that when one plugin A
       * sets a _meta field and another plugin B does a write
       * to the document, it must be ensured that the
       * field of plugin A was not removed.
       */
      if (writeRow.previous) {
        Object.keys(writeRow.previous._meta).forEach(function (metaFieldName) {
          if (!writeRow.document._meta.hasOwnProperty(metaFieldName)) {
            throw (0, _rxError.newRxError)('SNH', {
              dataBefore: writeRow.previous,
              dataAfter: writeRow.document
            });
          }
        });
      }
    }
    data._meta.lwt = (0, _util.now)();

    /**
     * Yes we really want to set the revision here.
     * If you make a plugin that relies on having its own revision
     * stored into the storage, use this.originalStorageInstance.bulkWrite() instead.
     */
    data._rev = (0, _util.createRevision)(database.hashFunction, data, writeRow.previous);
    return {
      document: data,
      previous: writeRow.previous
    };
  }
  var ret = {
    schema: storageInstance.schema,
    internals: storageInstance.internals,
    collectionName: storageInstance.collectionName,
    databaseName: storageInstance.databaseName,
    options: storageInstance.options,
    bulkWrite: function bulkWrite(rows, context) {
      var toStorageWriteRows = rows.map(function (row) {
        return transformDocumentDataFromRxDBToRxStorage(row);
      });
      return database.lockedRun(function () {
        return storageInstance.bulkWrite(toStorageWriteRows, context);
      })
      /**
       * The RxStorageInstance MUST NOT allow to insert already _deleted documents,
       * without sending the previous document version.
       * But for better developer experience, RxDB does allow to re-insert deleted documents.
       * We do this by automatically fixing the conflict errors for that case
       * by running another bulkWrite() and merging the results.
       * @link https://github.com/pubkey/rxdb/pull/3839
       */.then(function (writeResult) {
        var reInsertErrors = Object.values(writeResult.error).filter(function (error) {
          if (error.status === 409 && !error.writeRow.previous && !error.writeRow.document._deleted && (0, _util.ensureNotFalsy)(error.documentInDb)._deleted) {
            return true;
          }
          return false;
        });
        if (reInsertErrors.length > 0) {
          var useWriteResult = {
            error: (0, _util.flatClone)(writeResult.error),
            success: (0, _util.flatClone)(writeResult.success)
          };
          var reInserts = reInsertErrors.map(function (error) {
            delete useWriteResult.error[error.documentId];
            return {
              previous: error.documentInDb,
              document: Object.assign({}, error.writeRow.document, {
                _rev: (0, _util.createRevision)(database.hashFunction, error.writeRow.document, error.documentInDb)
              })
            };
          });
          return database.lockedRun(function () {
            return storageInstance.bulkWrite(reInserts, context);
          }).then(function (subResult) {
            useWriteResult.error = Object.assign(useWriteResult.error, subResult.error);
            useWriteResult.success = Object.assign(useWriteResult.success, subResult.success);
            return useWriteResult;
          });
        }
        return writeResult;
      });
    },
    query: function query(preparedQuery) {
      return database.lockedRun(function () {
        return storageInstance.query(preparedQuery);
      });
    },
    count: function count(preparedQuery) {
      return database.lockedRun(function () {
        return storageInstance.count(preparedQuery);
      });
    },
    findDocumentsById: function findDocumentsById(ids, deleted) {
      return database.lockedRun(function () {
        return storageInstance.findDocumentsById(ids, deleted);
      });
    },
    getAttachmentData: function getAttachmentData(documentId, attachmentId) {
      return database.lockedRun(function () {
        return storageInstance.getAttachmentData(documentId, attachmentId);
      });
    },
    getChangedDocumentsSince: function getChangedDocumentsSince(limit, checkpoint) {
      return database.lockedRun(function () {
        return storageInstance.getChangedDocumentsSince((0, _util.ensureNotFalsy)(limit), checkpoint);
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
      return storageInstance.changeStream();
    },
    conflictResultionTasks: function conflictResultionTasks() {
      return storageInstance.conflictResultionTasks();
    },
    resolveConflictResultionTask: function resolveConflictResultionTask(taskSolution) {
      if (taskSolution.output.isEqual) {
        return storageInstance.resolveConflictResultionTask(taskSolution);
      }
      var doc = Object.assign({}, taskSolution.output.documentData, {
        _meta: (0, _util.getDefaultRxDocumentMeta)(),
        _rev: (0, _util.getDefaultRevision)(),
        _attachments: {}
      });
      var documentData = (0, _util.flatClone)(doc);
      delete documentData._meta;
      delete documentData._rev;
      delete documentData._attachments;
      return storageInstance.resolveConflictResultionTask({
        id: taskSolution.id,
        output: {
          isEqual: false,
          documentData: documentData
        }
      });
    }
  };
  ret.originalStorageInstance = storageInstance;
  return ret;
}

/**
 * Each RxStorage implementation should
 * run this method at the first step of createStorageInstance()
 * to ensure that the configuration is correct.
 */
function ensureRxStorageInstanceParamsAreCorrect(params) {
  if (params.schema.keyCompression) {
    throw (0, _rxError.newRxError)('UT5', {
      args: {
        params: params
      }
    });
  }
  if (hasEncryption(params.schema)) {
    throw (0, _rxError.newRxError)('UT6', {
      args: {
        params: params
      }
    });
  }
}
function hasEncryption(jsonSchema) {
  if (!!jsonSchema.encrypted && jsonSchema.encrypted.length > 0 || jsonSchema.attachments && jsonSchema.attachments.encrypted) {
    return true;
  } else {
    return false;
  }
}
//# sourceMappingURL=rx-storage-helper.js.map