"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OPEN_LOKIJS_STORAGE_INSTANCES = exports.LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = exports.LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = exports.LOKIJS_COLLECTION_DEFAULT_OPTIONS = exports.CHANGES_COLLECTION_SUFFIX = void 0;
exports.closeLokiCollections = closeLokiCollections;
exports.getLokiDatabase = getLokiDatabase;
exports.getLokiEventKey = getLokiEventKey;
exports.stripLokiKey = stripLokiKey;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _lokijs = _interopRequireDefault(require("lokijs"));

var _unload = require("unload");

var _util = require("../../util");

var _lokiSaveQueue = require("./loki-save-queue");

var CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
exports.CHANGES_COLLECTION_SUFFIX = CHANGES_COLLECTION_SUFFIX;
var LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request';
exports.LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE;
var LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request-key-object';
/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */

exports.LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE;

function stripLokiKey(docData) {
  if (!docData.$loki) {
    return docData;
  }

  var cloned = (0, _util.flatClone)(docData);
  delete cloned.$loki;
  return cloned;
}

function getLokiEventKey(isLocal, primary, revision) {
  var prefix = isLocal ? 'local' : 'non-local';
  var eventKey = prefix + '|' + primary + '|' + revision;
  return eventKey;
}
/**
 * Used to check in tests if all instances have been cleaned up.
 */


var OPEN_LOKIJS_STORAGE_INSTANCES = new Set();
exports.OPEN_LOKIJS_STORAGE_INSTANCES = OPEN_LOKIJS_STORAGE_INSTANCES;
var LOKIJS_COLLECTION_DEFAULT_OPTIONS = {
  disableChangesApi: true,
  disableMeta: true,
  disableDeltaChangesApi: true,
  disableFreeze: true,
  // TODO use 'immutable' like WatermelonDB does it
  cloneMethod: 'shallow-assign',
  clone: false,
  transactional: false,
  autoupdate: false
};
exports.LOKIJS_COLLECTION_DEFAULT_OPTIONS = LOKIJS_COLLECTION_DEFAULT_OPTIONS;
var LOKI_DATABASE_STATE_BY_NAME = new Map();

function getLokiDatabase(databaseName, databaseSettings, rxDatabaseIdleQueue) {
  var databaseState = LOKI_DATABASE_STATE_BY_NAME.get(databaseName);

  if (!databaseState) {
    /**
     * We assume that as soon as an adapter is passed,
     * the database has to be persistend.
     */
    var hasPersistence = !!databaseSettings.adapter;
    databaseState = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var persistenceMethod, useSettings, database, saveQueue, unloads, state;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              persistenceMethod = hasPersistence ? 'adapter' : 'memory';

              if (databaseSettings.persistenceMethod) {
                persistenceMethod = databaseSettings.persistenceMethod;
              }

              useSettings = Object.assign( // defaults
              {
                autoload: hasPersistence,
                persistenceMethod: persistenceMethod,
                verbose: true
              }, databaseSettings, // overwrites
              {
                /**
                 * RxDB uses its custom load and save handling
                 * so we disable the LokiJS save/load handlers.
                 */
                autoload: false,
                autosave: false,
                throttledSaves: false
              });
              database = new _lokijs["default"](databaseName + '.db', (0, _util.flatClone)(useSettings));
              saveQueue = new _lokiSaveQueue.LokiSaveQueue(database, useSettings, rxDatabaseIdleQueue);
              /**
               * Wait until all data is loaded from persistence adapter.
               * Wrap the loading into the saveQueue to ensure that when many
               * collections are created a the same time, the load-calls do not interfer
               * with each other and cause error logs.
               */

              if (!hasPersistence) {
                _context.next = 8;
                break;
              }

              _context.next = 8;
              return saveQueue.runningSavesIdleQueue.wrapCall(function () {
                return new Promise(function (res, rej) {
                  database.loadDatabase({}, function (err) {
                    if (useSettings.autoloadCallback) {
                      useSettings.autoloadCallback(err);
                    }

                    err ? rej(err) : res();
                  });
                });
              });

            case 8:
              /**
               * Autosave database on process end
               */
              unloads = [];

              if (hasPersistence) {
                unloads.push((0, _unload.add)(function () {
                  return saveQueue.run();
                }));
              }

              state = {
                database: database,
                databaseSettings: useSettings,
                saveQueue: saveQueue,
                collections: {},
                unloads: unloads
              };
              return _context.abrupt("return", state);

            case 12:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }))();
    LOKI_DATABASE_STATE_BY_NAME.set(databaseName, databaseState);
  }

  return databaseState;
}

function closeLokiCollections(_x, _x2) {
  return _closeLokiCollections.apply(this, arguments);
}

function _closeLokiCollections() {
  _closeLokiCollections = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(databaseName, collections) {
    var databaseState;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return LOKI_DATABASE_STATE_BY_NAME.get(databaseName);

          case 2:
            databaseState = _context2.sent;

            if (databaseState) {
              _context2.next = 5;
              break;
            }

            return _context2.abrupt("return");

          case 5:
            _context2.next = 7;
            return databaseState.saveQueue.run();

          case 7:
            collections.forEach(function (collection) {
              var collectionName = collection.name;
              delete databaseState.collections[collectionName];
            });

            if (!(Object.keys(databaseState.collections).length === 0)) {
              _context2.next = 13;
              break;
            }

            // all collections closed -> also close database
            LOKI_DATABASE_STATE_BY_NAME["delete"](databaseName);
            databaseState.unloads.forEach(function (u) {
              return u.remove();
            });
            _context2.next = 13;
            return new Promise(function (res, rej) {
              databaseState.database.close(function (err) {
                err ? rej(err) : res();
              });
            });

          case 13:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _closeLokiCollections.apply(this, arguments);
}
//# sourceMappingURL=lokijs-helper.js.map