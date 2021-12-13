import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import lokijs from 'lokijs';
import { add as unloadAdd } from 'unload';
import { flatClone } from '../../util';
import { LokiSaveQueue } from './loki-save-queue';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { newRxError } from '../../rx-error';
import { BroadcastChannel, createLeaderElection } from 'broadcast-channel';
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
export function getLokiDatabase(databaseName, databaseSettings) {
  var databaseState = LOKI_DATABASE_STATE_BY_NAME.get(databaseName);

  if (!databaseState) {
    /**
     * We assume that as soon as an adapter is passed,
     * the database has to be persistend.
     */
    var hasPersistence = !!databaseSettings.adapter;
    databaseState = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
      var persistenceMethod, useSettings, database, lokiSaveQueue, loadDatabasePromise, unloads, state;
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
              lokiSaveQueue = new LokiSaveQueue(database, useSettings);
              /**
               * Wait until all data is loaded from persistence adapter.
               * Wrap the loading into the saveQueue to ensure that when many
               * collections are created a the same time, the load-calls do not interfer
               * with each other and cause error logs.
               */

              if (!hasPersistence) {
                _context.next = 10;
                break;
              }

              loadDatabasePromise = new Promise(function (res, rej) {
                database.loadDatabase({}, function (err) {
                  if (useSettings.autoloadCallback) {
                    useSettings.autoloadCallback(err);
                  }

                  err ? rej(err) : res();
                });
              });
              lokiSaveQueue.saveQueue = lokiSaveQueue.saveQueue.then(function () {
                return loadDatabasePromise;
              });
              _context.next = 10;
              return loadDatabasePromise;

            case 10:
              /**
               * Autosave database on process end
               */
              unloads = [];

              if (hasPersistence) {
                unloads.push(unloadAdd(function () {
                  return lokiSaveQueue.run();
                }));
              }

              state = {
                database: database,
                databaseSettings: useSettings,
                saveQueue: lokiSaveQueue,
                collections: {},
                unloads: unloads
              };
              return _context.abrupt("return", state);

            case 14:
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
/**
 * This function is at lokijs-helper
 * because we need it in multiple places.
 */

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

export function getLokiSortComparator(schema, query) {
  var _ref2;

  var primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey); // TODO if no sort is given, use sort by primary.
  // This should be done inside of RxDB and not in the storage implementations.

  var sortOptions = query.sort ? query.sort : [(_ref2 = {}, _ref2[primaryKey] = 'asc', _ref2)];

  var fun = function fun(a, b) {
    var compareResult = 0; // 1 | -1

    sortOptions.find(function (sortPart) {
      var fieldName = Object.keys(sortPart)[0];
      var direction = Object.values(sortPart)[0];
      var directionMultiplier = direction === 'asc' ? 1 : -1;
      var valueA = a[fieldName];
      var valueB = b[fieldName];

      if (valueA === valueB) {
        return false;
      } else {
        if (valueA > valueB) {
          compareResult = 1 * directionMultiplier;
          return true;
        } else {
          compareResult = -1 * directionMultiplier;
          return true;
        }
      }
    });
    /**
     * Two different objects should never have the same sort position.
     * We ensure this by having the unique primaryKey in the sort params
     * at this.prepareQuery()
     */

    if (!compareResult) {
      throw newRxError('SNH', {
        args: {
          query: query,
          a: a,
          b: b
        }
      });
    }

    return compareResult;
  };

  return fun;
}
export function getLokiLeaderElector(storage, databaseName) {
  var electorState = storage.leaderElectorByLokiDbName.get(databaseName);

  if (!electorState) {
    var channelName = 'rxdb-lokijs-' + databaseName;
    var channel = new BroadcastChannel(channelName);
    var elector = createLeaderElection(channel);
    electorState = {
      leaderElector: elector,
      intancesCount: 1
    };
    storage.leaderElectorByLokiDbName.set(databaseName, electorState);
  } else {
    electorState.intancesCount = electorState.intancesCount + 1;
  }

  return electorState.leaderElector;
}
export function removeLokiLeaderElectorReference(storage, databaseName) {
  var electorState = storage.leaderElectorByLokiDbName.get(databaseName);

  if (electorState) {
    electorState.intancesCount = electorState.intancesCount - 1;

    if (electorState.intancesCount === 0) {
      electorState.leaderElector.broadcastChannel.close();
      storage.leaderElectorByLokiDbName["delete"](databaseName);
    }
  }
}
//# sourceMappingURL=lokijs-helper.js.map