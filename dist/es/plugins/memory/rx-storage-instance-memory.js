import { Subject } from 'rxjs';
import { getStartIndexStringFromLowerBound, getStartIndexStringFromUpperBound } from '../../custom-index';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { categorizeBulkWriteRows, getNewestOfDocumentStates } from '../../rx-storage-helper';
import { getFromMapOrThrow, lastOfArray, now, PROMISE_RESOLVE_TRUE, PROMISE_RESOLVE_VOID, RX_META_LWT_MINIMUM } from '../../util';
import { RxStorageDexieStatics } from '../dexie/dexie-statics';
import { boundGE, boundGT, boundLE } from './binary-search-bounds';
import { attachmentMapKey, compareDocsWithIndex, ensureNotRemoved, getMemoryCollectionKey, putWriteRowToState, removeDocFromState } from './memory-helper';
import { addIndexesToInternalsState, getMemoryIndexName } from './memory-indexes';
export var RxStorageInstanceMemory = /*#__PURE__*/function () {
  function RxStorageInstanceMemory(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.closed = false;
    this.changes$ = new Subject();
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
  }
  var _proto = RxStorageInstanceMemory.prototype;
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    var _this = this;
    ensureNotRemoved(this);
    var ret = {
      success: {},
      error: {}
    };
    var categorized = categorizeBulkWriteRows(this, this.primaryPath, this.internals.documents, documentWrites, context);
    ret.error = categorized.errors;

    /**
     * Do inserts/updates
     */
    var stateByIndex = Object.values(this.internals.byIndex);
    categorized.bulkInsertDocs.forEach(function (writeRow) {
      var docId = writeRow.document[_this.primaryPath];
      putWriteRowToState(docId, _this.internals, stateByIndex, writeRow, undefined);
      ret.success[docId] = writeRow.document;
    });
    categorized.bulkUpdateDocs.forEach(function (writeRow) {
      var docId = writeRow.document[_this.primaryPath];
      putWriteRowToState(docId, _this.internals, stateByIndex, writeRow, _this.internals.documents.get(docId));
      ret.success[docId] = writeRow.document;
    });

    /**
     * Handle attachments
     */
    var attachmentsMap = this.internals.attachments;
    categorized.attachmentsAdd.forEach(function (attachment) {
      attachmentsMap.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
    });
    categorized.attachmentsUpdate.forEach(function (attachment) {
      attachmentsMap.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
    });
    categorized.attachmentsRemove.forEach(function (attachment) {
      attachmentsMap["delete"](attachmentMapKey(attachment.documentId, attachment.attachmentId));
    });
    if (categorized.eventBulk.events.length > 0) {
      var lastState = getNewestOfDocumentStates(this.primaryPath, Object.values(ret.success));
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
      queryMatcher = RxStorageDexieStatics.getQueryMatcher(this.schema, preparedQuery);
    }
    var queryPlanFields = queryPlan.index;
    var mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
    var index = ['_deleted'].concat(queryPlanFields);
    var lowerBound = queryPlan.startKeys;
    lowerBound = [false].concat(lowerBound);
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, lowerBound, queryPlan.inclusiveStart);
    var upperBound = queryPlan.endKeys;
    upperBound = [false].concat(upperBound);
    var upperBoundString = getStartIndexStringFromUpperBound(this.schema, index, upperBound, queryPlan.inclusiveEnd);
    var indexName = getMemoryIndexName(index);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var indexOfLower = boundGE(docsWithIndex, {
      indexString: lowerBoundString
    }, compareDocsWithIndex);
    var indexOfUpper = boundLE(docsWithIndex, {
      indexString: upperBoundString
    }, compareDocsWithIndex);
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
      var sortComparator = RxStorageDexieStatics.getSortComparator(this.schema, preparedQuery);
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
    var sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
    var sinceId = checkpoint ? checkpoint.id : '';
    var index = ['_meta.lwt', this.primaryPath];
    var indexName = getMemoryIndexName(index);
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, ['_meta.lwt', this.primaryPath], [sinceLwt, sinceId], false);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var indexOfLower = boundGT(docsWithIndex, {
      indexString: lowerBoundString
    }, compareDocsWithIndex);

    // TODO use array.slice() so we do not have to iterate here
    var rows = [];
    while (rows.length < limit && indexOfLower < docsWithIndex.length) {
      var currentDoc = docsWithIndex[indexOfLower];
      rows.push(currentDoc.doc);
      indexOfLower++;
    }
    var lastDoc = lastOfArray(rows);
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
    var maxDeletionTime = now() - minimumDeletedTime;
    var index = ['_deleted', '_meta.lwt', this.primaryPath];
    var indexName = getMemoryIndexName(index);
    var docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
    var lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, [true, 0, ''], false);
    var indexOfLower = boundGT(docsWithIndex, {
      indexString: lowerBoundString
    }, compareDocsWithIndex);
    var done = false;
    while (!done) {
      var currentDoc = docsWithIndex[indexOfLower];
      if (!currentDoc || currentDoc.doc._meta.lwt > maxDeletionTime) {
        done = true;
      } else {
        removeDocFromState(this.primaryPath, this.schema, this.internals, currentDoc.doc);
        indexOfLower++;
      }
    }
    return PROMISE_RESOLVE_TRUE;
  };
  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    ensureNotRemoved(this);
    var data = getFromMapOrThrow(this.internals.attachments, attachmentMapKey(documentId, attachmentId));
    return Promise.resolve(data.data);
  };
  _proto.changeStream = function changeStream() {
    ensureNotRemoved(this);
    return this.changes$.asObservable();
  };
  _proto.remove = function remove() {
    try {
      var _this6 = this;
      ensureNotRemoved(_this6);
      _this6.internals.removed = true;
      _this6.storage.collectionStates["delete"](getMemoryCollectionKey(_this6.databaseName, _this6.collectionName));
      return Promise.resolve(_this6.close()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.close = function close() {
    if (this.closed) {
      return Promise.reject(newRxError('SNH', {
        database: this.databaseName,
        collection: this.collectionName
      }));
    }
    this.closed = true;
    this.changes$.complete();
    this.internals.refCount = this.internals.refCount - 1;
    if (this.internals.refCount === 0) {
      this.storage.collectionStates["delete"](getMemoryCollectionKey(this.databaseName, this.collectionName));
    }
    return PROMISE_RESOLVE_VOID;
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return this.internals.conflictResultionTasks$.asObservable();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return PROMISE_RESOLVE_VOID;
  };
  return RxStorageInstanceMemory;
}();
export function createMemoryStorageInstance(storage, params, settings) {
  var collectionKey = getMemoryCollectionKey(params.databaseName, params.collectionName);
  var internals = storage.collectionStates.get(collectionKey);
  if (!internals) {
    internals = {
      removed: false,
      refCount: 1,
      documents: new Map(),
      attachments: params.schema.attachments ? new Map() : undefined,
      byIndex: {},
      conflictResultionTasks$: new Subject()
    };
    addIndexesToInternalsState(internals, params.schema);
    storage.collectionStates.set(collectionKey, internals);
  } else {
    internals.refCount = internals.refCount + 1;
  }
  var instance = new RxStorageInstanceMemory(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  return Promise.resolve(instance);
}
//# sourceMappingURL=rx-storage-instance-memory.js.map