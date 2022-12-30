"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
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
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
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
  var statePromise = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
    var storageInstance, docCache, incrementalWriteQueue, databaseStorageToken, subLocalDocs, state;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return createLocalDocumentStorageInstance(database.token, database.storage, database.name, collectionName, database.instanceCreationOptions, database.multiInstance);
        case 2:
          storageInstance = _context.sent;
          storageInstance = (0, _rxStorageHelper.getWrappedStorageInstance)(database, storageInstance, RX_LOCAL_DOCUMENT_SCHEMA);
          docCache = new _docCache.DocumentCache('id', parent.$.pipe((0, _operators.filter)(function (cE) {
            return cE.isLocal;
          })), function (docData) {
            return (0, _rxLocalDocument.createRxLocalDocument)(docData, parent);
          });
          incrementalWriteQueue = new _incrementalWrite.IncrementalWriteQueue(storageInstance, 'id', function () {}, function () {});
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
                return (0, _rxStorageHelper.storageChangeEventToRxChangeEvent)(true, ev, parent.database ? parent : undefined);
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
function removeLocalDocumentsStorageInstance(_x, _x2, _x3) {
  return _removeLocalDocumentsStorageInstance.apply(this, arguments);
}
function _removeLocalDocumentsStorageInstance() {
  _removeLocalDocumentsStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(storage, databaseName, collectionName) {
    var databaseInstanceToken, storageInstance;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          databaseInstanceToken = (0, _utils.randomCouchString)(10);
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