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
exports.getSingleDocument = getSingleDocument;
exports.getUniqueDeterministicEventKey = getUniqueDeterministicEventKey;
exports.getWrappedStorageInstance = getWrappedStorageInstance;
exports.hasEncryption = hasEncryption;
exports.stackCheckpoints = stackCheckpoints;
exports.storageChangeEventToRxChangeEvent = storageChangeEventToRxChangeEvent;
exports.stripAttachmentsDataFromDocument = stripAttachmentsDataFromDocument;
exports.stripAttachmentsDataFromRow = stripAttachmentsDataFromRow;
exports.throwIfIsStorageWriteError = throwIfIsStorageWriteError;
exports.writeSingle = writeSingle;
var _overwritable = require("./overwritable");
var _rxError = require("./rx-error");
var _rxSchemaHelper = require("./rx-schema-helper");
var _utils = require("./plugins/utils");
/**
 * Helper functions for accessing the RxStorage instances.
 */

var INTERNAL_STORAGE_NAME = '_rxdb_internal';
exports.INTERNAL_STORAGE_NAME = INTERNAL_STORAGE_NAME;
var RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';
exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = RX_DATABASE_LOCAL_DOCS_STORAGE_NAME;
async function getSingleDocument(storageInstance, documentId) {
  var results = await storageInstance.findDocumentsById([documentId], false);
  var doc = results[documentId];
  if (doc) {
    return doc;
  } else {
    return null;
  }
}

/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
async function writeSingle(instance, writeRow, context) {
  var writeResult = await instance.bulkWrite([writeRow], context);
  if (Object.keys(writeResult.error).length > 0) {
    var error = (0, _utils.firstPropertyValueOfObject)(writeResult.error);
    throw error;
  } else {
    var ret = (0, _utils.firstPropertyValueOfObject)(writeResult.success);
    return ret;
  }
}

/**
 * Checkpoints must be stackable over another.
 * This is required form some RxStorage implementations
 * like the sharding plugin, where a checkpoint only represents
 * the document state from some, but not all shards.
 */
