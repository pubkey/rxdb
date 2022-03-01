"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrappedRxStorage = wrappedRxStorage;

var _worker = require("threads/worker");

var _util = require("../../util");

/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
function wrappedRxStorage(args) {
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
    bulkAddRevisions: function bulkAddRevisions(instanceId, documents) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.bulkAddRevisions(documents);
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
    getChangedDocuments: function getChangedDocuments(instanceId, options) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.getChangedDocuments(options);
    },
    changeStream: function changeStream(instanceId) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.changeStream();
    },
    close: function close(instanceId) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.close();
    },
    remove: function remove(instanceId) {
      var instance = (0, _util.getFromMapOrThrow)(instanceById, instanceId);
      return instance.remove();
    }
  };
  (0, _worker.expose)(exposeMe);
}
//# sourceMappingURL=in-worker.js.map