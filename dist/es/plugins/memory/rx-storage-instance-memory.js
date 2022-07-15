import { Subject } from 'rxjs';
import { getStartIndexStringFromLowerBound, getStartIndexStringFromUpperBound } from '../../custom-index';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { categorizeBulkWriteRows, getNewestOfDocumentStates } from '../../rx-storage-helper';
import { getFromMapOrThrow, lastOfArray, now, PROMISE_RESOLVE_VOID, RX_META_LWT_MINIMUM } from '../../util';
import { RxStorageDexieStatics } from '../dexie/rx-storage-dexie';
import { boundGE, boundGT } from './binary-search-bounds';
import { attachmentMapKey, compareDocsWithIndex, ensureNotRemoved, getMemoryCollectionKey, putWriteRowToState, removeDocFromState } from './memory-helper';
import { addIndexesToInternalsState, getMemoryIndexName } from './memory-indexes';
export var createMemoryStorageInstance = function createMemoryStorageInstance(storage, params, settings) {
  try {
    var collectionKey = getMemoryCollectionKey(params.databaseName, params.collectionName);

    var _internals = storage.collectionStates.get(collectionKey);

    if (!_internals) {
      _internals = {
        removed: false,
        refCount: 1,
        documents: new Map(),
        attachments: params.schema.attachments ? new Map() : undefined,
        byIndex: {},
        conflictResultionTasks$: new Subject()
      };
      addIndexesToInternalsState(_internals, params.schema);
      storage.collectionStates.set(collectionKey, _internals);
    } else {
      _internals.refCount = _internals.refCount + 1;
    }

    var instance = new RxStorageInstanceMemory(storage, params.databaseName, params.collectionName, params.schema, _internals, params.options, settings);
    return Promise.resolve(instance);
  } catch (e) {
    return Promise.reject(e);
  }
};
export var RxStorageInstanceMemory = /*#__PURE__*/function () {
  function RxStorageInstanceMemory(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.changes$ = new Subject();
    this.closed = false;
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
    categorized.errors.forEach(function (err) {
      ret.error[err.documentId] = err;
    });
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
    try {
      var _this3 = this;

      var ret = {};
      docIds.forEach(function (docId) {
        var docInDb = _this3.internals.documents.get(docId);

        if (docInDb && (!docInDb._deleted || withDeleted)) {
          ret[docId] = docInDb;
        }
      });
      return Promise.resolve(ret);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.query = function query(preparedQuery) {
    try {
      var _this5 = this;

      var queryPlan = preparedQuery.queryPlan;
      var query = preparedQuery.query;
      var skip = query.skip ? query.skip : 0;
      var limit = query.limit ? query.limit : Infinity;
      var skipPlusLimit = skip + limit;
      var queryMatcher = RxStorageDexieStatics.getQueryMatcher(_this5.schema, preparedQuery);
      var sortComparator = RxStorageDexieStatics.getSortComparator(_this5.schema, preparedQuery);
      var queryPlanFields = queryPlan.index;
      var mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
      var index = ['_deleted'].concat(queryPlanFields);
      var lowerBound = queryPlan.startKeys;
      lowerBound = [false].concat(lowerBound);
      var lowerBoundString = getStartIndexStringFromLowerBound(_this5.schema, index, lowerBound);
      var upperBound = queryPlan.endKeys;
      upperBound = [false].concat(upperBound);
      var upperBoundString = getStartIndexStringFromUpperBound(_this5.schema, index, upperBound);
      var indexName = getMemoryIndexName(index);
      var docsWithIndex = _this5.internals.byIndex[indexName].docsWithIndex;
      var indexOfLower = boundGE(docsWithIndex, {
        indexString: lowerBoundString
      }, compareDocsWithIndex);
      var rows = [];
      var done = false;

      while (!done) {
        var currentDoc = docsWithIndex[indexOfLower];

        if (!currentDoc || currentDoc.indexString > upperBoundString) {
          break;
        }

        if (queryMatcher(currentDoc.doc)) {
          rows.push(currentDoc.doc);
        }

        if (rows.length >= skipPlusLimit && !mustManuallyResort || indexOfLower >= docsWithIndex.length) {
          done = true;
        }

        indexOfLower++;
      }

      if (mustManuallyResort) {
        rows = rows.sort(sortComparator);
      } // apply skip and limit boundaries.


      rows = rows.slice(skip, skipPlusLimit);
      return Promise.resolve({
        documents: rows
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    try {
      var _this7 = this;

      var sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
      var sinceId = checkpoint ? checkpoint.id : '';
      var index = ['_meta.lwt', _this7.primaryPath];
      var indexName = getMemoryIndexName(index);
      var lowerBoundString = getStartIndexStringFromLowerBound(_this7.schema, ['_meta.lwt', _this7.primaryPath], [sinceLwt, sinceId]);
      var docsWithIndex = _this7.internals.byIndex[indexName].docsWithIndex;
      var indexOfLower = boundGT(docsWithIndex, {
        indexString: lowerBoundString
      }, compareDocsWithIndex); // TODO use array.slice() so we do not have to iterate here

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
          id: lastDoc[_this7.primaryPath],
          lwt: lastDoc._meta.lwt
        } : {
          id: '',
          lwt: 0
        }
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.cleanup = function cleanup(minimumDeletedTime) {
    try {
      var _this9 = this;

      var maxDeletionTime = now() - minimumDeletedTime;
      var index = ['_deleted', '_meta.lwt', _this9.primaryPath];
      var indexName = getMemoryIndexName(index);
      var docsWithIndex = _this9.internals.byIndex[indexName].docsWithIndex;
      var lowerBoundString = getStartIndexStringFromLowerBound(_this9.schema, index, [true, 0, '']);
      var indexOfLower = boundGT(docsWithIndex, {
        indexString: lowerBoundString
      }, compareDocsWithIndex);
      var done = false;

      while (!done) {
        var currentDoc = docsWithIndex[indexOfLower];

        if (!currentDoc || currentDoc.doc._meta.lwt > maxDeletionTime) {
          done = true;
        } else {
          removeDocFromState(_this9.primaryPath, _this9.schema, _this9.internals, currentDoc.doc);
          indexOfLower++;
        }
      }

      return Promise.resolve(true);
    } catch (e) {
      return Promise.reject(e);
    }
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
      var _this11 = this;

      ensureNotRemoved(_this11);
      _this11.internals.removed = true;

      _this11.storage.collectionStates["delete"](getMemoryCollectionKey(_this11.databaseName, _this11.collectionName));

      return Promise.resolve(_this11.close()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.close = function close() {
    try {
      var _this13 = this;

      if (_this13.closed) {
        throw newRxError('SNH', {
          database: _this13.databaseName,
          collection: _this13.collectionName
        });
      }

      _this13.closed = true;

      _this13.changes$.complete();

      _this13.internals.refCount = _this13.internals.refCount - 1;

      if (_this13.internals.refCount === 0) {
        _this13.storage.collectionStates["delete"](getMemoryCollectionKey(_this13.databaseName, _this13.collectionName));
      }

      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return this.internals.conflictResultionTasks$.asObservable();
  };

  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return PROMISE_RESOLVE_VOID;
  };

  return RxStorageInstanceMemory;
}();
//# sourceMappingURL=rx-storage-instance-memory.js.map