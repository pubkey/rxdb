import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */

import { expose } from 'threads/worker';
import { getFromMapOrThrow } from '../utils';
export function wrappedWorkerRxStorage(args) {
  var nextId = 0;
  var instanceById = new Map();
  var exposeMe = {
    /**
     * RxStorageInstance
     */
    createStorageInstance: function () {
      var _createStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(params) {
        var instanceId, instance;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
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
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.bulkWrite(documentWrites, context);
    },
    findDocumentsById: function findDocumentsById(instanceId, ids, deleted) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.findDocumentsById(ids, deleted);
    },
    query: function query(instanceId, preparedQuery) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.query(preparedQuery);
    },
    count: function count(instanceId, preparedQuery) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.count(preparedQuery);
    },
    getAttachmentData: function getAttachmentData(instanceId, documentId, attachmentId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.getAttachmentData(documentId, attachmentId);
    },
    getChangedDocumentsSince: function getChangedDocumentsSince(instanceId, limit, checkpoint) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.getChangedDocumentsSince(limit, checkpoint);
    },
    changeStream: function changeStream(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.changeStream();
    },
    cleanup: function cleanup(instanceId, minDeletedTime) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.cleanup(minDeletedTime);
    },
    close: function close(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.close();
    },
    remove: function remove(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.remove();
    },
    conflictResultionTasks: function conflictResultionTasks(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.conflictResultionTasks();
    },
    resolveConflictResultionTask: function resolveConflictResultionTask(instanceId, taskSolution) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.resolveConflictResultionTask(taskSolution);
    }
  };
  expose(exposeMe);
}
//# sourceMappingURL=in-worker.js.map