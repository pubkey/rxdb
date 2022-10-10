import { createRevision, getDefaultRevision, getDefaultRxDocumentMeta, now } from './util';
import { fillPrimaryKey } from './rx-schema-helper';
import { runAsyncPluginHooks } from './hooks';
import { getAllCollectionDocuments } from './rx-database-internal-store';
import { flatCloneDocWithMeta } from './rx-storage-helper';

/**
 * fills in the default data.
 * This also clones the data.
 */

/**
 * Removes the main storage of the collection
 * and all connected storages like the ones from the replication meta etc.
 */
export var removeCollectionStorages = function removeCollectionStorages(storage, databaseInternalStorage, databaseInstanceToken, databaseName, collectionName,
/**
 * If no hash function is provided,
 * we assume that the whole internal store is removed anyway
 * so we do not have to delete the meta documents.
 */
hashFunction) {
  try {
    return Promise.resolve(getAllCollectionDocuments(storage.statics, databaseInternalStorage)).then(function (allCollectionMetaDocs) {
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
                  return Promise.resolve(runAsyncPluginHooks('postRemoveRxCollection', {
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
              var writeDoc = flatCloneDocWithMeta(doc);
              writeDoc._deleted = true;
              writeDoc._meta.lwt = now();
              writeDoc._rev = createRevision(hashFunction, writeDoc, doc);
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
/**
 * Creates the storage instances that are used internally in the collection
 */
export var createRxCollectionStorageInstance = function createRxCollectionStorageInstance(rxDatabase, storageInstanceCreationParams) {
  try {
    storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
    return Promise.resolve(rxDatabase.storage.createStorageInstance(storageInstanceCreationParams));
  } catch (e) {
    return Promise.reject(e);
  }
};
export function fillObjectDataBeforeInsert(schema, data) {
  var useJson = schema.fillObjectWithDefaults(data);
  useJson = fillPrimaryKey(schema.primaryPath, schema.jsonSchema, useJson);
  useJson._meta = getDefaultRxDocumentMeta();
  if (!useJson.hasOwnProperty('_deleted')) {
    useJson._deleted = false;
  }
  if (!useJson.hasOwnProperty('_attachments')) {
    useJson._attachments = {};
  }
  if (!useJson.hasOwnProperty('_rev')) {
    useJson._rev = getDefaultRevision();
  }
  return useJson;
}
//# sourceMappingURL=rx-collection-helper.js.map