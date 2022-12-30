"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.STORAGE_TOKEN_DOCUMENT_KEY = exports.STORAGE_TOKEN_DOCUMENT_ID = exports.INTERNAL_STORE_SCHEMA_TITLE = exports.INTERNAL_STORE_SCHEMA = exports.INTERNAL_CONTEXT_STORAGE_TOKEN = exports.INTERNAL_CONTEXT_COLLECTION = void 0;
exports._collectionNamePrimary = _collectionNamePrimary;
exports.addConnectedStorageToCollection = addConnectedStorageToCollection;
exports.ensureStorageTokenDocumentExists = ensureStorageTokenDocumentExists;
exports.getAllCollectionDocuments = getAllCollectionDocuments;
exports.getPrimaryKeyOfInternalDocument = getPrimaryKeyOfInternalDocument;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxError = require("./rx-error");
var _rxSchemaHelper = require("./rx-schema-helper");
var _rxStorageHelper = require("./rx-storage-helper");
var _utils = require("./plugins/utils");
var INTERNAL_CONTEXT_COLLECTION = 'collection';
exports.INTERNAL_CONTEXT_COLLECTION = INTERNAL_CONTEXT_COLLECTION;
var INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';

/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */
exports.INTERNAL_CONTEXT_STORAGE_TOKEN = INTERNAL_CONTEXT_STORAGE_TOKEN;
var INTERNAL_STORE_SCHEMA_TITLE = 'RxInternalDocument';
exports.INTERNAL_STORE_SCHEMA_TITLE = INTERNAL_STORE_SCHEMA_TITLE;
var INTERNAL_STORE_SCHEMA = (0, _rxSchemaHelper.fillWithDefaultSettings)({
  version: 0,
  title: INTERNAL_STORE_SCHEMA_TITLE,
  primaryKey: {
    key: 'id',
    fields: ['context', 'key'],
    separator: '|'
  },
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 200
    },
    key: {
      type: 'string'
    },
    context: {
      type: 'string',
      "enum": [INTERNAL_CONTEXT_COLLECTION, INTERNAL_CONTEXT_STORAGE_TOKEN, 'OTHER']
    },
    data: {
      type: 'object',
      additionalProperties: true
    }
  },
  indexes: [],
  required: ['key', 'context', 'data'],
  additionalProperties: false,
  /**
   * If the sharding plugin is used,
   * it must not shard on the internal RxStorageInstance
   * because that one anyway has only a small amount of documents
   * and also its creation is in the hot path of the initial page load,
   * so we should spend less time creating multiple RxStorageInstances.
   */
  sharding: {
    shards: 1,
    mode: 'collection'
  }
});
exports.INTERNAL_STORE_SCHEMA = INTERNAL_STORE_SCHEMA;
function getPrimaryKeyOfInternalDocument(key, context) {
  return (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(INTERNAL_STORE_SCHEMA, {
    key: key,
    context: context
  });
}

/**
 * Returns all internal documents
 * with context 'collection'
 */
function getAllCollectionDocuments(_x, _x2) {
  return _getAllCollectionDocuments.apply(this, arguments);
}
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
function _getAllCollectionDocuments() {
  _getAllCollectionDocuments = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(storageStatics, storageInstance) {
    var getAllQueryPrepared, queryResult, allDocs;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          getAllQueryPrepared = storageStatics.prepareQuery(storageInstance.schema, {
            selector: {
              context: INTERNAL_CONTEXT_COLLECTION
            },
            sort: [{
              id: 'asc'
            }],
            skip: 0
          });
          _context.next = 3;
          return storageInstance.query(getAllQueryPrepared);
        case 3:
          queryResult = _context.sent;
          allDocs = queryResult.documents;
          return _context.abrupt("return", allDocs);
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _getAllCollectionDocuments.apply(this, arguments);
}
var STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
exports.STORAGE_TOKEN_DOCUMENT_KEY = STORAGE_TOKEN_DOCUMENT_KEY;
var STORAGE_TOKEN_DOCUMENT_ID = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
exports.STORAGE_TOKEN_DOCUMENT_ID = STORAGE_TOKEN_DOCUMENT_ID;
function ensureStorageTokenDocumentExists(_x3) {
  return _ensureStorageTokenDocumentExists.apply(this, arguments);
}
function _ensureStorageTokenDocumentExists() {
  _ensureStorageTokenDocumentExists = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(rxDatabase) {
    var storageToken, passwordHash, docData, writeResult, error, conflictError, storageTokenDocInDb;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          /**
           * To have less read-write cycles,
           * we just try to insert a new document
           * and only fetch the existing one if a conflict happened.
           */
          storageToken = (0, _utils.randomCouchString)(10);
          passwordHash = rxDatabase.password ? (0, _utils.fastUnsecureHash)(rxDatabase.password) : undefined;
          docData = {
            id: STORAGE_TOKEN_DOCUMENT_ID,
            context: INTERNAL_CONTEXT_STORAGE_TOKEN,
            key: STORAGE_TOKEN_DOCUMENT_KEY,
            data: {
              token: storageToken,
              /**
               * We add the instance token here
               * to be able to detect if a given RxDatabase instance
               * is the first instance that was ever created
               * or if databases have existed earlier on that storage
               * with the same database name.
               */
              instanceToken: rxDatabase.token,
              passwordHash: passwordHash
            },
            _deleted: false,
            _meta: (0, _utils.getDefaultRxDocumentMeta)(),
            _rev: (0, _utils.getDefaultRevision)(),
            _attachments: {}
          };
          _context2.next = 5;
          return rxDatabase.internalStore.bulkWrite([{
            document: docData
          }], 'internal-add-storage-token');
        case 5:
          writeResult = _context2.sent;
          if (!writeResult.success[STORAGE_TOKEN_DOCUMENT_ID]) {
            _context2.next = 8;
            break;
          }
          return _context2.abrupt("return", writeResult.success[STORAGE_TOKEN_DOCUMENT_ID]);
        case 8:
          /**
           * If we get a 409 error,
           * it means another instance already inserted the storage token.
           * So we get that token from the database and return that one.
           */
          error = (0, _utils.ensureNotFalsy)(writeResult.error[STORAGE_TOKEN_DOCUMENT_ID]);
          if (!(error.isError && error.status === 409)) {
            _context2.next = 15;
            break;
          }
          conflictError = error;
          if (!(passwordHash && passwordHash !== conflictError.documentInDb.data.passwordHash)) {
            _context2.next = 13;
            break;
          }
          throw (0, _rxError.newRxError)('DB1', {
            passwordHash: passwordHash,
            existingPasswordHash: conflictError.documentInDb.data.passwordHash
          });
        case 13:
          storageTokenDocInDb = conflictError.documentInDb;
          return _context2.abrupt("return", (0, _utils.ensureNotFalsy)(storageTokenDocInDb));
        case 15:
          throw error;
        case 16:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _ensureStorageTokenDocumentExists.apply(this, arguments);
}
function addConnectedStorageToCollection(_x4, _x5, _x6) {
  return _addConnectedStorageToCollection.apply(this, arguments);
}
/**
 * returns the primary for a given collection-data
 * used in the internal store of a RxDatabase
 */
function _addConnectedStorageToCollection() {
  _addConnectedStorageToCollection = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(collection, storageCollectionName, schema) {
    var collectionNameWithVersion, collectionDocId, collectionDoc, saveData, alreadyThere;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          collectionNameWithVersion = _collectionNamePrimary(collection.name, collection.schema.jsonSchema);
          collectionDocId = getPrimaryKeyOfInternalDocument(collectionNameWithVersion, INTERNAL_CONTEXT_COLLECTION);
        case 2:
          if (!true) {
            _context3.next = 23;
            break;
          }
          _context3.next = 5;
          return (0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, collectionDocId);
        case 5:
          collectionDoc = _context3.sent;
          saveData = (0, _utils.clone)((0, _utils.ensureNotFalsy)(collectionDoc));
          /**
           * Add array if not exist for backwards compatibility
           * TODO remove this in 2023
           */
          if (!saveData.data.connectedStorages) {
            saveData.data.connectedStorages = [];
          }

          // do nothing if already in array
          alreadyThere = saveData.data.connectedStorages.find(function (row) {
            return row.collectionName === storageCollectionName && row.schema.version === schema.version;
          });
          if (!alreadyThere) {
            _context3.next = 11;
            break;
          }
          return _context3.abrupt("return");
        case 11:
          // otherwise add to array and save
          saveData.data.connectedStorages.push({
            collectionName: storageCollectionName,
            schema: schema
          });
          _context3.prev = 12;
          _context3.next = 15;
          return (0, _rxStorageHelper.writeSingle)(collection.database.internalStore, {
            previous: (0, _utils.ensureNotFalsy)(collectionDoc),
            document: saveData
          }, 'add-connected-storage-to-collection');
        case 15:
          _context3.next = 21;
          break;
        case 17:
          _context3.prev = 17;
          _context3.t0 = _context3["catch"](12);
          if ((0, _rxError.isBulkWriteConflictError)(_context3.t0)) {
            _context3.next = 21;
            break;
          }
          throw _context3.t0;
        case 21:
          _context3.next = 2;
          break;
        case 23:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[12, 17]]);
  }));
  return _addConnectedStorageToCollection.apply(this, arguments);
}
function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}
//# sourceMappingURL=rx-database-internal-store.js.map