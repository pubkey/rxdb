import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { filter } from 'rxjs/operators';
import { DocumentCache } from '../../doc-cache';
import { IncrementalWriteQueue } from '../../incremental-write';
import { newRxError } from '../../rx-error';
import { fillWithDefaultSettings } from '../../rx-schema-helper';
import { getWrappedStorageInstance, storageChangeEventToRxChangeEvent } from '../../rx-storage-helper';
import { randomCouchString } from '../../util';
import { createRxLocalDocument } from './rx-local-document';
export var LOCAL_DOC_STATE_BY_PARENT = new WeakMap();
export var LOCAL_DOC_STATE_BY_PARENT_RESOLVED = new WeakMap();
export function createLocalDocStateByParent(parent) {
  var database = parent.database ? parent.database : parent;
  var collectionName = parent.database ? parent.name : '';
  var statePromise = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
    var storageInstance, docCache, incrementalWriteQueue, databaseStorageToken, subLocalDocs, state;
    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return createLocalDocumentStorageInstance(database.token, database.storage, database.name, collectionName, database.instanceCreationOptions, database.multiInstance);
        case 2:
          storageInstance = _context.sent;
          storageInstance = getWrappedStorageInstance(database, storageInstance, RX_LOCAL_DOCUMENT_SCHEMA);
          docCache = new DocumentCache('id', parent.$.pipe(filter(function (cE) {
            return cE.isLocal;
          })), function (docData) {
            return createRxLocalDocument(docData, parent);
          });
          incrementalWriteQueue = new IncrementalWriteQueue(storageInstance, 'id', function () {}, function () {});
          /**
           * Emit the changestream into the collections change stream
           */
          _context.next = 8;
          return database.storageToken;
        case 8:
          databaseStorageToken = _context.sent;
          subLocalDocs = storageInstance.changeStream().subscribe(function (eventBulk) {
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
          state = {
            database: database,
            parent: parent,
            storageInstance: storageInstance,
            docCache: docCache,
            incrementalWriteQueue: incrementalWriteQueue
          };
          LOCAL_DOC_STATE_BY_PARENT_RESOLVED.set(parent, state);
          return _context.abrupt("return", state);
        case 14:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }))();
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
export function removeLocalDocumentsStorageInstance(_x, _x2, _x3) {
  return _removeLocalDocumentsStorageInstance.apply(this, arguments);
}
function _removeLocalDocumentsStorageInstance() {
  _removeLocalDocumentsStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(storage, databaseName, collectionName) {
    var databaseInstanceToken, storageInstance;
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          databaseInstanceToken = randomCouchString(10);
          _context2.next = 3;
          return createLocalDocumentStorageInstance(databaseInstanceToken, storage, databaseName, collectionName, {}, false);
        case 3:
          storageInstance = _context2.sent;
          _context2.next = 6;
          return storageInstance.remove();
        case 6:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _removeLocalDocumentsStorageInstance.apply(this, arguments);
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