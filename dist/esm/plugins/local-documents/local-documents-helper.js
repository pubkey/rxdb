import { newRxError } from "../../rx-error.js";
import { fillWithDefaultSettings } from "../../rx-schema-helper.js";
import { randomToken } from "../../plugins/utils/index.js";
import { overwritable } from "../../overwritable.js";
export var LOCAL_DOC_STATE_BY_PARENT = new WeakMap();
export var LOCAL_DOC_STATE_BY_PARENT_RESOLVED = new WeakMap();
export function getLocalDocStateByParent(parent) {
  var statePromise = LOCAL_DOC_STATE_BY_PARENT.get(parent);
  if (!statePromise) {
    var database = parent.database ? parent.database : parent;
    var collectionName = parent.database ? parent.name : '';
    throw newRxError('LD8', {
      database: database.name,
      collection: collectionName
    });
  }
  return statePromise;
}
export function createLocalDocumentStorageInstance(databaseInstanceToken, storage, databaseName, collectionName, instanceCreationOptions, multiInstance) {
  return storage.createStorageInstance({
    databaseInstanceToken,
    databaseName: databaseName,
    /**
     * Use a different collection name for the local documents instance
     * so that the local docs can be kept while deleting the normal instance
     * after migration.
     */
    collectionName: getCollectionLocalInstanceName(collectionName),
    schema: RX_LOCAL_DOCUMENT_SCHEMA,
    options: instanceCreationOptions,
    multiInstance,
    devMode: overwritable.isDevMode()
  });
}
export function closeStateByParent(parent) {
  var statePromise = LOCAL_DOC_STATE_BY_PARENT.get(parent);
  if (statePromise) {
    LOCAL_DOC_STATE_BY_PARENT.delete(parent);
    return statePromise.then(state => state.storageInstance.close());
  }
}
export async function removeLocalDocumentsStorageInstance(storage, databaseName, collectionName) {
  var databaseInstanceToken = randomToken(10);
  var storageInstance = await createLocalDocumentStorageInstance(databaseInstanceToken, storage, databaseName, collectionName, {}, false);
  await storageInstance.remove();
}
export function getCollectionLocalInstanceName(collectionName) {
  return 'plugin-local-documents-' + collectionName;
}
export var RX_LOCAL_DOCUMENT_SCHEMA = fillWithDefaultSettings({
  title: 'RxLocalDocument',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 128
    },
    data: {
      type: 'object',
      additionalProperties: true
    }
  },
  required: ['id', 'data']
});
//# sourceMappingURL=local-documents-helper.js.map