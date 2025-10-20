"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_LOCAL_DOCUMENT_SCHEMA = exports.LOCAL_DOC_STATE_BY_PARENT_RESOLVED = exports.LOCAL_DOC_STATE_BY_PARENT = void 0;
exports.closeStateByParent = closeStateByParent;
exports.createLocalDocumentStorageInstance = createLocalDocumentStorageInstance;
exports.getCollectionLocalInstanceName = getCollectionLocalInstanceName;
exports.getLocalDocStateByParent = getLocalDocStateByParent;
exports.removeLocalDocumentsStorageInstance = removeLocalDocumentsStorageInstance;
var _rxError = require("../../rx-error.js");
var _rxSchemaHelper = require("../../rx-schema-helper.js");
var _index = require("../../plugins/utils/index.js");
var _overwritable = require("../../overwritable.js");
var LOCAL_DOC_STATE_BY_PARENT = exports.LOCAL_DOC_STATE_BY_PARENT = new WeakMap();
var LOCAL_DOC_STATE_BY_PARENT_RESOLVED = exports.LOCAL_DOC_STATE_BY_PARENT_RESOLVED = new WeakMap();
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
    multiInstance,
    devMode: _overwritable.overwritable.isDevMode()
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
  var databaseInstanceToken = (0, _index.randomToken)(10);
  var storageInstance = await createLocalDocumentStorageInstance(databaseInstanceToken, storage, databaseName, collectionName, {}, false);
  await storageInstance.remove();
}
function getCollectionLocalInstanceName(collectionName) {
  return 'plugin-local-documents-' + collectionName;
}
var RX_LOCAL_DOCUMENT_SCHEMA = exports.RX_LOCAL_DOCUMENT_SCHEMA = (0, _rxSchemaHelper.fillWithDefaultSettings)({
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