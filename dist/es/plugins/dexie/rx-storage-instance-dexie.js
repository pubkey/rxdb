import { Subject } from 'rxjs';
import { now, randomCouchString, PROMISE_RESOLVE_VOID, RX_META_LWT_MINIMUM, sortDocumentsByLastWriteTime, lastOfArray } from '../../util';
import { newRxError } from '../../rx-error';
import { closeDexieDb, fromDexieToStorage, fromStorageToDexie, getDexieDbWithTables, getDocsInDb } from './dexie-helper';
import { dexieQuery } from './dexie-query';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { getNewestOfDocumentStates, getUniqueDeterministicEventKey } from '../../rx-storage-helper';
import { addRxStorageMultiInstanceSupport } from '../../rx-storage-multiinstance';
var instanceId = now();
export var RxStorageInstanceDexie = /*#__PURE__*/function () {
  function RxStorageInstanceDexie(storage, databaseName, collectionName, schema, internals, options, settings) {
    this.changes$ = new Subject();
    this.instanceId = instanceId++;
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
        var eventBulk = {
          id: randomCouchString(10),
          events: [],
          checkpoint: null,
          context: context
        };
        var documentKeys = documentWrites.map(function (writeRow) {
          return writeRow.document[_this2.primaryPath];
        });
        return Promise.resolve(state.dexieDb.transaction('rw', state.dexieTable, state.dexieDeletedTable, function () {
          try {
            return Promise.resolve(getDocsInDb(_this2.internals, documentKeys)).then(function (docsInDb) {
              docsInDb = docsInDb.map(function (d) {
                return d ? fromDexieToStorage(d) : d;
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
                var startTime = now();
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
                      eventId: getUniqueDeterministicEventKey(_this2, _this2.primaryPath, writeRow),
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
                        throw newRxError('SNH', {
                          args: {
                            writeRow: writeRow
                          }
                        });
                      }
                    } else {
                      eventBulk.events.push({
                        eventId: getUniqueDeterministicEventKey(_this2, _this2.primaryPath, writeRow),
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
                return fromStorageToDexie(d);
              })) : PROMISE_RESOLVE_VOID, bulkRemoveDocs.length > 0 ? state.dexieTable.bulkDelete(bulkRemoveDocs) : PROMISE_RESOLVE_VOID, bulkPutDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkPut(bulkPutDeletedDocs.map(function (d) {
                return fromStorageToDexie(d);
              })) : PROMISE_RESOLVE_VOID, bulkRemoveDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkDelete(bulkRemoveDeletedDocs) : PROMISE_RESOLVE_VOID])).then(function () {});
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function () {
          if (eventBulk.events.length > 0) {
            var lastState = getNewestOfDocumentStates(_this2.primaryPath, Object.values(ret.success));
            eventBulk.checkpoint = {
              id: lastState[_this2.primaryPath],
              lwt: lastState._meta.lwt
            };
            var endTime = now();
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

      ensureNotClosed(_this4);
      return Promise.resolve(_this4.internals).then(function (state) {
        var ret = {};
        return Promise.resolve(state.dexieDb.transaction('r', state.dexieTable, state.dexieDeletedTable, function () {
          try {
            var _temp3 = function _temp3() {
              ids.forEach(function (id, idx) {
                var documentInDb = docsInDb[idx];

                if (documentInDb && (!documentInDb._deleted || deleted)) {
                  ret[id] = fromDexieToStorage(documentInDb);
                }
              });
            };

            var docsInDb;

            var _temp4 = function () {
              if (deleted) {
                return Promise.resolve(getDocsInDb(_this4.internals, ids)).then(function (_getDocsInDb) {
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
    return dexieQuery(this, preparedQuery);
  };

  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    try {
      var _this6 = this;

      ensureNotClosed(_this6);
      var sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
      var sinceId = checkpoint ? checkpoint.id : '';
      return Promise.resolve(_this6.internals).then(function (state) {
        return Promise.resolve(Promise.all([state.dexieTable, state.dexieDeletedTable].map(function (table) {
          try {
            var query = table.where('[_meta.lwt+' + _this6.primaryPath + ']').above([sinceLwt, sinceId]).limit(limit);
            return Promise.resolve(query.toArray()).then(function (changedDocuments) {
              return changedDocuments.map(function (d) {
                return fromDexieToStorage(d);
              });
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function (_ref) {
          var changedDocsNormal = _ref[0],
              changedDocsDeleted = _ref[1];
          var changedDocs = changedDocsNormal.concat(changedDocsDeleted);
          changedDocs = sortDocumentsByLastWriteTime(_this6.primaryPath, changedDocs);
          changedDocs = changedDocs.slice(0, limit);
          var lastDoc = lastOfArray(changedDocs);
          return {
            documents: changedDocs,
            checkpoint: lastDoc ? {
              id: lastDoc[_this6.primaryPath],
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
      var _this8 = this;

      ensureNotClosed(_this8);
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
    ensureNotClosed(this);
    return this.changes$.asObservable();
  };

  _proto.cleanup = function cleanup(minimumDeletedTime) {
    try {
      var _this10 = this;

      ensureNotClosed(_this10);
      return Promise.resolve(_this10.internals).then(function (state) {
        return Promise.resolve(state.dexieDb.transaction('rw', state.dexieDeletedTable, function () {
          try {
            var maxDeletionTime = now() - minimumDeletedTime;
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
    ensureNotClosed(this);
    throw new Error('Attachments are not implemented in the dexie RxStorage. Make a pull request.');
  };

  _proto.close = function close() {
    ensureNotClosed(this);
    this.closed = true;
    this.changes$.complete();
    closeDexieDb(this.internals);
    return PROMISE_RESOLVE_VOID;
  };

  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new Subject();
  };

  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return Promise.resolve();
  };

  return RxStorageInstanceDexie;
}();
export function createDexieStorageInstance(storage, params, settings) {
  var internals = getDexieDbWithTables(params.databaseName, params.collectionName, settings, params.schema);
  var instance = new RxStorageInstanceDexie(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  addRxStorageMultiInstanceSupport(params, instance);
  return Promise.resolve(instance);
}

function ensureNotClosed(instance) {
  if (instance.closed) {
    throw new Error('RxStorageInstanceDexie is closed ' + instance.databaseName + '-' + instance.collectionName);
  }
}
//# sourceMappingURL=rx-storage-instance-dexie.js.map