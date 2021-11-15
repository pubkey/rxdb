"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._handleFromStorageInstance = _handleFromStorageInstance;
exports._handleToStorageInstance = _handleToStorageInstance;
exports.createRxCollectionStorageInstances = createRxCollectionStorageInstances;
exports.fillObjectDataBeforeInsert = fillObjectDataBeforeInsert;
exports.getCollectionLocalInstanceName = getCollectionLocalInstanceName;
exports.writeToStorageInstance = writeToStorageInstance;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _util = require("./util");

var _rxError = require("./rx-error");

var _hooks = require("./hooks");

var _rxStorageHelper = require("./rx-storage-helper");

var _overwritable = require("./overwritable");

/**
 * Every write access on the storage engine,
 * goes throught this method
 * so we can run hooks and resolve stuff etc.
 */
function writeToStorageInstance(_x, _x2) {
  return _writeToStorageInstance.apply(this, arguments);
}
/**
 * wrappers to process document data beofre/after it goes to the storage instnace.
 * Used to handle keycompression, encryption etc
 */


function _writeToStorageInstance() {
  _writeToStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(collection, writeRow) {
    var overwrite,
        toStorageInstance,
        writeResult,
        ret,
        _args2 = arguments;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            overwrite = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : false;
            toStorageInstance = {
              previous: writeRow.previous ? _handleToStorageInstance(collection, (0, _util.flatClone)(writeRow.previous)) : undefined,
              document: _handleToStorageInstance(collection, (0, _util.flatClone)(writeRow.document))
            };

          case 2:
            if (!true) {
              _context2.next = 16;
              break;
            }

            _context2.prev = 3;
            _context2.next = 6;
            return collection.database.lockedRun(function () {
              return (0, _rxStorageHelper.writeSingle)(collection.storageInstance, toStorageInstance);
            });

          case 6:
            writeResult = _context2.sent;
            // on success, just return the result
            ret = _handleFromStorageInstance(collection, writeResult);
            return _context2.abrupt("return", ret);

          case 11:
            _context2.prev = 11;
            _context2.t0 = _context2["catch"](3);
            return _context2.delegateYield( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
              var useErr, primary, singleRes;
              return _regenerator["default"].wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      useErr = _context2.t0;
                      primary = useErr.documentId;

                      if (!(overwrite && useErr.status === 409)) {
                        _context.next = 11;
                        break;
                      }

                      _context.next = 5;
                      return collection.database.lockedRun(function () {
                        return (0, _rxStorageHelper.getSingleDocument)(collection.storageInstance, primary);
                      });

                    case 5:
                      singleRes = _context.sent;

                      if (singleRes) {
                        _context.next = 8;
                        break;
                      }

                      throw (0, _rxError.newRxError)('SNH', {
                        args: {
                          writeRow: writeRow
                        }
                      });

                    case 8:
                      toStorageInstance.previous = singleRes; // now we can retry

                      _context.next = 16;
                      break;

                    case 11:
                      if (!(useErr.status === 409)) {
                        _context.next = 15;
                        break;
                      }

                      throw (0, _rxError.newRxError)('COL19', {
                        collection: collection.name,
                        id: primary,
                        pouchDbError: useErr,
                        data: writeRow
                      });

                    case 15:
                      throw useErr;

                    case 16:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee);
            })(), "t1", 14);

          case 14:
            _context2.next = 2;
            break;

          case 16:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, null, [[3, 11]]);
  }));
  return _writeToStorageInstance.apply(this, arguments);
}

function _handleToStorageInstance(col, data) {
  // ensure primary key has not been changed
  if (_overwritable.overwritable.isDevMode()) {
    col.schema.fillPrimaryKey(data);
  }

  data = col._crypter.encrypt(data);
  var hookParams = {
    collection: col,
    doc: data
  };
  (0, _hooks.runPluginHooks)('preWriteToStorageInstance', hookParams);
  return hookParams.doc;
}

function _handleFromStorageInstance(col, data) {
  var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var hookParams = {
    collection: col,
    doc: data
  };
  (0, _hooks.runPluginHooks)('postReadFromInstance', hookParams);

  if (noDecrypt) {
    return hookParams.doc;
  }

  return col._crypter.decrypt(hookParams.doc);
}
/**
 * fills in the default data.
 * This also clones the data.
 */


function fillObjectDataBeforeInsert(collection, data) {
  var useJson = collection.schema.fillObjectWithDefaults(data);
  useJson = collection.schema.fillPrimaryKey(useJson);
  return useJson;
}

function getCollectionLocalInstanceName(collectionName) {
  return collectionName + '-local';
}
/**
 * Creates the storage instances that are used internally in the collection
 */


function createRxCollectionStorageInstances(_x3, _x4, _x5, _x6) {
  return _createRxCollectionStorageInstances.apply(this, arguments);
}

function _createRxCollectionStorageInstances() {
  _createRxCollectionStorageInstances = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(collectionName, rxDatabase, storageInstanceCreationParams, instanceCreationOptions) {
    var _yield$Promise$all, storageInstance, localDocumentsStore;

    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            storageInstanceCreationParams.broadcastChannel = rxDatabase.broadcastChannel;
            _context3.next = 3;
            return Promise.all([rxDatabase.storage.createStorageInstance(storageInstanceCreationParams), rxDatabase.storage.createKeyObjectStorageInstance({
              databaseName: rxDatabase.name,

              /**
               * Use a different collection name for the local documents instance
               * so that the local docs can be kept while deleting the normal instance
               * after migration.
               */
              collectionName: getCollectionLocalInstanceName(collectionName),
              options: instanceCreationOptions,
              idleQueue: rxDatabase.idleQueue,
              broadcastChannel: rxDatabase.broadcastChannel
            })]);

          case 3:
            _yield$Promise$all = _context3.sent;
            storageInstance = _yield$Promise$all[0];
            localDocumentsStore = _yield$Promise$all[1];
            return _context3.abrupt("return", {
              storageInstance: storageInstance,
              localDocumentsStore: localDocumentsStore
            });

          case 7:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _createRxCollectionStorageInstances.apply(this, arguments);
}
//# sourceMappingURL=rx-collection-helper.js.map