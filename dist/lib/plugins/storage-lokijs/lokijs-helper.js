"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_STORAGE_NAME_LOKIJS = exports.OPEN_LOKIJS_STORAGE_INSTANCES = exports.LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = exports.LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = exports.LOKIJS_COLLECTION_DEFAULT_OPTIONS = exports.CHANGES_COLLECTION_SUFFIX = void 0;
exports.closeLokiCollections = closeLokiCollections;
exports.getLokiDatabase = getLokiDatabase;
exports.getLokiLeaderElector = getLokiLeaderElector;
exports.getLokiSortComparator = getLokiSortComparator;
exports.handleRemoteRequest = handleRemoteRequest;
exports.mustUseLocalState = mustUseLocalState;
exports.requestRemoteInstance = requestRemoteInstance;
exports.stripLokiKey = stripLokiKey;
exports.waitUntilHasLeader = waitUntilHasLeader;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxStorageInstanceLoki = require("./rx-storage-instance-loki");
var _lokijs = _interopRequireDefault(require("lokijs"));
var _unload = require("unload");
var _utils = require("../utils");
var _lokiSaveQueue = require("./loki-save-queue");
var _rxError = require("../../rx-error");
var _objectPath = _interopRequireDefault(require("object-path"));
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");
var _leaderElection = require("../leader-election");
var CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
exports.CHANGES_COLLECTION_SUFFIX = CHANGES_COLLECTION_SUFFIX;
var LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request';
exports.LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE;
var LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request-key-object';
exports.LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE;
var RX_STORAGE_NAME_LOKIJS = 'lokijs';

