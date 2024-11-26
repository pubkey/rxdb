import _readOnlyError from "@babel/runtime/helpers/readOnlyError";
import { Subject } from 'rxjs';
import { getStartIndexStringFromLowerBound, getStartIndexStringFromUpperBound } from "../../custom-index.js";
import { getPrimaryFieldOfPrimaryKey } from "../../rx-schema-helper.js";
import { categorizeBulkWriteRows } from "../../rx-storage-helper.js";
import { deepEqual, ensureNotFalsy, now, PROMISE_RESOLVE_TRUE, PROMISE_RESOLVE_VOID, randomToken, requestIdlePromiseNoQueue } from "../../plugins/utils/index.js";
import { boundGE, boundGT, boundLE, boundLT } from "./binary-search-bounds.js";
import { attachmentMapKey, compareDocsWithIndex, ensureNotRemoved, getMemoryCollectionKey, putWriteRowToState, removeDocFromState } from "./memory-helper.js";
import { addIndexesToInternalsState, getMemoryIndexName } from "./memory-indexes.js";
import { getQueryMatcher, getSortComparator } from "../../rx-query-helper.js";

/**
 * Used in tests to ensure everything
 * is closed correctly
 */
export var OPEN_MEMORY_INSTANCES = new Set();
export var RxStorageInstanceMemory = /*#__PURE__*/function () {
  /**
   * Used by some plugins and storage wrappers
   * to find out details about the internals of a write operation.
   * For example if you want to know which documents really have been replaced
   * or newly inserted.
   */

  function RxStorageInstanceMemory(storage, databaseName, collectionName, schema, internals, options, settings, devMode) {
    this.closed = false;
    this.categorizedByWriteInput = new WeakMap();
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.devMode = devMode;
    OPEN_MEMORY_INSTANCES.add(this);
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceMemory.prototype;
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    this.ensurePersistence();
    ensureNotRemoved(this);
    var internals = this.internals;
    var documentsById = this.internals.documents;
    var primaryPath = this.primaryPath;
    var categorized = categorizeBulkWriteRows(this, primaryPath, documentsById, documentWrites, context);
    var error = categorized.errors;
    /**
     * @performance
     * We have to return a Promise but we do not want to wait
     * one tick, so we directly create the promise
     * which makes it likely to be already resolved later.
     */
    var awaitMe = Promise.resolve({
      error
    });
    this.categorizedByWriteInput.set(documentWrites, categorized);
    this.internals.ensurePersistenceTask = categorized;
    if (!this.internals.ensurePersistenceIdlePromise) {
      this.internals.ensurePersistenceIdlePromise = requestIdlePromiseNoQueue().then(() => {
        this.internals.ensurePersistenceIdlePromise = undefined;
        this.ensurePersistence();
      });
    }

    /**
     * Important: The events must be emitted AFTER the persistence
     * task has been added.
     */
    if (categorized.eventBulk.events.length > 0) {
      var lastState = ensureNotFalsy(categorized.newestRow).document;
      categorized.eventBulk.checkpoint = {
        id: lastState[primaryPath],
        lwt: lastState._meta.lwt
      };
      internals.changes$.next(categorized.eventBulk);
    }
    return awaitMe;
  }

  /**
   * Instead of directly inserting the documents into all indexes,
   * we do it lazy in the background. This gives the application time
   * to directly work with the write-result and to do stuff like rendering DOM
   * notes and processing RxDB queries.
   * Then in some later time, or just before the next read/write,
   * it is ensured that the indexes have been written.
   */;
  _proto.ensurePersistence = function ensurePersistence() {
    if (!this.internals.ensurePersistenceTask) {
      return;
    }
    var internals = this.internals;
    var documentsById = this.internals.documents;
    var primaryPath = this.primaryPath;
    var categorized = this.internals.ensurePersistenceTask;
    this.internals.ensurePersistenceTask = undefined;

    /**
     * Do inserts/updates
     */
    var stateByIndex = Object.values(this.internals.byIndex);
    var bulkInsertDocs = categorized.bulkInsertDocs;
    for (var i = 0; i < bulkInsertDocs.length; ++i) {
      var writeRow = bulkInsertDocs[i];
      var doc = writeRow.document;
      var docId = doc[primaryPath];
      putWriteRowToState(docId, internals, stateByIndex, doc, undefined);
    }
    var bulkUpdateDocs = categorized.bulkUpdateDocs;
    for (var _i = 0; _i < bulkUpdateDocs.length; ++_i) {
      var _writeRow = bulkUpdateDocs[_i];
      var _doc = _writeRow.document;
      var _docId = _doc[primaryPath];
      putWriteRowToState(_docId, internals, stateByIndex, _doc, documentsById.get(_docId));
    }

    /**
     * Handle attachments
     */
    if (this.schema.attachments) {
      var attachmentsMap = internals.attachments;
      categorized.attachmentsAdd.forEach(attachment => {
        attachmentsMap.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), {
          writeData: attachment.attachmentData,
          digest: attachment.digest
        });
      });
      if (this.schema.attachments) {
        categorized.attachmentsUpdate.forEach(attachment => {
          attachmentsMap.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), {
            writeData: attachment.attachmentData,
            digest: attachment.digest
          });
        });
        categorized.attachmentsRemove.forEach(attachment => {
          attachmentsMap.delete(attachmentMapKey(attachment.documentId, attachment.attachmentId));
        });
      }
    }
  };
  _proto.findDocumentsById = function findDocumentsById(docIds, withDeleted) {
    this.ensurePersistence();
    var documentsById = this.internals.documents;
    var ret = [];
    if (documentsById.size === 0) {
      return Promise.resolve(ret);
    }
    for (var i = 0; i < docIds.length; ++i) {
      var docId = docIds[i];
      var docInDb = documentsById.get(docId);
      if (docInDb && (!docInDb._deleted || withDeleted)) {
        ret.push(docInDb);
      }
    }
    return Promise.resolve(ret);
  };
  _proto.query = function query(preparedQuery) {
    this.ensurePersistence();
    var queryPlan = preparedQuery.queryPlan;
    var query = preparedQuery.query;
    var skip = query.skip ? query.skip : 0;
    var limit = query.limit ? query.limit : Infinity;
    var skipPlusLimit = skip + limit;
    var queryMatcher = false;
    if (!queryPlan.selectorSatisfiedByIndex) {
      queryMatcher = getQueryMatcher(this.schema, preparedQuery.query);
    }
    var queryPlanFields = queryPlan.index;
    var mustManuallyResort = !queryPlan.sortSatisfiedByIndex;
    var index = queryPlanFields;
    var lowerBound = queryPlan.startKeys;
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, lowerBound);
    var upperBound = queryPlan.endKeys;
    upperBound = upperBound;
    var upperBoundString = getStartIndexStringFromUpperBound(this.schema, index, upperBound);
    var indexName = getMemoryIndexName(index);
    if (!this.internals.byIndex[indexName]) {
      throw new Error('index does not exist ' + indexName);
    }
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var indexOfLower = (queryPlan.inclusiveStart ? boundGE : boundGT)(docsWithIndex, [lowerBoundString], compareDocsWithIndex);
    var indexOfUpper = (queryPlan.inclusiveEnd ? boundLE : boundLT)(docsWithIndex, [upperBoundString], compareDocsWithIndex);
    var rows = [];
    var done = false;
    while (!done) {
      var currentRow = docsWithIndex[indexOfLower];
      if (!currentRow || indexOfLower > indexOfUpper) {
        break;
      }
      var currentDoc = currentRow[1];
      if (!queryMatcher || queryMatcher(currentDoc)) {
        rows.push(currentDoc);
      }
      if (rows.length >= skipPlusLimit && !mustManuallyResort) {
        done = true;
      }
      indexOfLower++;
    }
    if (mustManuallyResort) {
      var sortComparator = getSortComparator(this.schema, preparedQuery.query);
      rows = rows.sort(sortComparator);
    }

    // apply skip and limit boundaries.
    rows = rows.slice(skip, skipPlusLimit);
    return Promise.resolve({
      documents: rows
    });
  };
  _proto.count = async function count(preparedQuery) {
    this.ensurePersistence();
    var result = await this.query(preparedQuery);
    return {
      count: result.documents.length,
      mode: 'fast'
    };
  };
  _proto.cleanup = function cleanup(minimumDeletedTime) {
    this.ensurePersistence();
    var maxDeletionTime = now() - minimumDeletedTime;
    var index = ['_deleted', '_meta.lwt', this.primaryPath];
    var indexName = getMemoryIndexName(index);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, [true, 0, '']);
    var indexOfLower = boundGT(docsWithIndex, [lowerBoundString], compareDocsWithIndex);
    var done = false;
    while (!done) {
      var currentDoc = docsWithIndex[indexOfLower];
      if (!currentDoc || currentDoc[1]._meta.lwt > maxDeletionTime) {
        done = true;
      } else {
        removeDocFromState(this.primaryPath, this.schema, this.internals, currentDoc[1]);
        indexOfLower++;
      }
    }
    return PROMISE_RESOLVE_TRUE;
  };
  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId, digest) {
    this.ensurePersistence();
    ensureNotRemoved(this);
    var key = attachmentMapKey(documentId, attachmentId);
    var data = this.internals.attachments.get(key);
    if (!digest || !data || data.digest !== digest) {
      throw new Error('attachment does not exist: ' + key);
    }
    return Promise.resolve(data.writeData.data);
  };
  _proto.changeStream = function changeStream() {
    ensureNotRemoved(this);
    return this.internals.changes$.asObservable();
  };
  _proto.remove = async function remove() {
    if (this.closed) {
      throw new Error('closed');
    }
    this.ensurePersistence();
    ensureNotRemoved(this);
    this.internals.removed = true;
    this.storage.collectionStates.delete(getMemoryCollectionKey(this.databaseName, this.collectionName, this.schema.version));
    await this.close();
  };
  _proto.close = function close() {
    OPEN_MEMORY_INSTANCES.delete(this);
    this.ensurePersistence();
    if (this.closed) {
      return PROMISE_RESOLVE_VOID;
    }
    this.closed = true;
    this.internals.refCount = this.internals.refCount - 1;
    return PROMISE_RESOLVE_VOID;
  };
  return RxStorageInstanceMemory;
}();
export function createMemoryStorageInstance(storage, params, settings) {
  var collectionKey = getMemoryCollectionKey(params.databaseName, params.collectionName, params.schema.version);
  var internals = storage.collectionStates.get(collectionKey);
  if (!internals) {
    internals = {
      id: randomToken(5),
      schema: params.schema,
      removed: false,
      refCount: 1,
      documents: new Map(),
      attachments: params.schema.attachments ? new Map() : undefined,
      byIndex: {},
      changes$: new Subject()
    };
    addIndexesToInternalsState(internals, params.schema);
    storage.collectionStates.set(collectionKey, internals);
  } else {
    /**
     * Ensure that the storage was not already
     * created with a different schema.
     * This is very important because if this check
     * does not exist here, we have hard-to-debug problems
     * downstream.
     */
    if (params.devMode && !deepEqual(internals.schema, params.schema)) {
      throw new Error('storage was already created with a different schema');
    }
    internals.refCount = internals.refCount + 1;
  }
  var instance = new RxStorageInstanceMemory(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings, params.devMode);
  return Promise.resolve(instance);
}
//# sourceMappingURL=rx-storage-instance-memory.js.map