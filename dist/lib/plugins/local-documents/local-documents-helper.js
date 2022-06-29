"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_LOCAL_DOCUMENT_SCHEMA = void 0;
exports.closeStateByParent = closeStateByParent;
exports.createLocalDocStateByParent = createLocalDocStateByParent;
exports.createLocalDocumentStorageInstance = createLocalDocumentStorageInstance;
exports.getCollectionLocalInstanceName = getCollectionLocalInstanceName;
exports.getLocalDocStateByParent = getLocalDocStateByParent;
exports.removeLocalDocumentsStorageInstance = void 0;

var _operators = require("rxjs/operators");

var _docCache = require("../../doc-cache");

var _rxError = require("../../rx-error");

var _rxSchemaHelper = require("../../rx-schema-helper");

var _rxStorageHelper = require("../../rx-storage-helper");

var _util = require("../../util");

var removeLocalDocumentsStorageInstance = function removeLocalDocumentsStorageInstance(storage, databaseName, collectionName) {
  try {
    var databaseInstanceToken = (0, _util.randomCouchString)(10);
    return Promise.resolve(createLocalDocumentStorageInstance(databaseInstanceToken, storage, databaseName, collectionName, {}, false)).then(function (storageInstance) {
      return Promise.resolve(storageInstance.remove()).then(function () {});
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.removeLocalDocumentsStorageInstance = removeLocalDocumentsStorageInstance;
var LOCAL_DOC_STATE_BY_PARENT = new WeakMap();

function createLocalDocStateByParent(parent) {
  var database = parent.database ? parent.database : parent;
  var collectionName = parent.database ? parent.name : '';

  var statePromise = function () {
    try {
      return Promise.resolve(createLocalDocumentStorageInstance(database.token, database.storage, database.name, collectionName, database.instanceCreationOptions, database.multiInstance)).then(function (storageInstance) {
        storageInstance = (0, _rxStorageHelper.getWrappedStorageInstance)(database, storageInstance, RX_LOCAL_DOCUMENT_SCHEMA);
        var docCache = new _docCache.DocCache();
        /**
         * Update cached local documents on events.
         */

        var sub = parent.$.pipe((0, _operators.filter)(function (cE) {
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
                return (0, _rxStorageHelper.storageChangeEventToRxChangeEvent)(true, ev, parent.database ? parent : undefined);
              }),
              databaseToken: database.token
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

function closeStateByParent(parent) {
  var statePromise = LOCAL_DOC_STATE_BY_PARENT.get(parent);

  if (statePromise) {
    LOCAL_DOC_STATE_BY_PARENT["delete"](parent);
    return statePromise.then(function (state) {
      return state.storageInstance.close();
    });
  }
}

function getCollectionLocalInstanceName(collectionName) {
  return 'plugin-local-documents-' + collectionName;
}

var RX_LOCAL_DOCUMENT_SCHEMA = (0, _rxSchemaHelper.fillWithDefaultSettings)({
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string'
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