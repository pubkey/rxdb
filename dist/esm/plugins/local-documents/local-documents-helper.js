import { filter, map } from 'rxjs';
import { DocumentCache } from "../../doc-cache.js";
import { IncrementalWriteQueue } from "../../incremental-write.js";
import { newRxError } from "../../rx-error.js";
import { fillWithDefaultSettings } from "../../rx-schema-helper.js";
import { getWrappedStorageInstance } from "../../rx-storage-helper.js";
import { randomToken } from "../../plugins/utils/index.js";
import { createRxLocalDocument } from "./rx-local-document.js";
import { overwritable } from "../../overwritable.js";
export var LOCAL_DOC_STATE_BY_PARENT = new WeakMap();
export var LOCAL_DOC_STATE_BY_PARENT_RESOLVED = new WeakMap();
export function createLocalDocStateByParent(parent) {
  var database = parent.database ? parent.database : parent;
  var collectionName = parent.database ? parent.name : '';
  var statePromise = (async () => {
    var storageInstance = await createLocalDocumentStorageInstance(database.token, database.storage, database.name, collectionName, database.instanceCreationOptions, database.multiInstance);
    storageInstance = getWrappedStorageInstance(database, storageInstance, RX_LOCAL_DOCUMENT_SCHEMA);
    var docCache = new DocumentCache('id', database.eventBulks$.pipe(filter(changeEventBulk => {
      var ret = false;
      if (
      // parent is database
      collectionName === '' && !changeEventBulk.collectionName ||
      // parent is collection

      collectionName !== '' && changeEventBulk.collectionName === collectionName) {
        ret = true;
      }
      return ret && changeEventBulk.isLocal;
    }), map(b => b.events)), docData => createRxLocalDocument(docData, parent));
    var incrementalWriteQueue = new IncrementalWriteQueue(storageInstance, 'id', () => {}, () => {});

    /**
     * Emit the changestream into the collections change stream
     */
    var databaseStorageToken = await database.storageToken;
    var subLocalDocs = storageInstance.changeStream().subscribe(eventBulk => {
      var events = new Array(eventBulk.events.length);
      var rawEvents = eventBulk.events;
      var collectionName = parent.database ? parent.name : undefined;
      for (var index = 0; index < rawEvents.length; index++) {
        var event = rawEvents[index];
        events[index] = {
          documentId: event.documentId,
          collectionName,
          isLocal: true,
          operation: event.operation,
          documentData: overwritable.deepFreezeWhenDevMode(event.documentData),
          previousDocumentData: overwritable.deepFreezeWhenDevMode(event.previousDocumentData)
        };
      }
      var changeEventBulk = {
        id: eventBulk.id,
        isLocal: true,
        internal: false,
        collectionName: parent.database ? parent.name : undefined,
        storageToken: databaseStorageToken,
        events,
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