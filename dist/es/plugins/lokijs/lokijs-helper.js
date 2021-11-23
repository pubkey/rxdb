import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import lokijs from 'lokijs';
import { add as unloadAdd } from 'unload';
import { flatClone } from '../../util';
import { LokiSaveQueue } from './loki-save-queue';
export var CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
export var LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request';
export var LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request-key-object';
/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */

export function stripLokiKey(docData) {
  if (!docData.$loki) {
    return docData;
  }

  var cloned = flatClone(docData);
  delete cloned.$loki;
  return cloned;
}
export function getLokiEventKey(isLocal, primary, revision) {
  var prefix = isLocal ? 'local' : 'non-local';
  var eventKey = prefix + '|' + primary + '|' + revision;
  return eventKey;
}
/**
 * Used to check in tests if all instances have been cleaned up.
 */

export var OPEN_LOKIJS_STORAGE_INSTANCES = new Set();
export var LOKIJS_COLLECTION_DEFAULT_OPTIONS = {
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
var LOKI_DATABASE_STATE_BY_NAME = new Map();
export function getLokiDatabase(databaseName, databaseSettings, rxDatabaseIdleQueue) {
  var databaseState = LOKI_DATABASE_STATE_BY_NAME.get(databaseName);

  if (!databaseState) {
    /**
     * We assume that as soon as an adapter is passed,
     * the database has to be persistend.
     */
    var hasPersistence = !!databaseSettings.adapter;
    databaseState = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
      var persistenceMethod, useSettings, database, saveQueue, unloads, state;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
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
              database = new lokijs(databaseName + '.db', flatClone(useSettings));
              saveQueue = new LokiSaveQueue(database, useSettings, rxDatabaseIdleQueue);
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
                unloads.push(unloadAdd(function () {
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
export function closeLokiCollections(_x, _x2) {
  return _closeLokiCollections.apply(this, arguments);
}

function _closeLokiCollections() {
  _closeLokiCollections = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(databaseName, collections) {
    var databaseState;
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
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