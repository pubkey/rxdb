import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { createLokiLocalState } from './rx-storage-instance-loki';
import lokijs from 'lokijs';
import { add as unloadAdd } from 'unload';
import { ensureNotFalsy, flatClone, promiseWait, randomCouchString } from '../utils';
import { LokiSaveQueue } from './loki-save-queue';
import { newRxError } from '../../rx-error';
import objectPath from 'object-path';
import { getBroadcastChannelReference } from '../../rx-storage-multiinstance';
import { getLeaderElectorByBroadcastChannel } from '../leader-election';
export var CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
export var LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request';
export var LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request-key-object';
export var RX_STORAGE_NAME_LOKIJS = 'lokijs';

/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */
export function stripLokiKey(docData) {
  if (!docData.$loki) {
    return docData;
  }
  var cloned = flatClone(docData);

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
            database = new lokijs(databaseName + '.db', flatClone(useSettings));
            lokiSaveQueue = new LokiSaveQueue(database, useSettings);
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
export function getLokiSortComparator(_schema, query) {
  if (!query.sort) {
    throw newRxError('SNH', {
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
      var valueA = objectPath.get(a, fieldName);
      var valueB = objectPath.get(b, fieldName);
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
export function getLokiLeaderElector(databaseInstanceToken, broadcastChannelRefObject, databaseName) {
  var broadcastChannel = getBroadcastChannelReference(databaseInstanceToken, databaseName, broadcastChannelRefObject);
  var elector = getLeaderElectorByBroadcastChannel(broadcastChannel);
  return elector;
}

/**
 * For multi-instance usage, we send requests to the RxStorage
 * to the current leading instance over the BroadcastChannel.
 */
export function requestRemoteInstance(_x3, _x4, _x5) {
  return _requestRemoteInstance.apply(this, arguments);
}

/**
 * Handles a request that came from a remote instance via requestRemoteInstance()
 * Runs the requested operation over the local db instance and sends back the result.
 */
function _requestRemoteInstance() {
  _requestRemoteInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(instance, operation, params) {
    var isRxStorageInstanceLoki, messageType, leaderElector, broadcastChannel, whenDeathListener, leaderDeadPromise, requestId, responseListener, responsePromise;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          isRxStorageInstanceLoki = typeof instance.query === 'function';
          messageType = isRxStorageInstanceLoki ? LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE : LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE;
          leaderElector = ensureNotFalsy(instance.internals.leaderElector);
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
          requestId = randomCouchString(12);
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
export function handleRemoteRequest(_x6, _x7) {
  return _handleRemoteRequest.apply(this, arguments);
}
function _handleRemoteRequest() {
  _handleRemoteRequest = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(instance, msg) {
    var operation, params, result, isError, _ref3, response;
    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
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
          ensureNotFalsy(instance.internals.leaderElector).broadcastChannel.postMessage(response);
        case 17:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[4, 10]]);
  }));
  return _handleRemoteRequest.apply(this, arguments);
}
export function waitUntilHasLeader(_x8) {
  return _waitUntilHasLeader.apply(this, arguments);
}

/**
 * If the local state must be used, that one is returned.
 * Returns false if a remote instance must be used.
 */
function _waitUntilHasLeader() {
  _waitUntilHasLeader = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(leaderElector) {
    return _regeneratorRuntime.wrap(function _callee5$(_context5) {
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
          return promiseWait(0);
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
export function mustUseLocalState(_x9) {
  return _mustUseLocalState.apply(this, arguments);
}
function _mustUseLocalState() {
  _mustUseLocalState = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(instance) {
    var leaderElector;
    return _regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          if (!instance.closed) {
            _context6.next = 2;
            break;
          }
          throw newRxError('SNH', {
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
          leaderElector = ensureNotFalsy(instance.internals.leaderElector);
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
          instance.internals.localState = createLokiLocalState({
            databaseInstanceToken: instance.databaseInstanceToken,
            databaseName: instance.databaseName,
            collectionName: instance.collectionName,
            options: instance.options,
            schema: instance.schema,
            multiInstance: instance.internals.leaderElector ? true : false
          }, instance.databaseSettings);
          return _context6.abrupt("return", ensureNotFalsy(instance.internals.localState));
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