function stackCheckpoints(checkpoints) {
  return Object.assign({}, ...checkpoints);
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
    isLocal,
    operation: rxStorageChangeEvent.operation,
    documentData: _overwritable.overwritable.deepFreezeWhenDevMode(documentData),
    previousDocumentData: _overwritable.overwritable.deepFreezeWhenDevMode(previousDocumentData)
  };
  return ret;
}
function throwIfIsStorageWriteError(collection, documentId, writeData, error) {
  if (error) {
    if (error.status === 409) {
      throw (0, _rxError.newRxError)('CONFLICT', {
        collection: collection.name,
        id: documentId,
        writeError: error,
        data: writeData
      });
    } else if (error.status === 422) {
      throw (0, _rxError.newRxError)('VD2', {
        collection: collection.name,
        id: documentId,
        writeError: error,
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
  docs.forEach(doc => {
    if (!ret || doc._meta.lwt > ret._meta.lwt || doc._meta.lwt === ret._meta.lwt && doc[primaryPath] > ret[primaryPath]) {
      ret = doc;
    }
  });
  return (0, _utils.ensureNotFalsy)(ret);
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
    id: (0, _utils.randomCouchString)(10),
    events: [],
    checkpoint: null,
    context
  };
  var attachmentsAdd = [];
  var attachmentsRemove = [];
  var attachmentsUpdate = [];
  var startTime = (0, _utils.now)();
  var docsByIdIsMap = typeof docsInDb.get === 'function';
  bulkWriteRows.forEach(writeRow => {
    var id = writeRow.document[primaryPath];
    var documentInDb = docsByIdIsMap ? docsInDb.get(id) : docsInDb[id];
    var attachmentError;
    if (!documentInDb) {
      /**
       * It is possible to insert already deleted documents,
       * this can happen on replication.
       */
      var insertedIsDeleted = writeRow.document._deleted ? true : false;
      if (hasAttachments) {
        Object.entries(writeRow.document._attachments).forEach(([attachmentId, attachmentData]) => {
          if (!attachmentData.data) {
            attachmentError = {
              documentId: id,
              isError: true,
              status: 510,
              writeRow,
              attachmentId
            };
            errors[id] = attachmentError;
          } else {
            attachmentsAdd.push({
              documentId: id,
              attachmentId,
              attachmentData: attachmentData
            });
          }
        });
      }
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
          startTime,
          endTime: (0, _utils.now)()
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
          documentInDb
        };
        errors[id] = err;
        return;
      }

      // handle attachments data

      var updatedRow = hasAttachments ? stripAttachmentsDataFromRow(writeRow) : writeRow;
      if (hasAttachments) {
        if (writeRow.document._deleted) {
          /**
           * Deleted documents must have cleared all their attachments.
           */
          if (writeRow.previous) {
            Object.keys(writeRow.previous._attachments).forEach(attachmentId => {
              attachmentsRemove.push({
                documentId: id,
                attachmentId
              });
            });
          }
        } else {
          // first check for errors
          Object.entries(writeRow.document._attachments).find(([attachmentId, attachmentData]) => {
            var previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;
            if (!previousAttachmentData && !attachmentData.data) {
              attachmentError = {
                documentId: id,
                documentInDb,
                isError: true,
                status: 510,
                writeRow,
                attachmentId
              };
            }
            return true;
          });
          if (!attachmentError) {
            Object.entries(writeRow.document._attachments).forEach(([attachmentId, attachmentData]) => {
              var previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;
              if (!previousAttachmentData) {
                attachmentsAdd.push({
                  documentId: id,
                  attachmentId,
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
                    attachmentId,
                    attachmentData: attachmentData
                  });
                }
              }
            });
          }
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
        eventDocumentData = (0, _utils.ensureNotFalsy)(writeRow.document);
        previousEventDocumentData = writeRow.previous;
      } else {
        throw (0, _rxError.newRxError)('SNH', {
          args: {
            writeRow
          }
        });
      }
      changedDocumentIds.push(id);
      eventBulk.events.push({
        eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow),
        documentId: id,
        documentData: (0, _utils.ensureNotFalsy)(eventDocumentData),
        previousDocumentData: previousEventDocumentData,
        operation: operation,
        startTime,
        endTime: (0, _utils.now)()
      });
    }
  });
  return {
    bulkInsertDocs,
    bulkUpdateDocs,
    errors,
    changedDocumentIds,
    eventBulk,
    attachmentsAdd,
    attachmentsRemove,
    attachmentsUpdate
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
    digest: (0, _utils.defaultHashFunction)(data),
    length: getAttachmentSize(data),
    type: writeData.type
  };
  return ret;
}
function stripAttachmentsDataFromDocument(doc) {
  var useDoc = (0, _utils.flatClone)(doc);
  useDoc._attachments = {};
  Object.entries(doc._attachments).forEach(([attachmentId, attachmentData]) => {
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
  var ret = (0, _utils.flatClone)(doc);
  ret._meta = (0, _utils.flatClone)(doc._meta);
  return ret;
}

/**
 * Each event is labeled with the id
 * to make it easy to filter out duplicates.
 */
function getUniqueDeterministicEventKey(storageInstance, primaryPath, writeRow) {
  var docId = writeRow.document[primaryPath];
  var binaryValues = [!!writeRow.previous, writeRow.previous && writeRow.previous._deleted, !!writeRow.document._deleted];
  var binary = binaryValues.map(v => v ? '1' : '0').join('');
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
    var data = (0, _utils.flatClone)(writeRow.document);
    data._meta = (0, _utils.flatClone)(data._meta);

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
        Object.keys(writeRow.previous._meta).forEach(metaFieldName => {
          if (!writeRow.document._meta.hasOwnProperty(metaFieldName)) {
            throw (0, _rxError.newRxError)('SNH', {
              dataBefore: writeRow.previous,
              dataAfter: writeRow.document
            });
          }
        });
      }
    }
    data._meta.lwt = (0, _utils.now)();

    /**
     * Yes we really want to set the revision here.
     * If you make a plugin that relies on having its own revision
     * stored into the storage, use this.originalStorageInstance.bulkWrite() instead.
     */
    data._rev = (0, _utils.createRevision)(database.token, writeRow.previous);
    return {
      document: data,
      previous: writeRow.previous
    };
  }
  var ret = {
    originalStorageInstance: storageInstance,
    schema: storageInstance.schema,
    internals: storageInstance.internals,
    collectionName: storageInstance.collectionName,
    databaseName: storageInstance.databaseName,
    options: storageInstance.options,
    bulkWrite(rows, context) {
      var toStorageWriteRows = rows.map(row => transformDocumentDataFromRxDBToRxStorage(row));
      return database.lockedRun(() => storageInstance.bulkWrite(toStorageWriteRows, context))
      /**
       * The RxStorageInstance MUST NOT allow to insert already _deleted documents,
       * without sending the previous document version.
       * But for better developer experience, RxDB does allow to re-insert deleted documents.
       * We do this by automatically fixing the conflict errors for that case
       * by running another bulkWrite() and merging the results.
       * @link https://github.com/pubkey/rxdb/pull/3839
       */.then(writeResult => {
        var reInsertErrors = Object.values(writeResult.error).filter(error => {
          if (error.status === 409 && !error.writeRow.previous && !error.writeRow.document._deleted && (0, _utils.ensureNotFalsy)(error.documentInDb)._deleted) {
            return true;
          }
          return false;
        });
        if (reInsertErrors.length > 0) {
          var useWriteResult = {
            error: (0, _utils.flatClone)(writeResult.error),
            success: (0, _utils.flatClone)(writeResult.success)
          };
          var reInserts = reInsertErrors.map(error => {
            delete useWriteResult.error[error.documentId];
            return {
              previous: error.documentInDb,
              document: Object.assign({}, error.writeRow.document, {
                _rev: (0, _utils.createRevision)(database.token, error.documentInDb)
              })
            };
          });
          return database.lockedRun(() => storageInstance.bulkWrite(reInserts, context)).then(subResult => {
            useWriteResult.error = Object.assign(useWriteResult.error, subResult.error);
            useWriteResult.success = Object.assign(useWriteResult.success, subResult.success);
            return useWriteResult;
          });
        }
        return writeResult;
      });
    },
    query(preparedQuery) {
      return database.lockedRun(() => storageInstance.query(preparedQuery));
    },
    count(preparedQuery) {
      return database.lockedRun(() => storageInstance.count(preparedQuery));
    },
    findDocumentsById(ids, deleted) {
      return database.lockedRun(() => storageInstance.findDocumentsById(ids, deleted));
    },
    getAttachmentData(documentId, attachmentId) {
      return database.lockedRun(() => storageInstance.getAttachmentData(documentId, attachmentId));
    },
    getChangedDocumentsSince(limit, checkpoint) {
      return database.lockedRun(() => storageInstance.getChangedDocumentsSince((0, _utils.ensureNotFalsy)(limit), checkpoint));
    },
    cleanup(minDeletedTime) {
      return database.lockedRun(() => storageInstance.cleanup(minDeletedTime));
    },
    remove() {
      return database.lockedRun(() => storageInstance.remove());
    },
    close() {
      return database.lockedRun(() => storageInstance.close());
    },
    changeStream() {
      return storageInstance.changeStream();
    },
    conflictResultionTasks() {
      return storageInstance.conflictResultionTasks();
    },
    resolveConflictResultionTask(taskSolution) {
      if (taskSolution.output.isEqual) {
        return storageInstance.resolveConflictResultionTask(taskSolution);
      }
      var doc = Object.assign({}, taskSolution.output.documentData, {
        _meta: (0, _utils.getDefaultRxDocumentMeta)(),
        _rev: (0, _utils.getDefaultRevision)(),
        _attachments: {}
      });
      var documentData = (0, _utils.flatClone)(doc);
      delete documentData._meta;
      delete documentData._rev;
      delete documentData._attachments;
      return storageInstance.resolveConflictResultionTask({
        id: taskSolution.id,
        output: {
          isEqual: false,
          documentData
        }
      });
    }
  };
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
        params
      }
    });
  }
  if (hasEncryption(params.schema)) {
    throw (0, _rxError.newRxError)('UT6', {
      args: {
        params
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