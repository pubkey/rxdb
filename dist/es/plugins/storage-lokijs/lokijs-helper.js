import { createLokiLocalState } from './rx-storage-instance-loki';
import lokijs from 'lokijs';
import { add as unloadAdd } from 'unload';
import { ensureNotFalsy, flatClone, getProperty, promiseWait, randomCouchString } from '../utils';
import { LokiSaveQueue } from './loki-save-queue';
import { newRxError } from '../../rx-error';
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
      var database = new lokijs(databaseName + '.db', flatClone(useSettings));
      var lokiSaveQueue = new LokiSaveQueue(database, useSettings);

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
        unloads.push(unloadAdd(() => lokiSaveQueue.run()));
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
export async function closeLokiCollections(databaseName, collections) {
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
export function getLokiSortComparator(_schema, query) {
  if (!query.sort) {
    throw newRxError('SNH', {
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
      var valueA = getProperty(a, fieldName);
      var valueB = getProperty(b, fieldName);
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
export function getLokiLeaderElector(databaseInstanceToken, broadcastChannelRefObject, databaseName) {
  var broadcastChannel = getBroadcastChannelReference(databaseInstanceToken, databaseName, broadcastChannelRefObject);
  var elector = getLeaderElectorByBroadcastChannel(broadcastChannel);
  return elector;
}

/**
 * For multi-instance usage, we send requests to the RxStorage
 * to the current leading instance over the BroadcastChannel.
 */
export async function requestRemoteInstance(instance, operation, params) {
  var isRxStorageInstanceLoki = typeof instance.query === 'function';
  var messageType = isRxStorageInstanceLoki ? LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE : LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE;
  var leaderElector = ensureNotFalsy(instance.internals.leaderElector);
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
  var requestId = randomCouchString(12);
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
export async function handleRemoteRequest(instance, msg) {
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
    ensureNotFalsy(instance.internals.leaderElector).broadcastChannel.postMessage(response);
  }
}
export async function waitUntilHasLeader(leaderElector) {
  while (!leaderElector.hasLeader) {
    await leaderElector.applyOnce();
    await promiseWait(0);
  }
}

/**
 * If the local state must be used, that one is returned.
 * Returns false if a remote instance must be used.
 */
export async function mustUseLocalState(instance) {
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
    return instance.internals.localState;
  }
  var leaderElector = ensureNotFalsy(instance.internals.leaderElector);
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
}
//# sourceMappingURL=lokijs-helper.js.map