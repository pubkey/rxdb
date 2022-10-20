/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */

import { expose } from 'threads/worker';
import { getFromMapOrThrow } from '../../util';
export function wrappedWorkerRxStorage(args) {
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