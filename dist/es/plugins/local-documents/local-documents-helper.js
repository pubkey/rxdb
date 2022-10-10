import { filter } from 'rxjs/operators';
import { DocCache } from '../../doc-cache';
import { newRxError } from '../../rx-error';
import { fillWithDefaultSettings } from '../../rx-schema-helper';
import { getWrappedStorageInstance, storageChangeEventToRxChangeEvent } from '../../rx-storage-helper';
import { randomCouchString } from '../../util';
export var removeLocalDocumentsStorageInstance = function removeLocalDocumentsStorageInstance(storage, databaseName, collectionName) {
  try {
    var databaseInstanceToken = randomCouchString(10);
    return Promise.resolve(createLocalDocumentStorageInstance(databaseInstanceToken, storage, databaseName, collectionName, {}, false)).then(function (storageInstance) {
      return Promise.resolve(storageInstance.remove()).then(function () {});
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var LOCAL_DOC_STATE_BY_PARENT = new WeakMap();
export function createLocalDocStateByParent(parent) {
  var database = parent.database ? parent.database : parent;
  var collectionName = parent.database ? parent.name : '';
  var statePromise = function () {
    try {
      return Promise.resolve(createLocalDocumentStorageInstance(database.token, database.storage, database.name, collectionName, database.instanceCreationOptions, database.multiInstance)).then(function (storageInstance) {
        storageInstance = getWrappedStorageInstance(database, storageInstance, RX_LOCAL_DOCUMENT_SCHEMA);
        var docCache = new DocCache();

        /**
         * Update cached local documents on events.
         */
        var sub = parent.$.pipe(filter(function (cE) {
          return cE.isLocal;
        })).subscribe(function (cE) {
          var doc = docCache.get(cE.documentId);
          if (doc) {
            doc._handleChangeEvent(cE);
          }
        });
        parent._subs.push(sub);

        /**
         * Emit the changestream into the collections change stream
         */
        return Promise.resolve(database.storageToken).then(function (databaseStorageToken) {
          var subLocalDocs = storageInstance.changeStream().subscribe(function (eventBulk) {
            var changeEventBulk = {
              id: eventBulk.id,
              internal: false,
              collectionName: parent.database ? parent.name : undefined,
              storageToken: databaseStorageToken,
              events: eventBulk.events.map(function (ev) {
                return storageChangeEventToRxChangeEvent(true, ev, parent.database ? parent : undefined);
              }),
              databaseToken: database.token,
              checkpoint: eventBulk.checkpoint,
              context: eventBulk.context
            };
            database.$emit(changeEventBulk);
          });
          parent._subs.push(subLocalDocs);
          return {
            database: database,
            parent: parent,
            storageInstance: storageInstance,
            docCache: docCache
          };
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }();
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
    databaseInstanceToken: databaseInstanceToken,
    databaseName: databaseName,
    /**
     * Use a different collection name for the local documents instance
     * so that the local docs can be kept while deleting the normal instance
     * after migration.
     */
    collectionName: getCollectionLocalInstanceName(collectionName),
    schema: RX_LOCAL_DOCUMENT_SCHEMA,
    options: instanceCreationOptions,
    multiInstance: multiInstance
  });
}
export function closeStateByParent(parent) {
  var statePromise = LOCAL_DOC_STATE_BY_PARENT.get(parent);
  if (statePromise) {
    LOCAL_DOC_STATE_BY_PARENT["delete"](parent);
    return statePromise.then(function (state) {
      return state.storageInstance.close();
    });
  }
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