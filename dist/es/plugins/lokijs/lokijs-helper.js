import { createLokiLocalState } from './rx-storage-instance-loki';
import lokijs from 'lokijs';
import { add as unloadAdd } from 'unload';
import { ensureNotFalsy, flatClone, promiseWait, randomCouchString } from '../../util';
import { LokiSaveQueue } from './loki-save-queue';
import { newRxError } from '../../rx-error';
import { getBroadcastChannelReference } from '../../rx-storage-multiinstance';
import { getLeaderElectorByBroadcastChannel } from '../leader-election';

/**
 * If the local state must be used, that one is returned.
 * Returns false if a remote instance must be used.
 */
function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }

        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }

    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }

    pact.s = state;
    pact.v = value;
    var observer = pact.o;

    if (observer) {
      observer(pact);
    }
  }
}

var _Pact = /*#__PURE__*/function () {
  function _Pact() {}

  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;

    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;

      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }

        return result;
      } else {
        return this;
      }
    }

    this.o = function (_this) {
      try {
        var value = _this.v;

        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };

    return result;
  };

  return _Pact;
}();

function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}

function _for(test, update, body) {
  var stage;

  for (;;) {
    var shouldContinue = test();

    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }

    if (!shouldContinue) {
      return result;
    }

    if (shouldContinue.then) {
      stage = 0;
      break;
    }

    var result = body();

    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }

    if (update) {
      var updateValue = update();

      if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }

  var pact = new _Pact();

  var reject = _settle.bind(null, pact, 2);

  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;

  function _resumeAfterBody(value) {
    result = value;

    do {
      if (update) {
        updateValue = update();

        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }

      shouldContinue = test();

      if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
        _settle(pact, 1, result);

        return;
      }

      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }

      result = body();

      if (_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);

    result.then(_resumeAfterBody).then(void 0, reject);
  }

  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();

      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      _settle(pact, 1, result);
    }
  }

  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
}

