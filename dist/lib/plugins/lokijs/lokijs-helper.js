"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OPEN_LOKIJS_STORAGE_INSTANCES = exports.LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = exports.LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = exports.LOKIJS_COLLECTION_DEFAULT_OPTIONS = exports.CHANGES_COLLECTION_SUFFIX = void 0;
exports.closeLokiCollections = closeLokiCollections;
exports.getLokiDatabase = getLokiDatabase;
exports.getLokiEventKey = getLokiEventKey;
exports.getLokiLeaderElector = getLokiLeaderElector;
exports.getLokiSortComparator = getLokiSortComparator;
exports.removeLokiLeaderElectorReference = removeLokiLeaderElectorReference;
exports.stripLokiKey = stripLokiKey;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _lokijs = _interopRequireDefault(require("lokijs"));

var _unload = require("unload");

var _util = require("../../util");

var _lokiSaveQueue = require("./loki-save-queue");

var _rxSchema = require("../../rx-schema");

var _rxError = require("../../rx-error");

var _broadcastChannel = require("broadcast-channel");

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

function getLokiDatabase(databaseName, databaseSettings) {
  var databaseState = LOKI_DATABASE_STATE_BY_NAME.get(databaseName);

  if (!databaseState) {
    /**
     * We assume that as soon as an adapter is passed,
     * the database has to be persistend.
     */
    var hasPersistence = !!databaseSettings.adapter;
    databaseState = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var persistenceMethod, useSettings, database, lokiSaveQueue, loadDatabasePromise, unloads, state;
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
              lokiSaveQueue = new _lokiSaveQueue.LokiSaveQueue(database, useSettings);
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
                unloads.push((0, _unload.add)(function () {
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

function closeLokiCollections(_x, _x2) {
  return _closeLokiCollections.apply(this, arguments);
}
/**
 * This function is at lokijs-helper
 * because we need it in multiple places.
 */


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

function getLokiSortComparator(schema, query) {
  var _ref2;

  var primaryKey = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey); // TODO if no sort is given, use sort by primary.
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
      throw (0, _rxError.newRxError)('SNH', {
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

function getLokiLeaderElector(storage, databaseName) {
  var electorState = storage.leaderElectorByLokiDbName.get(databaseName);

  if (!electorState) {
    var channelName = 'rxdb-lokijs-' + databaseName;
    var channel = new _broadcastChannel.BroadcastChannel(channelName);
    var elector = (0, _broadcastChannel.createLeaderElection)(channel);
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

function removeLokiLeaderElectorReference(storage, databaseName) {
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