"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrapRxStorageInstance = wrapRxStorageInstance;
exports.wrappedValidateStorageFactory = wrappedValidateStorageFactory;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _operators = require("rxjs/operators");
var _rxSchemaHelper = require("./rx-schema-helper");
var _util = require("./util");
/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var VALIDATOR_CACHE_BY_VALIDATOR_KEY = new Map();

/**
 * This factory is used in the validation plugins
 * so that we can reuse the basic storage wrapping code.
 */
function wrappedValidateStorageFactory(
/**
 * Returns a method that can be used to validate
 * documents and throws when the document is not valid.
 */
getValidator,
/**
 * A string to identify the validation library.
 */
validatorKey) {
  if (!VALIDATOR_CACHE_BY_VALIDATOR_KEY.has(validatorKey)) {
    VALIDATOR_CACHE_BY_VALIDATOR_KEY.set(validatorKey, new Map());
  }
  var VALIDATOR_CACHE = (0, _util.getFromMapOrThrow)(VALIDATOR_CACHE_BY_VALIDATOR_KEY, validatorKey);
  function initValidator(schema) {
    var hash = (0, _util.fastUnsecureHash)(JSON.stringify(schema));
    if (!VALIDATOR_CACHE.has(hash)) {
      var validator = getValidator(schema);
      VALIDATOR_CACHE.set(hash, validator);
      return validator;
    }
    return (0, _util.getFromMapOrThrow)(VALIDATOR_CACHE, hash);
  }
  return function (args) {
    return Object.assign({}, args.storage, {
      createStorageInstance: function () {
        var _createStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(params) {
          var instance, primaryPath, validatorCached, oldBulkWrite;
          return _regenerator["default"].wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return args.storage.createStorageInstance(params);
              case 2:
                instance = _context.sent;
                primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(params.schema.primaryKey);
                /**
                 * Lazy initialize the validator
                 * to save initial page load performance.
                 * Some libraries take really long to initialize the validator
                 * from the schema.
                 */
                (0, _util.requestIdleCallbackIfAvailable)(function () {
                  return validatorCached = initValidator(params.schema);
                });
                oldBulkWrite = instance.bulkWrite.bind(instance);
                instance.bulkWrite = function (documentWrites, context) {
                  if (!validatorCached) {
                    validatorCached = initValidator(params.schema);
                  }
                  var errors = [];
                  var continueWrites = [];
                  documentWrites.forEach(function (row) {
                    var documentId = row.document[primaryPath];
                    var validationErrors = validatorCached(row.document);
                    if (validationErrors.length > 0) {
                      errors.push({
                        status: 422,
                        isError: true,
                        documentId: documentId,
                        writeRow: row,
                        validationErrors: validationErrors
                      });
                    } else {
                      continueWrites.push(row);
                    }
                  });
                  var writePromise = continueWrites.length > 0 ? oldBulkWrite(continueWrites, context) : Promise.resolve({
                    error: {},
                    success: {}
                  });
                  return writePromise.then(function (writeResult) {
                    errors.forEach(function (validationError) {
                      writeResult.error[validationError.documentId] = validationError;
                    });
                    return writeResult;
                  });
                };
                return _context.abrupt("return", instance);
              case 8:
              case "end":
                return _context.stop();
            }
          }, _callee);
        }));
        function createStorageInstance(_x) {
          return _createStorageInstance.apply(this, arguments);
        }
        return createStorageInstance;
      }()
    });
  };
}

/**
 * Used in plugins to easily modify all in- and outgoing
 * data of that storage instance.
 */
