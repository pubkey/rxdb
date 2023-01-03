"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrappedWorkerRxStorage = wrappedWorkerRxStorage;
var _worker = require("threads/worker");
var _utils = require("../utils");
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
    async createStorageInstance(params) {
      var instanceId = nextId++;
      var instance = await args.storage.createStorageInstance(params);
      instanceById.set(instanceId, instance);
      return instanceId;
    },
    bulkWrite(instanceId, documentWrites, context) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.bulkWrite(documentWrites, context);
    },
    findDocumentsById(instanceId, ids, deleted) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.findDocumentsById(ids, deleted);
    },
    query(instanceId, preparedQuery) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.query(preparedQuery);
    },
    count(instanceId, preparedQuery) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.count(preparedQuery);
    },
    getAttachmentData(instanceId, documentId, attachmentId) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.getAttachmentData(documentId, attachmentId);
    },
    getChangedDocumentsSince(instanceId, limit, checkpoint) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.getChangedDocumentsSince(limit, checkpoint);
    },
    changeStream(instanceId) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.changeStream();
    },
    cleanup(instanceId, minDeletedTime) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.cleanup(minDeletedTime);
    },
    close(instanceId) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.close();
    },
    remove(instanceId) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.remove();
    },
    conflictResultionTasks(instanceId) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.conflictResultionTasks();
    },
    resolveConflictResultionTask(instanceId, taskSolution) {
      var instance = (0, _utils.getFromMapOrThrow)(instanceById, instanceId);
      return instance.resolveConflictResultionTask(taskSolution);
    }
  };
  (0, _worker.expose)(exposeMe);
}
//# sourceMappingURL=in-worker.js.map