"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceMemory = void 0;
exports.createMemoryStorageInstance = createMemoryStorageInstance;
var _rxjs = require("rxjs");
var _customIndex = require("../../custom-index");
var _rxError = require("../../rx-error");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _util = require("../../util");
var _dexieStatics = require("../dexie/dexie-statics");
var _binarySearchBounds = require("./binary-search-bounds");
var _memoryHelper = require("./memory-helper");
var _memoryIndexes = require("./memory-indexes");
var RxStorageInstanceMemory = /*#__PURE__*/function () {
  function RxStorageInstanceMemory(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.closed = false;
    this.changes$ = new _rxjs.Subject();
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
    var _this = this;
    (0, _memoryHelper.ensureNotRemoved)(this);
    var ret = {
      success: {},
      error: {}
    };
    var categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(this, this.primaryPath, this.internals.documents, documentWrites, context);
    ret.error = categorized.errors;

    /**
     * Do inserts/updates
     */
    var stateByIndex = Object.values(this.internals.byIndex);
    categorized.bulkInsertDocs.forEach(function (writeRow) {
      var docId = writeRow.document[_this.primaryPath];
      (0, _memoryHelper.putWriteRowToState)(docId, _this.internals, stateByIndex, writeRow, undefined);
      ret.success[docId] = writeRow.document;
    });
    categorized.bulkUpdateDocs.forEach(function (writeRow) {
      var docId = writeRow.document[_this.primaryPath];
      (0, _memoryHelper.putWriteRowToState)(docId, _this.internals, stateByIndex, writeRow, _this.internals.documents.get(docId));
      ret.success[docId] = writeRow.document;
    });

    /**
     * Handle attachments
     */
    var attachmentsMap = this.internals.attachments;
    categorized.attachmentsAdd.forEach(function (attachment) {
      attachmentsMap.set((0, _memoryHelper.attachmentMapKey)(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
    });
    categorized.attachmentsUpdate.forEach(function (attachment) {
      attachmentsMap.set((0, _memoryHelper.attachmentMapKey)(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
    });
    categorized.attachmentsRemove.forEach(function (attachment) {
      attachmentsMap["delete"]((0, _memoryHelper.attachmentMapKey)(attachment.documentId, attachment.attachmentId));
    });
    if (categorized.eventBulk.events.length > 0) {
      var lastState = (0, _rxStorageHelper.getNewestOfDocumentStates)(this.primaryPath, Object.values(ret.success));
      categorized.eventBulk.checkpoint = {
        id: lastState[this.primaryPath],
        lwt: lastState._meta.lwt
      };
      this.changes$.next(categorized.eventBulk);
    }
    return Promise.resolve(ret);
  };
  _proto.findDocumentsById = function findDocumentsById(docIds, withDeleted) {
    var _this2 = this;
    var ret = {};
    docIds.forEach(function (docId) {
      var docInDb = _this2.internals.documents.get(docId);
      if (docInDb && (!docInDb._deleted || withDeleted)) {
        ret[docId] = docInDb;
      }
    });
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
      queryMatcher = _dexieStatics.RxStorageDexieStatics.getQueryMatcher(this.schema, preparedQuery);
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
    var indexOfLower = (0, _binarySearchBounds.boundGE)(docsWithIndex, {
      indexString: lowerBoundString
    }, _memoryHelper.compareDocsWithIndex);
    var indexOfUpper = (0, _binarySearchBounds.boundLE)(docsWithIndex, {
      indexString: upperBoundString
    }, _memoryHelper.compareDocsWithIndex);
    var rows = [];
    var done = false;
    while (!done) {
      var currentDoc = docsWithIndex[indexOfLower];
      if (!currentDoc || indexOfLower > indexOfUpper) {
        break;
      }
      if (!queryMatcher || queryMatcher(currentDoc.doc)) {
        rows.push(currentDoc.doc);
      }
      if (rows.length >= skipPlusLimit && !mustManuallyResort || indexOfLower >= docsWithIndex.length) {
        done = true;
      }
      indexOfLower++;
    }
    if (mustManuallyResort) {
      var sortComparator = _dexieStatics.RxStorageDexieStatics.getSortComparator(this.schema, preparedQuery);
      rows = rows.sort(sortComparator);
    }

    // apply skip and limit boundaries.
    rows = rows.slice(skip, skipPlusLimit);
    return Promise.resolve({
      documents: rows
    });
  };
  _proto.count = function count(preparedQuery) {
    try {
      var _this4 = this;
      return Promise.resolve(_this4.query(preparedQuery)).then(function (result) {
        return {
          count: result.documents.length,
          mode: 'fast'
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    var sinceLwt = checkpoint ? checkpoint.lwt : _util.RX_META_LWT_MINIMUM;
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
    var lastDoc = (0, _util.lastOfArray)(rows);
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
    var maxDeletionTime = (0, _util.now)() - minimumDeletedTime;
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
    return _util.PROMISE_RESOLVE_TRUE;
  };
  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    (0, _memoryHelper.ensureNotRemoved)(this);
    var data = (0, _util.getFromMapOrThrow)(this.internals.attachments, (0, _memoryHelper.attachmentMapKey)(documentId, attachmentId));
    return Promise.resolve(data.data);
  };
  _proto.changeStream = function changeStream() {
    (0, _memoryHelper.ensureNotRemoved)(this);
    return this.changes$.asObservable();
  };
  _proto.remove = function remove() {
    try {
      var _this6 = this;
      (0, _memoryHelper.ensureNotRemoved)(_this6);
      _this6.internals.removed = true;
      _this6.storage.collectionStates["delete"]((0, _memoryHelper.getMemoryCollectionKey)(_this6.databaseName, _this6.collectionName));
      return Promise.resolve(_this6.close()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.close = function close() {
    if (this.closed) {
      return Promise.reject((0, _rxError.newRxError)('SNH', {
        database: this.databaseName,
        collection: this.collectionName
      }));
    }
    this.closed = true;
    this.changes$.complete();
    this.internals.refCount = this.internals.refCount - 1;
    if (this.internals.refCount === 0) {
      this.storage.collectionStates["delete"]((0, _memoryHelper.getMemoryCollectionKey)(this.databaseName, this.collectionName));
    }
    return _util.PROMISE_RESOLVE_VOID;
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return this.internals.conflictResultionTasks$.asObservable();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return _util.PROMISE_RESOLVE_VOID;
  };
  return RxStorageInstanceMemory;
}();
exports.RxStorageInstanceMemory = RxStorageInstanceMemory;
function createMemoryStorageInstance(storage, params, settings) {
  var collectionKey = (0, _memoryHelper.getMemoryCollectionKey)(params.databaseName, params.collectionName);
  var internals = storage.collectionStates.get(collectionKey);
  if (!internals) {
    internals = {
      removed: false,
      refCount: 1,
      documents: new Map(),
      attachments: params.schema.attachments ? new Map() : undefined,
      byIndex: {},
      conflictResultionTasks$: new _rxjs.Subject()
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