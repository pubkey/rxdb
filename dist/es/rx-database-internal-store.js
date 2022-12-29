import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { isBulkWriteConflictError, newRxError } from './rx-error';
import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData } from './rx-schema-helper';
import { getSingleDocument, writeSingle } from './rx-storage-helper';
import { clone, ensureNotFalsy, fastUnsecureHash, getDefaultRevision, getDefaultRxDocumentMeta, randomCouchString } from './util';
export var INTERNAL_CONTEXT_COLLECTION = 'collection';
export var INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';

/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */
export var INTERNAL_STORE_SCHEMA_TITLE = 'RxInternalDocument';
export var INTERNAL_STORE_SCHEMA = fillWithDefaultSettings({
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
export function getPrimaryKeyOfInternalDocument(key, context) {
  return getComposedPrimaryKeyOfDocumentData(INTERNAL_STORE_SCHEMA, {
    key: key,
    context: context
  });
}

/**
 * Returns all internal documents
 * with context 'collection'
 */
export function getAllCollectionDocuments(_x, _x2) {
  return _getAllCollectionDocuments.apply(this, arguments);
}

/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
function _getAllCollectionDocuments() {
  _getAllCollectionDocuments = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(storageStatics, storageInstance) {
    var getAllQueryPrepared, queryResult, allDocs;
    return _regeneratorRuntime.wrap(function _callee$(_context) {
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
export var STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
export var STORAGE_TOKEN_DOCUMENT_ID = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
export function ensureStorageTokenDocumentExists(_x3) {
  return _ensureStorageTokenDocumentExists.apply(this, arguments);
}
function _ensureStorageTokenDocumentExists() {
  _ensureStorageTokenDocumentExists = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(rxDatabase) {
    var storageToken, passwordHash, docData, writeResult, error, conflictError, storageTokenDocInDb;
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          /**
           * To have less read-write cycles,
           * we just try to insert a new document
           * and only fetch the existing one if a conflict happened.
           */
          storageToken = randomCouchString(10);
          passwordHash = rxDatabase.password ? fastUnsecureHash(rxDatabase.password) : undefined;
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
            _meta: getDefaultRxDocumentMeta(),
            _rev: getDefaultRevision(),
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
          error = ensureNotFalsy(writeResult.error[STORAGE_TOKEN_DOCUMENT_ID]);
          if (!(error.isError && error.status === 409)) {
            _context2.next = 15;
            break;
          }
          conflictError = error;
          if (!(passwordHash && passwordHash !== conflictError.documentInDb.data.passwordHash)) {
            _context2.next = 13;
            break;
          }
          throw newRxError('DB1', {
            passwordHash: passwordHash,
            existingPasswordHash: conflictError.documentInDb.data.passwordHash
          });
        case 13:
          storageTokenDocInDb = conflictError.documentInDb;
          return _context2.abrupt("return", ensureNotFalsy(storageTokenDocInDb));
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
export function addConnectedStorageToCollection(_x4, _x5, _x6) {
  return _addConnectedStorageToCollection.apply(this, arguments);
}

/**
 * returns the primary for a given collection-data
 * used in the internal store of a RxDatabase
 */
function _addConnectedStorageToCollection() {
  _addConnectedStorageToCollection = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(collection, storageCollectionName, schema) {
    var collectionNameWithVersion, collectionDocId, collectionDoc, saveData, alreadyThere;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
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
          return getSingleDocument(collection.database.internalStore, collectionDocId);
        case 5:
          collectionDoc = _context3.sent;
          saveData = clone(ensureNotFalsy(collectionDoc));
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
          return writeSingle(collection.database.internalStore, {
            previous: ensureNotFalsy(collectionDoc),
            document: saveData
          }, 'add-connected-storage-to-collection');
        case 15:
          _context3.next = 21;
          break;
        case 17:
          _context3.prev = 17;
          _context3.t0 = _context3["catch"](12);
          if (isBulkWriteConflictError(_context3.t0)) {
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
export function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}
//# sourceMappingURL=rx-database-internal-store.js.map