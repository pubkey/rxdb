"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createDexieStorageInstance = exports.RxStorageInstanceDexie = void 0;

var _rxjs = require("rxjs");

var _util = require("../../util");

var _rxError = require("../../rx-error");

var _dexieHelper = require("./dexie-helper");

var _dexieQuery = require("./dexie-query");

var _rxSchemaHelper = require("../../rx-schema-helper");

var _rxStorageHelper = require("../../rx-storage-helper");

var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");

var createDexieStorageInstance = function createDexieStorageInstance(storage, params, settings) {
  try {
    var _internals = (0, _dexieHelper.getDexieDbWithTables)(params.databaseName, params.collectionName, settings, params.schema);

    var instance = new RxStorageInstanceDexie(storage, params.databaseName, params.collectionName, params.schema, _internals, params.options, settings);
    (0, _rxStorageMultiinstance.addRxStorageMultiInstanceSupport)(params, instance);
    return Promise.resolve(instance);
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.createDexieStorageInstance = createDexieStorageInstance;
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

      return Promise.resolve(_this2.internals).then(function (state) {
        var ret = {
          success: {},
          error: {}
        };
        var eventBulk = {
          id: (0, _util.randomCouchString)(10),
          events: [],
          checkpoint: null,
          context: context
        };
        var documentKeys = documentWrites.map(function (writeRow) {
          return writeRow.document[_this2.primaryPath];
        });
        return Promise.resolve(state.dexieDb.transaction('rw', state.dexieTable, state.dexieDeletedTable, function () {
          try {
            return Promise.resolve((0, _dexieHelper.getDocsInDb)(_this2.internals, documentKeys)).then(function (docsInDb) {
              docsInDb = docsInDb.map(function (d) {
                return d ? (0, _dexieHelper.fromDexieToStorage)(d) : d;
              });
              /**
               * Batch up the database operations
               * so we can later run them in bulk.
               */

              var bulkPutDocs = [];
              var bulkRemoveDocs = [];
              var bulkPutDeletedDocs = [];
              var bulkRemoveDeletedDocs = [];
              var changesIds = [];
              documentWrites.forEach(function (writeRow, docIndex) {
                var id = writeRow.document[_this2.primaryPath];
                var startTime = (0, _util.now)();
                var documentInDb = docsInDb[docIndex];

                if (!documentInDb) {
                  /**
                   * It is possible to insert already deleted documents,
                   * this can happen on replication.
                   */
                  var insertedIsDeleted = writeRow.document._deleted ? true : false;
                  var writeDoc = Object.assign({}, writeRow.document, {
                    _deleted: insertedIsDeleted,
                    // TODO attachments are currently not working with dexie.js
                    _attachments: {}
                  });
                  changesIds.push(id);

                  if (insertedIsDeleted) {
                    bulkPutDeletedDocs.push(writeDoc);
                  } else {
                    bulkPutDocs.push(writeDoc);
                    eventBulk.events.push({
                      eventId: (0, _rxStorageHelper.getUniqueDeterministicEventKey)(_this2, _this2.primaryPath, writeRow),
                      documentId: id,
                      change: {
                        doc: writeDoc,
                        id: id,
                        operation: 'INSERT',
                        previous: null
                      },
                      startTime: startTime,
                      // will be filled up before the event is pushed into the changestream
                      endTime: startTime
                    });
                  }

                  ret.success[id] = writeDoc;
                } else {
                  // update existing document
                  var revInDb = documentInDb._rev;

                  if (!writeRow.previous || !!writeRow.previous && revInDb !== writeRow.previous._rev) {
                    // conflict error
                    var err = {
                      isError: true,
                      status: 409,
                      documentId: id,
                      writeRow: writeRow,
                      documentInDb: documentInDb
                    };
                    ret.error[id] = err;
                  } else {
                    var isDeleted = !!writeRow.document._deleted;

                    var _writeDoc = Object.assign({}, writeRow.document, {
                      _deleted: isDeleted,
                      // TODO attachments are currently not working with lokijs
                      _attachments: {}
                    });

                    changesIds.push(id);
                    var change = null;

                    if (writeRow.previous && writeRow.previous._deleted && !_writeDoc._deleted) {
                      /**
                       * Insert document that was deleted before.
                       */
                      bulkPutDocs.push(_writeDoc);
                      bulkRemoveDeletedDocs.push(id);
                      change = {
                        id: id,
                        operation: 'INSERT',
                        previous: null,
                        doc: _writeDoc
                      };
                    } else if (writeRow.previous && !writeRow.previous._deleted && !_writeDoc._deleted) {
                      /**
                       * Update existing non-deleted document
                       */
                      bulkPutDocs.push(_writeDoc);
                      change = {
                        id: id,
                        operation: 'UPDATE',
                        previous: writeRow.previous,
                        doc: _writeDoc
                      };
                    } else if (writeRow.previous && !writeRow.previous._deleted && _writeDoc._deleted) {
                      /**
                       * Set non-deleted document to deleted.
                       */
                      bulkPutDeletedDocs.push(_writeDoc);
                      bulkRemoveDocs.push(id);
                      change = {
                        id: id,
                        operation: 'DELETE',
                        previous: writeRow.previous,
                        doc: null
                      };
                    } else if (writeRow.previous && writeRow.previous._deleted && writeRow.document._deleted) {
                      // deleted doc was overwritten with other deleted doc
                      bulkPutDeletedDocs.push(_writeDoc);
                    }

                    if (!change) {
                      if (writeRow.previous && writeRow.previous._deleted && writeRow.document._deleted) {// deleted doc got overwritten with other deleted doc -> do not send an event
                      } else {
                        throw (0, _rxError.newRxError)('SNH', {
                          args: {
                            writeRow: writeRow
                          }
                        });
                      }
                    } else {
                      eventBulk.events.push({
                        eventId: (0, _rxStorageHelper.getUniqueDeterministicEventKey)(_this2, _this2.primaryPath, writeRow),
                        documentId: id,
                        change: change,
                        startTime: startTime,
                        // will be filled up before the event is pushed into the changestream
                        endTime: startTime
                      });
                    }

                    ret.success[id] = _writeDoc;
                  }
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
          if (eventBulk.events.length > 0) {
            var lastState = (0, _rxStorageHelper.getNewestOfDocumentStates)(_this2.primaryPath, Object.values(ret.success));
            eventBulk.checkpoint = {
              id: lastState[_this2.primaryPath],
              lwt: lastState._meta.lwt
            };
            var endTime = (0, _util.now)();
            eventBulk.events.forEach(function (event) {
              return event.endTime = endTime;
            });

            _this2.changes$.next(eventBulk);
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
    return (0, _dexieQuery.dexieQuery)(this, preparedQuery);
  };

  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    try {
      var _this6 = this;

      var sinceLwt = checkpoint ? checkpoint.lwt : _util.RX_META_LWT_MINIMUM;
      var sinceId = checkpoint ? checkpoint.id : '';
      return Promise.resolve(_this6.internals).then(function (state) {
        return Promise.resolve(Promise.all([state.dexieTable, state.dexieDeletedTable].map(function (table) {
          try {
            var query = table.where('[_meta.lwt+' + _this6.primaryPath + ']').above([sinceLwt, sinceId]).limit(limit);
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
          changedDocs = (0, _util.sortDocumentsByLastWriteTime)(_this6.primaryPath, changedDocs);
          changedDocs = changedDocs.slice(0, limit);
          return changedDocs.map(function (docData) {
            return {
              document: docData,
              checkpoint: {
                id: docData[_this6.primaryPath],
                lwt: docData._meta.lwt
              }
            };
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.remove = function remove() {
    try {
      var _this8 = this;

      return Promise.resolve(_this8.internals).then(function (state) {
        return Promise.resolve(Promise.all([state.dexieDeletedTable.clear(), state.dexieTable.clear()])).then(function () {
          return _this8.close();
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto.cleanup = function cleanup(minimumDeletedTime) {
    try {
      var _this10 = this;

      return Promise.resolve(_this10.internals).then(function (state) {
        return Promise.resolve(state.dexieDb.transaction('rw', state.dexieDeletedTable, function () {
          try {
            var maxDeletionTime = (0, _util.now)() - minimumDeletedTime;
            return Promise.resolve(state.dexieDeletedTable.where('_meta.lwt').below(maxDeletionTime).toArray()).then(function (toRemove) {
              var removeIds = toRemove.map(function (doc) {
                return doc[_this10.primaryPath];
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
    throw new Error('Attachments are not implemented in the dexie RxStorage. Make a pull request.');
  };

  _proto.close = function close() {
    try {
      var _this12 = this;

      if (_this12.closed) {
        throw (0, _rxError.newRxError)('SNH', {
          database: _this12.databaseName,
          collection: _this12.collectionName
        });
      }

      _this12.closed = true;

      _this12.changes$.complete();

      (0, _dexieHelper.closeDexieDb)(_this12.internals);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
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
//# sourceMappingURL=rx-storage-instance-dexie.js.map