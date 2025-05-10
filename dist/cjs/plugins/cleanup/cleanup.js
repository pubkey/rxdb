"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cleanupRxCollection = cleanupRxCollection;
exports.initialCleanupWait = initialCleanupWait;
exports.runCleanupAfterDelete = runCleanupAfterDelete;
exports.startCleanupForRxCollection = startCleanupForRxCollection;
var _index = require("../../plugins/utils/index.js");
var _index2 = require("../replication/index.js");
var _cleanupHelper = require("./cleanup-helper.js");
var _hooks = require("../../hooks.js");
var _rxjs = require("rxjs");
/**
 * Even on multiple databases,
 * the calls to RxStorage().cleanup()
 * must never run in parallel.
 * The cleanup is a background task which should
 * not affect the performance of other, more important tasks.
 */
var RXSTORAGE_CLEANUP_QUEUE = _index.PROMISE_RESOLVE_TRUE;
async function startCleanupForRxCollection(rxCollection) {
  var rxDatabase = rxCollection.database;
  var cleanupPolicy = Object.assign({}, _cleanupHelper.DEFAULT_CLEANUP_POLICY, rxDatabase.cleanupPolicy ? rxDatabase.cleanupPolicy : {});
  await initialCleanupWait(rxCollection, cleanupPolicy);
  if (rxCollection.closed) {
    return;
  }

  // initially cleanup the collection
  await cleanupRxCollection(rxCollection, cleanupPolicy);

  /**
   * Afterwards we listen to deletes
   * and only re-run the cleanup after
   * minimumDeletedTime is reached.
   */
  await runCleanupAfterDelete(rxCollection, cleanupPolicy);
}
async function initialCleanupWait(collection, cleanupPolicy) {
  /**
   * Wait until minimumDatabaseInstanceAge is reached
   * or collection is closed.
   */
  await collection.promiseWait(cleanupPolicy.minimumCollectionAge);
  if (collection.closed) {
    return;
  }
  if (collection.database.multiInstance && cleanupPolicy.waitForLeadership) {
    await collection.database.waitForLeadership();
  }
}

/**
 * Runs the cleanup for a single RxCollection
 */
async function cleanupRxCollection(rxCollection, cleanupPolicy) {
  var rxDatabase = rxCollection.database;
  var storageInstance = rxCollection.storageInstance;

  // run cleanup() until it returns true
  var isDone = false;
  while (!isDone && !rxCollection.closed) {
    if (cleanupPolicy.awaitReplicationsInSync) {
      var replicationStates = _index2.REPLICATION_STATE_BY_COLLECTION.get(rxCollection);
      if (replicationStates) {
        await Promise.all(replicationStates.map(replicationState => {
          if (!replicationState.isStopped()) {
            return replicationState.awaitInSync();
          }
        }));
      }
    }
    if (rxCollection.closed) {
      return;
    }
    RXSTORAGE_CLEANUP_QUEUE = RXSTORAGE_CLEANUP_QUEUE.then(async () => {
      if (rxCollection.closed) {
        return true;
      }
      await rxDatabase.requestIdlePromise();
      return storageInstance.cleanup(cleanupPolicy.minimumDeletedTime);
    });
    isDone = await RXSTORAGE_CLEANUP_QUEUE;
  }
  await (0, _hooks.runAsyncPluginHooks)('postCleanup', {
    collectionName: rxCollection.name,
    databaseName: rxDatabase.name
  });
}
async function runCleanupAfterDelete(rxCollection, cleanupPolicy) {
  while (!rxCollection.closed) {
    /**
     * In theory we should wait here until a document is deleted.
     * But this would mean we have to search through all events ever processed.
     * So instead we just wait for any write event and then we anyway throttle
     * the calls with the promiseWait() below.
     */
    await (0, _rxjs.firstValueFrom)(rxCollection.eventBulks$).catch(() => {});
    await rxCollection.promiseWait(cleanupPolicy.runEach);
    if (rxCollection.closed) {
      return;
    }
    await cleanupRxCollection(rxCollection, cleanupPolicy);
  }
}
//# sourceMappingURL=cleanup.js.map