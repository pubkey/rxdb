"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxCollectionStorageInstance = createRxCollectionStorageInstance;
exports.fillObjectDataBeforeInsert = fillObjectDataBeforeInsert;
exports.removeCollectionStorages = removeCollectionStorages;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _utils = require("./plugins/utils");
var _rxSchemaHelper = require("./rx-schema-helper");
var _hooks = require("./hooks");
var _rxDatabaseInternalStore = require("./rx-database-internal-store");
var _rxStorageHelper = require("./rx-storage-helper");
/**
 * fills in the default data.
 * This also clones the data.
 */
function fillObjectDataBeforeInsert(schema, data) {
  var useJson = schema.fillObjectWithDefaults(data);
  useJson = (0, _rxSchemaHelper.fillPrimaryKey)(schema.primaryPath, schema.jsonSchema, useJson);
  useJson._meta = (0, _utils.getDefaultRxDocumentMeta)();
  if (!useJson.hasOwnProperty('_deleted')) {
    useJson._deleted = false;
  }
  if (!useJson.hasOwnProperty('_attachments')) {
    useJson._attachments = {};
  }
  if (!useJson.hasOwnProperty('_rev')) {
    useJson._rev = (0, _utils.getDefaultRevision)();
  }
  return useJson;
}

/**
 * Creates the storage instances that are used internally in the collection
 */
function createRxCollectionStorageInstance(_x, _x2) {
  return _createRxCollectionStorageInstance.apply(this, arguments);
}
/**
 * Removes the main storage of the collection
 * and all connected storages like the ones from the replication meta etc.
 */
function _createRxCollectionStorageInstance() {
  _createRxCollectionStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(rxDatabase, storageInstanceCreationParams) {
    var storageInstance;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
          _context.next = 3;
          return rxDatabase.storage.createStorageInstance(storageInstanceCreationParams);
        case 3:
          storageInstance = _context.sent;
          return _context.abrupt("return", storageInstance);
        case 5:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _createRxCollectionStorageInstance.apply(this, arguments);
}
function removeCollectionStorages(_x3, _x4, _x5, _x6, _x7, _x8) {
  return _removeCollectionStorages.apply(this, arguments);
}
function _removeCollectionStorages() {
  _removeCollectionStorages = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(storage, databaseInternalStorage, databaseInstanceToken, databaseName, collectionName,
  /**
   * If no hash function is provided,
   * we assume that the whole internal store is removed anyway
   * so we do not have to delete the meta documents.
   */
  hashFunction) {
    var allCollectionMetaDocs, relevantCollectionMetaDocs, removeStorages, alreadyAdded, writeRows;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return (0, _rxDatabaseInternalStore.getAllCollectionDocuments)(storage.statics, databaseInternalStorage);
        case 2:
          allCollectionMetaDocs = _context3.sent;
          relevantCollectionMetaDocs = allCollectionMetaDocs.filter(function (metaDoc) {
            return metaDoc.data.name === collectionName;
          });
          removeStorages = [];
          relevantCollectionMetaDocs.forEach(function (metaDoc) {
            removeStorages.push({
              collectionName: metaDoc.data.name,
              schema: metaDoc.data.schema,
              isCollection: true
            });
            metaDoc.data.connectedStorages.forEach(function (row) {
              return removeStorages.push({
                collectionName: row.collectionName,
                isCollection: false,
                schema: row.schema
              });
            });
          });

          // ensure uniqueness
          alreadyAdded = new Set();
          removeStorages = removeStorages.filter(function (row) {
            var key = row.collectionName + '||' + row.schema.version;
            if (alreadyAdded.has(key)) {
              return false;
            } else {
              alreadyAdded.add(key);
              return true;
            }
          });

          // remove all the storages
          _context3.next = 10;
          return Promise.all(removeStorages.map( /*#__PURE__*/function () {
            var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(row) {
              var storageInstance;
              return _regenerator["default"].wrap(function _callee2$(_context2) {
                while (1) switch (_context2.prev = _context2.next) {
                  case 0:
                    _context2.next = 2;
                    return storage.createStorageInstance({
                      collectionName: row.collectionName,
                      databaseInstanceToken: databaseInstanceToken,
                      databaseName: databaseName,
                      multiInstance: false,
                      options: {},
                      schema: row.schema
                    });
                  case 2:
                    storageInstance = _context2.sent;
                    _context2.next = 5;
                    return storageInstance.remove();
                  case 5:
                    if (!row.isCollection) {
                      _context2.next = 8;
                      break;
                    }
                    _context2.next = 8;
                    return (0, _hooks.runAsyncPluginHooks)('postRemoveRxCollection', {
                      storage: storage,
                      databaseName: databaseName,
                      collectionName: collectionName
                    });
                  case 8:
                  case "end":
                    return _context2.stop();
                }
              }, _callee2);
            }));
            return function (_x9) {
              return _ref.apply(this, arguments);
            };
          }()));
        case 10:
          if (!hashFunction) {
            _context3.next = 14;
            break;
          }
          writeRows = relevantCollectionMetaDocs.map(function (doc) {
            var writeDoc = (0, _rxStorageHelper.flatCloneDocWithMeta)(doc);
            writeDoc._deleted = true;
            writeDoc._meta.lwt = (0, _utils.now)();
            writeDoc._rev = (0, _utils.createRevision)(databaseInstanceToken, doc);
            return {
              previous: doc,
              document: writeDoc
            };
          });
          _context3.next = 14;
          return databaseInternalStorage.bulkWrite(writeRows, 'rx-database-remove-collection-all');
        case 14:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _removeCollectionStorages.apply(this, arguments);
}
//# sourceMappingURL=rx-collection-helper.js.map