"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_LOCAL_DOCUMENT_SCHEMA = exports.LOCAL_DOC_STATE_BY_PARENT_RESOLVED = exports.LOCAL_DOC_STATE_BY_PARENT = void 0;
exports.closeStateByParent = closeStateByParent;
exports.createLocalDocStateByParent = createLocalDocStateByParent;
exports.createLocalDocumentStorageInstance = createLocalDocumentStorageInstance;
exports.getCollectionLocalInstanceName = getCollectionLocalInstanceName;
exports.getLocalDocStateByParent = getLocalDocStateByParent;
exports.removeLocalDocumentsStorageInstance = removeLocalDocumentsStorageInstance;
var _operators = require("rxjs/operators");
var _docCache = require("../../doc-cache");
var _incrementalWrite = require("../../incremental-write");
var _rxError = require("../../rx-error");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _utils = require("../../plugins/utils");
var _rxLocalDocument = require("./rx-local-document");
var LOCAL_DOC_STATE_BY_PARENT = new WeakMap();
exports.LOCAL_DOC_STATE_BY_PARENT = LOCAL_DOC_STATE_BY_PARENT;
var LOCAL_DOC_STATE_BY_PARENT_RESOLVED = new WeakMap();
exports.LOCAL_DOC_STATE_BY_PARENT_RESOLVED = LOCAL_DOC_STATE_BY_PARENT_RESOLVED;
function createLocalDocStateByParent(parent) {
  var database = parent.database ? parent.database : parent;
  var collectionName = parent.database ? parent.name : '';
  var statePromise = (async () => {
    var storageInstance = await createLocalDocumentStorageInstance(database.token, database.storage, database.name, collectionName, database.instanceCreationOptions, database.multiInstance);
    storageInstance = (0, _rxStorageHelper.getWrappedStorageInstance)(database, storageInstance, RX_LOCAL_DOCUMENT_SCHEMA);
    var docCache = new _docCache.DocumentCache('id', parent.$.pipe((0, _operators.filter)(cE => cE.isLocal)), docData => (0, _rxLocalDocument.createRxLocalDocument)(docData, parent));
    var incrementalWriteQueue = new _incrementalWrite.IncrementalWriteQueue(storageInstance, 'id', () => {}, () => {});

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
        events: eventBulk.events.map(ev => (0, _rxStorageHelper.storageChangeEventToRxChangeEvent)(true, ev, parent.database ? parent : undefined)),
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
function getLocalDocStateByParent(parent) {
  var statePromise = LOCAL_DOC_STATE_BY_PARENT.get(parent);
  if (!statePromise) {
    var database = parent.database ? parent.database : parent;
    var collectionName = parent.database ? parent.name : '';
    throw (0, _rxError.newRxError)('LD8', {
      database: database.name,
      collection: collectionName
    });
  }
  return statePromise;
}
function createLocalDocumentStorageInstance(databaseInstanceToken, storage, databaseName, collectionName, instanceCreationOptions, multiInstance) {
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
function closeStateByParent(parent) {
  var statePromise = LOCAL_DOC_STATE_BY_PARENT.get(parent);
  if (statePromise) {
    LOCAL_DOC_STATE_BY_PARENT.delete(parent);
    return statePromise.then(state => state.storageInstance.close());
  }
}
async function removeLocalDocumentsStorageInstance(storage, databaseName, collectionName) {
  var databaseInstanceToken = (0, _utils.randomCouchString)(10);
  var storageInstance = await createLocalDocumentStorageInstance(databaseInstanceToken, storage, databaseName, collectionName, {}, false);
  await storageInstance.remove();
}
function getCollectionLocalInstanceName(collectionName) {
  return 'plugin-local-documents-' + collectionName;
}
var RX_LOCAL_DOCUMENT_SCHEMA = (0, _rxSchemaHelper.fillWithDefaultSettings)({
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
exports.RX_LOCAL_DOCUMENT_SCHEMA = RX_LOCAL_DOCUMENT_SCHEMA;
//# sourceMappingURL=local-documents-helper.js.map