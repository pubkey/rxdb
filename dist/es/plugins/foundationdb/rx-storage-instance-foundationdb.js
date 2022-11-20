import { Subject } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
// import {
//     open as foundationDBOpen,
//     directory as foundationDBDirectory,
//     encoders as foundationDBEncoders,
//     keySelector as foundationDBKeySelector,
//     StreamingMode as foundationDBStreamingMode
// } from 'foundationdb';
import { categorizeBulkWriteRows, getNewestOfDocumentStates } from '../../rx-storage-helper';
import { CLEANUP_INDEX, getFoundationDBIndexName } from './foundationdb-helpers';
import { newRxError } from '../../rx-error';
import { getIndexableStringMonad, getStartIndexStringFromLowerBound, getStartIndexStringFromUpperBound } from '../../custom-index';
import { ensureNotFalsy, lastOfArray, now, PROMISE_RESOLVE_VOID } from '../../util';
import { queryFoundationDB } from './foundationdb-query';
import { INDEX_MAX } from '../../query-planner';
import { attachmentMapKey } from '../memory';
export var RxStorageInstanceFoundationDB = /*#__PURE__*/function () {
  function RxStorageInstanceFoundationDB(storage, databaseName, collectionName, schema, internals, options, settings) {
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
  var _proto = RxStorageInstanceFoundationDB.prototype;
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    try {
      var _this2 = this;
      return Promise.resolve(_this2.internals.dbsPromise).then(function (dbs) {
        var categorized = null;
        return Promise.resolve(dbs.root.doTransaction(function (tx) {
          try {
            var ret = {
              success: {},
              error: {}
            };
            var ids = documentWrites.map(function (row) {
              return row.document[_this2.primaryPath];
            });
            var mainTx = tx.at(dbs.main.subspace);
            var attachmentTx = tx.at(dbs.attachments.subspace);
            var docsInDB = new Map();
            /**
             * TODO this might be faster if fdb
             * any time adds a bulk-fetch-by-key method.
             */
            return Promise.resolve(Promise.all(ids.map(function (id) {
              try {
                return Promise.resolve(mainTx.get(id)).then(function (doc) {
                  docsInDB.set(id, doc);
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {
              categorized = categorizeBulkWriteRows(_this2, _this2.primaryPath, docsInDB, documentWrites, context);
              ret.error = categorized.errors;

              // INSERTS
              categorized.bulkInsertDocs.forEach(function (writeRow) {
                var docId = writeRow.document[_this2.primaryPath];
                ret.success[docId] = writeRow.document;

                // insert document data
                mainTx.set(docId, writeRow.document);

                // insert secondary indexes
                Object.values(dbs.indexes).forEach(function (indexMeta) {
                  var indexString = indexMeta.getIndexableString(writeRow.document);
                  var indexTx = tx.at(indexMeta.db.subspace);
                  indexTx.set(indexString, docId);
                });
              });
              // UPDATES
              categorized.bulkUpdateDocs.forEach(function (writeRow) {
                var docId = writeRow.document[_this2.primaryPath];

                // overwrite document data
                mainTx.set(docId, writeRow.document);

                // update secondary indexes
                Object.values(dbs.indexes).forEach(function (indexMeta) {
                  var oldIndexString = indexMeta.getIndexableString(ensureNotFalsy(writeRow.previous));
                  var newIndexString = indexMeta.getIndexableString(writeRow.document);
                  if (oldIndexString !== newIndexString) {
                    var indexTx = tx.at(indexMeta.db.subspace);
                    indexTx["delete"](oldIndexString);
                    indexTx.set(newIndexString, docId);
                  }
                });
                ret.success[docId] = writeRow.document;
              });

              // attachments
              categorized.attachmentsAdd.forEach(function (attachment) {
                attachmentTx.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
              });
              categorized.attachmentsUpdate.forEach(function (attachment) {
                attachmentTx.set(attachmentMapKey(attachment.documentId, attachment.attachmentId), attachment.attachmentData);
              });
              categorized.attachmentsRemove.forEach(function (attachment) {
                attachmentTx["delete"](attachmentMapKey(attachment.documentId, attachment.attachmentId));
              });
              return ret;
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function (result) {
          /**
           * The events must be emitted AFTER the transaction
           * has finished.
           * Otherwise an observable changestream might cause a read
           * to a document that does not already exist outside of the transaction.
           */
          if (ensureNotFalsy(categorized).eventBulk.events.length > 0) {
            var lastState = getNewestOfDocumentStates(_this2.primaryPath, Object.values(result.success));
            ensureNotFalsy(categorized).eventBulk.checkpoint = {
              id: lastState[_this2.primaryPath],
              lwt: lastState._meta.lwt
            };
            _this2.changes$.next(ensureNotFalsy(categorized).eventBulk);
          }
          return result;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.findDocumentsById = function findDocumentsById(ids, withDeleted) {
    try {
      var _this4 = this;
      return Promise.resolve(_this4.internals.dbsPromise).then(function (dbs) {
        return dbs.main.doTransaction(function (tx) {
          try {
            var ret = {};
            return Promise.resolve(Promise.all(ids.map(function (docId) {
              try {
                return Promise.resolve(tx.get(docId)).then(function (docInDb) {
                  if (docInDb && (!docInDb._deleted || withDeleted)) {
                    ret[docId] = docInDb;
                  }
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {
              return ret;
            });
          } catch (e) {
            return Promise.reject(e);
          }
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.query = function query(preparedQuery) {
    return queryFoundationDB(this, preparedQuery);
  };
  _proto.count = function count(preparedQuery) {
    try {
      var _this6 = this;
      /**
       * At this point in time (end 2022), FoundationDB does not support
       * range counts. So we have to run a normal query and use the result set length.
       * @link https://github.com/apple/foundationdb/issues/5981
       */
      return Promise.resolve(_this6.query(preparedQuery)).then(function (result) {
        return {
          count: result.documents.length,
          mode: 'fast'
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    try {
      var _this8 = this;
      return Promise.resolve(_this8.internals.dbsPromise).then(function (dbs) {
        return Promise.resolve(dbs.attachments.get(attachmentMapKey(documentId, attachmentId))).then(function (attachment) {
          return attachment.data;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    try {
      var _this10 = this;
      var _require = require('foundationdb'),
        keySelector = _require.keySelector,
        StreamingMode = _require.StreamingMode;
      return Promise.resolve(_this10.internals.dbsPromise).then(function (dbs) {
        var index = ['_meta.lwt', _this10.primaryPath];
        var indexName = getFoundationDBIndexName(index);
        var indexMeta = dbs.indexes[indexName];
        var lowerBoundString = '';
        if (checkpoint) {
          var _checkpointPartialDoc;
          var checkpointPartialDoc = (_checkpointPartialDoc = {}, _checkpointPartialDoc[_this10.primaryPath] = checkpoint.id, _checkpointPartialDoc._meta = {
            lwt: checkpoint.lwt
          }, _checkpointPartialDoc);
          lowerBoundString = indexMeta.getIndexableString(checkpointPartialDoc);
        }
        return Promise.resolve(dbs.root.doTransaction(function (tx) {
          try {
            var innerResult = [];
            var indexTx = tx.at(indexMeta.db.subspace);
            var mainTx = tx.at(dbs.main.subspace);
            return Promise.resolve(indexTx.getRangeAll(keySelector.firstGreaterThan(lowerBoundString), INDEX_MAX, {
              limit: limit,
              streamingMode: StreamingMode.Exact
            })).then(function (range) {
              var docIds = range.map(function (row) {
                return row[1];
              });
              return Promise.resolve(Promise.all(docIds.map(function (docId) {
                return mainTx.get(docId);
              }))).then(function (docsData) {
                innerResult = innerResult.concat(docsData);
                return innerResult;
              });
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function (result) {
          var lastDoc = lastOfArray(result);
          return {
            documents: result,
            checkpoint: lastDoc ? {
              id: lastDoc[_this10.primaryPath],
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
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.remove = function remove() {
    try {
      var _this12 = this;
      return Promise.resolve(_this12.internals.dbsPromise).then(function (dbs) {
        return Promise.resolve(dbs.root.doTransaction(function (tx) {
          tx.clearRange('', INDEX_MAX);
          return PROMISE_RESOLVE_VOID;
        })).then(function () {
          return _this12.close();
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.cleanup = function cleanup(minimumDeletedTime) {
    try {
      var _this14 = this;
      var _require2 = require('foundationdb'),
        keySelector = _require2.keySelector,
        StreamingMode = _require2.StreamingMode;
      var maxDeletionTime = now() - minimumDeletedTime;
      return Promise.resolve(_this14.internals.dbsPromise).then(function (dbs) {
        var index = CLEANUP_INDEX;
        var indexName = getFoundationDBIndexName(index);
        var indexMeta = dbs.indexes[indexName];
        var lowerBoundString = getStartIndexStringFromLowerBound(_this14.schema, index, [true,
        /**
         * Do not use 0 here,
         * because 1 is the minimum value for _meta.lwt
         */
        1], false);
        var upperBoundString = getStartIndexStringFromUpperBound(_this14.schema, index, [true, maxDeletionTime], true);
        var noMoreUndeleted = true;
        return Promise.resolve(dbs.root.doTransaction(function (tx) {
          try {
            var batchSize = ensureNotFalsy(_this14.settings.batchSize);
            var indexTx = tx.at(indexMeta.db.subspace);
            var mainTx = tx.at(dbs.main.subspace);
            return Promise.resolve(indexTx.getRangeAll(keySelector.firstGreaterThan(lowerBoundString), upperBoundString, {
              limit: batchSize + 1,
              // get one more extra to detect what to return from cleanup()
              streamingMode: StreamingMode.Exact
            })).then(function (range) {
              if (range.length > batchSize) {
                noMoreUndeleted = false;
                range.pop();
              }
              var docIds = range.map(function (row) {
                return row[1];
              });
              return Promise.resolve(Promise.all(docIds.map(function (docId) {
                return mainTx.get(docId);
              }))).then(function (docsData) {
                Object.values(dbs.indexes).forEach(function (indexMetaInner) {
                  var subIndexDB = tx.at(indexMetaInner.db.subspace);
                  docsData.forEach(function (docData) {
                    var indexString = indexMetaInner.getIndexableString(docData);
                    subIndexDB["delete"](indexString);
                  });
                });
                docIds.forEach(function (id) {
                  return mainTx["delete"](id);
                });
              });
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function () {
          return noMoreUndeleted;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new Subject().asObservable();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return PROMISE_RESOLVE_VOID;
  };
  _proto.close = function close() {
    try {
      var _this16 = this;
      if (_this16.closed) {
        return Promise.reject(newRxError('SNH', {
          database: _this16.databaseName,
          collection: _this16.collectionName
        }));
      }
      _this16.closed = true;
      _this16.changes$.complete();
      return Promise.resolve(_this16.internals.dbsPromise).then(function (dbs) {
        dbs.root.close();

        // TODO shouldn't we close the index databases?
        // Object.values(dbs.indexes).forEach(db => db.close());
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return RxStorageInstanceFoundationDB;
}();
export function createFoundationDBStorageInstance(storage, params, settings) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
  var _require3 = require('foundationdb'),
    open = _require3.open,
    directory = _require3.directory,
    encoders = _require3.encoders;
  var connection = open(settings.clusterFile);
  var dbsPromise = function () {
    try {
      return Promise.resolve(directory.createOrOpen(connection, 'rxdb')).then(function (dir) {
        var root = connection.at(dir).at(params.databaseName + '.').at(params.collectionName + '.').at(params.schema.version + '.');
        var main = root.at('main.').withKeyEncoding(encoders.string) // automatically encode & decode keys using tuples
        .withValueEncoding(encoders.json); // and values using JSON

        var events = root.at('events.').withKeyEncoding(encoders.string).withValueEncoding(encoders.json);
        var attachments = root.at('attachments.').withKeyEncoding(encoders.string).withValueEncoding(encoders.json);
        var indexDBs = {};
        var useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
        useIndexes.push([primaryPath]);
        var useIndexesFinal = useIndexes.map(function (index) {
          var indexAr = Array.isArray(index) ? index.slice(0) : [index];
          indexAr.unshift('_deleted');
          return indexAr;
        });
        // used for `getChangedDocumentsSince()`
        useIndexesFinal.push(['_meta.lwt', primaryPath]);
        useIndexesFinal.push(CLEANUP_INDEX);
        useIndexesFinal.forEach(function (indexAr) {
          var indexName = getFoundationDBIndexName(indexAr);
          var indexDB = root.at(indexName + '.').withKeyEncoding(encoders.string).withValueEncoding(encoders.string);
          indexDBs[indexName] = {
            indexName: indexName,
            db: indexDB,
            getIndexableString: getIndexableStringMonad(params.schema, indexAr),
            index: indexAr
          };
        });
        return {
          root: root,
          main: main,
          events: events,
          attachments: attachments,
          indexes: indexDBs
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }();
  var internals = {
    connection: connection,
    dbsPromise: dbsPromise
  };
  var instance = new RxStorageInstanceFoundationDB(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  return Promise.resolve(instance);
}
//# sourceMappingURL=rx-storage-instance-foundationdb.js.map