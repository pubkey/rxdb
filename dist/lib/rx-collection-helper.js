"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxCollectionStorageInstance = createRxCollectionStorageInstance;
exports.fillObjectDataBeforeInsert = fillObjectDataBeforeInsert;
exports.removeCollectionStorages = removeCollectionStorages;
var _utils = require("./plugins/utils");
var _rxSchemaHelper = require("./rx-schema-helper");
var _hooks = require("./hooks");
var _rxDatabaseInternalStore = require("./rx-database-internal-store");
var _rxStorageHelper = require("./rx-storage-helper");
/**
 * fills in the default data.
 * This also clones the data.
 */
function fillObjectDataBeforeInsert(schema, data) {
  var useJson = schema.fillObjectWithDefaults(data);
  useJson = (0, _rxSchemaHelper.fillPrimaryKey)(schema.primaryPath, schema.jsonSchema, useJson);
  useJson._meta = (0, _utils.getDefaultRxDocumentMeta)();
  if (!useJson.hasOwnProperty('_deleted')) {
    useJson._deleted = false;
  }
  if (!useJson.hasOwnProperty('_attachments')) {
    useJson._attachments = {};
  }
  if (!useJson.hasOwnProperty('_rev')) {
    useJson._rev = (0, _utils.getDefaultRevision)();
  }
  return useJson;
}

/**
 * Creates the storage instances that are used internally in the collection
 */
async function createRxCollectionStorageInstance(rxDatabase, storageInstanceCreationParams) {
  storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
  var storageInstance = await rxDatabase.storage.createStorageInstance(storageInstanceCreationParams);
  return storageInstance;
}

/**
 * Removes the main storage of the collection
 * and all connected storages like the ones from the replication meta etc.
 */
async function removeCollectionStorages(storage, databaseInternalStorage, databaseInstanceToken, databaseName, collectionName,
/**
 * If no hash function is provided,
 * we assume that the whole internal store is removed anyway
 * so we do not have to delete the meta documents.
 */
hashFunction) {
  var allCollectionMetaDocs = await (0, _rxDatabaseInternalStore.getAllCollectionDocuments)(storage.statics, databaseInternalStorage);
  var relevantCollectionMetaDocs = allCollectionMetaDocs.filter(metaDoc => metaDoc.data.name === collectionName);
  var removeStorages = [];
  relevantCollectionMetaDocs.forEach(metaDoc => {
    removeStorages.push({
      collectionName: metaDoc.data.name,
      schema: metaDoc.data.schema,
      isCollection: true
    });
    metaDoc.data.connectedStorages.forEach(row => removeStorages.push({
      collectionName: row.collectionName,
      isCollection: false,
      schema: row.schema
    }));
  });

  // ensure uniqueness
  var alreadyAdded = new Set();
  removeStorages = removeStorages.filter(row => {
    var key = row.collectionName + '||' + row.schema.version;
    if (alreadyAdded.has(key)) {
      return false;
    } else {
      alreadyAdded.add(key);
      return true;
    }
  });

  // remove all the storages
  await Promise.all(removeStorages.map(async row => {
    var storageInstance = await storage.createStorageInstance({
      collectionName: row.collectionName,
      databaseInstanceToken,
      databaseName,
      multiInstance: false,
      options: {},
      schema: row.schema
    });
    await storageInstance.remove();
    if (row.isCollection) {
      await (0, _hooks.runAsyncPluginHooks)('postRemoveRxCollection', {
        storage,
        databaseName: databaseName,
        collectionName
      });
    }
  }));

  // remove the meta documents
  if (hashFunction) {
    var writeRows = relevantCollectionMetaDocs.map(doc => {
      var writeDoc = (0, _rxStorageHelper.flatCloneDocWithMeta)(doc);
      writeDoc._deleted = true;
      writeDoc._meta.lwt = (0, _utils.now)();
      writeDoc._rev = (0, _utils.createRevision)(databaseInstanceToken, doc);
      return {
        previous: doc,
        document: writeDoc
      };
    });
    await databaseInternalStorage.bulkWrite(writeRows, 'rx-database-remove-collection-all');
  }
}
//# sourceMappingURL=rx-collection-helper.js.map