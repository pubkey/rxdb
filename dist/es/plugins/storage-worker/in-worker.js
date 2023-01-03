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
    async createStorageInstance(params) {
      var instanceId = nextId++;
      var instance = await args.storage.createStorageInstance(params);
      instanceById.set(instanceId, instance);
      return instanceId;
    },
    bulkWrite(instanceId, documentWrites, context) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.bulkWrite(documentWrites, context);
    },
    findDocumentsById(instanceId, ids, deleted) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.findDocumentsById(ids, deleted);
    },
    query(instanceId, preparedQuery) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.query(preparedQuery);
    },
    count(instanceId, preparedQuery) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.count(preparedQuery);
    },
    getAttachmentData(instanceId, documentId, attachmentId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.getAttachmentData(documentId, attachmentId);
    },
    getChangedDocumentsSince(instanceId, limit, checkpoint) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.getChangedDocumentsSince(limit, checkpoint);
    },
    changeStream(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.changeStream();
    },
    cleanup(instanceId, minDeletedTime) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.cleanup(minDeletedTime);
    },
    close(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.close();
    },
    remove(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.remove();
    },
    conflictResultionTasks(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.conflictResultionTasks();
    },
    resolveConflictResultionTask(instanceId, taskSolution) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.resolveConflictResultionTask(taskSolution);
    }
  };
  expose(exposeMe);
}
//# sourceMappingURL=in-worker.js.map