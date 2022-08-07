import { getDefaultRevision, getDefaultRxDocumentMeta } from './util';
import { fillPrimaryKey } from './rx-schema-helper';

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
//# sourceMappingURL=rx-collection-helper.js.map