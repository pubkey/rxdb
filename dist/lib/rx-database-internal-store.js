"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLocalDocument = getLocalDocument;
exports.setLocalDocument = setLocalDocument;
exports.putDocument = putDocument;
exports.getAllDocuments = getAllDocuments;
exports.deleteStorageInstance = deleteStorageInstance;
exports.INTERNAL_STORAGE_NAME = void 0;

var _util = require("./util");

/**
 * In this file we handle all accesses to the internal store of the database
 * This store is used to save hashes and checksums and metadata
 * ATM this only works with PouchDB but in the future
 * it should work by using the storage.interface
 */
// will be typed when we have more then one
var INTERNAL_STORAGE_NAME = '_rxdb_internal';
/**
 * returns to local document with the given id
 * or null if not exists
 */

exports.INTERNAL_STORAGE_NAME = INTERNAL_STORAGE_NAME;

function getLocalDocument(storageInstance, id) {
  return storageInstance.get(_util.LOCAL_PREFIX + id)["catch"](function () {
    return null;
  });
}

function setLocalDocument(storageInstance, id, value) {
  return storageInstance.put({
    _id: id,
    value: value
  }).then(function () {});
}

function putDocument(storageInstance, doc) {
  return storageInstance.put(doc).then(function (putResult) {
    return Object.assign({
      _id: putResult.id,
      _rev: putResult.rev
    }, doc);
  });
}
/**
 * returns all NON-LOCAL documents
 */


function getAllDocuments(storageInstance) {
  return storageInstance.allDocs({
    include_docs: true
  }).then(function (result) {
    return result.rows;
  });
}
/**
 * deletes the storage instance and all of it's data
 */


function deleteStorageInstance(storageInstance) {
  return storageInstance.destroy();
}

//# sourceMappingURL=rx-database-internal-store.js.map