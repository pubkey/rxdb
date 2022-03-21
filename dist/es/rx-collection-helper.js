import { getDefaultRxDocumentMeta } from './util';
import { fillPrimaryKey } from './rx-schema-helper';
/**
 * fills in the default data.
 * This also clones the data.
 */

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
export function fillObjectDataBeforeInsert(collection, data) {
  var useJson = collection.schema.fillObjectWithDefaults(data);
  useJson = fillPrimaryKey(collection.schema.primaryPath, collection.schema.jsonSchema, useJson);
  useJson._meta = getDefaultRxDocumentMeta();

  if (!useJson.hasOwnProperty('_deleted')) {
    useJson._deleted = false;
  }

  return useJson;
}
//# sourceMappingURL=rx-collection-helper.js.map