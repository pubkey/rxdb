"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxCollectionStorageInstance = createRxCollectionStorageInstance;
exports.ensureRxCollectionIsNotClosed = ensureRxCollectionIsNotClosed;
exports.fillObjectDataBeforeInsert = fillObjectDataBeforeInsert;
exports.removeCollectionStorages = removeCollectionStorages;
var _index = require("./plugins/utils/index.js");
var _rxSchemaHelper = require("./rx-schema-helper.js");
var _hooks = require("./hooks.js");
var _rxDatabaseInternalStore = require("./rx-database-internal-store.js");
var _rxStorageHelper = require("./rx-storage-helper.js");
var _overwritable = require("./overwritable.js");
var _rxError = require("./rx-error.js");
/**
 * fills in the default data.
 * This also clones the data.
 */
function fillObjectDataBeforeInsert(schema, data) {
  data = (0, _index.flatClone)(data);
  data = (0, _rxSchemaHelper.fillObjectWithDefaults)(schema, data);
  if (typeof schema.jsonSchema.primaryKey !== 'string') {
    data = (0, _rxSchemaHelper.fillPrimaryKey)(schema.primaryPath, schema.jsonSchema, data);
  }
  data._meta = (0, _index.getDefaultRxDocumentMeta)();
  if (!Object.prototype.hasOwnProperty.call(data, '_deleted')) {
    data._deleted = false;
  }
  if (!Object.prototype.hasOwnProperty.call(data, '_attachments')) {
    data._attachments = {};
  }
  if (!Object.prototype.hasOwnProperty.call(data, '_rev')) {
    data._rev = (0, _index.getDefaultRevision)();
  }
  return data;
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
async function removeCollectionStorages(storage, databaseInternalStorage, databaseInstanceToken, databaseName, collectionName, multiInstance, password,
/**
 * If no hash function is provided,
 * we assume that the whole internal store is removed anyway
 * so we do not have to delete the meta documents.
 */
hashFunction) {
  var allCollectionMetaDocs = await (0, _rxDatabaseInternalStore.getAllCollectionDocuments)(databaseInternalStorage);
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
      /**
       * multiInstance must be set to true if multiInstance
       * was true on the database
       * so that the storageInstance can inform other
       * instances about being removed.
       */
      multiInstance,
      options: {},
      schema: row.schema,
      password,
      devMode: _overwritable.overwritable.isDevMode()
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
      writeDoc._meta.lwt = (0, _index.now)();
      writeDoc._rev = (0, _index.createRevision)(databaseInstanceToken, doc);
      return {
        previous: doc,
        document: writeDoc
      };
    });
    await databaseInternalStorage.bulkWrite(writeRows, 'rx-database-remove-collection-all');
  }
}
function ensureRxCollectionIsNotClosed(collection) {
  if (collection.closed) {
    throw (0, _rxError.newRxError)('COL21', {
      collection: collection.name,
      version: collection.schema.version
    });
  }
}
//# sourceMappingURL=rx-collection-helper.js.map