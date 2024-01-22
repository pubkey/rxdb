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
exports.getChangedDocumentsSince = getChangedDocumentsSince;
exports.getChangedDocumentsSinceQuery = getChangedDocumentsSinceQuery;
exports.getSingleDocument = getSingleDocument;
exports.getWrappedStorageInstance = getWrappedStorageInstance;
exports.hasEncryption = hasEncryption;
exports.observeSingle = observeSingle;
exports.randomDelayStorage = randomDelayStorage;
exports.stackCheckpoints = stackCheckpoints;
exports.storageChangeEventToRxChangeEvent = storageChangeEventToRxChangeEvent;
exports.stripAttachmentsDataFromDocument = stripAttachmentsDataFromDocument;
exports.stripAttachmentsDataFromRow = stripAttachmentsDataFromRow;
exports.throwIfIsStorageWriteError = throwIfIsStorageWriteError;
exports.writeSingle = writeSingle;
var _overwritable = require("./overwritable.js");
var _rxError = require("./rx-error.js");
var _rxSchemaHelper = require("./rx-schema-helper.js");
var _index = require("./plugins/utils/index.js");
var _rxjs = require("rxjs");
var _rxQuery = require("./rx-query.js");
var _rxQueryHelper = require("./rx-query-helper.js");
/**
 * Helper functions for accessing the RxStorage instances.
 */

var INTERNAL_STORAGE_NAME = exports.INTERNAL_STORAGE_NAME = '_rxdb_internal';
var RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = exports.RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';
async function getSingleDocument(storageInstance, documentId) {
  var results = await storageInstance.findDocumentsById([documentId], false);
  var doc = results[0];
  if (doc) {
    return doc;
  } else {
    return undefined;
  }
}

/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
async function writeSingle(instance, writeRow, context) {
  var writeResult = await instance.bulkWrite([writeRow], context);
  if (writeResult.error.length > 0) {
    var error = writeResult.error[0];
    throw error;
  } else {
    var ret = writeResult.success[0];
    return ret;
  }
}

/**
 * Observe the plain document data of a single document.
 * Do not forget to unsubscribe.
 */
