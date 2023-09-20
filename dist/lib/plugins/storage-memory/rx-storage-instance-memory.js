"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceMemory = void 0;
exports.createMemoryStorageInstance = createMemoryStorageInstance;
var _rxjs = require("rxjs");
var _customIndex = require("../../custom-index");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _utils = require("../../plugins/utils");
var _binarySearchBounds = require("./binary-search-bounds");
var _memoryHelper = require("./memory-helper");
var _memoryIndexes = require("./memory-indexes");
var _rxQueryHelper = require("../../rx-query-helper");
var RxStorageInstanceMemory = /*#__PURE__*/function () {
  function RxStorageInstanceMemory(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceMemory.prototype;
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    (0, _memoryHelper.ensureNotRemoved)(this);
    var internals = this.internals;
    var documentsById = this.internals.documents;
    var primaryPath = this.primaryPath;
    var success = {};
    var error = {};
    var categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(this, primaryPath, documentsById, documentWrites, context);
    error = categorized.errors;

    /**
     * Do inserts/updates
     */
    var stateByIndex = Object.values(this.internals.byIndex);
    var bulkInsertDocs = categorized.bulkInsertDocs;
    for (var i = 0; i < bulkInsertDocs.length; ++i) {
      var writeRow = bulkInsertDocs[i];
      var docId = writeRow.document[primaryPath];
      (0, _memoryHelper.putWriteRowToState)(docId, internals, stateByIndex, writeRow, undefined);
      success[docId] = writeRow.document;
    }
    var bulkUpdateDocs = categorized.bulkUpdateDocs;
    for (var _i = 0; _i < bulkUpdateDocs.length; ++_i) {
      var _writeRow = bulkUpdateDocs[_i];
      var _docId = _writeRow.document[primaryPath];
      (0, _memoryHelper.putWriteRowToState)(_docId, internals, stateByIndex, _writeRow, documentsById.get(_docId));
      success[_docId] = _writeRow.document;
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
    if (categorized.eventBulk.events.length > 0) {
      var lastState = (0, _utils.ensureNotFalsy)(categorized.newestRow).document;
      categorized.eventBulk.checkpoint = {
        id: lastState[primaryPath],
        lwt: lastState._meta.lwt
      };
      internals.changes$.next(categorized.eventBulk);
    }
    return Promise.resolve({
      success,
      error
    });
  };
  _proto.findDocumentsById = function findDocumentsById(docIds, withDeleted) {
    var documentsById = this.internals.documents;
    var ret = {};
    for (var i = 0; i < docIds.length; ++i) {
      var docId = docIds[i];
      var docInDb = documentsById.get(docId);
      if (docInDb && (!docInDb._deleted || withDeleted)) {
        ret[docId] = docInDb;
      }
    }
    return Promise.resolve(ret);
  };
  _proto.query = function query(preparedQuery) {
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
    var mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
    var index = ['_deleted'].concat(queryPlanFields);
    var lowerBound = queryPlan.startKeys;
    lowerBound = [false].concat(lowerBound);
    var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(this.schema, index, lowerBound, queryPlan.inclusiveStart);
    var upperBound = queryPlan.endKeys;
    upperBound = [false].concat(upperBound);
    var upperBoundString = (0, _customIndex.getStartIndexStringFromUpperBound)(this.schema, index, upperBound, queryPlan.inclusiveEnd);
    var indexName = (0, _memoryIndexes.getMemoryIndexName)(index);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var indexOfLower = (queryPlan.inclusiveStart ? _binarySearchBounds.boundGE : _binarySearchBounds.boundGT)(docsWithIndex, {
      indexString: lowerBoundString
    }, _memoryHelper.compareDocsWithIndex);
    var indexOfUpper = (queryPlan.inclusiveEnd ? _binarySearchBounds.boundLE : _binarySearchBounds.boundLT)(docsWithIndex, {
      indexString: upperBoundString
    }, _memoryHelper.compareDocsWithIndex);
    var rows = [];
    var done = false;
    while (!done) {
      var currentRow = docsWithIndex[indexOfLower];
      if (!currentRow || indexOfLower > indexOfUpper) {
        break;
      }
      var currentDoc = currentRow.doc;
      if (!queryMatcher || queryMatcher(currentDoc)) {
        rows.push(currentDoc);
      }
      if (rows.length >= skipPlusLimit && !mustManuallyResort || indexOfLower >= docsWithIndex.length) {
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
    var result = await this.query(preparedQuery);
    return {
      count: result.documents.length,
      mode: 'fast'
    };
  };
  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    var sinceLwt = checkpoint ? checkpoint.lwt : _utils.RX_META_LWT_MINIMUM;
    var sinceId = checkpoint ? checkpoint.id : '';
    var index = ['_meta.lwt', this.primaryPath];
    var indexName = (0, _memoryIndexes.getMemoryIndexName)(index);
    var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(this.schema, ['_meta.lwt', this.primaryPath], [sinceLwt, sinceId], false);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var indexOfLower = (0, _binarySearchBounds.boundGT)(docsWithIndex, {
      indexString: lowerBoundString
    }, _memoryHelper.compareDocsWithIndex);

    // TODO use array.slice() so we do not have to iterate here
    var rows = [];
    while (rows.length < limit && indexOfLower < docsWithIndex.length) {
      var currentDoc = docsWithIndex[indexOfLower];
      rows.push(currentDoc.doc);
      indexOfLower++;
    }
    var lastDoc = (0, _utils.lastOfArray)(rows);
    return Promise.resolve({
      documents: rows,
      checkpoint: lastDoc ? {
        id: lastDoc[this.primaryPath],
        lwt: lastDoc._meta.lwt
      } : checkpoint ? checkpoint : {
        id: '',
        lwt: 0
      }
    });
  };
  _proto.cleanup = function cleanup(minimumDeletedTime) {
    var maxDeletionTime = (0, _utils.now)() - minimumDeletedTime;
    var index = ['_deleted', '_meta.lwt', this.primaryPath];
    var indexName = (0, _memoryIndexes.getMemoryIndexName)(index);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(this.schema, index, [true, 0, ''], false);
    var indexOfLower = (0, _binarySearchBounds.boundGT)(docsWithIndex, {
      indexString: lowerBoundString
    }, _memoryHelper.compareDocsWithIndex);
    var done = false;
    while (!done) {
      var currentDoc = docsWithIndex[indexOfLower];
      if (!currentDoc || currentDoc.doc._meta.lwt > maxDeletionTime) {
        done = true;
      } else {
        (0, _memoryHelper.removeDocFromState)(this.primaryPath, this.schema, this.internals, currentDoc.doc);
        indexOfLower++;
      }
    }
    return _utils.PROMISE_RESOLVE_TRUE;
  };
  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId, digest) {
    (0, _memoryHelper.ensureNotRemoved)(this);
    var data = (0, _utils.getFromMapOrThrow)(this.internals.attachments, (0, _memoryHelper.attachmentMapKey)(documentId, attachmentId));
    if (!digest || data.digest !== digest) {
      throw new Error('attachment does not exist');
    }
    return Promise.resolve(data.writeData.data);
  };
  _proto.changeStream = function changeStream() {
    (0, _memoryHelper.ensureNotRemoved)(this);
    return this.internals.changes$.asObservable();
  };
  _proto.remove = async function remove() {
    (0, _memoryHelper.ensureNotRemoved)(this);
    this.internals.removed = true;
    this.storage.collectionStates.delete((0, _memoryHelper.getMemoryCollectionKey)(this.databaseName, this.collectionName, this.schema.version));
    await this.close();
  };
  _proto.close = function close() {
    if (this.closed) {
      return Promise.reject(new Error('already closed'));
    }
    this.closed = true;
    this.internals.refCount = this.internals.refCount - 1;
    return _utils.PROMISE_RESOLVE_VOID;
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return this.internals.conflictResultionTasks$.asObservable();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return _utils.PROMISE_RESOLVE_VOID;
  };
  return RxStorageInstanceMemory;
}();
exports.RxStorageInstanceMemory = RxStorageInstanceMemory;
function createMemoryStorageInstance(storage, params, settings) {
  var collectionKey = (0, _memoryHelper.getMemoryCollectionKey)(params.databaseName, params.collectionName, params.schema.version);
  var internals = storage.collectionStates.get(collectionKey);
  if (!internals) {
    internals = {
      removed: false,
      refCount: 1,
      documents: new Map(),
      attachments: params.schema.attachments ? new Map() : undefined,
      byIndex: {},
      conflictResultionTasks$: new _rxjs.Subject(),
      changes$: new _rxjs.Subject()
    };
    (0, _memoryIndexes.addIndexesToInternalsState)(internals, params.schema);
    storage.collectionStates.set(collectionKey, internals);
  } else {
    internals.refCount = internals.refCount + 1;
  }
  var instance = new RxStorageInstanceMemory(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  return Promise.resolve(instance);
}
//# sourceMappingURL=rx-storage-instance-memory.js.map