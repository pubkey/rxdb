"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrappedWorkerRxStorage = wrappedWorkerRxStorage;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _worker = require("threads/worker");
var _util = require("../../util");
/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */

function wrappedWorkerRxStorage(args) {
  var nextId = 0;
  var instanceById = new Map();
  var exposeMe = {
    /**
     * RxStorageInstance
     */
    createStorageInstance: function () {
      var _createStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(params) {
        var instanceId, instance;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              instanceId = nextId++;
              _context.next = 3;
              return args.storage.createStorageInstance(params);
            case 3:
              instance = _context.sent;
              instanceById.set(instanceId, instance);
              return _context.abrupt("return", instanceId);
            case 6:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function createStorageInstance(_x) {
        return _createStorageInstance.apply(this, arguments);
      }
      return createStorageInstance;
    }(),
    bulkWrite: function bulkWrite(instanceId, documentWrites, context) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.bulkWrite(documentWrites, context);
    },
    findDocumentsById: function findDocumentsById(instanceId, ids, deleted) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.findDocumentsById(ids, deleted);
    },
    query: function query(instanceId, preparedQuery) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.query(preparedQuery);
    },
    count: function count(instanceId, preparedQuery) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.count(preparedQuery);
    },
    getAttachmentData: function getAttachmentData(instanceId, documentId, attachmentId) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.getAttachmentData(documentId, attachmentId);
    },
    getChangedDocumentsSince: function getChangedDocumentsSince(instanceId, limit, checkpoint) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.getChangedDocumentsSince(limit, checkpoint);
    },
    changeStream: function changeStream(instanceId) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.changeStream();
    },
    cleanup: function cleanup(instanceId, minDeletedTime) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.cleanup(minDeletedTime);
    },
    close: function close(instanceId) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.close();
    },
    remove: function remove(instanceId) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.remove();
    },
    conflictResultionTasks: function conflictResultionTasks(instanceId) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.conflictResultionTasks();
    },
    resolveConflictResultionTask: function resolveConflictResultionTask(instanceId, taskSolution) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.resolveConflictResultionTask(taskSolution);
    }
  };
  (0, _worker.expose)(exposeMe);
}
//# sourceMappingURL=in-worker.js.map