"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceDexie = void 0;
exports.createDexieStorageInstance = createDexieStorageInstance;
var _rxjs = require("rxjs");
var _util = require("../../util");
var _dexieHelper = require("./dexie-helper");
var _dexieQuery = require("./dexie-query");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");
var _rxError = require("../../rx-error");
var instanceId = (0, _util.now)();
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
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    try {
      var _this2 = this;
      ensureNotClosed(_this2);
      return Promise.resolve(_this2.internals).then(function (state) {
        var ret = {
          success: {},
          error: {}
        };
        var documentKeys = documentWrites.map(function (writeRow) {
          return writeRow.document[_this2.primaryPath];
        });
        var categorized = null;
        return Promise.resolve(state.dexieDb.transaction('rw', state.dexieTable, state.dexieDeletedTable, function () {
          try {
            var docsInDbMap = new Map();
            return Promise.resolve((0, _dexieHelper.getDocsInDb)(_this2.internals, documentKeys)).then(function (docsInDbWithInternals) {
              docsInDbWithInternals.forEach(function (docWithDexieInternals) {
                var doc = docWithDexieInternals ? (0, _dexieHelper.fromDexieToStorage)(docWithDexieInternals) : docWithDexieInternals;
                if (doc) {
                  docsInDbMap.set(doc[_this2.primaryPath], doc);
                }
                return doc;
              });
              categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(_this2, _this2.primaryPath, docsInDbMap, documentWrites, context);
              ret.error = categorized.errors;

              /**
               * Batch up the database operations
               * so we can later run them in bulk.
               */
              var bulkPutDocs = [];
              var bulkRemoveDocs = [];
              var bulkPutDeletedDocs = [];
              var bulkRemoveDeletedDocs = [];
              categorized.bulkInsertDocs.forEach(function (row) {
                var docId = row.document[_this2.primaryPath];
                ret.success[docId] = row.document;
                bulkPutDocs.push(row.document);
              });
              categorized.bulkUpdateDocs.forEach(function (row) {
                var docId = row.document[_this2.primaryPath];
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
                      row: row
                    }
                  });
                }
              });
              return Promise.resolve(Promise.all([bulkPutDocs.length > 0 ? state.dexieTable.bulkPut(bulkPutDocs.map(function (d) {
                return (0, _dexieHelper.fromStorageToDexie)(d);
              })) : _util.PROMISE_RESOLVE_VOID, bulkRemoveDocs.length > 0 ? state.dexieTable.bulkDelete(bulkRemoveDocs) : _util.PROMISE_RESOLVE_VOID, bulkPutDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkPut(bulkPutDeletedDocs.map(function (d) {
                return (0, _dexieHelper.fromStorageToDexie)(d);
              })) : _util.PROMISE_RESOLVE_VOID, bulkRemoveDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkDelete(bulkRemoveDeletedDocs) : _util.PROMISE_RESOLVE_VOID])).then(function () {});
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function () {
          if ((0, _util.ensureNotFalsy)(categorized).eventBulk.events.length > 0) {
            var lastState = (0, _rxStorageHelper.getNewestOfDocumentStates)(_this2.primaryPath, Object.values(ret.success));
            (0, _util.ensureNotFalsy)(categorized).eventBulk.checkpoint = {
              id: lastState[_this2.primaryPath],
              lwt: lastState._meta.lwt
            };
            var endTime = (0, _util.now)();
            (0, _util.ensureNotFalsy)(categorized).eventBulk.events.forEach(function (event) {
              return event.endTime = endTime;
            });
            _this2.changes$.next((0, _util.ensureNotFalsy)(categorized).eventBulk);
          }
          return ret;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.findDocumentsById = function findDocumentsById(ids, deleted) {
    try {
      var _this4 = this;
      ensureNotClosed(_this4);
      return Promise.resolve(_this4.internals).then(function (state) {
        var ret = {};
        return Promise.resolve(state.dexieDb.transaction('r', state.dexieTable, state.dexieDeletedTable, function () {
          try {
            var _temp3 = function _temp3() {
              ids.forEach(function (id, idx) {
                var documentInDb = docsInDb[idx];
                if (documentInDb && (!documentInDb._deleted || deleted)) {
                  ret[id] = (0, _dexieHelper.fromDexieToStorage)(documentInDb);
                }
              });
            };
            var docsInDb;
            var _temp4 = function () {
              if (deleted) {
                return Promise.resolve((0, _dexieHelper.getDocsInDb)(_this4.internals, ids)).then(function (_getDocsInDb) {
                  docsInDb = _getDocsInDb;
                });
              } else {
                return Promise.resolve(state.dexieTable.bulkGet(ids)).then(function (_state$dexieTable$bul) {
                  docsInDb = _state$dexieTable$bul;
                });
              }
            }();
            return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function () {
          return ret;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.query = function query(preparedQuery) {
    ensureNotClosed(this);
    return (0, _dexieQuery.dexieQuery)(this, preparedQuery);
  };
  _proto.count = function count(preparedQuery) {
    try {
      var _this6 = this;
      return Promise.resolve((0, _dexieQuery.dexieCount)(_this6, preparedQuery)).then(function (result) {
        return {
          count: result,
          mode: 'fast'
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    try {
      var _this8 = this;
      ensureNotClosed(_this8);
      var sinceLwt = checkpoint ? checkpoint.lwt : _util.RX_META_LWT_MINIMUM;
      var sinceId = checkpoint ? checkpoint.id : '';
      return Promise.resolve(_this8.internals).then(function (state) {
        return Promise.resolve(Promise.all([state.dexieTable, state.dexieDeletedTable].map(function (table) {
          try {
            var query = table.where('[_meta.lwt+' + _this8.primaryPath + ']').above([sinceLwt, sinceId]).limit(limit);
            return Promise.resolve(query.toArray()).then(function (changedDocuments) {
              return changedDocuments.map(function (d) {
                return (0, _dexieHelper.fromDexieToStorage)(d);
              });
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function (_ref) {
          var changedDocsNormal = _ref[0],
            changedDocsDeleted = _ref[1];
          var changedDocs = changedDocsNormal.concat(changedDocsDeleted);
          changedDocs = (0, _util.sortDocumentsByLastWriteTime)(_this8.primaryPath, changedDocs);
          changedDocs = changedDocs.slice(0, limit);
          var lastDoc = (0, _util.lastOfArray)(changedDocs);
          return {
            documents: changedDocs,
            checkpoint: lastDoc ? {
              id: lastDoc[_this8.primaryPath],
              lwt: lastDoc._meta.lwt
            } : checkpoint ? checkpoint : {
              id: '',
              lwt: 0
            }
          };
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.remove = function remove() {
    try {
      var _this10 = this;
      ensureNotClosed(_this10);
      return Promise.resolve(_this10.internals).then(function (state) {
        return Promise.resolve(Promise.all([state.dexieDeletedTable.clear(), state.dexieTable.clear()])).then(function () {
          return _this10.close();
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.changeStream = function changeStream() {
    ensureNotClosed(this);
    return this.changes$.asObservable();
  };
  _proto.cleanup = function cleanup(minimumDeletedTime) {
    try {
      var _this12 = this;
      ensureNotClosed(_this12);
      return Promise.resolve(_this12.internals).then(function (state) {
        return Promise.resolve(state.dexieDb.transaction('rw', state.dexieDeletedTable, function () {
          try {
            var maxDeletionTime = (0, _util.now)() - minimumDeletedTime;
            return Promise.resolve(state.dexieDeletedTable.where('_meta.lwt').below(maxDeletionTime).toArray()).then(function (toRemove) {
              var removeIds = toRemove.map(function (doc) {
                return doc[_this12.primaryPath];
              });
              return Promise.resolve(state.dexieDeletedTable.bulkDelete(removeIds)).then(function () {});
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function () {
          /**
           * TODO instead of deleting all deleted docs at once,
           * only clean up some of them and return false if there are more documents to clean up.
           * This ensures that when many documents have to be purged,
           * we do not block the more important tasks too long.
           */
          return true;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
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
    return _util.PROMISE_RESOLVE_VOID;
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new _rxjs.Subject();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return Promise.resolve();
  };
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