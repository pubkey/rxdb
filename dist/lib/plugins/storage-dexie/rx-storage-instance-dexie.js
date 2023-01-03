"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceDexie = void 0;
exports.createDexieStorageInstance = createDexieStorageInstance;
var _rxjs = require("rxjs");
var _utils = require("../utils");
var _dexieHelper = require("./dexie-helper");
var _dexieQuery = require("./dexie-query");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");
var _rxError = require("../../rx-error");
var instanceId = (0, _utils.now)();
var RxStorageInstanceDexie = /*#__PURE__*/function () {
  function RxStorageInstanceDexie(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.changes$ = new _rxjs.Subject();
    this.instanceId = instanceId++;
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
        throw (0, _rxError.newRxError)('SNH', {
          args: {
            row
          }
        });
      }
    });
    var state = await this.internals;
    var ret = {
      success: {},
      error: {}
    };
    var documentKeys = documentWrites.map(writeRow => writeRow.document[this.primaryPath]);
    var categorized = null;
    await state.dexieDb.transaction('rw', state.dexieTable, state.dexieDeletedTable, async () => {
      var docsInDbMap = new Map();
      var docsInDbWithInternals = await (0, _dexieHelper.getDocsInDb)(this.internals, documentKeys);
      docsInDbWithInternals.forEach(docWithDexieInternals => {
        var doc = docWithDexieInternals ? (0, _dexieHelper.fromDexieToStorage)(docWithDexieInternals) : docWithDexieInternals;
        if (doc) {
          docsInDbMap.set(doc[this.primaryPath], doc);
        }
        return doc;
      });
      categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(this, this.primaryPath, docsInDbMap, documentWrites, context);
      ret.error = categorized.errors;

      /**
       * Batch up the database operations
       * so we can later run them in bulk.
       */
      var bulkPutDocs = [];
      var bulkRemoveDocs = [];
      var bulkPutDeletedDocs = [];
      var bulkRemoveDeletedDocs = [];
      categorized.bulkInsertDocs.forEach(row => {
        var docId = row.document[this.primaryPath];
        ret.success[docId] = row.document;
        bulkPutDocs.push(row.document);
      });
      categorized.bulkUpdateDocs.forEach(row => {
        var docId = row.document[this.primaryPath];
        ret.success[docId] = row.document;
        if (row.document._deleted && row.previous && !row.previous._deleted) {
          // newly deleted
          bulkRemoveDocs.push(docId);
          bulkPutDeletedDocs.push(row.document);
        } else if (row.document._deleted && row.previous && row.previous._deleted) {
          // deleted was modified but is still deleted
          bulkPutDeletedDocs.push(row.document);
        } else if (!row.document._deleted) {
          // non-deleted was changed
          bulkPutDocs.push(row.document);
        } else {
          throw (0, _rxError.newRxError)('SNH', {
            args: {
              row
            }
          });
        }
      });
      await Promise.all([bulkPutDocs.length > 0 ? state.dexieTable.bulkPut(bulkPutDocs.map(d => (0, _dexieHelper.fromStorageToDexie)(d))) : _utils.PROMISE_RESOLVE_VOID, bulkRemoveDocs.length > 0 ? state.dexieTable.bulkDelete(bulkRemoveDocs) : _utils.PROMISE_RESOLVE_VOID, bulkPutDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkPut(bulkPutDeletedDocs.map(d => (0, _dexieHelper.fromStorageToDexie)(d))) : _utils.PROMISE_RESOLVE_VOID, bulkRemoveDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkDelete(bulkRemoveDeletedDocs) : _utils.PROMISE_RESOLVE_VOID]);
    });
    if ((0, _utils.ensureNotFalsy)(categorized).eventBulk.events.length > 0) {
      var lastState = (0, _rxStorageHelper.getNewestOfDocumentStates)(this.primaryPath, Object.values(ret.success));
      (0, _utils.ensureNotFalsy)(categorized).eventBulk.checkpoint = {
        id: lastState[this.primaryPath],
        lwt: lastState._meta.lwt
      };
      var endTime = (0, _utils.now)();
      (0, _utils.ensureNotFalsy)(categorized).eventBulk.events.forEach(event => event.endTime = endTime);
      this.changes$.next((0, _utils.ensureNotFalsy)(categorized).eventBulk);
    }
    return ret;
  };
  _proto.findDocumentsById = async function findDocumentsById(ids, deleted) {
    ensureNotClosed(this);
    var state = await this.internals;
    var ret = {};
    await state.dexieDb.transaction('r', state.dexieTable, state.dexieDeletedTable, async () => {
      var docsInDb;
      if (deleted) {
        docsInDb = await (0, _dexieHelper.getDocsInDb)(this.internals, ids);
      } else {
        docsInDb = await state.dexieTable.bulkGet(ids);
      }
      ids.forEach((id, idx) => {
        var documentInDb = docsInDb[idx];
        if (documentInDb && (!documentInDb._deleted || deleted)) {
          ret[id] = (0, _dexieHelper.fromDexieToStorage)(documentInDb);
        }
      });
    });
    return ret;
  };
  _proto.query = function query(preparedQuery) {
    ensureNotClosed(this);
    return (0, _dexieQuery.dexieQuery)(this, preparedQuery);
  };
  _proto.count = async function count(preparedQuery) {
    var result = await (0, _dexieQuery.dexieCount)(this, preparedQuery);
    return {
      count: result,
      mode: 'fast'
    };
  };
  _proto.getChangedDocumentsSince = async function getChangedDocumentsSince(limit, checkpoint) {
    ensureNotClosed(this);
    var sinceLwt = checkpoint ? checkpoint.lwt : _utils.RX_META_LWT_MINIMUM;
    var sinceId = checkpoint ? checkpoint.id : '';
    var state = await this.internals;
    var [changedDocsNormal, changedDocsDeleted] = await Promise.all([state.dexieTable, state.dexieDeletedTable].map(async table => {
      var query = table.where('[_meta.lwt+' + this.primaryPath + ']').above([sinceLwt, sinceId]).limit(limit);
      var changedDocuments = await query.toArray();
      return changedDocuments.map(d => (0, _dexieHelper.fromDexieToStorage)(d));
    }));
    var changedDocs = changedDocsNormal.concat(changedDocsDeleted);
    changedDocs = (0, _utils.sortDocumentsByLastWriteTime)(this.primaryPath, changedDocs);
    changedDocs = changedDocs.slice(0, limit);
    var lastDoc = (0, _utils.lastOfArray)(changedDocs);
    return {
      documents: changedDocs,
      checkpoint: lastDoc ? {
        id: lastDoc[this.primaryPath],
        lwt: lastDoc._meta.lwt
      } : checkpoint ? checkpoint : {
        id: '',
        lwt: 0
      }
    };
  };
  _proto.remove = async function remove() {
    ensureNotClosed(this);
    var state = await this.internals;
    await Promise.all([state.dexieDeletedTable.clear(), state.dexieTable.clear()]);
    return this.close();
  };
  _proto.changeStream = function changeStream() {
    ensureNotClosed(this);
    return this.changes$.asObservable();
  };
  _proto.cleanup = async function cleanup(minimumDeletedTime) {
    ensureNotClosed(this);
    var state = await this.internals;
    await state.dexieDb.transaction('rw', state.dexieDeletedTable, async () => {
      var maxDeletionTime = (0, _utils.now)() - minimumDeletedTime;
      var toRemove = await state.dexieDeletedTable.where('_meta.lwt').below(maxDeletionTime).toArray();
      var removeIds = toRemove.map(doc => doc[this.primaryPath]);
      await state.dexieDeletedTable.bulkDelete(removeIds);
    });

    /**
     * TODO instead of deleting all deleted docs at once,
     * only clean up some of them and return false if there are more documents to clean up.
     * This ensures that when many documents have to be purged,
     * we do not block the more important tasks too long.
     */
    return true;
  };
  _proto.getAttachmentData = function getAttachmentData(_documentId, _attachmentId) {
    ensureNotClosed(this);
    throw new Error('Attachments are not implemented in the dexie RxStorage. Make a pull request.');
  };
  _proto.close = function close() {
    ensureNotClosed(this);
    this.closed = true;
    this.changes$.complete();
    (0, _dexieHelper.closeDexieDb)(this.internals);
    return _utils.PROMISE_RESOLVE_VOID;
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new _rxjs.Subject();
  };
  _proto.resolveConflictResultionTask = async function resolveConflictResultionTask(_taskSolution) {};
  return RxStorageInstanceDexie;
}();
exports.RxStorageInstanceDexie = RxStorageInstanceDexie;
function createDexieStorageInstance(storage, params, settings) {
  var internals = (0, _dexieHelper.getDexieDbWithTables)(params.databaseName, params.collectionName, settings, params.schema);
  var instance = new RxStorageInstanceDexie(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  (0, _rxStorageMultiinstance.addRxStorageMultiInstanceSupport)(_dexieHelper.RX_STORAGE_NAME_DEXIE, params, instance);
  return Promise.resolve(instance);
}
function ensureNotClosed(instance) {
  if (instance.closed) {
    throw new Error('RxStorageInstanceDexie is closed ' + instance.databaseName + '-' + instance.collectionName);
  }
}
//# sourceMappingURL=rx-storage-instance-dexie.js.map