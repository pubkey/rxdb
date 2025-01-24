import { Subject } from 'rxjs';
import { now, ensureNotFalsy, hasPremiumFlag } from "../utils/index.js";
import { attachmentObjectId, closeDexieDb, fromStorageToDexie, getDexieDbWithTables, getDocsInDb, RX_STORAGE_NAME_DEXIE } from "./dexie-helper.js";
import { dexieCount, dexieQuery } from "./dexie-query.js";
import { getPrimaryFieldOfPrimaryKey } from "../../rx-schema-helper.js";
import { categorizeBulkWriteRows, flatCloneDocWithMeta } from "../../rx-storage-helper.js";
import { addRxStorageMultiInstanceSupport } from "../../rx-storage-multiinstance.js";
import { newRxError } from "../../rx-error.js";
var instanceId = now();
var shownNonPremiumLog = false;
export var RxStorageInstanceDexie = /*#__PURE__*/function () {
  function RxStorageInstanceDexie(storage, databaseName, collectionName, schema, internals, options, settings, devMode) {
    this.changes$ = new Subject();
    this.instanceId = instanceId++;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.devMode = devMode;
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceDexie.prototype;
  _proto.bulkWrite = async function bulkWrite(documentWrites, context) {
    ensureNotClosed(this);
    if (!shownNonPremiumLog && !(await hasPremiumFlag())) {
      console.warn(['-------------- RxDB Open Core RxStorage -------------------------------', 'You are using the free Dexie.js based RxStorage implementation from RxDB https://rxdb.info/rx-storage-dexie.html?console=dexie ', 'While this is a great option, we want to let you know that there are faster storage solutions available in our premium plugins.', 'For professional users and production environments, we highly recommend considering these premium options to enhance performance and reliability.', ' https://rxdb.info/premium/?console=dexie ', 'If you already purchased premium access you can disable this log by calling the setPremiumFlag() function from rxdb-premium/plugins/shared.', '---------------------------------------------------------------------'].join('\n'));
      shownNonPremiumLog = true;
    } else {
      shownNonPremiumLog = true;
    }

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
      error: []
    };

    /**
     * Some storages might add any _meta fields
     * internally. To ensure RxDB can work with that in the
     * test suite, we add a random field here.
     * To ensure 
     */
    if (this.devMode) {
      documentWrites = documentWrites.map(row => {
        var doc = flatCloneDocWithMeta(row.document);
        return {
          previous: row.previous,
          document: doc
        };
      });
    }
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
        bulkPutDocs.push(row.document);
      });
      categorized.bulkUpdateDocs.forEach(row => {
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
      var toRemove = await state.dexieTable.where('_meta.lwt').below(maxDeletionTime).toArray();
      var removeIds = [];
      toRemove.forEach(doc => {
        if (doc._deleted === '1') {
          removeIds.push(doc[this.primaryPath]);
        }
      });
      await state.dexieTable.bulkDelete(removeIds);
    });
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
  return RxStorageInstanceDexie;
}();
export async function createDexieStorageInstance(storage, params, settings) {
  var internals = getDexieDbWithTables(params.databaseName, params.collectionName, settings, params.schema);
  var instance = new RxStorageInstanceDexie(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings, params.devMode);
  await addRxStorageMultiInstanceSupport(RX_STORAGE_NAME_DEXIE, params, instance);
  return Promise.resolve(instance);
}
function ensureNotClosed(instance) {
  if (instance.closed) {
    throw new Error('RxStorageInstanceDexie is closed ' + instance.databaseName + '-' + instance.collectionName);
  }
}
//# sourceMappingURL=rx-storage-instance-dexie.js.map