export var mustUseLocalState = function mustUseLocalState(instance) {
  try {
    if (instance.closed) {
      /**
       * If this happens, it means that RxDB made a call to an already closed storage instance.
       * This must never happen because when RxDB closes a collection or database,
       * all tasks must be cleared so that no more calls are made the the storage.
       */
      throw newRxError('SNH', {
        args: {
          instanceClosed: instance.closed,
          databaseName: instance.databaseName,
          collectionName: instance.collectionName
        }
      });
    }

    if (instance.internals.localState) {
      return Promise.resolve(instance.internals.localState);
    }

    var leaderElector = ensureNotFalsy(instance.internals.leaderElector);
    return Promise.resolve(waitUntilHasLeader(leaderElector)).then(function () {
      /**
       * It might already have a localState after the applying
       * because another subtask also called mustUSeLocalState()
       */
      if (instance.internals.localState) {
        return instance.internals.localState;
      }

      if (leaderElector.isLeader && !instance.internals.localState) {
        // own is leader, use local instance
        instance.internals.localState = createLokiLocalState({
          databaseInstanceToken: instance.databaseInstanceToken,
          databaseName: instance.databaseName,
          collectionName: instance.collectionName,
          options: instance.options,
          schema: instance.schema,
          multiInstance: instance.internals.leaderElector ? true : false
        }, instance.databaseSettings);
        return ensureNotFalsy(instance.internals.localState);
      } else {
        // other is leader, send message to remote leading instance
        return false;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var waitUntilHasLeader = function waitUntilHasLeader(leaderElector) {
  try {
    var _temp13 = _for(function () {
      return !leaderElector.hasLeader;
    }, void 0, function () {
      return Promise.resolve(leaderElector.applyOnce()).then(function () {
        return Promise.resolve(promiseWait(0)).then(function () {});
      });
    });

    return Promise.resolve(_temp13 && _temp13.then ? _temp13.then(function () {}) : void 0);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Handles a request that came from a remote instance via requestRemoteInstance()
 * Runs the requested operation over the local db instance and sends back the result.
 */
export var handleRemoteRequest = function handleRemoteRequest(instance, msg) {
  try {
    var _temp9 = function () {
      if (msg.type === LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.requestId && msg.databaseName === instance.databaseName && msg.collectionName === instance.collectionName && !msg.response) {
        var _temp10 = function _temp10() {
          var response = {
            response: true,
            requestId: msg.requestId,
            databaseName: instance.databaseName,
            collectionName: instance.collectionName,
            result: _result,
            isError: _isError,
            type: msg.type
          };
          ensureNotFalsy(instance.internals.leaderElector).broadcastChannel.postMessage(response);
        };

        var operation = msg.operation;
        var params = msg.params;

        var _result;

        var _isError = false;

        var _temp11 = _catch(function () {
          var _ref2;

          return Promise.resolve((_ref2 = instance)[operation].apply(_ref2, params)).then(function (_operation) {
            _result = _operation;
          });
        }, function (err) {
          console.dir(err);
          _isError = true;
          _result = err;
        });

        return _temp11 && _temp11.then ? _temp11.then(_temp10) : _temp10(_temp11);
      }
    }();

    return Promise.resolve(_temp9 && _temp9.then ? _temp9.then(function () {}) : void 0);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * For multi-instance usage, we send requests to the RxStorage
 * to the current leading instance over the BroadcastChannel.
 */
export var requestRemoteInstance = function requestRemoteInstance(instance, operation, params) {
  try {
    var isRxStorageInstanceLoki = typeof instance.query === 'function';
    var messageType = isRxStorageInstanceLoki ? LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE : LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE;
    var leaderElector = ensureNotFalsy(instance.internals.leaderElector);
    return Promise.resolve(waitUntilHasLeader(leaderElector)).then(function () {
      var broadcastChannel = leaderElector.broadcastChannel;
      var whenDeathListener;
      var leaderDeadPromise = new Promise(function (res) {
        whenDeathListener = function whenDeathListener(msg) {
          if (msg.context === 'leader' && msg.action === 'death') {
            res({
              retry: true
            });
          }
        };

        broadcastChannel.addEventListener('internal', whenDeathListener);
      });
      var requestId = randomCouchString(12);
      var responseListener;
      var responsePromise = new Promise(function (res, _rej) {
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
      return Promise.race([leaderDeadPromise, responsePromise]).then(function (firstResolved) {
        // clean up listeners
        broadcastChannel.removeEventListener('message', responseListener);
        broadcastChannel.removeEventListener('internal', whenDeathListener);

        if (firstResolved.retry) {
          var _ref;

          /**
           * The leader died while a remote request was running
           * we re-run the whole operation.
           * We cannot just re-run requestRemoteInstance()
           * because the current instance might be the new leader now
           * and then we have to use the local state instead of requesting the remote.
           */
          return (_ref = instance)[operation].apply(_ref, params);
        } else {
          if (firstResolved.error) {
            throw firstResolved.error;
          } else {
            return firstResolved.result;
          }
        }
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var closeLokiCollections = function closeLokiCollections(databaseName, collections) {
  try {
    return Promise.resolve(LOKI_DATABASE_STATE_BY_NAME.get(databaseName)).then(function (databaseState) {
      if (!databaseState) {
        // already closed
        return;
      }

      return Promise.resolve(databaseState.saveQueue.run()).then(function () {
        collections.forEach(function (collection) {
          var collectionName = collection.name;
          delete databaseState.collections[collectionName];
        });

        var _temp5 = function () {
          if (Object.keys(databaseState.collections).length === 0) {
            // all collections closed -> also close database
            LOKI_DATABASE_STATE_BY_NAME["delete"](databaseName);
            databaseState.unloads.forEach(function (u) {
              return u.remove();
            });
            return Promise.resolve(new Promise(function (res, rej) {
              databaseState.database.close(function (err) {
                err ? rej(err) : res();
              });
            })).then(function () {});
          }
        }();

        if (_temp5 && _temp5.then) return _temp5.then(function () {});
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * This function is at lokijs-helper
 * because we need it in multiple places.
 */

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

    databaseState = function () {
      try {
        var _temp3 = function _temp3() {
          /**
           * Autosave database on process end
           */
          var unloads = [];

          if (hasPersistence) {
            unloads.push(unloadAdd(function () {
              return lokiSaveQueue.run();
            }));
          }

          var state = {
            database: database,
            databaseSettings: useSettings,
            saveQueue: lokiSaveQueue,
            collections: {},
            unloads: unloads
          };
          return state;
        };

        var persistenceMethod = hasPersistence ? 'adapter' : 'memory';

        if (databaseSettings.persistenceMethod) {
          persistenceMethod = databaseSettings.persistenceMethod;
        }

        var useSettings = Object.assign( // defaults
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
        var database = new lokijs(databaseName + '.db', flatClone(useSettings));
        var lokiSaveQueue = new LokiSaveQueue(database, useSettings);
        /**
         * Wait until all data is loaded from persistence adapter.
         * Wrap the loading into the saveQueue to ensure that when many
         * collections are created at the same time, the load-calls do not interfere
         * with each other and cause error logs.
         */

        var _temp4 = function () {
          if (hasPersistence) {
            var loadDatabasePromise = new Promise(function (res, rej) {
              try {
                database.loadDatabase({
                  recursiveWait: false
                }, function (err) {
                  if (useSettings.autoloadCallback) {
                    useSettings.autoloadCallback(err);
                  }

                  err ? rej(err) : res();
                });
              } catch (err) {
                rej(err);
              }
            });
            lokiSaveQueue.saveQueue = lokiSaveQueue.saveQueue.then(function () {
              return loadDatabasePromise;
            });
            return Promise.resolve(loadDatabasePromise).then(function () {});
          }
        }();

        return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
      } catch (e) {
        return Promise.reject(e);
      }
    }();

    LOKI_DATABASE_STATE_BY_NAME.set(databaseName, databaseState);
  }

  return databaseState;
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
//# sourceMappingURL=lokijs-helper.js.map