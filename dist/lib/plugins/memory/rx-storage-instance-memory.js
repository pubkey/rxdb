"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createMemoryStorageInstance = exports.RxStorageInstanceMemory = void 0;

var _rxjs = require("rxjs");

var _customIndex = require("../../custom-index");

var _rxError = require("../../rx-error");

var _rxSchemaHelper = require("../../rx-schema-helper");

var _rxStorageHelper = require("../../rx-storage-helper");

var _util = require("../../util");

var _rxStorageDexie = require("../dexie/rx-storage-dexie");

var _binarySearchBounds = require("./binary-search-bounds");

var _memoryHelper = require("./memory-helper");

var _memoryIndexes = require("./memory-indexes");

var createMemoryStorageInstance = function createMemoryStorageInstance(storage, params, settings) {
  try {
    var collectionKey = (0, _memoryHelper.getMemoryCollectionKey)(params.databaseName, params.collectionName);

    var _internals = storage.collectionStates.get(collectionKey);

    if (!_internals) {
      _internals = {
        removed: false,
        refCount: 1,
        documents: new Map(),
        attachments: params.schema.attachments ? new Map() : undefined,
        byIndex: {}
      };
      (0, _memoryIndexes.addIndexesToInternalsState)(_internals, params.schema);
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

exports.createMemoryStorageInstance = createMemoryStorageInstance;

var RxStorageInstanceMemory = /*#__PURE__*/function () {
  function RxStorageInstanceMemory(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.changes$ = new _rxjs.Subject();
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

  _proto.bulkWrite = function bulkWrite(documentWrites) {
    var _this = this;

    (0, _memoryHelper.ensureNotRemoved)(this);
    var ret = {
      success: {},
      error: {}
    };
    var categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(this, this.primaryPath, this.internals.documents, documentWrites);
    categorized.errors.forEach(function (err) {
      ret.error[err.documentId] = err;
    });
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
    this.changes$.next(categorized.eventBulk);
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

      var queryMatcher = _rxStorageDexie.RxStorageDexieStatics.getQueryMatcher(_this5.schema, preparedQuery);

      var sortComparator = _rxStorageDexie.RxStorageDexieStatics.getSortComparator(_this5.schema, preparedQuery);

      var queryPlanFields = queryPlan.index;
      var mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
      var index = ['_deleted'].concat(queryPlanFields);
      var lowerBound = queryPlan.startKeys;
      lowerBound = [false].concat(lowerBound);
      var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(_this5.schema, index, lowerBound);
      var upperBound = queryPlan.endKeys;
      upperBound = [false].concat(upperBound);
      var upperBoundString = (0, _customIndex.getStartIndexStringFromUpperBound)(_this5.schema, index, upperBound);
      var indexName = (0, _memoryIndexes.getMemoryIndexName)(index);
      var docsWithIndex = _this5.internals.byIndex[indexName].docsWithIndex;
      var indexOfLower = (0, _binarySearchBounds.boundGE)(docsWithIndex, {
        indexString: lowerBoundString
      }, _memoryHelper.compareDocsWithIndex);
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

      var sinceLwt = checkpoint ? checkpoint.lwt : _util.RX_META_LWT_MINIMUM;
      var sinceId = checkpoint ? checkpoint.id : '';
      var index = ['_meta.lwt', _this7.primaryPath];
      var indexName = (0, _memoryIndexes.getMemoryIndexName)(index);
      var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(_this7.schema, ['_meta.lwt', _this7.primaryPath], [sinceLwt, sinceId]);
      var docsWithIndex = _this7.internals.byIndex[indexName].docsWithIndex;
      var indexOfLower = (0, _binarySearchBounds.boundGT)(docsWithIndex, {
        indexString: lowerBoundString
      }, _memoryHelper.compareDocsWithIndex); // TODO use array.slice() so we do not have to iterate here

      var rows = [];

      while (rows.length < limit && indexOfLower < docsWithIndex.length) {
        var currentDoc = docsWithIndex[indexOfLower];
        rows.push(currentDoc.doc);
        indexOfLower++;
      }

      return Promise.resolve(rows.map(function (docData) {
        return {
          document: docData,
          checkpoint: {
            id: docData[_this7.primaryPath],
            lwt: docData._meta.lwt
          }
        };
      }));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.cleanup = function cleanup(minimumDeletedTime) {
    try {
      var _this9 = this;

      var maxDeletionTime = (0, _util.now)() - minimumDeletedTime;
      var index = ['_deleted', '_meta.lwt', _this9.primaryPath];
      var indexName = (0, _memoryIndexes.getMemoryIndexName)(index);
      var docsWithIndex = _this9.internals.byIndex[indexName].docsWithIndex;
      var lowerBoundString = (0, _customIndex.getStartIndexStringFromLowerBound)(_this9.schema, index, [true, 0, '']);
      var indexOfLower = (0, _binarySearchBounds.boundGT)(docsWithIndex, {
        indexString: lowerBoundString
      }, _memoryHelper.compareDocsWithIndex);
      var done = false;

      while (!done) {
        var currentDoc = docsWithIndex[indexOfLower];

        if (!currentDoc || currentDoc.doc._meta.lwt > maxDeletionTime) {
          done = true;
        } else {
          (0, _memoryHelper.removeDocFromState)(_this9.primaryPath, _this9.schema, _this9.internals, currentDoc.doc);
          indexOfLower++;
        }
      }

      return Promise.resolve(true);
    } catch (e) {
      return Promise.reject(e);
    }
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
      var _this11 = this;

      (0, _memoryHelper.ensureNotRemoved)(_this11);
      _this11.internals.removed = true;

      _this11.storage.collectionStates["delete"]((0, _memoryHelper.getMemoryCollectionKey)(_this11.databaseName, _this11.collectionName));

      return Promise.resolve(_this11.close()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.close = function close() {
    try {
      var _this13 = this;

      if (_this13.closed) {
        throw (0, _rxError.newRxError)('SNH', {
          database: _this13.databaseName,
          collection: _this13.collectionName
        });
      }

      _this13.closed = true;

      _this13.changes$.complete();

      _this13.internals.refCount = _this13.internals.refCount - 1;

      if (_this13.internals.refCount === 0) {
        _this13.storage.collectionStates["delete"]((0, _memoryHelper.getMemoryCollectionKey)(_this13.databaseName, _this13.collectionName));
      }

      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageInstanceMemory;
}();

exports.RxStorageInstanceMemory = RxStorageInstanceMemory;
//# sourceMappingURL=rx-storage-instance-memory.js.map