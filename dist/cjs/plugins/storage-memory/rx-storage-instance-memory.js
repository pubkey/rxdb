"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceMemory = exports.OPEN_MEMORY_INSTANCES = void 0;
exports.createMemoryStorageInstance = createMemoryStorageInstance;
var _readOnlyError2 = _interopRequireDefault(require("@babel/runtime/helpers/readOnlyError"));
var _rxjs = require("rxjs");
var _customIndex = require("../../custom-index.js");
var _rxSchemaHelper = require("../../rx-schema-helper.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _index = require("../../plugins/utils/index.js");
var _binarySearchBounds = require("./binary-search-bounds.js");
var _memoryHelper = require("./memory-helper.js");
var _memoryIndexes = require("./memory-indexes.js");
var _rxQueryHelper = require("../../rx-query-helper.js");
/**
 * Used in tests to ensure everything
 * is closed correctly
 */
var OPEN_MEMORY_INSTANCES = exports.OPEN_MEMORY_INSTANCES = new Set();
var RxStorageInstanceMemory = exports.RxStorageInstanceMemory = /*#__PURE__*/function () {
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
    this.primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceMemory.prototype;
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    this.ensurePersistence();
    (0, _memoryHelper.ensureNotRemoved)(this);
    var internals = this.internals;
    var documentsById = this.internals.documents;
    var primaryPath = this.primaryPath;
    var categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(this, primaryPath, documentsById, documentWrites, context);
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
      this.internals.ensurePersistenceIdlePromise = (0, _index.requestIdlePromiseNoQueue)().then(() => {
        this.internals.ensurePersistenceIdlePromise = undefined;
        this.ensurePersistence();
      });
    }

    /**
     * Important: The events must be emitted AFTER the persistence
     * task has been added.
     */
    if (categorized.eventBulk.events.length > 0) {
      var lastState = (0, _index.ensureNotFalsy)(categorized.newestRow).document;
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
      (0, _memoryHelper.putWriteRowToState)(docId, internals, stateByIndex, doc, undefined);
    }
    var bulkUpdateDocs = categorized.bulkUpdateDocs;
    for (var _i = 0; _i < bulkUpdateDocs.length; ++_i) {
      var _writeRow = bulkUpdateDocs[_i];
      var _doc = _writeRow.document;
      var _docId = _doc[primaryPath];
      (0, _memoryHelper.putWriteRowToState)(_docId, internals, stateByIndex, _doc, documentsById.get(_docId));
    }

    /**
     * Handle attachments
     */
    if (this.schema.attachments) {
      var attachmentsMap = internals.attachments;
      categorized.attachmentsAdd.forEach(attachment => {
        attachmentsMap.set((0, _memoryHelper.attachmentMapKey)(attachment.documentId, attachment.attachmentId), {
          writeData: attachment.attachmentData,
          digest: attachment.digest
        });
      });
      if (this.schema.attachments) {
        categorized.attachmentsUpdate.forEach(attachment => {
          attachmentsMap.set((0, _memoryHelper.attachmentMapKey)(attachment.documentId, attachment.attachmentId), {
            writeData: attachment.attachmentData,
            digest: attachment.digest
          });
        });
        categorized.attachmentsRemove.forEach(attachment => {
          attachmentsMap.delete((0, _memoryHelper.attachmentMapKey)(attachment.documentId, attachment.attachmentId));
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
      queryMatcher = (0, _rxQueryHelper.getQueryMatcher)(this.schema, preparedQuery.query);
    }
    var queryPlanFields = queryPlan.index;
    var mustManuallyResort = !queryPlan.sortSatisfiedByIndex;
    var index = queryPlanFields;
    var lowerBound = queryPlan.startKeys;
    var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(this.schema, index, lowerBound);
    var upperBound = queryPlan.endKeys;
    upperBound = upperBound;
    var upperBoundString = (0, _customIndex.getStartIndexStringFromUpperBound)(this.schema, index, upperBound);
    var indexName = (0, _memoryIndexes.getMemoryIndexName)(index);
    if (!this.internals.byIndex[indexName]) {
      throw new Error('index does not exist ' + indexName);
    }
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var indexOfLower = (queryPlan.inclusiveStart ? _binarySearchBounds.boundGE : _binarySearchBounds.boundGT)(docsWithIndex, [lowerBoundString], _memoryHelper.compareDocsWithIndex);
    var indexOfUpper = (queryPlan.inclusiveEnd ? _binarySearchBounds.boundLE : _binarySearchBounds.boundLT)(docsWithIndex, [upperBoundString], _memoryHelper.compareDocsWithIndex);
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
      var sortComparator = (0, _rxQueryHelper.getSortComparator)(this.schema, preparedQuery.query);
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
    var maxDeletionTime = (0, _index.now)() - minimumDeletedTime;
    var index = ['_deleted', '_meta.lwt', this.primaryPath];
    var indexName = (0, _memoryIndexes.getMemoryIndexName)(index);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(this.schema, index, [true, 0, '']);
    var indexOfLower = (0, _binarySearchBounds.boundGT)(docsWithIndex, [lowerBoundString], _memoryHelper.compareDocsWithIndex);
    var done = false;
    while (!done) {
      var currentDoc = docsWithIndex[indexOfLower];
      if (!currentDoc || currentDoc[1]._meta.lwt > maxDeletionTime) {
        done = true;
      } else {
        (0, _memoryHelper.removeDocFromState)(this.primaryPath, this.schema, this.internals, currentDoc[1]);
        indexOfLower++;
      }
    }
    return _index.PROMISE_RESOLVE_TRUE;
  };
  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId, digest) {
    this.ensurePersistence();
    (0, _memoryHelper.ensureNotRemoved)(this);
    var key = (0, _memoryHelper.attachmentMapKey)(documentId, attachmentId);
    var data = this.internals.attachments.get(key);
    if (!digest || !data || data.digest !== digest) {
      throw new Error('attachment does not exist: ' + key);
    }
    return Promise.resolve(data.writeData.data);
  };
  _proto.changeStream = function changeStream() {
    (0, _memoryHelper.ensureNotRemoved)(this);
    return this.internals.changes$.asObservable();
  };
  _proto.remove = async function remove() {
    if (this.closed) {
      throw new Error('closed');
    }
    this.ensurePersistence();
    (0, _memoryHelper.ensureNotRemoved)(this);
    this.internals.removed = true;
    this.storage.collectionStates.delete((0, _memoryHelper.getMemoryCollectionKey)(this.databaseName, this.collectionName, this.schema.version));
    await this.close();
  };
  _proto.close = function close() {
    OPEN_MEMORY_INSTANCES.delete(this);
    this.ensurePersistence();
    if (this.closed) {
      return _index.PROMISE_RESOLVE_VOID;
    }
    this.closed = true;
    this.internals.refCount = this.internals.refCount - 1;
    return _index.PROMISE_RESOLVE_VOID;
  };
  return RxStorageInstanceMemory;
}();
function createMemoryStorageInstance(storage, params, settings) {
  var collectionKey = (0, _memoryHelper.getMemoryCollectionKey)(params.databaseName, params.collectionName, params.schema.version);
  var internals = storage.collectionStates.get(collectionKey);
  if (!internals) {
    internals = {
      id: (0, _index.randomToken)(5),
      schema: params.schema,
      removed: false,
      refCount: 1,
      documents: new Map(),
      attachments: params.schema.attachments ? new Map() : undefined,
      byIndex: {},
      changes$: new _rxjs.Subject()
    };
    (0, _memoryIndexes.addIndexesToInternalsState)(internals, params.schema);
    storage.collectionStates.set(collectionKey, internals);
  } else {
    /**
     * Ensure that the storage was not already
     * created with a different schema.
     * This is very important because if this check
     * does not exist here, we have hard-to-debug problems
     * downstream.
     */
    if (params.devMode && !(0, _index.deepEqual)(internals.schema, params.schema)) {
      throw new Error('storage was already created with a different schema');
    }
    internals.refCount = internals.refCount + 1;
  }
  var instance = new RxStorageInstanceMemory(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings, params.devMode);
  return Promise.resolve(instance);
}
//# sourceMappingURL=rx-storage-instance-memory.js.map