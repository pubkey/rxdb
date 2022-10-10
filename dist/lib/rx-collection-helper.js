"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxCollectionStorageInstance = void 0;
exports.fillObjectDataBeforeInsert = fillObjectDataBeforeInsert;
exports.removeCollectionStorages = void 0;
var _util = require("./util");
var _rxSchemaHelper = require("./rx-schema-helper");
var _hooks = require("./hooks");
var _rxDatabaseInternalStore = require("./rx-database-internal-store");
var _rxStorageHelper = require("./rx-storage-helper");
/**
 * Removes the main storage of the collection
 * and all connected storages like the ones from the replication meta etc.
 */var removeCollectionStorages = function removeCollectionStorages(storage, databaseInternalStorage, databaseInstanceToken, databaseName, collectionName,
/**
 * If no hash function is provided,
 * we assume that the whole internal store is removed anyway
 * so we do not have to delete the meta documents.
 */
hashFunction) {
  try {
    return Promise.resolve((0, _rxDatabaseInternalStore.getAllCollectionDocuments)(storage.statics, databaseInternalStorage)).then(function (allCollectionMetaDocs) {
      var relevantCollectionMetaDocs = allCollectionMetaDocs.filter(function (metaDoc) {
        return metaDoc.data.name === collectionName;
      });
      var removeStorages = [];
      relevantCollectionMetaDocs.forEach(function (metaDoc) {
        removeStorages.push({
          collectionName: metaDoc.data.name,
          schema: metaDoc.data.schema,
          isCollection: true
        });
        metaDoc.data.connectedStorages.forEach(function (row) {
          return removeStorages.push({
            collectionName: row.collectionName,
            isCollection: false,
            schema: row.schema
          });
        });
      });

      // ensure uniqueness
      var alreadyAdded = new Set();
      removeStorages = removeStorages.filter(function (row) {
        var key = row.collectionName + '||' + row.schema.version;
        if (alreadyAdded.has(key)) {
          return false;
        } else {
          alreadyAdded.add(key);
          return true;
        }
      });

      // remove all the storages
      return Promise.resolve(Promise.all(removeStorages.map(function (row) {
        try {
          return Promise.resolve(storage.createStorageInstance({
            collectionName: row.collectionName,
            databaseInstanceToken: databaseInstanceToken,
            databaseName: databaseName,
            multiInstance: false,
            options: {},
            schema: row.schema
          })).then(function (storageInstance) {
            return Promise.resolve(storageInstance.remove()).then(function () {
              var _temp2 = function () {
                if (row.isCollection) {
                  return Promise.resolve((0, _hooks.runAsyncPluginHooks)('postRemoveRxCollection', {
                    storage: storage,
                    databaseName: databaseName,
                    collectionName: collectionName
                  })).then(function () {});
                }
              }();
              if (_temp2 && _temp2.then) return _temp2.then(function () {});
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }))).then(function () {
        var _temp = function () {
          if (hashFunction) {
            var writeRows = relevantCollectionMetaDocs.map(function (doc) {
              var writeDoc = (0, _rxStorageHelper.flatCloneDocWithMeta)(doc);
              writeDoc._deleted = true;
              writeDoc._meta.lwt = (0, _util.now)();
              writeDoc._rev = (0, _util.createRevision)(hashFunction, writeDoc, doc);
              return {
                previous: doc,
                document: writeDoc
              };
            });
            return Promise.resolve(databaseInternalStorage.bulkWrite(writeRows, 'rx-database-remove-collection-all')).then(function () {});
          }
        }();
        if (_temp && _temp.then) return _temp.then(function () {});
      }); // remove the meta documents
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.removeCollectionStorages = removeCollectionStorages;
/**
 * Creates the storage instances that are used internally in the collection
 */var createRxCollectionStorageInstance = function createRxCollectionStorageInstance(rxDatabase, storageInstanceCreationParams) {
  try {
    storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
    return Promise.resolve(rxDatabase.storage.createStorageInstance(storageInstanceCreationParams));
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.createRxCollectionStorageInstance = createRxCollectionStorageInstance;
/**
 * fills in the default data.
 * This also clones the data.
 */
function fillObjectDataBeforeInsert(schema, data) {
  var useJson = schema.fillObjectWithDefaults(data);
  useJson = (0, _rxSchemaHelper.fillPrimaryKey)(schema.primaryPath, schema.jsonSchema, useJson);
  useJson._meta = (0, _util.getDefaultRxDocumentMeta)();
  if (!useJson.hasOwnProperty('_deleted')) {
    useJson._deleted = false;
  }
  if (!useJson.hasOwnProperty('_attachments')) {
    useJson._attachments = {};
  }
  if (!useJson.hasOwnProperty('_rev')) {
    useJson._rev = (0, _util.getDefaultRevision)();
  }
  return useJson;
}
//# sourceMappingURL=rx-collection-helper.js.map