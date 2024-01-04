import { Subject } from 'rxjs';
import { now, ensureNotFalsy } from "../utils/index.js";
import { attachmentObjectId, closeDexieDb, fromStorageToDexie, getDexieDbWithTables, getDocsInDb, RX_STORAGE_NAME_DEXIE } from "./dexie-helper.js";
import { dexieCount, dexieQuery } from "./dexie-query.js";
import { getPrimaryFieldOfPrimaryKey } from "../../rx-schema-helper.js";
import { categorizeBulkWriteRows } from "../../rx-storage-helper.js";
import { addRxStorageMultiInstanceSupport } from "../../rx-storage-multiinstance.js";
import { newRxError } from "../../rx-error.js";
var instanceId = now();
export var RxStorageInstanceDexie = /*#__PURE__*/function () {
  function RxStorageInstanceDexie(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.changes$ = new Subject();
    this.instanceId = instanceId++;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceDexie.prototype;
  _proto.bulkWrite = async function bulkWrite(documentWrites, context) {
    ensureNotClosed(this);

    /**
     * Check some assumptions to ensure RxDB
     * does not call the storage with an invalid write.
     */
    documentWrites.forEach(row => {
      // ensure revision is set
      if (!row.document._rev || row.previous && !row.previous._rev) {
        throw newRxError('SNH', {
          args: {
            row
          }
        });
      }
    });
    var state = await this.internals;
    var ret = {
      success: [],
      error: []
    };
    var documentKeys = documentWrites.map(writeRow => writeRow.document[this.primaryPath]);
    var categorized;
    await state.dexieDb.transaction('rw', state.dexieTable, state.dexieAttachmentsTable, async () => {
      var docsInDbMap = new Map();
      var docsInDbWithInternals = await getDocsInDb(this.internals, documentKeys);
      docsInDbWithInternals.forEach(docWithDexieInternals => {
        var doc = docWithDexieInternals;
        if (doc) {
          docsInDbMap.set(doc[this.primaryPath], doc);
        }
        return doc;
      });
      categorized = categorizeBulkWriteRows(this, this.primaryPath, docsInDbMap, documentWrites, context);
      ret.error = categorized.errors;

      /**
       * Batch up the database operations
       * so we can later run them in bulk.
       */
      var bulkPutDocs = [];
      categorized.bulkInsertDocs.forEach(row => {
        ret.success.push(row.document);
        bulkPutDocs.push(row.document);
      });
      categorized.bulkUpdateDocs.forEach(row => {
        ret.success.push(row.document);
        bulkPutDocs.push(row.document);
      });
      bulkPutDocs = bulkPutDocs.map(d => fromStorageToDexie(state.booleanIndexes, d));
      if (bulkPutDocs.length > 0) {
        await state.dexieTable.bulkPut(bulkPutDocs);
      }

      // handle attachments
      var putAttachments = [];
      categorized.attachmentsAdd.forEach(attachment => {
        putAttachments.push({
          id: attachmentObjectId(attachment.documentId, attachment.attachmentId),
          data: attachment.attachmentData.data
        });
      });
      categorized.attachmentsUpdate.forEach(attachment => {
        putAttachments.push({
          id: attachmentObjectId(attachment.documentId, attachment.attachmentId),
          data: attachment.attachmentData.data
        });
      });
      await state.dexieAttachmentsTable.bulkPut(putAttachments);
      await state.dexieAttachmentsTable.bulkDelete(categorized.attachmentsRemove.map(attachment => attachmentObjectId(attachment.documentId, attachment.attachmentId)));
    });
    categorized = ensureNotFalsy(categorized);
    if (categorized.eventBulk.events.length > 0) {
      var lastState = ensureNotFalsy(categorized.newestRow).document;
      categorized.eventBulk.checkpoint = {
        id: lastState[this.primaryPath],
        lwt: lastState._meta.lwt
      };
      categorized.eventBulk.endTime = now();
      this.changes$.next(categorized.eventBulk);
    }
    return ret;
  };
  _proto.findDocumentsById = async function findDocumentsById(ids, deleted) {
    ensureNotClosed(this);
    var state = await this.internals;
    var ret = [];
    await state.dexieDb.transaction('r', state.dexieTable, async () => {
      var docsInDb = await getDocsInDb(this.internals, ids);
      docsInDb.forEach(documentInDb => {
        if (documentInDb && (!documentInDb._deleted || deleted)) {
          ret.push(documentInDb);
        }
      });
    });
    return ret;
  };
  _proto.query = function query(preparedQuery) {
    ensureNotClosed(this);
    return dexieQuery(this, preparedQuery);
  };
  _proto.count = async function count(preparedQuery) {
    if (preparedQuery.queryPlan.selectorSatisfiedByIndex) {
      var result = await dexieCount(this, preparedQuery);
      return {
        count: result,
        mode: 'fast'
      };
    } else {
      var _result = await dexieQuery(this, preparedQuery);
      return {
        count: _result.documents.length,
        mode: 'slow'
      };
    }
  };
  _proto.changeStream = function changeStream() {
    ensureNotClosed(this);
    return this.changes$.asObservable();
  };
  _proto.cleanup = async function cleanup(minimumDeletedTime) {
    ensureNotClosed(this);
    var state = await this.internals;
    await state.dexieDb.transaction('rw', state.dexieTable, async () => {
      var maxDeletionTime = now() - minimumDeletedTime;
      /**
       * TODO only fetch _deleted=true
       */
      var toRemove = await state.dexieTable.where('_meta.lwt').below(maxDeletionTime).toArray();
      var removeIds = [];
      toRemove.forEach(doc => {
        if (doc._deleted === '1') {
          removeIds.push(doc[this.primaryPath]);
        }
      });
      await state.dexieTable.bulkDelete(removeIds);
    });

    /**
     * TODO instead of deleting all deleted docs at once,
     * only clean up some of them and return false if there are more documents to clean up.
     * This ensures that when many documents have to be purged,
     * we do not block the more important tasks too long.
     */
    return true;
  };
  _proto.getAttachmentData = async function getAttachmentData(documentId, attachmentId, _digest) {
    ensureNotClosed(this);
    var state = await this.internals;
    var id = attachmentObjectId(documentId, attachmentId);
    return await state.dexieDb.transaction('r', state.dexieAttachmentsTable, async () => {
      var attachment = await state.dexieAttachmentsTable.get(id);
      if (attachment) {
        return attachment.data;
      } else {
        throw new Error('attachment missing documentId: ' + documentId + ' attachmentId: ' + attachmentId);
      }
    });
  };
  _proto.remove = async function remove() {
    ensureNotClosed(this);
    var state = await this.internals;
    await state.dexieTable.clear();
    return this.close();
  };
  _proto.close = function close() {
    if (this.closed) {
      return this.closed;
    }
    this.closed = (async () => {
      this.changes$.complete();
      await closeDexieDb(this.internals);
    })();
    return this.closed;
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new Subject();
  };
  _proto.resolveConflictResultionTask = async function resolveConflictResultionTask(_taskSolution) {};
  return RxStorageInstanceDexie;
}();
export async function createDexieStorageInstance(storage, params, settings) {
  var internals = getDexieDbWithTables(params.databaseName, params.collectionName, settings, params.schema);
  var instance = new RxStorageInstanceDexie(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  await addRxStorageMultiInstanceSupport(RX_STORAGE_NAME_DEXIE, params, instance);
  return Promise.resolve(instance);
}
function ensureNotClosed(instance) {
  if (instance.closed) {
    throw new Error('RxStorageInstanceDexie is closed ' + instance.databaseName + '-' + instance.collectionName);
  }
}
//# sourceMappingURL=rx-storage-instance-dexie.js.map