import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
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
import { getIndexableStringMonad, getStartIndexStringFromLowerBound, getStartIndexStringFromUpperBound } from '../../custom-index';
import { ensureNotFalsy, lastOfArray, now, PROMISE_RESOLVE_VOID, toArray } from '../../util';
import { queryFoundationDB } from './foundationdb-query';
import { INDEX_MAX } from '../../query-planner';
import { attachmentMapKey } from '../storage-memory';
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
  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(documentWrites, context) {
      var _this = this;
      var dbs, categorized, result, lastState;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return this.internals.dbsPromise;
          case 2:
            dbs = _context3.sent;
            categorized = null;
            _context3.next = 6;
            return dbs.root.doTransaction( /*#__PURE__*/function () {
              var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(tx) {
                var ret, ids, mainTx, attachmentTx, docsInDB;
                return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) switch (_context2.prev = _context2.next) {
                    case 0:
                      ret = {
                        success: {},
                        error: {}
                      };
                      ids = documentWrites.map(function (row) {
                        return row.document[_this.primaryPath];
                      });
                      mainTx = tx.at(dbs.main.subspace);
                      attachmentTx = tx.at(dbs.attachments.subspace);
                      docsInDB = new Map();
                      /**
                       * TODO this might be faster if fdb
                       * any time adds a bulk-fetch-by-key method.
                       */
                      _context2.next = 7;
                      return Promise.all(ids.map( /*#__PURE__*/function () {
                        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(id) {
                          var doc;
                          return _regeneratorRuntime.wrap(function _callee$(_context) {
                            while (1) switch (_context.prev = _context.next) {
                              case 0:
                                _context.next = 2;
                                return mainTx.get(id);
                              case 2:
                                doc = _context.sent;
                                docsInDB.set(id, doc);
                              case 4:
                              case "end":
                                return _context.stop();
                            }
                          }, _callee);
                        }));
                        return function (_x4) {
                          return _ref2.apply(this, arguments);
                        };
                      }()));
                    case 7:
                      categorized = categorizeBulkWriteRows(_this, _this.primaryPath, docsInDB, documentWrites, context);
                      ret.error = categorized.errors;

                      // INSERTS
                      categorized.bulkInsertDocs.forEach(function (writeRow) {
                        var docId = writeRow.document[_this.primaryPath];
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
                        var docId = writeRow.document[_this.primaryPath];

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
                      return _context2.abrupt("return", ret);
                    case 15:
                    case "end":
                      return _context2.stop();
                  }
                }, _callee2);
              }));
              return function (_x3) {
                return _ref.apply(this, arguments);
              };
            }());
          case 6:
            result = _context3.sent;
            /**
             * The events must be emitted AFTER the transaction
             * has finished.
             * Otherwise an observable changestream might cause a read
             * to a document that does not already exist outside of the transaction.
             */
            if (ensureNotFalsy(categorized).eventBulk.events.length > 0) {
              lastState = getNewestOfDocumentStates(this.primaryPath, Object.values(result.success));
              ensureNotFalsy(categorized).eventBulk.checkpoint = {
                id: lastState[this.primaryPath],
                lwt: lastState._meta.lwt
              };
              this.changes$.next(ensureNotFalsy(categorized).eventBulk);
            }
            return _context3.abrupt("return", result);
          case 9:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function bulkWrite(_x, _x2) {
      return _bulkWrite.apply(this, arguments);
    }
    return bulkWrite;
  }();
  _proto.findDocumentsById = /*#__PURE__*/function () {
    var _findDocumentsById = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(ids, withDeleted) {
      var dbs;
      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return this.internals.dbsPromise;
          case 2:
            dbs = _context6.sent;
            return _context6.abrupt("return", dbs.main.doTransaction( /*#__PURE__*/function () {
              var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(tx) {
                var ret;
                return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                  while (1) switch (_context5.prev = _context5.next) {
                    case 0:
                      ret = {};
                      _context5.next = 3;
                      return Promise.all(ids.map( /*#__PURE__*/function () {
                        var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(docId) {
                          var docInDb;
                          return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                            while (1) switch (_context4.prev = _context4.next) {
                              case 0:
                                _context4.next = 2;
                                return tx.get(docId);
                              case 2:
                                docInDb = _context4.sent;
                                if (docInDb && (!docInDb._deleted || withDeleted)) {
                                  ret[docId] = docInDb;
                                }
                              case 4:
                              case "end":
                                return _context4.stop();
                            }
                          }, _callee4);
                        }));
                        return function (_x8) {
                          return _ref4.apply(this, arguments);
                        };
                      }()));
                    case 3:
                      return _context5.abrupt("return", ret);
                    case 4:
                    case "end":
                      return _context5.stop();
                  }
                }, _callee5);
              }));
              return function (_x7) {
                return _ref3.apply(this, arguments);
              };
            }()));
          case 4:
          case "end":
            return _context6.stop();
        }
      }, _callee6, this);
    }));
    function findDocumentsById(_x5, _x6) {
      return _findDocumentsById.apply(this, arguments);
    }
    return findDocumentsById;
  }();
  _proto.query = function query(preparedQuery) {
    return queryFoundationDB(this, preparedQuery);
  };
  _proto.count = /*#__PURE__*/function () {
    var _count = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(preparedQuery) {
      var result;
      return _regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return this.query(preparedQuery);
          case 2:
            result = _context7.sent;
            return _context7.abrupt("return", {
              count: result.documents.length,
              mode: 'fast'
            });
          case 4:
          case "end":
            return _context7.stop();
        }
      }, _callee7, this);
    }));
    function count(_x9) {
      return _count.apply(this, arguments);
    }
    return count;
  }();
  _proto.getAttachmentData = /*#__PURE__*/function () {
    var _getAttachmentData = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(documentId, attachmentId) {
      var dbs, attachment;
      return _regeneratorRuntime.wrap(function _callee8$(_context8) {
        while (1) switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return this.internals.dbsPromise;
          case 2:
            dbs = _context8.sent;
            _context8.next = 5;
            return dbs.attachments.get(attachmentMapKey(documentId, attachmentId));
          case 5:
            attachment = _context8.sent;
            return _context8.abrupt("return", attachment.data);
          case 7:
          case "end":
            return _context8.stop();
        }
      }, _callee8, this);
    }));
    function getAttachmentData(_x10, _x11) {
      return _getAttachmentData.apply(this, arguments);
    }
    return getAttachmentData;
  }();
  _proto.getChangedDocumentsSince = /*#__PURE__*/function () {
    var _getChangedDocumentsSince = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee10(limit, checkpoint) {
      var _require, keySelector, StreamingMode, dbs, index, indexName, indexMeta, lowerBoundString, _checkpointPartialDoc, checkpointPartialDoc, result, lastDoc;
      return _regeneratorRuntime.wrap(function _callee10$(_context10) {
        while (1) switch (_context10.prev = _context10.next) {
          case 0:
            _require = require('foundationdb'), keySelector = _require.keySelector, StreamingMode = _require.StreamingMode;
            _context10.next = 3;
            return this.internals.dbsPromise;
          case 3:
            dbs = _context10.sent;
            index = ['_meta.lwt', this.primaryPath];
            indexName = getFoundationDBIndexName(index);
            indexMeta = dbs.indexes[indexName];
            lowerBoundString = '';
            if (checkpoint) {
              checkpointPartialDoc = (_checkpointPartialDoc = {}, _checkpointPartialDoc[this.primaryPath] = checkpoint.id, _checkpointPartialDoc._meta = {
                lwt: checkpoint.lwt
              }, _checkpointPartialDoc);
              lowerBoundString = indexMeta.getIndexableString(checkpointPartialDoc);
            }
            _context10.next = 11;
            return dbs.root.doTransaction( /*#__PURE__*/function () {
              var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9(tx) {
                var innerResult, indexTx, mainTx, range, docIds, docsData;
                return _regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) switch (_context9.prev = _context9.next) {
                    case 0:
                      innerResult = [];
                      indexTx = tx.at(indexMeta.db.subspace);
                      mainTx = tx.at(dbs.main.subspace);
                      _context9.next = 5;
                      return indexTx.getRangeAll(keySelector.firstGreaterThan(lowerBoundString), INDEX_MAX, {
                        limit: limit,
                        streamingMode: StreamingMode.Exact
                      });
                    case 5:
                      range = _context9.sent;
                      docIds = range.map(function (row) {
                        return row[1];
                      });
                      _context9.next = 9;
                      return Promise.all(docIds.map(function (docId) {
                        return mainTx.get(docId);
                      }));
                    case 9:
                      docsData = _context9.sent;
                      innerResult = innerResult.concat(docsData);
                      return _context9.abrupt("return", innerResult);
                    case 12:
                    case "end":
                      return _context9.stop();
                  }
                }, _callee9);
              }));
              return function (_x14) {
                return _ref5.apply(this, arguments);
              };
            }());
          case 11:
            result = _context10.sent;
            lastDoc = lastOfArray(result);
            return _context10.abrupt("return", {
              documents: result,
              checkpoint: lastDoc ? {
                id: lastDoc[this.primaryPath],
                lwt: lastDoc._meta.lwt
              } : checkpoint ? checkpoint : {
                id: '',
                lwt: 0
              }
            });
          case 14:
          case "end":
            return _context10.stop();
        }
      }, _callee10, this);
    }));
    function getChangedDocumentsSince(_x12, _x13) {
      return _getChangedDocumentsSince.apply(this, arguments);
    }
    return getChangedDocumentsSince;
  }();
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.remove = /*#__PURE__*/function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee11() {
      var dbs;
      return _regeneratorRuntime.wrap(function _callee11$(_context11) {
        while (1) switch (_context11.prev = _context11.next) {
          case 0:
            _context11.next = 2;
            return this.internals.dbsPromise;
          case 2:
            dbs = _context11.sent;
            _context11.next = 5;
            return dbs.root.doTransaction(function (tx) {
              tx.clearRange('', INDEX_MAX);
              return PROMISE_RESOLVE_VOID;
            });
          case 5:
            return _context11.abrupt("return", this.close());
          case 6:
          case "end":
            return _context11.stop();
        }
      }, _callee11, this);
    }));
    function remove() {
      return _remove.apply(this, arguments);
    }
    return remove;
  }();
  _proto.cleanup = /*#__PURE__*/function () {
    var _cleanup = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee13(minimumDeletedTime) {
      var _this2 = this;
      var _require2, keySelector, StreamingMode, maxDeletionTime, dbs, index, indexName, indexMeta, lowerBoundString, upperBoundString, noMoreUndeleted;
      return _regeneratorRuntime.wrap(function _callee13$(_context13) {
        while (1) switch (_context13.prev = _context13.next) {
          case 0:
            _require2 = require('foundationdb'), keySelector = _require2.keySelector, StreamingMode = _require2.StreamingMode;
            maxDeletionTime = now() - minimumDeletedTime;
            _context13.next = 4;
            return this.internals.dbsPromise;
          case 4:
            dbs = _context13.sent;
            index = CLEANUP_INDEX;
            indexName = getFoundationDBIndexName(index);
            indexMeta = dbs.indexes[indexName];
            lowerBoundString = getStartIndexStringFromLowerBound(this.schema, index, [true,
            /**
             * Do not use 0 here,
             * because 1 is the minimum value for _meta.lwt
             */
            1], false);
            upperBoundString = getStartIndexStringFromUpperBound(this.schema, index, [true, maxDeletionTime], true);
            noMoreUndeleted = true;
            _context13.next = 13;
            return dbs.root.doTransaction( /*#__PURE__*/function () {
              var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee12(tx) {
                var batchSize, indexTx, mainTx, range, docIds, docsData;
                return _regeneratorRuntime.wrap(function _callee12$(_context12) {
                  while (1) switch (_context12.prev = _context12.next) {
                    case 0:
                      batchSize = ensureNotFalsy(_this2.settings.batchSize);
                      indexTx = tx.at(indexMeta.db.subspace);
                      mainTx = tx.at(dbs.main.subspace);
                      _context12.next = 5;
                      return indexTx.getRangeAll(keySelector.firstGreaterThan(lowerBoundString), upperBoundString, {
                        limit: batchSize + 1,
                        // get one more extra to detect what to return from cleanup()
                        streamingMode: StreamingMode.Exact
                      });
                    case 5:
                      range = _context12.sent;
                      if (range.length > batchSize) {
                        noMoreUndeleted = false;
                        range.pop();
                      }
                      docIds = range.map(function (row) {
                        return row[1];
                      });
                      _context12.next = 10;
                      return Promise.all(docIds.map(function (docId) {
                        return mainTx.get(docId);
                      }));
                    case 10:
                      docsData = _context12.sent;
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
                    case 13:
                    case "end":
                      return _context12.stop();
                  }
                }, _callee12);
              }));
              return function (_x16) {
                return _ref6.apply(this, arguments);
              };
            }());
          case 13:
            return _context13.abrupt("return", noMoreUndeleted);
          case 14:
          case "end":
            return _context13.stop();
        }
      }, _callee13, this);
    }));
    function cleanup(_x15) {
      return _cleanup.apply(this, arguments);
    }
    return cleanup;
  }();
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new Subject().asObservable();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return PROMISE_RESOLVE_VOID;
  };
  _proto.close = /*#__PURE__*/function () {
    var _close = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee14() {
      var dbs;
      return _regeneratorRuntime.wrap(function _callee14$(_context14) {
        while (1) switch (_context14.prev = _context14.next) {
          case 0:
            if (!this.closed) {
              _context14.next = 2;
              break;
            }
            return _context14.abrupt("return", Promise.reject(new Error('already closed')));
          case 2:
            this.closed = true;
            this.changes$.complete();
            _context14.next = 6;
            return this.internals.dbsPromise;
          case 6:
            dbs = _context14.sent;
            dbs.root.close();

            // TODO shouldn't we close the index databases?
            // Object.values(dbs.indexes).forEach(db => db.close());
          case 8:
          case "end":
            return _context14.stop();
        }
      }, _callee14, this);
    }));
    function close() {
      return _close.apply(this, arguments);
    }
    return close;
  }();
  return RxStorageInstanceFoundationDB;
}();
export function createFoundationDBStorageInstance(storage, params, settings) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
  var _require3 = require('foundationdb'),
    open = _require3.open,
    directory = _require3.directory,
    encoders = _require3.encoders;
  var connection = open(settings.clusterFile);
  var dbsPromise = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee15() {
    var dir, root, main, events, attachments, indexDBs, useIndexes, useIndexesFinal;
    return _regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) switch (_context15.prev = _context15.next) {
        case 0:
          _context15.next = 2;
          return directory.createOrOpen(connection, 'rxdb');
        case 2:
          dir = _context15.sent;
          root = connection.at(dir).at(params.databaseName + '.').at(params.collectionName + '.').at(params.schema.version + '.');
          main = root.at('main.').withKeyEncoding(encoders.string) // automatically encode & decode keys using tuples
          .withValueEncoding(encoders.json); // and values using JSON
          events = root.at('events.').withKeyEncoding(encoders.string).withValueEncoding(encoders.json);
          attachments = root.at('attachments.').withKeyEncoding(encoders.string).withValueEncoding(encoders.json);
          indexDBs = {};
          useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
          useIndexes.push([primaryPath]);
          useIndexesFinal = useIndexes.map(function (index) {
            var indexAr = toArray(index);
            indexAr.unshift('_deleted');
            return indexAr;
          }); // used for `getChangedDocumentsSince()`
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
          return _context15.abrupt("return", {
            root: root,
            main: main,
            events: events,
            attachments: attachments,
            indexes: indexDBs
          });
        case 15:
        case "end":
          return _context15.stop();
      }
    }, _callee15);
  }))();
  var internals = {
    connection: connection,
    dbsPromise: dbsPromise
  };
  var instance = new RxStorageInstanceFoundationDB(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, settings);
  return Promise.resolve(instance);
}
//# sourceMappingURL=rx-storage-instance-foundationdb.js.map