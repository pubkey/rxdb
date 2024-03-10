import { PROMISE_RESOLVE_TRUE } from "../../plugins/utils/index.js";
import { REPLICATION_STATE_BY_COLLECTION } from "../replication/index.js";
import { DEFAULT_CLEANUP_POLICY } from "./cleanup-helper.js";

/**
 * Even on multiple databases,
 * the calls to RxStorage().cleanup()
 * must never run in parallel.
 * The cleanup is a background task which should
 * not affect the performance of other, more important tasks.
 */
var RXSTORAGE_CLEANUP_QUEUE = PROMISE_RESOLVE_TRUE;
export async function startCleanupForRxCollection(rxCollection) {
  var rxDatabase = rxCollection.database;
  var cleanupPolicy = Object.assign({}, DEFAULT_CLEANUP_POLICY, rxDatabase.cleanupPolicy ? rxDatabase.cleanupPolicy : {});
  await initialCleanupWait(rxCollection, cleanupPolicy);
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
export async function initialCleanupWait(collection, cleanupPolicy) {
  /**
   * Wait until minimumDatabaseInstanceAge is reached
   * or collection is destroyed.
   */
  await collection.promiseWait(cleanupPolicy.minimumCollectionAge);
  if (collection.destroyed) {
    return;
  }
  if (cleanupPolicy.waitForLeadership) {
    await collection.database.waitForLeadership();
  }
}

/**
 * Runs the cleanup for a single RxCollection
 */
export async function cleanupRxCollection(rxCollection, cleanupPolicy) {
  var rxDatabase = rxCollection.database;
  var storageInstance = rxCollection.storageInstance;

  // run cleanup() until it returns true
  var isDone = false;
  while (!isDone && !rxCollection.destroyed) {
    if (cleanupPolicy.awaitReplicationsInSync) {
      var replicationStates = REPLICATION_STATE_BY_COLLECTION.get(rxCollection);
      if (replicationStates) {
        await Promise.all(replicationStates.map(replicationState => {
          if (!replicationState.isStopped()) {
            return replicationState.awaitInSync();
          }
        }));
      }
    }
    if (rxCollection.destroyed) {
      return;
    }
    RXSTORAGE_CLEANUP_QUEUE = RXSTORAGE_CLEANUP_QUEUE.then(async () => {
      if (rxCollection.destroyed) {
        return true;
      }
      await rxDatabase.requestIdlePromise();
      return storageInstance.cleanup(cleanupPolicy.minimumDeletedTime);
    });
    isDone = await RXSTORAGE_CLEANUP_QUEUE;
  }
}

/**
 * TODO this is not waiting for deletes!
 * it just runs on interval.
 */
export async function runCleanupAfterDelete(rxCollection, cleanupPolicy) {
  while (!rxCollection.destroyed) {
    await rxCollection.promiseWait(cleanupPolicy.runEach);
    if (rxCollection.destroyed) {
      return;
    }
    await cleanupRxCollection(rxCollection, cleanupPolicy);
  }
}
//# sourceMappingURL=cleanup.js.map