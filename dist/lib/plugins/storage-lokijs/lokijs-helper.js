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
var _rxStorageInstanceLoki = require("./rx-storage-instance-loki");
var _lokijs = _interopRequireDefault(require("lokijs"));
var _unload = require("unload");
var _utils = require("../utils");
var _lokiSaveQueue = require("./loki-save-queue");
var _rxError = require("../../rx-error");
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
    databaseState = (async () => {
      var persistenceMethod = hasPersistence ? 'adapter' : 'memory';
      if (databaseSettings.persistenceMethod) {
        persistenceMethod = databaseSettings.persistenceMethod;
      }
      var useSettings = Object.assign(
      // defaults
      {
        autoload: hasPersistence,
        persistenceMethod,
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
      var database = new _lokijs.default(databaseName + '.db', (0, _utils.flatClone)(useSettings));
      var lokiSaveQueue = new _lokiSaveQueue.LokiSaveQueue(database, useSettings);

      /**
       * Wait until all data is loaded from persistence adapter.
       * Wrap the loading into the saveQueue to ensure that when many
       * collections are created at the same time, the load-calls do not interfere
       * with each other and cause error logs.
       */
      if (hasPersistence) {
        var loadDatabasePromise = new Promise((res, rej) => {
          try {
            database.loadDatabase({
              recursiveWait: false
            }, err => {
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
        lokiSaveQueue.saveQueue = lokiSaveQueue.saveQueue.then(() => loadDatabasePromise);
        await loadDatabasePromise;
      }

      /**
       * Autosave database on process end
       */
      var unloads = [];
      if (hasPersistence) {
        unloads.push((0, _unload.add)(() => lokiSaveQueue.run()));
      }
      var state = {
        database,
        databaseSettings: useSettings,
        saveQueue: lokiSaveQueue,
        collections: {},
        unloads
      };
      return state;
    })();
    LOKI_DATABASE_STATE_BY_NAME.set(databaseName, databaseState);
  }
  return databaseState;
}
async function closeLokiCollections(databaseName, collections) {
  var databaseState = await LOKI_DATABASE_STATE_BY_NAME.get(databaseName);
  if (!databaseState) {
    // already closed
    return;
  }
  await databaseState.saveQueue.run();
  collections.forEach(collection => {
    var collectionName = collection.name;
    delete databaseState.collections[collectionName];
  });
  if (Object.keys(databaseState.collections).length === 0) {
    // all collections closed -> also close database
    LOKI_DATABASE_STATE_BY_NAME.delete(databaseName);
    databaseState.unloads.forEach(u => u.remove());
    await new Promise((res, rej) => {
      databaseState.database.close(err => {
        if (err) {
          rej(err);
        } else {
          res();
        }
      });
    });
  }
}

/**
 * This function is at lokijs-helper
 * because we need it in multiple places.
 */
function getLokiSortComparator(_schema, query) {
  if (!query.sort) {
    throw (0, _rxError.newRxError)('SNH', {
      query
    });
  }
  var sortOptions = query.sort;
  var fun = (a, b) => {
    var compareResult = 0; // 1 | -1
    sortOptions.find(sortPart => {
      var fieldName = Object.keys(sortPart)[0];
      var direction = Object.values(sortPart)[0];
      var directionMultiplier = direction === 'asc' ? 1 : -1;
      var valueA = (0, _utils.getProperty)(a, fieldName);
      var valueB = (0, _utils.getProperty)(b, fieldName);
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
          query,
          a,
          b
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
async function requestRemoteInstance(instance, operation, params) {
  var isRxStorageInstanceLoki = typeof instance.query === 'function';
  var messageType = isRxStorageInstanceLoki ? LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE : LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE;
  var leaderElector = (0, _utils.ensureNotFalsy)(instance.internals.leaderElector);
  await waitUntilHasLeader(leaderElector);
  var broadcastChannel = leaderElector.broadcastChannel;
  var whenDeathListener;
  var leaderDeadPromise = new Promise(res => {
    whenDeathListener = msg => {
      if (msg.context === 'leader' && msg.action === 'death') {
        res({
          retry: true
        });
      }
    };
    broadcastChannel.addEventListener('internal', whenDeathListener);
  });
  var requestId = (0, _utils.randomCouchString)(12);
  var responseListener;
  var responsePromise = new Promise((res, _rej) => {
    responseListener = msg => {
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
  });

  // send out the request to the other instance
  broadcastChannel.postMessage({
    response: false,
    type: messageType,
    operation,
    params,
    requestId,
    databaseName: instance.databaseName,
    collectionName: instance.collectionName
  });
  return Promise.race([leaderDeadPromise, responsePromise]).then(firstResolved => {
    // clean up listeners
    broadcastChannel.removeEventListener('message', responseListener);
    broadcastChannel.removeEventListener('internal', whenDeathListener);
    if (firstResolved.retry) {
      /**
       * The leader died while a remote request was running
       * we re-run the whole operation.
       * We cannot just re-run requestRemoteInstance()
       * because the current instance might be the new leader now
       * and then we have to use the local state instead of requesting the remote.
       */
      return instance[operation](...params);
    } else {
      if (firstResolved.error) {
        throw firstResolved.error;
      } else {
        return firstResolved.result;
      }
    }
  });
}

/**
 * Handles a request that came from a remote instance via requestRemoteInstance()
 * Runs the requested operation over the local db instance and sends back the result.
 */
async function handleRemoteRequest(instance, msg) {
  if (msg.type === LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.requestId && msg.databaseName === instance.databaseName && msg.collectionName === instance.collectionName && !msg.response) {
    var operation = msg.operation;
    var params = msg.params;
    var result;
    var isError = false;
    try {
      result = await instance[operation](...params);
    } catch (err) {
      console.dir(err);
      isError = true;
      result = err;
    }
    var response = {
      response: true,
      requestId: msg.requestId,
      databaseName: instance.databaseName,
      collectionName: instance.collectionName,
      result,
      isError,
      type: msg.type
    };
    (0, _utils.ensureNotFalsy)(instance.internals.leaderElector).broadcastChannel.postMessage(response);
  }
}
async function waitUntilHasLeader(leaderElector) {
  while (!leaderElector.hasLeader) {
    await leaderElector.applyOnce();
    await (0, _utils.promiseWait)(0);
  }
}

/**
 * If the local state must be used, that one is returned.
 * Returns false if a remote instance must be used.
 */
async function mustUseLocalState(instance) {
  if (instance.closed) {
    /**
     * If this happens, it means that RxDB made a call to an already closed storage instance.
     * This must never happen because when RxDB closes a collection or database,
     * all tasks must be cleared so that no more calls are made the the storage.
     */
    throw (0, _rxError.newRxError)('SNH', {
      args: {
        instanceClosed: instance.closed,
        databaseName: instance.databaseName,
        collectionName: instance.collectionName
      }
    });
  }
  if (instance.internals.localState) {
    return instance.internals.localState;
  }
  var leaderElector = (0, _utils.ensureNotFalsy)(instance.internals.leaderElector);
  await waitUntilHasLeader(leaderElector);

  /**
   * It might already have a localState after the applying
   * because another subtask also called mustUSeLocalState()
   */
  if (instance.internals.localState) {
    return instance.internals.localState;
  }
  if (leaderElector.isLeader && !instance.internals.localState) {
    // own is leader, use local instance
    instance.internals.localState = (0, _rxStorageInstanceLoki.createLokiLocalState)({
      databaseInstanceToken: instance.databaseInstanceToken,
      databaseName: instance.databaseName,
      collectionName: instance.collectionName,
      options: instance.options,
      schema: instance.schema,
      multiInstance: instance.internals.leaderElector ? true : false
    }, instance.databaseSettings);
    return (0, _utils.ensureNotFalsy)(instance.internals.localState);
  } else {
    // other is leader, send message to remote leading instance
    return false;
  }
}
//# sourceMappingURL=lokijs-helper.js.map