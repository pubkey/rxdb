"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startReplicationUpstream = startReplicationUpstream;
var _rxjs = require("rxjs");
var _rxStorageHelper = require("../rx-storage-helper.js");
var _index = require("../plugins/utils/index.js");
var _checkpoint = require("./checkpoint.js");
var _conflicts = require("./conflicts.js");
var _helper = require("./helper.js");
var _metaInstance = require("./meta-instance.js");
var _index2 = require("../plugins/attachments/index.js");
var _rxError = require("../rx-error.js");
/**
 * Writes all document changes from the fork to the master.
 * The upstream runs on two modes:
 * - For initial replication, a checkpoint-iteration is used
 * - For ongoing local writes, we just subscribe to the changeStream of the fork.
 *   In contrast to the master, the fork can be assumed to never loose connection,
 *   so we do not have to prepare for missed out events.
 */
async function startReplicationUpstream(state) {
  if (state.input.initialCheckpoint && state.input.initialCheckpoint.upstream) {
    var checkpointDoc = await (0, _checkpoint.getLastCheckpointDoc)(state, 'up');
    if (!checkpointDoc) {
      await (0, _checkpoint.setCheckpoint)(state, 'up', state.input.initialCheckpoint.upstream);
    }
  }
  var replicationHandler = state.input.replicationHandler;
  state.streamQueue.up = state.streamQueue.up.then(() => {
    return upstreamInitialSync().then(() => {
      return processTasks();
    });
  });

  // used to detect which tasks etc can in it at which order.
  var timer = 0;
  var initialSyncStartTime = -1;
  var openTasks = [];
  var persistenceQueue = _index.PROMISE_RESOLVE_FALSE;
  var nonPersistedFromMaster = {
    docs: {}
  };
  var sub = state.input.forkInstance.changeStream().subscribe(eventBulk => {
    if (state.events.paused.getValue()) {
      return;
    }
    state.stats.up.forkChangeStreamEmit = state.stats.up.forkChangeStreamEmit + 1;
    openTasks.push({
      task: eventBulk,
      time: timer++
    });
    if (!state.events.active.up.getValue()) {
      state.events.active.up.next(true);
    }
    if (state.input.waitBeforePersist) {
      return state.input.waitBeforePersist().then(() => processTasks());
    } else {
      return processTasks();
    }
  });
  var subResync = replicationHandler.masterChangeStream$.pipe((0, _rxjs.filter)(ev => ev === 'RESYNC')).subscribe(() => {
    openTasks.push({
      task: 'RESYNC',
      time: timer++
    });
    processTasks();
  });

  // unsubscribe when replication is canceled
  (0, _rxjs.firstValueFrom)(state.events.canceled.pipe((0, _rxjs.filter)(canceled => !!canceled))).then(() => {
    sub.unsubscribe();
    subResync.unsubscribe();
  });
  async function upstreamInitialSync() {
    state.stats.up.upstreamInitialSync = state.stats.up.upstreamInitialSync + 1;
    if (state.events.canceled.getValue()) {
      return;
    }
    state.checkpointQueue = state.checkpointQueue.then(() => (0, _checkpoint.getLastCheckpointDoc)(state, 'up'));
    var lastCheckpoint = await state.checkpointQueue;
    var promises = new Set();
    var _loop = async function () {
      initialSyncStartTime = timer++;

      /**
       * Throttle the calls to
       * forkInstance.getChangedDocumentsSince() so that
       * if the pushing to the remote is slower compared to the
       * pulling out of forkInstance, we do not block the UI too much
       * and have a big memory spike with all forkInstance documents.
       */
      if (promises.size > 3) {
        await Promise.race(Array.from(promises));
      }
      var upResult = await (0, _rxStorageHelper.getChangedDocumentsSince)(state.input.forkInstance, state.input.pushBatchSize, lastCheckpoint);
      if (upResult.documents.length === 0) {
        return 1; // break
      }
      lastCheckpoint = (0, _rxStorageHelper.stackCheckpoints)([lastCheckpoint, upResult.checkpoint]);
      var promise = persistToMaster(upResult.documents, (0, _index.ensureNotFalsy)(lastCheckpoint));
      promises.add(promise);
      promise.catch().then(() => promises.delete(promise));
    };
    while (!state.events.canceled.getValue()) {
      if (await _loop()) break;
    }

    /**
     * If we had conflicts during the initial sync,
     * it means that we likely have new writes to the fork
     * and so we have to run the initial sync again to upstream these new writes.
     */
    var resolvedPromises = await Promise.all(promises);
    var hadConflicts = resolvedPromises.find(r => !!r);
    if (hadConflicts) {
      await upstreamInitialSync();
    } else if (!state.firstSyncDone.up.getValue() && !state.events.canceled.getValue()) {
      state.firstSyncDone.up.next(true);
    }
  }

  /**
   * Takes all open tasks an processes them at once.
   */
  function processTasks() {
    if (state.events.canceled.getValue() || openTasks.length === 0) {
      state.events.active.up.next(false);
      return;
    }
    state.stats.up.processTasks = state.stats.up.processTasks + 1;
    state.events.active.up.next(true);
    state.streamQueue.up = state.streamQueue.up.then(async () => {
      /**
       * Merge/filter all open tasks
       */
      var docs = [];
      var checkpoint;
      while (openTasks.length > 0) {
        var taskWithTime = (0, _index.ensureNotFalsy)(openTasks.shift());
        /**
         * If the task came in before the last time the initial sync fetching
         * has run, we can ignore the task because the initial sync already processed
         * these documents.
         */
        if (taskWithTime.time < initialSyncStartTime) {
          continue;
        }
        if (taskWithTime.task === 'RESYNC') {
          state.events.active.up.next(false);
          await upstreamInitialSync();
          return;
        }

        /**
         * If the task came from the downstream, we can ignore these documents
         * because we know they are replicated already.
         * But even if they can be ignored, we later have to call persistToMaster()
         * to have the correct checkpoint set.
         */
        if (taskWithTime.task.context !== (await state.downstreamBulkWriteFlag)) {
          (0, _index.appendToArray)(docs, taskWithTime.task.events.map(r => {
            return r.documentData;
          }));
        }
        checkpoint = (0, _rxStorageHelper.stackCheckpoints)([checkpoint, taskWithTime.task.checkpoint]);
      }
      await persistToMaster(docs, checkpoint);

      // might have got more tasks while running persistToMaster()
      if (openTasks.length === 0) {
        state.events.active.up.next(false);
      } else {
        return processTasks();
      }
    });
  }

  /**
   * Returns true if had conflicts,
   * false if not.
   */
  function persistToMaster(docs, checkpoint) {
    state.stats.up.persistToMaster = state.stats.up.persistToMaster + 1;

    /**
     * Add the new docs to the non-persistent list
     */
    docs.forEach(docData => {
      var docId = docData[state.primaryPath];
      nonPersistedFromMaster.docs[docId] = docData;
    });
    nonPersistedFromMaster.checkpoint = checkpoint;
    persistenceQueue = persistenceQueue.then(async () => {
      if (state.events.canceled.getValue()) {
        return false;
      }
      var upDocsById = nonPersistedFromMaster.docs;
      nonPersistedFromMaster.docs = {};
      var useCheckpoint = nonPersistedFromMaster.checkpoint;
      var docIds = Object.keys(upDocsById);
      /**
       * Even if we do not have anything to push,
       * we still have to store the up-checkpoint.
       * This ensures that when many documents have been pulled
       * from the remote (that do not have to be pushed again),
       * we continue at the correct position and do not have to load
       * these documents from the storage again when the replication is restarted.
       */
      function rememberCheckpointBeforeReturn() {
        return (0, _checkpoint.setCheckpoint)(state, 'up', useCheckpoint);
      }
      ;
      if (docIds.length === 0) {
        rememberCheckpointBeforeReturn();
        return false;
      }
      var assumedMasterState = await (0, _metaInstance.getAssumedMasterState)(state, docIds);
      var writeRowsToMaster = {};
      var writeRowsToMasterIds = [];
      var writeRowsToMeta = {};
      var forkStateById = {};
      await Promise.all(docIds.map(async docId => {
        var fullDocData = upDocsById[docId];
        forkStateById[docId] = fullDocData;
        var docData = (0, _helper.writeDocToDocState)(fullDocData, state.hasAttachments, !!state.input.keepMeta);
        var assumedMasterDoc = assumedMasterState[docId];

        /**
         * If the master state is equal to the
         * fork state, we can assume that the document state is already
         * replicated.
         */
        if (assumedMasterDoc &&
        // if the isResolvedConflict is correct, we do not have to compare the documents.
        assumedMasterDoc.metaDocument.isResolvedConflict !== fullDocData._rev && state.input.conflictHandler.isEqual(assumedMasterDoc.docData, docData, 'upstream-check-if-equal') || (
        /**
         * If the master works with _rev fields,
         * we use that to check if our current doc state
         * is different from the assumedMasterDoc.
         */

        assumedMasterDoc && assumedMasterDoc.docData._rev && (0, _index.getHeightOfRevision)(fullDocData._rev) === fullDocData._meta[state.input.identifier])) {
          return;
        }
        writeRowsToMasterIds.push(docId);
        writeRowsToMaster[docId] = {
          assumedMasterState: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
          newDocumentState: docData
        };
        writeRowsToMeta[docId] = await (0, _metaInstance.getMetaWriteRow)(state, docData, assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined);
      }));
      if (writeRowsToMasterIds.length === 0) {
        rememberCheckpointBeforeReturn();
        return false;
      }
      var writeRowsArray = Object.values(writeRowsToMaster);
      var conflictIds = new Set();
      var conflictsById = {};

      /**
       * To always respect the push.batchSize,
       * we have to split the write rows into batches
       * to ensure that replicationHandler.masterWrite() is never
       * called with more documents than what the batchSize limits.
       */
      var writeBatches = (0, _index.batchArray)(writeRowsArray, state.input.pushBatchSize);
      await Promise.all(writeBatches.map(async writeBatch => {
        // enhance docs with attachments
        if (state.hasAttachments) {
          await Promise.all(writeBatch.map(async row => {
            row.newDocumentState = await (0, _index2.fillWriteDataForAttachmentsChange)(state.primaryPath, state.input.forkInstance, (0, _index.clone)(row.newDocumentState), row.assumedMasterState);
          }));
        }
        var masterWriteResult = await replicationHandler.masterWrite(writeBatch);
        masterWriteResult.forEach(conflictDoc => {
          var id = conflictDoc[state.primaryPath];
          conflictIds.add(id);
          conflictsById[id] = conflictDoc;
        });
      }));
      var useWriteRowsToMeta = [];
      writeRowsToMasterIds.forEach(docId => {
        if (!conflictIds.has(docId)) {
          state.events.processed.up.next(writeRowsToMaster[docId]);
          useWriteRowsToMeta.push(writeRowsToMeta[docId]);
        }
      });
      if (state.events.canceled.getValue()) {
        return false;
      }
      if (useWriteRowsToMeta.length > 0) {
        await state.input.metaInstance.bulkWrite((0, _helper.stripAttachmentsDataFromMetaWriteRows)(state, useWriteRowsToMeta), 'replication-up-write-meta');
        // TODO what happens when we have conflicts here?
      }

      /**
       * Resolve conflicts by writing a new document
       * state to the fork instance and the 'real' master state
       * to the meta instance.
       * Non-409 errors will be detected by resolveConflictError()
       */
      var hadConflictWrites = false;
      if (conflictIds.size > 0) {
        state.stats.up.persistToMasterHadConflicts = state.stats.up.persistToMasterHadConflicts + 1;
        var conflictWriteFork = [];
        var conflictWriteMeta = {};
        await Promise.all(Object.entries(conflictsById).map(([docId, realMasterState]) => {
          var writeToMasterRow = writeRowsToMaster[docId];
          var input = {
            newDocumentState: writeToMasterRow.newDocumentState,
            assumedMasterState: writeToMasterRow.assumedMasterState,
            realMasterState
          };
          return (0, _conflicts.resolveConflictError)(state, input, forkStateById[docId]).then(async resolved => {
            if (resolved) {
              state.events.resolvedConflicts.next({
                input,
                output: resolved
              });
              conflictWriteFork.push({
                previous: forkStateById[docId],
                document: resolved
              });
              var assumedMasterDoc = assumedMasterState[docId];
              conflictWriteMeta[docId] = await (0, _metaInstance.getMetaWriteRow)(state, (0, _index.ensureNotFalsy)(realMasterState), assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined, resolved._rev);
            }
          });
        }));
        if (conflictWriteFork.length > 0) {
          hadConflictWrites = true;
          state.stats.up.persistToMasterConflictWrites = state.stats.up.persistToMasterConflictWrites + 1;
          var forkWriteResult = await state.input.forkInstance.bulkWrite(conflictWriteFork, 'replication-up-write-conflict');
          var mustThrow;
          forkWriteResult.error.forEach(error => {
            /**
             * Conflict-Errors in the forkWriteResult must not be handled
             * because they have been caused by a write to the forkInstance
             * in between which will anyway trigger a new upstream cycle
             * that will then resolved the conflict again.
             */
            if (error.status === 409) {
              return;
            }
            // other non-conflict errors must be handled
            var throwMe = (0, _rxError.newRxError)('RC_PUSH', {
              writeError: error
            });
            state.events.error.next(throwMe);
            mustThrow = throwMe;
          });
          if (mustThrow) {
            throw mustThrow;
          }
          var useMetaWrites = [];
          var success = (0, _rxStorageHelper.getWrittenDocumentsFromBulkWriteResponse)(state.primaryPath, conflictWriteFork, forkWriteResult);
          success.forEach(docData => {
            var docId = docData[state.primaryPath];
            useMetaWrites.push(conflictWriteMeta[docId]);
          });
          if (useMetaWrites.length > 0) {
            await state.input.metaInstance.bulkWrite((0, _helper.stripAttachmentsDataFromMetaWriteRows)(state, useMetaWrites), 'replication-up-write-conflict-meta');
          }
          // TODO what to do with conflicts while writing to the metaInstance?
        }
      }

      /**
       * For better performance we do not await checkpoint writes,
       * but to ensure order on parallel checkpoint writes,
       * we have to use a queue.
       */
      rememberCheckpointBeforeReturn();
      return hadConflictWrites;
    }).catch(unhandledError => {
      state.events.error.next(unhandledError);
      return false;
    });
    return persistenceQueue;
  }
}
//# sourceMappingURL=upstream.js.map