function wrapRxStorageInstance(instance, modifyToStorage, modifyFromStorage) {
  var modifyAttachmentFromStorage = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (v) {
    return v;
  };
  function toStorage(_x2) {
    return _toStorage.apply(this, arguments);
  }
  function _toStorage() {
    _toStorage = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee11(docData) {
      return _regenerator["default"].wrap(function _callee11$(_context11) {
        while (1) switch (_context11.prev = _context11.next) {
          case 0:
            if (docData) {
              _context11.next = 2;
              break;
            }
            return _context11.abrupt("return", docData);
          case 2:
            _context11.next = 4;
            return modifyToStorage(docData);
          case 4:
            return _context11.abrupt("return", _context11.sent);
          case 5:
          case "end":
            return _context11.stop();
        }
      }, _callee11);
    }));
    return _toStorage.apply(this, arguments);
  }
  function fromStorage(_x3) {
    return _fromStorage.apply(this, arguments);
  }
  function _fromStorage() {
    _fromStorage = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee12(docData) {
      return _regenerator["default"].wrap(function _callee12$(_context12) {
        while (1) switch (_context12.prev = _context12.next) {
          case 0:
            if (docData) {
              _context12.next = 2;
              break;
            }
            return _context12.abrupt("return", docData);
          case 2:
            _context12.next = 4;
            return modifyFromStorage(docData);
          case 4:
            return _context12.abrupt("return", _context12.sent);
          case 5:
          case "end":
            return _context12.stop();
        }
      }, _callee12);
    }));
    return _fromStorage.apply(this, arguments);
  }
  function errorFromStorage(_x4) {
    return _errorFromStorage.apply(this, arguments);
  }
  function _errorFromStorage() {
    _errorFromStorage = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee13(error) {
      var ret;
      return _regenerator["default"].wrap(function _callee13$(_context13) {
        while (1) switch (_context13.prev = _context13.next) {
          case 0:
            ret = (0, _util.flatClone)(error);
            ret.writeRow = (0, _util.flatClone)(ret.writeRow);
            if (!ret.documentInDb) {
              _context13.next = 6;
              break;
            }
            _context13.next = 5;
            return fromStorage(ret.documentInDb);
          case 5:
            ret.documentInDb = _context13.sent;
          case 6:
            if (!ret.writeRow.previous) {
              _context13.next = 10;
              break;
            }
            _context13.next = 9;
            return fromStorage(ret.writeRow.previous);
          case 9:
            ret.writeRow.previous = _context13.sent;
          case 10:
            _context13.next = 12;
            return fromStorage(ret.writeRow.document);
          case 12:
            ret.writeRow.document = _context13.sent;
            return _context13.abrupt("return", ret);
          case 14:
          case "end":
            return _context13.stop();
        }
      }, _callee13);
    }));
    return _errorFromStorage.apply(this, arguments);
  }
  var wrappedInstance = {
    databaseName: instance.databaseName,
    internals: instance.internals,
    cleanup: instance.cleanup.bind(instance),
    options: instance.options,
    close: instance.close.bind(instance),
    schema: instance.schema,
    collectionName: instance.collectionName,
    count: instance.count.bind(instance),
    remove: instance.remove.bind(instance),
    originalStorageInstance: instance,
    bulkWrite: function () {
      var _bulkWrite = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(documentWrites, context) {
        var useRows, writeResult, ret, promises;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              useRows = [];
              _context3.next = 3;
              return Promise.all(documentWrites.map( /*#__PURE__*/function () {
                var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(row) {
                  var _yield$Promise$all, previous, document;
                  return _regenerator["default"].wrap(function _callee2$(_context2) {
                    while (1) switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.next = 2;
                        return Promise.all([row.previous ? toStorage(row.previous) : undefined, toStorage(row.document)]);
                      case 2:
                        _yield$Promise$all = _context2.sent;
                        previous = _yield$Promise$all[0];
                        document = _yield$Promise$all[1];
                        useRows.push({
                          previous: previous,
                          document: document
                        });
                      case 6:
                      case "end":
                        return _context2.stop();
                    }
                  }, _callee2);
                }));
                return function (_x7) {
                  return _ref.apply(this, arguments);
                };
              }()));
            case 3:
              _context3.next = 5;
              return instance.bulkWrite(useRows, context);
            case 5:
              writeResult = _context3.sent;
              ret = {
                success: {},
                error: {}
              };
              promises = [];
              Object.entries(writeResult.success).forEach(function (_ref2) {
                var k = _ref2[0],
                  v = _ref2[1];
                promises.push(fromStorage(v).then(function (v2) {
                  return ret.success[k] = v2;
                }));
              });
              Object.entries(writeResult.error).forEach(function (_ref3) {
                var k = _ref3[0],
                  error = _ref3[1];
                promises.push(errorFromStorage(error).then(function (err) {
                  return ret.error[k] = err;
                }));
              });
              _context3.next = 12;
              return Promise.all(promises);
            case 12:
              return _context3.abrupt("return", ret);
            case 13:
            case "end":
              return _context3.stop();
          }
        }, _callee3);
      }));
      function bulkWrite(_x5, _x6) {
        return _bulkWrite.apply(this, arguments);
      }
      return bulkWrite;
    }(),
    query: function query(preparedQuery) {
      return instance.query(preparedQuery).then(function (queryResult) {
        return Promise.all(queryResult.documents.map(function (doc) {
          return fromStorage(doc);
        }));
      }).then(function (documents) {
        return {
          documents: documents
        };
      });
    },
    getAttachmentData: function () {
      var _getAttachmentData = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(documentId, attachmentId) {
        var data;
        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 2;
              return instance.getAttachmentData(documentId, attachmentId);
            case 2:
              data = _context4.sent;
              _context4.next = 5;
              return modifyAttachmentFromStorage(data);
            case 5:
              data = _context4.sent;
              return _context4.abrupt("return", data);
            case 7:
            case "end":
              return _context4.stop();
          }
        }, _callee4);
      }));
      function getAttachmentData(_x8, _x9) {
        return _getAttachmentData.apply(this, arguments);
      }
      return getAttachmentData;
    }(),
    findDocumentsById: function findDocumentsById(ids, deleted) {
      return instance.findDocumentsById(ids, deleted).then( /*#__PURE__*/function () {
        var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(findResult) {
          var ret;
          return _regenerator["default"].wrap(function _callee6$(_context6) {
            while (1) switch (_context6.prev = _context6.next) {
              case 0:
                ret = {};
                _context6.next = 3;
                return Promise.all(Object.entries(findResult).map( /*#__PURE__*/function () {
                  var _ref6 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(_ref5) {
                    var key, doc;
                    return _regenerator["default"].wrap(function _callee5$(_context5) {
                      while (1) switch (_context5.prev = _context5.next) {
                        case 0:
                          key = _ref5[0], doc = _ref5[1];
                          _context5.next = 3;
                          return fromStorage(doc);
                        case 3:
                          ret[key] = _context5.sent;
                        case 4:
                        case "end":
                          return _context5.stop();
                      }
                    }, _callee5);
                  }));
                  return function (_x11) {
                    return _ref6.apply(this, arguments);
                  };
                }()));
              case 3:
                return _context6.abrupt("return", ret);
              case 4:
              case "end":
                return _context6.stop();
            }
          }, _callee6);
        }));
        return function (_x10) {
          return _ref4.apply(this, arguments);
        };
      }());
    },
    getChangedDocumentsSince: function getChangedDocumentsSince(limit, checkpoint) {
      return instance.getChangedDocumentsSince(limit, checkpoint).then( /*#__PURE__*/function () {
        var _ref7 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(result) {
          return _regenerator["default"].wrap(function _callee7$(_context7) {
            while (1) switch (_context7.prev = _context7.next) {
              case 0:
                _context7.t0 = result.checkpoint;
                _context7.next = 3;
                return Promise.all(result.documents.map(function (d) {
                  return fromStorage(d);
                }));
              case 3:
                _context7.t1 = _context7.sent;
                return _context7.abrupt("return", {
                  checkpoint: _context7.t0,
                  documents: _context7.t1
                });
              case 5:
              case "end":
                return _context7.stop();
            }
          }, _callee7);
        }));
        return function (_x12) {
          return _ref7.apply(this, arguments);
        };
      }());
    },
    changeStream: function changeStream() {
      return instance.changeStream().pipe((0, _operators.mergeMap)( /*#__PURE__*/function () {
        var _ref8 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(eventBulk) {
          var useEvents, ret;
          return _regenerator["default"].wrap(function _callee9$(_context9) {
            while (1) switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return Promise.all(eventBulk.events.map( /*#__PURE__*/function () {
                  var _ref9 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(event) {
                    var _yield$Promise$all2, documentData, previousDocumentData, ev;
                    return _regenerator["default"].wrap(function _callee8$(_context8) {
                      while (1) switch (_context8.prev = _context8.next) {
                        case 0:
                          _context8.next = 2;
                          return Promise.all([fromStorage(event.documentData), fromStorage(event.previousDocumentData)]);
                        case 2:
                          _yield$Promise$all2 = _context8.sent;
                          documentData = _yield$Promise$all2[0];
                          previousDocumentData = _yield$Promise$all2[1];
                          ev = {
                            operation: event.operation,
                            eventId: event.eventId,
                            documentId: event.documentId,
                            endTime: event.endTime,
                            startTime: event.startTime,
                            documentData: documentData,
                            previousDocumentData: previousDocumentData,
                            isLocal: false
                          };
                          return _context8.abrupt("return", ev);
                        case 7:
                        case "end":
                          return _context8.stop();
                      }
                    }, _callee8);
                  }));
                  return function (_x14) {
                    return _ref9.apply(this, arguments);
                  };
                }()));
              case 2:
                useEvents = _context9.sent;
                ret = {
                  id: eventBulk.id,
                  events: useEvents,
                  checkpoint: eventBulk.checkpoint,
                  context: eventBulk.context
                };
                return _context9.abrupt("return", ret);
              case 5:
              case "end":
                return _context9.stop();
            }
          }, _callee9);
        }));
        return function (_x13) {
          return _ref8.apply(this, arguments);
        };
      }()));
    },
    conflictResultionTasks: function conflictResultionTasks() {
      return instance.conflictResultionTasks().pipe((0, _operators.mergeMap)( /*#__PURE__*/function () {
        var _ref10 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10(task) {
          var assumedMasterState, newDocumentState, realMasterState;
          return _regenerator["default"].wrap(function _callee10$(_context10) {
            while (1) switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return fromStorage(task.input.assumedMasterState);
              case 2:
                assumedMasterState = _context10.sent;
                _context10.next = 5;
                return fromStorage(task.input.newDocumentState);
              case 5:
                newDocumentState = _context10.sent;
                _context10.next = 8;
                return fromStorage(task.input.realMasterState);
              case 8:
                realMasterState = _context10.sent;
                return _context10.abrupt("return", {
                  id: task.id,
                  context: task.context,
                  input: {
                    assumedMasterState: assumedMasterState,
                    realMasterState: realMasterState,
                    newDocumentState: newDocumentState
                  }
                });
              case 10:
              case "end":
                return _context10.stop();
            }
          }, _callee10);
        }));
        return function (_x15) {
          return _ref10.apply(this, arguments);
        };
      }()));
    },
    resolveConflictResultionTask: function resolveConflictResultionTask(taskSolution) {
      if (taskSolution.output.isEqual) {
        return instance.resolveConflictResultionTask(taskSolution);
      }
      var useSolution = {
        id: taskSolution.id,
        output: {
          isEqual: false,
          documentData: taskSolution.output.documentData
        }
      };
      return instance.resolveConflictResultionTask(useSolution);
    }
  };
  return wrappedInstance;
}
//# sourceMappingURL=plugin-helpers.js.map