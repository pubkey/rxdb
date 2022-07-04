"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrappedWorkerRxStorage = wrappedWorkerRxStorage;

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
    createStorageInstance: function createStorageInstance(params) {
      try {
        var _instanceId = nextId++;

        return Promise.resolve(args.storage.createStorageInstance(params)).then(function (instance) {
          instanceById.set(_instanceId, instance);
          return _instanceId;
        });
      } catch (e) {
        return Promise.reject(e);
      }
    },
    bulkWrite: function bulkWrite(instanceId, documentWrites) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.bulkWrite(documentWrites);
    },
    findDocumentsById: function findDocumentsById(instanceId, ids, deleted) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.findDocumentsById(ids, deleted);
    },
    query: function query(instanceId, preparedQuery) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.query(preparedQuery);
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