/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */
exports.RX_STORAGE_NAME_LOKIJS = RX_STORAGE_NAME_LOKIJS;
function stripLokiKey(docData) {
  if (!docData.$loki) {
    return docData;
  }
  var cloned = (0, _utils.flatClone)(docData);

  /**
   * In RxDB version 12.0.0,
   * we introduced the _meta field that already contains the last write time.
   * To be backwards compatible, we have to move the $lastWriteAt to the _meta field.
   * TODO remove this in the next major version.
   */
  if (cloned.$lastWriteAt) {
    cloned._meta = {
      lwt: cloned.$lastWriteAt
    };
    delete cloned.$lastWriteAt;
  }
  delete cloned.$loki;
  return cloned;
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
        while (1) switch (_context.prev = _context.next) {
          case 0:
            persistenceMethod = hasPersistence ? 'adapter' : 'memory';
            if (databaseSettings.persistenceMethod) {
              persistenceMethod = databaseSettings.persistenceMethod;
            }
            useSettings = Object.assign(
            // defaults
            {
              autoload: hasPersistence,
              persistenceMethod: persistenceMethod,
              verbose: true
            }, databaseSettings,
            // overwrites
            {
              /**
               * RxDB uses its custom load and save handling
               * so we disable the LokiJS save/load handlers.
               */
              autoload: false,
              autosave: false,
              throttledSaves: false
            });
            database = new _lokijs["default"](databaseName + '.db', (0, _utils.flatClone)(useSettings));
            lokiSaveQueue = new _lokiSaveQueue.LokiSaveQueue(database, useSettings);
            /**
             * Wait until all data is loaded from persistence adapter.
             * Wrap the loading into the saveQueue to ensure that when many
             * collections are created at the same time, the load-calls do not interfere
             * with each other and cause error logs.
             */
            if (!hasPersistence) {
              _context.next = 10;
              break;
            }
            loadDatabasePromise = new Promise(function (res, rej) {
              try {
                database.loadDatabase({
                  recursiveWait: false
                }, function (err) {
                  if (useSettings.autoloadCallback) {
                    useSettings.autoloadCallback(err);
                  }
                  if (err) {
                    rej(err);
                  } else {
                    res();
                  }
                });
              } catch (err) {
                rej(err);
              }
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
      while (1) switch (_context2.prev = _context2.next) {
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
              if (err) {
                rej(err);
              } else {
                res();
              }
            });
          });
        case 13:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _closeLokiCollections.apply(this, arguments);
}
function getLokiSortComparator(_schema, query) {
  if (!query.sort) {
    throw (0, _rxError.newRxError)('SNH', {
      query: query
    });
  }
  var sortOptions = query.sort;
  var fun = function fun(a, b) {
    var compareResult = 0; // 1 | -1
    sortOptions.find(function (sortPart) {
      var fieldName = Object.keys(sortPart)[0];
      var direction = Object.values(sortPart)[0];
      var directionMultiplier = direction === 'asc' ? 1 : -1;
      var valueA = _objectPath["default"].get(a, fieldName);
      var valueB = _objectPath["default"].get(b, fieldName);
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
     * which is added by RxDB if not existing yet.
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
function getLokiLeaderElector(databaseInstanceToken, broadcastChannelRefObject, databaseName) {
  var broadcastChannel = (0, _rxStorageMultiinstance.getBroadcastChannelReference)(databaseInstanceToken, databaseName, broadcastChannelRefObject);
  var elector = (0, _leaderElection.getLeaderElectorByBroadcastChannel)(broadcastChannel);
  return elector;
}

/**
 * For multi-instance usage, we send requests to the RxStorage
 * to the current leading instance over the BroadcastChannel.
 */
function requestRemoteInstance(_x3, _x4, _x5) {
  return _requestRemoteInstance.apply(this, arguments);
}
/**
 * Handles a request that came from a remote instance via requestRemoteInstance()
 * Runs the requested operation over the local db instance and sends back the result.
 */
function _requestRemoteInstance() {
  _requestRemoteInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(instance, operation, params) {
    var isRxStorageInstanceLoki, messageType, leaderElector, broadcastChannel, whenDeathListener, leaderDeadPromise, requestId, responseListener, responsePromise;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          isRxStorageInstanceLoki = typeof instance.query === 'function';
          messageType = isRxStorageInstanceLoki ? LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE : LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE;
          leaderElector = (0, _utils.ensureNotFalsy)(instance.internals.leaderElector);
          _context3.next = 5;
          return waitUntilHasLeader(leaderElector);
        case 5:
          broadcastChannel = leaderElector.broadcastChannel;
          leaderDeadPromise = new Promise(function (res) {
            whenDeathListener = function whenDeathListener(msg) {
              if (msg.context === 'leader' && msg.action === 'death') {
                res({
                  retry: true
                });
              }
            };
            broadcastChannel.addEventListener('internal', whenDeathListener);
          });
          requestId = (0, _utils.randomCouchString)(12);
          responsePromise = new Promise(function (res, _rej) {
            responseListener = function responseListener(msg) {
              if (msg.type === messageType && msg.response === true && msg.requestId === requestId) {
                if (msg.isError) {
                  res({
                    retry: false,
                    error: msg.result
                  });
                } else {
                  res({
                    retry: false,
                    result: msg.result
                  });
                }
              }
            };
            broadcastChannel.addEventListener('message', responseListener);
          }); // send out the request to the other instance
          broadcastChannel.postMessage({
            response: false,
            type: messageType,
            operation: operation,
            params: params,
            requestId: requestId,
            databaseName: instance.databaseName,
            collectionName: instance.collectionName
          });
          return _context3.abrupt("return", Promise.race([leaderDeadPromise, responsePromise]).then(function (firstResolved) {
            // clean up listeners
            broadcastChannel.removeEventListener('message', responseListener);
            broadcastChannel.removeEventListener('internal', whenDeathListener);
            if (firstResolved.retry) {
              var _ref2;
              /**
               * The leader died while a remote request was running
               * we re-run the whole operation.
               * We cannot just re-run requestRemoteInstance()
               * because the current instance might be the new leader now
               * and then we have to use the local state instead of requesting the remote.
               */
              return (_ref2 = instance)[operation].apply(_ref2, params);
            } else {
              if (firstResolved.error) {
                throw firstResolved.error;
              } else {
                return firstResolved.result;
              }
            }
          }));
        case 11:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _requestRemoteInstance.apply(this, arguments);
}
function handleRemoteRequest(_x6, _x7) {
  return _handleRemoteRequest.apply(this, arguments);
}
function _handleRemoteRequest() {
  _handleRemoteRequest = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(instance, msg) {
    var operation, params, result, isError, _ref3, response;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          if (!(msg.type === LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.requestId && msg.databaseName === instance.databaseName && msg.collectionName === instance.collectionName && !msg.response)) {
            _context4.next = 17;
            break;
          }
          operation = msg.operation;
          params = msg.params;
          isError = false;
          _context4.prev = 4;
          _context4.next = 7;
          return (_ref3 = instance)[operation].apply(_ref3, params);
        case 7:
          result = _context4.sent;
          _context4.next = 15;
          break;
        case 10:
          _context4.prev = 10;
          _context4.t0 = _context4["catch"](4);
          console.dir(_context4.t0);
          isError = true;
          result = _context4.t0;
        case 15:
          response = {
            response: true,
            requestId: msg.requestId,
            databaseName: instance.databaseName,
            collectionName: instance.collectionName,
            result: result,
            isError: isError,
            type: msg.type
          };
          (0, _utils.ensureNotFalsy)(instance.internals.leaderElector).broadcastChannel.postMessage(response);
        case 17:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[4, 10]]);
  }));
  return _handleRemoteRequest.apply(this, arguments);
}
function waitUntilHasLeader(_x8) {
  return _waitUntilHasLeader.apply(this, arguments);
}
/**
 * If the local state must be used, that one is returned.
 * Returns false if a remote instance must be used.
 */
function _waitUntilHasLeader() {
  _waitUntilHasLeader = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(leaderElector) {
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          if (leaderElector.hasLeader) {
            _context5.next = 7;
            break;
          }
          _context5.next = 3;
          return leaderElector.applyOnce();
        case 3:
          _context5.next = 5;
          return (0, _utils.promiseWait)(0);
        case 5:
          _context5.next = 0;
          break;
        case 7:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return _waitUntilHasLeader.apply(this, arguments);
}
function mustUseLocalState(_x9) {
  return _mustUseLocalState.apply(this, arguments);
}
function _mustUseLocalState() {
  _mustUseLocalState = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(instance) {
    var leaderElector;
    return _regenerator["default"].wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          if (!instance.closed) {
            _context6.next = 2;
            break;
          }
          throw (0, _rxError.newRxError)('SNH', {
            args: {
              instanceClosed: instance.closed,
              databaseName: instance.databaseName,
              collectionName: instance.collectionName
            }
          });
        case 2:
          if (!instance.internals.localState) {
            _context6.next = 4;
            break;
          }
          return _context6.abrupt("return", instance.internals.localState);
        case 4:
          leaderElector = (0, _utils.ensureNotFalsy)(instance.internals.leaderElector);
          _context6.next = 7;
          return waitUntilHasLeader(leaderElector);
        case 7:
          if (!instance.internals.localState) {
            _context6.next = 9;
            break;
          }
          return _context6.abrupt("return", instance.internals.localState);
        case 9:
          if (!(leaderElector.isLeader && !instance.internals.localState)) {
            _context6.next = 14;
            break;
          }
          // own is leader, use local instance
          instance.internals.localState = (0, _rxStorageInstanceLoki.createLokiLocalState)({
            databaseInstanceToken: instance.databaseInstanceToken,
            databaseName: instance.databaseName,
            collectionName: instance.collectionName,
            options: instance.options,
            schema: instance.schema,
            multiInstance: instance.internals.leaderElector ? true : false
          }, instance.databaseSettings);
          return _context6.abrupt("return", (0, _utils.ensureNotFalsy)(instance.internals.localState));
        case 14:
          return _context6.abrupt("return", false);
        case 15:
        case "end":
          return _context6.stop();
      }
    }, _callee6);
  }));
  return _mustUseLocalState.apply(this, arguments);
}
//# sourceMappingURL=lokijs-helper.js.map