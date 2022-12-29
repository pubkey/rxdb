"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageWorker = exports.RxStorageInstanceWorker = void 0;
exports.getRxStorageWorker = getRxStorageWorker;
exports.removeWorkerRef = removeWorkerRef;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxjs = require("rxjs");
var _threads = require("threads");
var _util = require("../../util");
/**
 * We have no way to detect if a worker is no longer needed.
 * So we create the worker process on the first RxStorageInstance
 * and have to close it again of no more RxStorageInstances are non-closed.
 */
var WORKER_BY_INSTANCE = new Map();
var RxStorageWorker = /*#__PURE__*/function () {
  function RxStorageWorker(settings, statics) {
    this.name = 'worker';
    this.settings = settings;
    this.statics = statics;
  }
  var _proto = RxStorageWorker.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    var _this = this;
    var workerState = WORKER_BY_INSTANCE.get(this);
    if (!workerState) {
      workerState = {
        workerPromise: (0, _threads.spawn)(new _threads.Worker(this.settings.workerInput)),
        refs: new Set()
      };
      WORKER_BY_INSTANCE.set(this, workerState);
    }
    return workerState.workerPromise.then(function (worker) {
      return worker.createStorageInstance(params).then(function (instanceId) {
        var instance = new RxStorageInstanceWorker(_this, params.databaseName, params.collectionName, params.schema, {
          rxStorage: _this,
          instanceId: instanceId,
          worker: worker
        }, params.options);
        (0, _util.ensureNotFalsy)(workerState).refs.add(instance);
        return instance;
      });
    });
  };
  return RxStorageWorker;
}();
exports.RxStorageWorker = RxStorageWorker;
var RxStorageInstanceWorker = /*#__PURE__*/function () {
  /**
   * threads.js uses observable-fns instead of rxjs
   * so we have to transform it.
   */

  function RxStorageInstanceWorker(storage, databaseName, collectionName, schema, internals, options) {
    var _this2 = this;
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
    this.subs.push(this.internals.worker.changeStream(this.internals.instanceId).subscribe(function (ev) {
      return _this2.changes$.next(ev);
    }));
    this.subs.push(this.internals.worker.conflictResultionTasks(this.internals.instanceId).subscribe(function (ev) {
      return _this2.conflicts$.next(ev);
    }));
  }
  var _proto2 = RxStorageInstanceWorker.prototype;
  _proto2.bulkWrite = function bulkWrite(documentWrites, context) {
    return this.internals.worker.bulkWrite(this.internals.instanceId, documentWrites, context);
  };
  _proto2.findDocumentsById = function findDocumentsById(ids, deleted) {
    return this.internals.worker.findDocumentsById(this.internals.instanceId, ids, deleted);
  };
  _proto2.query = function query(preparedQuery) {
    return this.internals.worker.query(this.internals.instanceId, preparedQuery);
  };
  _proto2.count = function count(preparedQuery) {
    return this.internals.worker.count(this.internals.instanceId, preparedQuery);
  };
  _proto2.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    return this.internals.worker.getAttachmentData(this.internals.instanceId, documentId, attachmentId);
  };
  _proto2.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    return this.internals.worker.getChangedDocumentsSince(this.internals.instanceId, limit, checkpoint);
  };
  _proto2.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto2.cleanup = function cleanup(minDeletedTime) {
    return this.internals.worker.cleanup(this.internals.instanceId, minDeletedTime);
  };
  _proto2.close = /*#__PURE__*/function () {
    var _close = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (!this.closed) {
              _context.next = 2;
              break;
            }
            return _context.abrupt("return", Promise.reject(new Error('already closed')));
          case 2:
            this.closed = true;
            this.subs.forEach(function (sub) {
              return sub.unsubscribe();
            });
            _context.next = 6;
            return this.internals.worker.close(this.internals.instanceId);
          case 6:
            _context.next = 8;
            return removeWorkerRef(this);
          case 8:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function close() {
      return _close.apply(this, arguments);
    }
    return close;
  }();
  _proto2.remove = /*#__PURE__*/function () {
    var _remove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return this.internals.worker.remove(this.internals.instanceId);
          case 2:
            this.closed = true;
            _context2.next = 5;
            return removeWorkerRef(this);
          case 5:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
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
    var _resolveConflictResultionTask = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(taskSolution) {
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return this.internals.worker.resolveConflictResultionTask(this.internals.instanceId, taskSolution);
          case 2:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function resolveConflictResultionTask(_x) {
      return _resolveConflictResultionTask.apply(this, arguments);
    }
    return resolveConflictResultionTask;
  }();
  return RxStorageInstanceWorker;
}();
exports.RxStorageInstanceWorker = RxStorageInstanceWorker;
function getRxStorageWorker(settings) {
  var storage = new RxStorageWorker(settings, settings.statics);
  return storage;
}

/**
 * TODO we have a bug.
 * When the exact same RxStorage opens and closes
 * many RxStorage instances, then it might happen
 * that some calls to createStorageInstance() time out,
 * because the worker thread is in the closing state.
 */
function removeWorkerRef(_x2) {
  return _removeWorkerRef.apply(this, arguments);
}
function _removeWorkerRef() {
  _removeWorkerRef = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(instance) {
    var workerState;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          workerState = (0, _util.getFromMapOrThrow)(WORKER_BY_INSTANCE, instance.storage);
          workerState.refs["delete"](instance);
          if (!(workerState.refs.size === 0)) {
            _context4.next = 6;
            break;
          }
          WORKER_BY_INSTANCE["delete"](instance.storage);
          _context4.next = 6;
          return workerState.workerPromise.then(function (worker) {
            return _threads.Thread.terminate(worker);
          });
        case 6:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  }));
  return _removeWorkerRef.apply(this, arguments);
}
//# sourceMappingURL=non-worker.js.map