function observeSingle(storageInstance, documentId) {
  var firstFindPromise = getSingleDocument(storageInstance, documentId);
  var ret = storageInstance.changeStream().pipe((0, _rxjs.map)(evBulk => evBulk.events.find(ev => ev.documentId === documentId)), (0, _rxjs.filter)(ev => !!ev), (0, _rxjs.map)(ev => Promise.resolve((0, _index.ensureNotFalsy)(ev).documentData)), (0, _rxjs.startWith)(firstFindPromise), (0, _rxjs.switchMap)(v => v), (0, _rxjs.filter)(v => !!v));
  return ret;
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
    documentId: rxStorageChangeEvent.documentId,
    collectionName: rxCollection ? rxCollection.name : undefined,
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
 * Analyzes a list of BulkWriteRows and determines
 * which documents must be inserted, updated or deleted
 * and which events must be emitted and which documents cause a conflict
 * and must not be written.
 * Used as helper inside of some RxStorage implementations.
 * @hotPath The performance of this function is critical
 */
function categorizeBulkWriteRows(storageInstance, primaryPath,
/**
 * Current state of the documents
 * inside of the storage. Used to determine
 * which writes cause conflicts.
 * This must be a Map for better performance.
 */
docsInDb,
/**
 * The write rows that are passed to
 * RxStorageInstance().bulkWrite().
 */
bulkWriteRows, context,
/**
 * Used by some storages for better performance.
 * For example when get-by-id and insert/update can run in parallel.
 */
onInsert, onUpdate) {
  var hasAttachments = !!storageInstance.schema.attachments;
  var bulkInsertDocs = [];
  var bulkUpdateDocs = [];
  var errors = [];
  var eventBulkId = (0, _index.randomCouchString)(10);
  var eventBulk = {
    id: eventBulkId,
    events: [],
    checkpoint: null,
    context,
    startTime: (0, _index.now)(),
    endTime: 0
  };
  var eventBulkEvents = eventBulk.events;
  var attachmentsAdd = [];
  var attachmentsRemove = [];
  var attachmentsUpdate = [];
  var hasDocsInDb = docsInDb.size > 0;
  var newestRow;

  /**
   * @performance is really important in this loop!
   */
  var rowAmount = bulkWriteRows.length;
  var _loop = function () {
    var writeRow = bulkWriteRows[rowId];

    // use these variables to have less property accesses
    var document = writeRow.document;
    var previous = writeRow.previous;
    var docId = document[primaryPath];
    var documentDeleted = document._deleted;
    var previousDeleted = previous && previous._deleted;
    var documentInDb = undefined;
    if (hasDocsInDb) {
      documentInDb = docsInDb.get(docId);
    }
    var attachmentError;
    if (!documentInDb) {
      /**
       * It is possible to insert already deleted documents,
       * this can happen on replication.
       */
      var insertedIsDeleted = documentDeleted ? true : false;
      if (hasAttachments) {
        Object.entries(document._attachments).forEach(([attachmentId, attachmentData]) => {
          if (!attachmentData.data) {
            attachmentError = {
              documentId: docId,
              isError: true,
              status: 510,
              writeRow,
              attachmentId
            };
            errors.push(attachmentError);
          } else {
            attachmentsAdd.push({
              documentId: docId,
              attachmentId,
              attachmentData: attachmentData,
              digest: attachmentData.digest
            });
          }
        });
      }
      if (!attachmentError) {
        if (hasAttachments) {
          bulkInsertDocs.push(stripAttachmentsDataFromRow(writeRow));
          if (onInsert) {
            onInsert(document);
          }
        } else {
          bulkInsertDocs.push(writeRow);
          if (onInsert) {
            onInsert(document);
          }
        }
        newestRow = writeRow;
      }
      if (!insertedIsDeleted) {
        var event = {
          documentId: docId,
          operation: 'INSERT',
          documentData: hasAttachments ? stripAttachmentsDataFromDocument(document) : document,
          previousDocumentData: hasAttachments && previous ? stripAttachmentsDataFromDocument(previous) : previous
        };
        eventBulkEvents.push(event);
      }
    } else {
      // update existing document
      var revInDb = documentInDb._rev;

      /**
       * Check for conflict
       */
      if (!previous || !!previous && revInDb !== previous._rev) {
        // is conflict error
        var err = {
          isError: true,
          status: 409,
          documentId: docId,
          writeRow: writeRow,
          documentInDb
        };
        errors.push(err);
        return 1; // continue
      }

      // handle attachments data

      var updatedRow = hasAttachments ? stripAttachmentsDataFromRow(writeRow) : writeRow;
      if (hasAttachments) {
        if (documentDeleted) {
          /**
           * Deleted documents must have cleared all their attachments.
           */
          if (previous) {
            Object.keys(previous._attachments).forEach(attachmentId => {
              attachmentsRemove.push({
                documentId: docId,
                attachmentId,
                digest: (0, _index.ensureNotFalsy)(previous)._attachments[attachmentId].digest
              });
            });
          }
        } else {
          // first check for errors
          Object.entries(document._attachments).find(([attachmentId, attachmentData]) => {
            var previousAttachmentData = previous ? previous._attachments[attachmentId] : undefined;
            if (!previousAttachmentData && !attachmentData.data) {
              attachmentError = {
                documentId: docId,
                documentInDb: documentInDb,
                isError: true,
                status: 510,
                writeRow,
                attachmentId
              };
            }
            return true;
          });
          if (!attachmentError) {
            Object.entries(document._attachments).forEach(([attachmentId, attachmentData]) => {
              var previousAttachmentData = previous ? previous._attachments[attachmentId] : undefined;
              if (!previousAttachmentData) {
                attachmentsAdd.push({
                  documentId: docId,
                  attachmentId,
                  attachmentData: attachmentData,
                  digest: attachmentData.digest
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
                    documentId: docId,
                    attachmentId,
                    attachmentData: attachmentData,
                    digest: attachmentData.digest
                  });
                }
              }
            });
          }
        }
      }
      if (attachmentError) {
        errors.push(attachmentError);
      } else {
        if (hasAttachments) {
          bulkUpdateDocs.push(stripAttachmentsDataFromRow(updatedRow));
          if (onUpdate) {
            onUpdate(document);
          }
        } else {
          bulkUpdateDocs.push(updatedRow);
          if (onUpdate) {
            onUpdate(document);
          }
        }
        newestRow = updatedRow;
      }
      var eventDocumentData = null;
      var previousEventDocumentData = null;
      var operation = null;
      if (previousDeleted && !documentDeleted) {
        operation = 'INSERT';
        eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(document) : document;
      } else if (previous && !previousDeleted && !documentDeleted) {
        operation = 'UPDATE';
        eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(document) : document;
        previousEventDocumentData = previous;
      } else if (documentDeleted) {
        operation = 'DELETE';
        eventDocumentData = (0, _index.ensureNotFalsy)(document);
        previousEventDocumentData = previous;
      } else {
        throw (0, _rxError.newRxError)('SNH', {
          args: {
            writeRow
          }
        });
      }
      var _event = {
        documentId: docId,
        documentData: eventDocumentData,
        previousDocumentData: previousEventDocumentData,
        operation: operation
      };
      eventBulkEvents.push(_event);
    }
  };
  for (var rowId = 0; rowId < rowAmount; rowId++) {
    if (_loop()) continue;
  }
  return {
    bulkInsertDocs,
    bulkUpdateDocs,
    newestRow,
    errors,
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
    length: getAttachmentSize(data),
    digest: writeData.digest,
    type: writeData.type
  };
  return ret;
}
function stripAttachmentsDataFromDocument(doc) {
  if (!doc._attachments || Object.keys(doc._attachments).length === 0) {
    return doc;
  }
  var useDoc = (0, _index.flatClone)(doc);
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
  var ret = (0, _index.flatClone)(doc);
  ret._meta = (0, _index.flatClone)(doc._meta);
  return ret;
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
    var data = (0, _index.flatClone)(writeRow.document);
    data._meta = (0, _index.flatClone)(data._meta);

    /**
     * Do some checks in dev-mode
     * that would be too performance expensive
     * in production.
     */
    if (_overwritable.overwritable.isDevMode()) {
      // ensure that the primary key has not been changed
      data = (0, _rxSchemaHelper.fillPrimaryKey)(primaryPath, rxJsonSchema, data);

      /**
       * Ensure it can be structured cloned
       */
      try {
        /**
         * Notice that structuredClone() is not available
         * in ReactNative, so we test for JSON.stringify() instead
         * @link https://github.com/pubkey/rxdb/issues/5046#issuecomment-1827374498
         */
        if (typeof structuredClone === 'function') {
          structuredClone(writeRow);
        } else {
          JSON.parse(JSON.stringify(writeRow));
        }
      } catch (err) {
        throw (0, _rxError.newRxError)('DOC24', {
          collection: storageInstance.collectionName,
          document: writeRow.document
        });
      }

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
          if (!Object.prototype.hasOwnProperty.call(writeRow.document._meta, metaFieldName)) {
            throw (0, _rxError.newRxError)('SNH', {
              dataBefore: writeRow.previous,
              dataAfter: writeRow.document
            });
          }
        });
      }
    }
    data._meta.lwt = (0, _index.now)();

    /**
     * Yes we really want to set the revision here.
     * If you make a plugin that relies on having its own revision
     * stored into the storage, use this.originalStorageInstance.bulkWrite() instead.
     */
    data._rev = (0, _index.createRevision)(database.token, writeRow.previous);
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
        var useWriteResult = {
          error: [],
          success: writeResult.success.slice(0)
        };
        var reInsertErrors = writeResult.error.filter(error => {
          if (error.status === 409 && !error.writeRow.previous && !error.writeRow.document._deleted && (0, _index.ensureNotFalsy)(error.documentInDb)._deleted) {
            return true;
          }
          useWriteResult.error.push(error);
          return false;
        });
        if (reInsertErrors.length > 0) {
          var reInserts = reInsertErrors.map(error => {
            return {
              previous: error.documentInDb,
              document: Object.assign({}, error.writeRow.document, {
                _rev: (0, _index.createRevision)(database.token, error.documentInDb)
              })
            };
          });
          return database.lockedRun(() => storageInstance.bulkWrite(reInserts, context)).then(subResult => {
            (0, _index.appendToArray)(useWriteResult.error, subResult.error);
            (0, _index.appendToArray)(useWriteResult.success, subResult.success);
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
    getAttachmentData(documentId, attachmentId, digest) {
      return database.lockedRun(() => storageInstance.getAttachmentData(documentId, attachmentId, digest));
    },
    getChangedDocumentsSince: !storageInstance.getChangedDocumentsSince ? undefined : (limit, checkpoint) => {
      return database.lockedRun(() => storageInstance.getChangedDocumentsSince((0, _index.ensureNotFalsy)(limit), checkpoint));
    },
    cleanup(minDeletedTime) {
      return database.lockedRun(() => storageInstance.cleanup(minDeletedTime));
    },
    remove() {
      database.storageInstances.delete(ret);
      return database.lockedRun(() => storageInstance.remove());
    },
    close() {
      database.storageInstances.delete(ret);
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
        _meta: (0, _index.getDefaultRxDocumentMeta)(),
        _rev: (0, _index.getDefaultRevision)(),
        _attachments: {}
      });
      var documentData = (0, _index.flatClone)(doc);
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
  database.storageInstances.add(ret);
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
  if (params.schema.attachments && params.schema.attachments.compression) {
    throw (0, _rxError.newRxError)('UT7', {
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
function getChangedDocumentsSinceQuery(storageInstance, limit, checkpoint) {
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(storageInstance.schema.primaryKey);
  var sinceLwt = checkpoint ? checkpoint.lwt : _index.RX_META_LWT_MINIMUM;
  var sinceId = checkpoint ? checkpoint.id : '';
  return (0, _rxQueryHelper.normalizeMangoQuery)(storageInstance.schema, {
    selector: {
      $or: [{
        '_meta.lwt': {
          $gt: sinceLwt
        }
      }, {
        '_meta.lwt': {
          $eq: sinceLwt
        },
        [primaryPath]: {
          $gt: checkpoint ? sinceId : ''
        }
      }],
      // add this hint for better index usage
      '_meta.lwt': {
        $gte: sinceLwt
      }
    },
    sort: [{
      '_meta.lwt': 'asc'
    }, {
      [primaryPath]: 'asc'
    }],
    skip: 0,
    limit
    /**
     * DO NOT SET A SPECIFIC INDEX HERE!
     * The query might be modified by some plugin
     * before sending it to the storage.
     * We can be sure that in the end the query planner
     * will find the best index.
     */
    // index: ['_meta.lwt', primaryPath]
  });
}
async function getChangedDocumentsSince(storageInstance, limit, checkpoint) {
  if (storageInstance.getChangedDocumentsSince) {
    return storageInstance.getChangedDocumentsSince(limit, checkpoint);
  }
  var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(storageInstance.schema.primaryKey);
  var query = (0, _rxQuery.prepareQuery)(storageInstance.schema, getChangedDocumentsSinceQuery(storageInstance, limit, checkpoint));
  var result = await storageInstance.query(query);
  var documents = result.documents;
  var lastDoc = (0, _index.lastOfArray)(documents);
  return {
    documents: documents,
    checkpoint: lastDoc ? {
      id: lastDoc[primaryPath],
      lwt: lastDoc._meta.lwt
    } : checkpoint ? checkpoint : {
      id: '',
      lwt: 0
    }
  };
}

/**
 * Wraps the storage and simluates
 * delays. Mostly used in tests.
 */
function randomDelayStorage(input) {
  var retStorage = {
    name: 'random-delay-' + input.storage.name,
    rxdbVersion: _index.RXDB_VERSION,
    async createStorageInstance(params) {
      await (0, _index.promiseWait)(input.delayTimeBefore());
      var storageInstance = await input.storage.createStorageInstance(params);
      await (0, _index.promiseWait)(input.delayTimeAfter());

      // write still must be processed in order
      var writeQueue = _index.PROMISE_RESOLVE_TRUE;
      return {
        databaseName: storageInstance.databaseName,
        internals: storageInstance.internals,
        options: storageInstance.options,
        schema: storageInstance.schema,
        collectionName: storageInstance.collectionName,
        async bulkWrite(a, b) {
          writeQueue = writeQueue.then(async () => {
            await (0, _index.promiseWait)(input.delayTimeBefore());
            var response = await storageInstance.bulkWrite(a, b);
            await (0, _index.promiseWait)(input.delayTimeAfter());
            return response;
          });
          var ret = await writeQueue;
          return ret;
        },
        async findDocumentsById(a, b) {
          await (0, _index.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.findDocumentsById(a, b);
          await (0, _index.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        async query(a) {
          await (0, _index.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.query(a);
          return ret;
        },
        async count(a) {
          await (0, _index.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.count(a);
          await (0, _index.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        async getAttachmentData(a, b, c) {
          await (0, _index.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.getAttachmentData(a, b, c);
          await (0, _index.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        getChangedDocumentsSince: !storageInstance.getChangedDocumentsSince ? undefined : async (a, b) => {
          await (0, _index.promiseWait)(input.delayTimeBefore());
          var ret = await (0, _index.ensureNotFalsy)(storageInstance.getChangedDocumentsSince)(a, b);
          await (0, _index.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        changeStream() {
          return storageInstance.changeStream();
        },
        conflictResultionTasks() {
          return storageInstance.conflictResultionTasks();
        },
        resolveConflictResultionTask(a) {
          return storageInstance.resolveConflictResultionTask(a);
        },
        async cleanup(a) {
          await (0, _index.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.cleanup(a);
          await (0, _index.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        async close() {
          await (0, _index.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.close();
          await (0, _index.promiseWait)(input.delayTimeAfter());
          return ret;
        },
        async remove() {
          await (0, _index.promiseWait)(input.delayTimeBefore());
          var ret = await storageInstance.remove();
          await (0, _index.promiseWait)(input.delayTimeAfter());
          return ret;
        }
      };
    }
  };
  return retStorage;
}
//# sourceMappingURL=rx-storage-helper.js.map