"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cleanupRxCollection = cleanupRxCollection;
exports.runCleanupAfterDelete = runCleanupAfterDelete;
exports.startCleanupForRxCollection = startCleanupForRxCollection;
var _utils = require("../../plugins/utils");
var _replication = require("../replication");
var _cleanupHelper = require("./cleanup-helper");
/**
 * Even on multiple databases,
 * the calls to RxStorage().cleanup()
 * must never run in parallel.
 * The cleanup is a background task which should
 * not affect the performance of other, more important tasks.
 */
var RXSOTRAGE_CLEANUP_QUEUE = _utils.PROMISE_RESOLVE_TRUE;
async function startCleanupForRxCollection(rxCollection) {
  var rxDatabase = rxCollection.database;
  var cleanupPolicy = Object.assign({}, _cleanupHelper.DEFAULT_CLEANUP_POLICY, rxDatabase.cleanupPolicy ? rxDatabase.cleanupPolicy : {});

  /**
   * Wait until minimumDatabaseInstanceAge is reached
   * or collection is destroyed.
   */
  await rxCollection.promiseWait(cleanupPolicy.minimumCollectionAge);
  if (rxCollection.destroyed) {
    return;
  }
  if (cleanupPolicy.waitForLeadership) {
    await rxDatabase.waitForLeadership();
  }
  if (rxCollection.destroyed) {
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

/**
 * Runs the cleanup for a single RxCollection
 */
async function cleanupRxCollection(rxCollection, cleanupPolicy) {
  var rxDatabase = rxCollection.database;
  var storageInstance = rxCollection.storageInstance;

  // run cleanup() until it returns true
  var isDone = false;
  while (!isDone && !rxCollection.destroyed) {
    if (cleanupPolicy.awaitReplicationsInSync) {
      var replicationStates = _replication.REPLICATION_STATE_BY_COLLECTION.get(rxCollection);
      if (replicationStates) {
        await Promise.all(replicationStates.map(replicationState => {
          if (!replicationState.isStopped()) {
            return replicationState.awaitInSync();
          }
        }));
      }
    }
    await rxDatabase.requestIdlePromise();
    if (rxCollection.destroyed) {
      return;
    }
    RXSOTRAGE_CLEANUP_QUEUE = RXSOTRAGE_CLEANUP_QUEUE.then(() => {
      if (rxCollection.destroyed) {
        return true;
      }
      return storageInstance.cleanup(cleanupPolicy.minimumDeletedTime);
    });
    isDone = await RXSOTRAGE_CLEANUP_QUEUE;
  }
}
async function runCleanupAfterDelete(rxCollection, cleanupPolicy) {
  while (!rxCollection.destroyed) {
    await rxCollection.promiseWait(cleanupPolicy.runEach);
    if (rxCollection.destroyed) {
      return;
    }
    await cleanupRxCollection(rxCollection, cleanupPolicy);
  }
}
//# sourceMappingURL=cleanup.js.map