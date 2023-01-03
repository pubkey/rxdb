import { filter } from 'rxjs/operators';
import { DocumentCache } from '../../doc-cache';
import { IncrementalWriteQueue } from '../../incremental-write';
import { newRxError } from '../../rx-error';
import { fillWithDefaultSettings } from '../../rx-schema-helper';
import { getWrappedStorageInstance, storageChangeEventToRxChangeEvent } from '../../rx-storage-helper';
import { randomCouchString } from '../../plugins/utils';
import { createRxLocalDocument } from './rx-local-document';
export var LOCAL_DOC_STATE_BY_PARENT = new WeakMap();
export var LOCAL_DOC_STATE_BY_PARENT_RESOLVED = new WeakMap();
export function createLocalDocStateByParent(parent) {
  var database = parent.database ? parent.database : parent;
  var collectionName = parent.database ? parent.name : '';
  var statePromise = (async () => {
    var storageInstance = await createLocalDocumentStorageInstance(database.token, database.storage, database.name, collectionName, database.instanceCreationOptions, database.multiInstance);
    storageInstance = getWrappedStorageInstance(database, storageInstance, RX_LOCAL_DOCUMENT_SCHEMA);
    var docCache = new DocumentCache('id', parent.$.pipe(filter(cE => cE.isLocal)), docData => createRxLocalDocument(docData, parent));
    var incrementalWriteQueue = new IncrementalWriteQueue(storageInstance, 'id', () => {}, () => {});

    /**
     * Emit the changestream into the collections change stream
     */
    var databaseStorageToken = await database.storageToken;
    var subLocalDocs = storageInstance.changeStream().subscribe(eventBulk => {
      var changeEventBulk = {
        id: eventBulk.id,
        internal: false,
        collectionName: parent.database ? parent.name : undefined,
        storageToken: databaseStorageToken,
        events: eventBulk.events.map(ev => storageChangeEventToRxChangeEvent(true, ev, parent.database ? parent : undefined)),
        databaseToken: database.token,
        checkpoint: eventBulk.checkpoint,
        context: eventBulk.context
      };
      database.$emit(changeEventBulk);
    });
    parent._subs.push(subLocalDocs);
    var state = {
      database,
      parent,
      storageInstance,
      docCache,
      incrementalWriteQueue
    };
    LOCAL_DOC_STATE_BY_PARENT_RESOLVED.set(parent, state);
    return state;
  })();
  LOCAL_DOC_STATE_BY_PARENT.set(parent, statePromise);
}
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
    multiInstance
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
  var databaseInstanceToken = randomCouchString(10);
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