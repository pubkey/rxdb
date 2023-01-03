import { createRevision, getDefaultRevision, getDefaultRxDocumentMeta, now } from './plugins/utils';
import { fillPrimaryKey } from './rx-schema-helper';
import { runAsyncPluginHooks } from './hooks';
import { getAllCollectionDocuments } from './rx-database-internal-store';
import { flatCloneDocWithMeta } from './rx-storage-helper';

/**
 * fills in the default data.
 * This also clones the data.
 */
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

/**
 * Creates the storage instances that are used internally in the collection
 */
export async function createRxCollectionStorageInstance(rxDatabase, storageInstanceCreationParams) {
  storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
  var storageInstance = await rxDatabase.storage.createStorageInstance(storageInstanceCreationParams);
  return storageInstance;
}

/**
 * Removes the main storage of the collection
 * and all connected storages like the ones from the replication meta etc.
 */
export async function removeCollectionStorages(storage, databaseInternalStorage, databaseInstanceToken, databaseName, collectionName,
/**
 * If no hash function is provided,
 * we assume that the whole internal store is removed anyway
 * so we do not have to delete the meta documents.
 */
hashFunction) {
  var allCollectionMetaDocs = await getAllCollectionDocuments(storage.statics, databaseInternalStorage);
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
      await runAsyncPluginHooks('postRemoveRxCollection', {
        storage,
        databaseName: databaseName,
        collectionName
      });
    }
  }));

  // remove the meta documents
  if (hashFunction) {
    var writeRows = relevantCollectionMetaDocs.map(doc => {
      var writeDoc = flatCloneDocWithMeta(doc);
      writeDoc._deleted = true;
      writeDoc._meta.lwt = now();
      writeDoc._rev = createRevision(databaseInstanceToken, doc);
      return {
        previous: doc,
        document: writeDoc
      };
    });
    await databaseInternalStorage.bulkWrite(writeRows, 'rx-database-remove-collection-all');
  }
}
//# sourceMappingURL=rx-collection-helper.js.map