"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createDexieStorageInstance = exports.RxStorageInstanceDexie = void 0;

var _rxjs = require("rxjs");

var _util = require("../../util");

var _rxError = require("../../rx-error");

var _dexieHelper = require("./dexie-helper");

var _dexieQuery = require("./query/dexie-query");

var _rxSchemaHelper = require("../../rx-schema-helper");

var _rxStorageHelper = require("../../rx-storage-helper");

var createDexieStorageInstance = function createDexieStorageInstance(storage, params, settings) {
  try {
    var _internals = (0, _dexieHelper.getDexieDbWithTables)(params.databaseName, params.collectionName, settings, params.schema);

    var instance = new RxStorageInstanceDexie(storage, params.databaseName, params.collectionName, params.schema, _internals, params.options, settings);
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
  /**
   * Adds entries to the changes feed
   * that can be queried to check which documents have been
   * changed since sequence X.
   */


  var _proto = RxStorageInstanceDexie.prototype;

  _proto.addChangeDocumentsMeta = function addChangeDocumentsMeta(ids) {
    try {
      var _this2 = this;

      return Promise.resolve(_this2.internals).then(function (state) {
        var addDocs = ids.map(function (id) {
          return {
            id: id
          };
        });
        return state.dexieChangesTable.bulkPut(addDocs);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.bulkWrite = function bulkWrite(documentWrites) {
    try {
      var _this4 = this;

      return Promise.resolve(_this4.internals).then(function (state) {
        var ret = {
          success: {},
          error: {}
        };
        var eventBulk = {
          id: (0, _util.randomCouchString)(10),
          events: []
        };
        var documentKeys = documentWrites.map(function (writeRow) {
          return writeRow.document[_this4.primaryPath];
        });
        return Promise.resolve(state.dexieDb.transaction('rw', state.dexieTable, state.dexieDeletedTable, state.dexieChangesTable, function () {
          try {
            return Promise.resolve((0, _dexieHelper.getDocsInDb)(_this4.internals, documentKeys)).then(function (docsInDb) {
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
                var id = writeRow.document[_this4.primaryPath];
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
                      eventId: (0, _rxStorageHelper.getUniqueDeterministicEventKey)(_this4, _this4.primaryPath, writeRow),
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
                  var revInDb = documentInDb._rev; // inserting a deleted document is possible
                  // without sending the previous data.

                  if (!writeRow.previous && documentInDb._deleted) {
                    writeRow.previous = documentInDb;
                  }

                  if (!writeRow.previous && !documentInDb._deleted || !!writeRow.previous && revInDb !== writeRow.previous._rev) {
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
                        eventId: (0, _rxStorageHelper.getUniqueDeterministicEventKey)(_this4, _this4.primaryPath, writeRow),
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
              return Promise.resolve(Promise.all([bulkPutDocs.length > 0 ? state.dexieTable.bulkPut(bulkPutDocs) : _util.PROMISE_RESOLVE_VOID, bulkRemoveDocs.length > 0 ? state.dexieTable.bulkDelete(bulkRemoveDocs) : _util.PROMISE_RESOLVE_VOID, bulkPutDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkPut(bulkPutDeletedDocs) : _util.PROMISE_RESOLVE_VOID, bulkRemoveDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkDelete(bulkRemoveDeletedDocs) : _util.PROMISE_RESOLVE_VOID, changesIds.length > 0 ? _this4.addChangeDocumentsMeta(changesIds) : _util.PROMISE_RESOLVE_VOID])).then(function () {});
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function () {
          var endTime = (0, _util.now)();
          eventBulk.events.forEach(function (event) {
            return event.endTime = endTime;
          });

          _this4.changes$.next(eventBulk);

          return ret;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.findDocumentsById = function findDocumentsById(ids, deleted) {
    try {
      var _this6 = this;

      return Promise.resolve(_this6.internals).then(function (state) {
        var ret = {};
        return Promise.resolve(state.dexieDb.transaction('r', state.dexieTable, state.dexieDeletedTable, function () {
          try {
            var _temp3 = function _temp3() {
              ids.forEach(function (id, idx) {
                var documentInDb = docsInDb[idx];

                if (documentInDb && (!documentInDb._deleted || deleted)) {
                  ret[id] = documentInDb;
                }
              });
            };

            var docsInDb;

            var _temp4 = function () {
              if (deleted) {
                return Promise.resolve((0, _dexieHelper.getDocsInDb)(_this6.internals, ids)).then(function (_getDocsInDb) {
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

  _proto.getChangedDocuments = function getChangedDocuments(options) {
    try {
      var _this8 = this;

      return Promise.resolve(_this8.internals).then(function (state) {
        var lastSequence = 0;
        var query;

        if (options.direction === 'before') {
          query = state.dexieChangesTable.where('sequence').below(options.sinceSequence).reverse();
        } else {
          query = state.dexieChangesTable.where('sequence').above(options.sinceSequence);
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        return Promise.resolve(query.toArray()).then(function (changedDocuments) {
          if (changedDocuments.length === 0) {
            lastSequence = options.sinceSequence;
          } else {
            var useForLastSequence = options.direction === 'after' ? (0, _util.lastOfArray)(changedDocuments) : changedDocuments[0];
            lastSequence = useForLastSequence.sequence;
          }

          return {
            lastSequence: lastSequence,
            changedDocuments: changedDocuments
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

      return Promise.resolve(_this10.internals).then(function (state) {
        return Promise.resolve(Promise.all([state.dexieChangesTable.clear(), state.dexieTable.clear()])).then(function () {
          return _this10.close();
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
      var _this12 = this;

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
           * only clean up some of them and return true.
           * This ensures that when many documents have to be purged,
           * we do not block the more important tasks too long.
           */
          return false;
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
      var _this14 = this;

      _this14.closed = true;

      _this14.changes$.complete();

      (0, _dexieHelper.closeDexieDb)(_this14.internals);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageInstanceDexie;
}();

exports.RxStorageInstanceDexie = RxStorageInstanceDexie;
//# sourceMappingURL=rx-storage-instance-dexie.js.map