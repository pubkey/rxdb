"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceDexie = void 0;
exports.createDexieStorageInstance = createDexieStorageInstance;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
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
  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(documentWrites, context) {
      var _this = this;
      var state, ret, documentKeys, categorized, lastState, endTime;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            ensureNotClosed(this);
            _context2.next = 3;
            return this.internals;
          case 3:
            state = _context2.sent;
            ret = {
              success: {},
              error: {}
            };
            documentKeys = documentWrites.map(function (writeRow) {
              return writeRow.document[_this.primaryPath];
            });
            categorized = null;
            _context2.next = 9;
            return state.dexieDb.transaction('rw', state.dexieTable, state.dexieDeletedTable, /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
              var docsInDbMap, docsInDbWithInternals, bulkPutDocs, bulkRemoveDocs, bulkPutDeletedDocs, bulkRemoveDeletedDocs;
              return _regenerator["default"].wrap(function _callee$(_context) {
                while (1) switch (_context.prev = _context.next) {
                  case 0:
                    docsInDbMap = new Map();
                    _context.next = 3;
                    return (0, _dexieHelper.getDocsInDb)(_this.internals, documentKeys);
                  case 3:
                    docsInDbWithInternals = _context.sent;
                    docsInDbWithInternals.forEach(function (docWithDexieInternals) {
                      var doc = docWithDexieInternals ? (0, _dexieHelper.fromDexieToStorage)(docWithDexieInternals) : docWithDexieInternals;
                      if (doc) {
                        docsInDbMap.set(doc[_this.primaryPath], doc);
                      }
                      return doc;
                    });
                    categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(_this, _this.primaryPath, docsInDbMap, documentWrites, context);
                    ret.error = categorized.errors;

                    /**
                     * Batch up the database operations
                     * so we can later run them in bulk.
                     */
                    bulkPutDocs = [];
                    bulkRemoveDocs = [];
                    bulkPutDeletedDocs = [];
                    bulkRemoveDeletedDocs = [];
                    categorized.bulkInsertDocs.forEach(function (row) {
                      var docId = row.document[_this.primaryPath];
                      ret.success[docId] = row.document;
                      bulkPutDocs.push(row.document);
                    });
                    categorized.bulkUpdateDocs.forEach(function (row) {
                      var docId = row.document[_this.primaryPath];
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
                    _context.next = 15;
                    return Promise.all([bulkPutDocs.length > 0 ? state.dexieTable.bulkPut(bulkPutDocs.map(function (d) {
                      return (0, _dexieHelper.fromStorageToDexie)(d);
                    })) : _utils.PROMISE_RESOLVE_VOID, bulkRemoveDocs.length > 0 ? state.dexieTable.bulkDelete(bulkRemoveDocs) : _utils.PROMISE_RESOLVE_VOID, bulkPutDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkPut(bulkPutDeletedDocs.map(function (d) {
                      return (0, _dexieHelper.fromStorageToDexie)(d);
                    })) : _utils.PROMISE_RESOLVE_VOID, bulkRemoveDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkDelete(bulkRemoveDeletedDocs) : _utils.PROMISE_RESOLVE_VOID]);
                  case 15:
                  case "end":
                    return _context.stop();
                }
              }, _callee);
            })));
          case 9:
            if ((0, _utils.ensureNotFalsy)(categorized).eventBulk.events.length > 0) {
              lastState = (0, _rxStorageHelper.getNewestOfDocumentStates)(this.primaryPath, Object.values(ret.success));
              (0, _utils.ensureNotFalsy)(categorized).eventBulk.checkpoint = {
                id: lastState[this.primaryPath],
                lwt: lastState._meta.lwt
              };
              endTime = (0, _utils.now)();
              (0, _utils.ensureNotFalsy)(categorized).eventBulk.events.forEach(function (event) {
                return event.endTime = endTime;
              });
              this.changes$.next((0, _utils.ensureNotFalsy)(categorized).eventBulk);
            }
            return _context2.abrupt("return", ret);
          case 11:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function bulkWrite(_x, _x2) {
      return _bulkWrite.apply(this, arguments);
    }
    return bulkWrite;
  }();
  _proto.findDocumentsById = /*#__PURE__*/function () {
    var _findDocumentsById = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(ids, deleted) {
      var _this2 = this;
      var state, ret;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            ensureNotClosed(this);
            _context4.next = 3;
            return this.internals;
          case 3:
            state = _context4.sent;
            ret = {};
            _context4.next = 7;
            return state.dexieDb.transaction('r', state.dexieTable, state.dexieDeletedTable, /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
              var docsInDb;
              return _regenerator["default"].wrap(function _callee3$(_context3) {
                while (1) switch (_context3.prev = _context3.next) {
                  case 0:
                    if (!deleted) {
                      _context3.next = 6;
                      break;
                    }
                    _context3.next = 3;
                    return (0, _dexieHelper.getDocsInDb)(_this2.internals, ids);
                  case 3:
                    docsInDb = _context3.sent;
                    _context3.next = 9;
                    break;
                  case 6:
                    _context3.next = 8;
                    return state.dexieTable.bulkGet(ids);
                  case 8:
                    docsInDb = _context3.sent;
                  case 9:
                    ids.forEach(function (id, idx) {
                      var documentInDb = docsInDb[idx];
                      if (documentInDb && (!documentInDb._deleted || deleted)) {
                        ret[id] = (0, _dexieHelper.fromDexieToStorage)(documentInDb);
                      }
                    });
                  case 10:
                  case "end":
                    return _context3.stop();
                }
              }, _callee3);
            })));
          case 7:
            return _context4.abrupt("return", ret);
          case 8:
          case "end":
            return _context4.stop();
        }
      }, _callee4, this);
    }));
    function findDocumentsById(_x3, _x4) {
      return _findDocumentsById.apply(this, arguments);
    }
    return findDocumentsById;
  }();
  _proto.query = function query(preparedQuery) {
    ensureNotClosed(this);
    return (0, _dexieQuery.dexieQuery)(this, preparedQuery);
  };
  _proto.count = /*#__PURE__*/function () {
    var _count = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(preparedQuery) {
      var result;
      return _regenerator["default"].wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return (0, _dexieQuery.dexieCount)(this, preparedQuery);
          case 2:
            result = _context5.sent;
            return _context5.abrupt("return", {
              count: result,
              mode: 'fast'
            });
          case 4:
          case "end":
            return _context5.stop();
        }
      }, _callee5, this);
    }));
    function count(_x5) {
      return _count.apply(this, arguments);
    }
    return count;
  }();
  _proto.getChangedDocumentsSince = /*#__PURE__*/function () {
    var _getChangedDocumentsSince = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(limit, checkpoint) {
      var _this3 = this;
      var sinceLwt, sinceId, state, _yield$Promise$all, changedDocsNormal, changedDocsDeleted, changedDocs, lastDoc;
      return _regenerator["default"].wrap(function _callee7$(_context7) {
        while (1) switch (_context7.prev = _context7.next) {
          case 0:
            ensureNotClosed(this);
            sinceLwt = checkpoint ? checkpoint.lwt : _utils.RX_META_LWT_MINIMUM;
            sinceId = checkpoint ? checkpoint.id : '';
            _context7.next = 5;
            return this.internals;
          case 5:
            state = _context7.sent;
            _context7.next = 8;
            return Promise.all([state.dexieTable, state.dexieDeletedTable].map( /*#__PURE__*/function () {
              var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(table) {
                var query, changedDocuments;
                return _regenerator["default"].wrap(function _callee6$(_context6) {
                  while (1) switch (_context6.prev = _context6.next) {
                    case 0:
                      query = table.where('[_meta.lwt+' + _this3.primaryPath + ']').above([sinceLwt, sinceId]).limit(limit);
                      _context6.next = 3;
                      return query.toArray();
                    case 3:
                      changedDocuments = _context6.sent;
                      return _context6.abrupt("return", changedDocuments.map(function (d) {
                        return (0, _dexieHelper.fromDexieToStorage)(d);
                      }));
                    case 5:
                    case "end":
                      return _context6.stop();
                  }
                }, _callee6);
              }));
              return function (_x8) {
                return _ref3.apply(this, arguments);
              };
            }()));
          case 8:
            _yield$Promise$all = _context7.sent;
            changedDocsNormal = _yield$Promise$all[0];
            changedDocsDeleted = _yield$Promise$all[1];
            changedDocs = changedDocsNormal.concat(changedDocsDeleted);
            changedDocs = (0, _utils.sortDocumentsByLastWriteTime)(this.primaryPath, changedDocs);
            changedDocs = changedDocs.slice(0, limit);
            lastDoc = (0, _utils.lastOfArray)(changedDocs);
            return _context7.abrupt("return", {
              documents: changedDocs,
              checkpoint: lastDoc ? {
                id: lastDoc[this.primaryPath],
                lwt: lastDoc._meta.lwt
              } : checkpoint ? checkpoint : {
                id: '',
                lwt: 0
              }
            });
          case 16:
          case "end":
            return _context7.stop();
        }
      }, _callee7, this);
    }));
    function getChangedDocumentsSince(_x6, _x7) {
      return _getChangedDocumentsSince.apply(this, arguments);
    }
    return getChangedDocumentsSince;
  }();
  _proto.remove = /*#__PURE__*/function () {
    var _remove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8() {
      var state;
      return _regenerator["default"].wrap(function _callee8$(_context8) {
        while (1) switch (_context8.prev = _context8.next) {
          case 0:
            ensureNotClosed(this);
            _context8.next = 3;
            return this.internals;
          case 3:
            state = _context8.sent;
            _context8.next = 6;
            return Promise.all([state.dexieDeletedTable.clear(), state.dexieTable.clear()]);
          case 6:
            return _context8.abrupt("return", this.close());
          case 7:
          case "end":
            return _context8.stop();
        }
      }, _callee8, this);
    }));
    function remove() {
      return _remove.apply(this, arguments);
    }
    return remove;
  }();
  _proto.changeStream = function changeStream() {
    ensureNotClosed(this);
    return this.changes$.asObservable();
  };
  _proto.cleanup = /*#__PURE__*/function () {
    var _cleanup = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10(minimumDeletedTime) {
      var _this4 = this;
      var state;
      return _regenerator["default"].wrap(function _callee10$(_context10) {
        while (1) switch (_context10.prev = _context10.next) {
          case 0:
            ensureNotClosed(this);
            _context10.next = 3;
            return this.internals;
          case 3:
            state = _context10.sent;
            _context10.next = 6;
            return state.dexieDb.transaction('rw', state.dexieDeletedTable, /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9() {
              var maxDeletionTime, toRemove, removeIds;
              return _regenerator["default"].wrap(function _callee9$(_context9) {
                while (1) switch (_context9.prev = _context9.next) {
                  case 0:
                    maxDeletionTime = (0, _utils.now)() - minimumDeletedTime;
                    _context9.next = 3;
                    return state.dexieDeletedTable.where('_meta.lwt').below(maxDeletionTime).toArray();
                  case 3:
                    toRemove = _context9.sent;
                    removeIds = toRemove.map(function (doc) {
                      return doc[_this4.primaryPath];
                    });
                    _context9.next = 7;
                    return state.dexieDeletedTable.bulkDelete(removeIds);
                  case 7:
                  case "end":
                    return _context9.stop();
                }
              }, _callee9);
            })));
          case 6:
            return _context10.abrupt("return", true);
          case 7:
          case "end":
            return _context10.stop();
        }
      }, _callee10, this);
    }));
    function cleanup(_x9) {
      return _cleanup.apply(this, arguments);
    }
    return cleanup;
  }();
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
  _proto.resolveConflictResultionTask = /*#__PURE__*/function () {
    var _resolveConflictResultionTask = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee11(_taskSolution) {
      return _regenerator["default"].wrap(function _callee11$(_context11) {
        while (1) switch (_context11.prev = _context11.next) {
          case 0:
          case "end":
            return _context11.stop();
        }
      }, _callee11);
    }));
    function resolveConflictResultionTask(_x10) {
      return _resolveConflictResultionTask.apply(this, arguments);
    }
    return resolveConflictResultionTask;
  }();
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