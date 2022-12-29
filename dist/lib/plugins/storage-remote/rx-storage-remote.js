"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageRemote = exports.RxStorageInstanceRemote = void 0;
exports.getRxStorageRemote = getRxStorageRemote;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _eventReduceJs = require("event-reduce-js");
var _rxjs = require("rxjs");
var _util = require("../../util");
var RxStorageRemote = /*#__PURE__*/function () {
  function RxStorageRemote(settings) {
    this.name = 'remote';
    this.requestIdSeed = (0, _util.randomCouchString)(10);
    this.lastRequestId = 0;
    this.settings = settings;
    this.statics = settings.statics;
  }
  var _proto = RxStorageRemote.prototype;
  _proto.getRequestId = function getRequestId() {
    var newId = this.lastRequestId++;
    return this.requestIdSeed + '|' + newId;
  };
  _proto.createStorageInstance = /*#__PURE__*/function () {
    var _createStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(params) {
      var requestId, waitForOkPromise, waitForOkResult;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            requestId = this.getRequestId();
            waitForOkPromise = (0, _rxjs.firstValueFrom)(this.settings.messages$.pipe((0, _rxjs.filter)(function (msg) {
              return msg.answerTo === requestId;
            })));
            this.settings.send({
              connectionId: this.getRequestId(),
              method: 'create',
              requestId: requestId,
              params: params
            });
            _context.next = 5;
            return waitForOkPromise;
          case 5:
            waitForOkResult = _context.sent;
            if (!waitForOkResult.error) {
              _context.next = 8;
              break;
            }
            throw new Error('could not create instance ' + JSON.stringify(waitForOkResult.error));
          case 8:
            return _context.abrupt("return", new RxStorageInstanceRemote(this, params.databaseName, params.collectionName, params.schema, {
              params: params,
              connectionId: (0, _eventReduceJs.ensureNotFalsy)(waitForOkResult.connectionId)
            }, params.options));
          case 9:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function createStorageInstance(_x) {
      return _createStorageInstance.apply(this, arguments);
    }
    return createStorageInstance;
  }();
  return RxStorageRemote;
}();
exports.RxStorageRemote = RxStorageRemote;
var RxStorageInstanceRemote = /*#__PURE__*/function () {
  function RxStorageInstanceRemote(storage, databaseName, collectionName, schema, internals, options) {
    var _this = this;
    this.changes$ = new _rxjs.Subject();
    this.conflicts$ = new _rxjs.Subject();
    this.subs = [];
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.messages$ = this.storage.settings.messages$.pipe((0, _rxjs.filter)(function (msg) {
      return msg.connectionId === _this.internals.connectionId;
    }));
    this.subs.push(this.messages$.subscribe(function (msg) {
      if (msg.method === 'changeStream') {
        _this.changes$.next(msg["return"]);
      }
      if (msg.method === 'conflictResultionTasks') {
        _this.conflicts$.next(msg["return"]);
      }
    }));
  }
  var _proto2 = RxStorageInstanceRemote.prototype;
  _proto2.requestRemote = /*#__PURE__*/function () {
    var _requestRemote = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(methodName, params) {
      var requestId, responsePromise, message, response;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            requestId = this.storage.getRequestId();
            responsePromise = (0, _rxjs.firstValueFrom)(this.messages$.pipe((0, _rxjs.filter)(function (msg) {
              return msg.answerTo === requestId;
            })));
            message = {
              connectionId: this.internals.connectionId,
              requestId: requestId,
              method: methodName,
              params: params
            };
            this.storage.settings.send(message);
            _context2.next = 6;
            return responsePromise;
          case 6:
            response = _context2.sent;
            if (!response.error) {
              _context2.next = 11;
              break;
            }
            throw new Error('could not requestRemote: ' + JSON.stringify(response.error));
          case 11:
            return _context2.abrupt("return", response["return"]);
          case 12:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function requestRemote(_x2, _x3) {
      return _requestRemote.apply(this, arguments);
    }
    return requestRemote;
  }();
  _proto2.bulkWrite = function bulkWrite(documentWrites, context) {
    return this.requestRemote('bulkWrite', [documentWrites, context]);
  };
  _proto2.findDocumentsById = function findDocumentsById(ids, deleted) {
    return this.requestRemote('findDocumentsById', [ids, deleted]);
  };
  _proto2.query = function query(preparedQuery) {
    return this.requestRemote('query', [preparedQuery]);
  };
  _proto2.count = function count(preparedQuery) {
    return this.requestRemote('count', [preparedQuery]);
  };
  _proto2.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    return this.requestRemote('getAttachmentData', [documentId, attachmentId]);
  };
  _proto2.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    return this.requestRemote('getChangedDocumentsSince', [limit, checkpoint]);
  };
  _proto2.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto2.cleanup = function cleanup(minDeletedTime) {
    return this.requestRemote('cleanup', [minDeletedTime]);
  };
  _proto2.close = /*#__PURE__*/function () {
    var _close = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            if (!this.closed) {
              _context3.next = 2;
              break;
            }
            return _context3.abrupt("return", Promise.reject(new Error('already closed')));
          case 2:
            this.closed = true;
            this.subs.forEach(function (sub) {
              return sub.unsubscribe();
            });
            this.changes$.complete();
            _context3.next = 7;
            return this.requestRemote('close', []);
          case 7:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function close() {
      return _close.apply(this, arguments);
    }
    return close;
  }();
  _proto2.remove = /*#__PURE__*/function () {
    var _remove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4() {
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            this.closed = true;
            _context4.next = 3;
            return this.requestRemote('remove', []);
          case 3:
          case "end":
            return _context4.stop();
        }
      }, _callee4, this);
    }));
    function remove() {
      return _remove.apply(this, arguments);
    }
    return remove;
  }();
  _proto2.conflictResultionTasks = function conflictResultionTasks() {
    return this.conflicts$;
  };
  _proto2.resolveConflictResultionTask = /*#__PURE__*/function () {
    var _resolveConflictResultionTask = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(taskSolution) {
      return _regenerator["default"].wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return this.requestRemote('resolveConflictResultionTask', [taskSolution]);
          case 2:
          case "end":
            return _context5.stop();
        }
      }, _callee5, this);
    }));
    function resolveConflictResultionTask(_x4) {
      return _resolveConflictResultionTask.apply(this, arguments);
    }
    return resolveConflictResultionTask;
  }();
  return RxStorageInstanceRemote;
}();
exports.RxStorageInstanceRemote = RxStorageInstanceRemote;
function getRxStorageRemote(settings) {
  return new RxStorageRemote(settings);
}
//# sourceMappingURL=rx-storage-remote.js.map