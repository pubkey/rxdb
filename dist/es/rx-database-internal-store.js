/**
 * In this file we handle all accesses to the internal store of the database
 * This store is used to save hashes and checksums and metadata
 * ATM this only works with PouchDB but in the future
 * it should work by using the storage.interface
 */
import { LOCAL_PREFIX } from './util';
// will be typed when we have more then one
export var INTERNAL_STORAGE_NAME = '_rxdb_internal';
/**
 * returns to local document with the given id
 * or null if not exists
 */

export function getLocalDocument(storageInstance, id) {
  return storageInstance.get(LOCAL_PREFIX + id)["catch"](function () {
    return null;
  });
}
export function setLocalDocument(storageInstance, id, value) {
  return storageInstance.put({
    _id: id,
    value: value
  }).then(function () {});
}
export function putDocument(storageInstance, doc) {
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

export function getAllDocuments(storageInstance) {
  return storageInstance.allDocs({
    include_docs: true
  }).then(function (result) {
    return result.rows;
  });
}
/**
 * deletes the storage instance and all of it's data
 */

export function deleteStorageInstance(storageInstance) {
  return storageInstance.destroy();
}
//# sourceMappingURL=rx-database-internal-store.js.map