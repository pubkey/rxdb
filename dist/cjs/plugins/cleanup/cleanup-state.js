"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cleanupRxState = cleanupRxState;
exports.runCleanupAfterWrite = runCleanupAfterWrite;
exports.startCleanupForRxState = startCleanupForRxState;
var _index = require("../../plugins/utils/index.js");
var _index2 = require("../replication/index.js");
var _cleanupHelper = require("./cleanup-helper.js");
var _cleanup = require("./cleanup.js");
var _rxjs = require("rxjs");
var RXSTATE_CLEANUP_QUEUE = _index.PROMISE_RESOLVE_TRUE;
async function startCleanupForRxState(state) {
  var rxCollection = state.collection;
  var rxDatabase = rxCollection.database;
  var cleanupPolicy = Object.assign({}, _cleanupHelper.DEFAULT_CLEANUP_POLICY, rxDatabase.cleanupPolicy ? rxDatabase.cleanupPolicy : {});
  await (0, _cleanup.initialCleanupWait)(rxCollection, cleanupPolicy);
  if (rxCollection.closed) {
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
async function cleanupRxState(state, cleanupPolicy) {
  var rxCollection = state.collection;
  var rxDatabase = rxCollection.database;

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
    RXSTATE_CLEANUP_QUEUE = RXSTATE_CLEANUP_QUEUE.then(async () => {
      if (rxCollection.closed) {
        return true;
      }
      await rxDatabase.requestIdlePromise();
      return state._cleanup();
    });
    isDone = await RXSTATE_CLEANUP_QUEUE;
  }
}
async function runCleanupAfterWrite(state, cleanupPolicy) {
  var rxCollection = state.collection;
  while (!rxCollection.closed) {
    /**
     * We only start the timer if there was actually a write
     * to the collection. Otherwise the cleanup would
     * just run on intervals even if nothing has changed.
     */
    await (0, _rxjs.firstValueFrom)(rxCollection.eventBulks$).catch(() => {});
    await rxCollection.promiseWait(cleanupPolicy.runEach);
    if (rxCollection.closed) {
      return;
    }
    await cleanupRxState(state, cleanupPolicy);
  }
}
//# sourceMappingURL=cleanup-state.js.map