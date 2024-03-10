import { PROMISE_RESOLVE_TRUE } from "../../plugins/utils/index.js";
import { REPLICATION_STATE_BY_COLLECTION } from "../replication/index.js";
import { DEFAULT_CLEANUP_POLICY } from "./cleanup-helper.js";
import { initialCleanupWait } from "./cleanup.js";
var RXSTATE_CLEANUP_QUEUE = PROMISE_RESOLVE_TRUE;
export async function startCleanupForRxState(state) {
  var rxCollection = state.collection;
  var rxDatabase = rxCollection.database;
  var cleanupPolicy = Object.assign({}, DEFAULT_CLEANUP_POLICY, rxDatabase.cleanupPolicy ? rxDatabase.cleanupPolicy : {});
  await initialCleanupWait(rxCollection, cleanupPolicy);
  if (rxCollection.destroyed) {
    return;
  }

  // initially cleanup the state
  await cleanupRxState(state, cleanupPolicy);

  /**
   * Afterwards we listen to writes
   * and only re-run the cleanup if there was a write
   * to the state.
   */
  await runCleanupAfterWrite(state, cleanupPolicy);
}
/**
 * Runs the cleanup for a single RxState
 */
export async function cleanupRxState(state, cleanupPolicy) {
  var rxCollection = state.collection;
  var rxDatabase = rxCollection.database;

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
    RXSTATE_CLEANUP_QUEUE = RXSTATE_CLEANUP_QUEUE.then(async () => {
      if (rxCollection.destroyed) {
        return true;
      }
      await rxDatabase.requestIdlePromise();
      return state._cleanup();
    });
    isDone = await RXSTATE_CLEANUP_QUEUE;
  }
}

/**
 * TODO this is not waiting for writes!
 * it just runs on interval.
 */
export async function runCleanupAfterWrite(state, cleanupPolicy) {
  var rxCollection = state.collection;
  while (!rxCollection.destroyed) {
    await rxCollection.promiseWait(cleanupPolicy.runEach);
    if (rxCollection.destroyed) {
      return;
    }
    await cleanupRxState(state, cleanupPolicy);
  }
}
//# sourceMappingURL=cleanup-state.js.map