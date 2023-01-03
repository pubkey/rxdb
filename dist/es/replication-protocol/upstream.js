import { firstValueFrom, filter } from 'rxjs';
import { stackCheckpoints } from '../rx-storage-helper';
import { batchArray, ensureNotFalsy, parseRevision, PROMISE_RESOLVE_FALSE } from '../plugins/utils';
import { getLastCheckpointDoc, setCheckpoint } from './checkpoint';
import { resolveConflictError } from './conflicts';
import { writeDocToDocState } from './helper';
import { getAssumedMasterState, getMetaWriteRow } from './meta-instance';

/**
 * Writes all document changes from the fork to the master.
 * The upstream runs on two modes:
 * - For initial replication, a checkpoint-iteration is used
 * - For ongoing local writes, we just subscribe to the changeStream of the fork.
 *   In contrast to the master, the fork can be assumed to never loose connection,
 *   so we do not have to prepare for missed out events.
 */
export function startReplicationUpstream(state) {
  var replicationHandler = state.input.replicationHandler;
  state.streamQueue.up = state.streamQueue.up.then(() => {
    return upstreamInitialSync().then(() => {
      processTasks();
    });
  });

  // used to detect which tasks etc can in it at which order.
  var timer = 0;
  var initialSyncStartTime = -1;
  var openTasks = [];
  var sub = state.input.forkInstance.changeStream().pipe(filter(eventBulk => eventBulk.context !== state.downstreamBulkWriteFlag)).subscribe(eventBulk => {
    state.stats.up.forkChangeStreamEmit = state.stats.up.forkChangeStreamEmit + 1;
    openTasks.push({
      task: eventBulk,
      time: timer++
    });
    if (state.input.waitBeforePersist) {
      return state.input.waitBeforePersist().then(() => processTasks());
    } else {
      return processTasks();
    }
  });
  firstValueFrom(state.events.canceled.pipe(filter(canceled => !!canceled))).then(() => sub.unsubscribe());
  async function upstreamInitialSync() {
    state.stats.up.upstreamInitialSync = state.stats.up.upstreamInitialSync + 1;
    if (state.events.canceled.getValue()) {
      return;
    }
    state.checkpointQueue = state.checkpointQueue.then(() => getLastCheckpointDoc(state, 'up'));
    var lastCheckpoint = await state.checkpointQueue;
    var promises = [];
    while (!state.events.canceled.getValue()) {
      initialSyncStartTime = timer++;
      var upResult = await state.input.forkInstance.getChangedDocumentsSince(state.input.pushBatchSize, lastCheckpoint);
      if (upResult.documents.length === 0) {
        break;
      }
      lastCheckpoint = stackCheckpoints([lastCheckpoint, upResult.checkpoint]);
      promises.push(persistToMaster(upResult.documents, ensureNotFalsy(lastCheckpoint)));
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
    } else if (!state.firstSyncDone.up.getValue()) {
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
    state.streamQueue.up = state.streamQueue.up.then(() => {
      /**
       * Merge/filter all open tasks
       */
      var docs = [];
      var checkpoint = {};
      while (openTasks.length > 0) {
        var taskWithTime = ensureNotFalsy(openTasks.shift());
        /**
         * If the task came in before the last time the initial sync fetching
         * has run, we can ignore the task because the initial sync already processed
         * these documents.
         */
        if (taskWithTime.time < initialSyncStartTime) {
          continue;
        }
        docs = docs.concat(taskWithTime.task.events.map(r => {
          return r.documentData;
        }));
        checkpoint = stackCheckpoints([checkpoint, taskWithTime.task.checkpoint]);
      }
      var promise = docs.length === 0 ? PROMISE_RESOLVE_FALSE : persistToMaster(docs, checkpoint);
      return promise.then(() => {
        if (openTasks.length === 0) {
          state.events.active.up.next(false);
        } else {
          processTasks();
        }
      });
    });
  }
  var persistenceQueue = PROMISE_RESOLVE_FALSE;
  var nonPersistedFromMaster = {
    docs: {}
  };

  /**
   * Returns true if had conflicts,
   * false if not.
   */
  function persistToMaster(docs, checkpoint) {
    state.stats.up.persistToMaster = state.stats.up.persistToMaster + 1;

    /**
     * Add the new docs to the non-persistend list
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
      if (docIds.length === 0) {
        return false;
      }
      var assumedMasterState = await getAssumedMasterState(state, docIds);
      var writeRowsToMaster = {};
      var writeRowsToMasterIds = [];
      var writeRowsToMeta = {};
      var forkStateById = {};
      await Promise.all(docIds.map(async docId => {
        var fullDocData = upDocsById[docId];
        forkStateById[docId] = fullDocData;
        var docData = writeDocToDocState(fullDocData);
        var assumedMasterDoc = assumedMasterState[docId];

        /**
         * If the master state is equal to the
         * fork state, we can assume that the document state is already
         * replicated.
         */
        if (assumedMasterDoc &&
        // if the isResolvedConflict is correct, we do not have to compare the documents.
        assumedMasterDoc.metaDocument.isResolvedConflict !== fullDocData._rev && (await state.input.conflictHandler({
          realMasterState: assumedMasterDoc.docData,
          newDocumentState: docData
        }, 'upstream-check-if-equal')).isEqual ||
        /**
         * If the master works with _rev fields,
         * we use that to check if our current doc state
         * is different from the assumedMasterDoc.
         */

        assumedMasterDoc && assumedMasterDoc.docData._rev && parseRevision(fullDocData._rev).height === fullDocData._meta[state.input.identifier]) {
          return;
        }
        writeRowsToMasterIds.push(docId);
        writeRowsToMaster[docId] = {
          assumedMasterState: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
          newDocumentState: docData
        };
        writeRowsToMeta[docId] = getMetaWriteRow(state, docData, assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined);
      }));
      if (writeRowsToMasterIds.length === 0) {
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
      var writeBatches = batchArray(writeRowsArray, state.input.pushBatchSize);
      await Promise.all(writeBatches.map(async writeBatch => {
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
      if (useWriteRowsToMeta.length > 0) {
        await state.input.metaInstance.bulkWrite(useWriteRowsToMeta, 'replication-up-write-meta');
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
          return resolveConflictError(state, input, forkStateById[docId]).then(resolved => {
            if (resolved) {
              state.events.resolvedConflicts.next({
                input,
                output: resolved.output
              });
              conflictWriteFork.push({
                previous: forkStateById[docId],
                document: resolved.resolvedDoc
              });
              var assumedMasterDoc = assumedMasterState[docId];
              conflictWriteMeta[docId] = getMetaWriteRow(state, ensureNotFalsy(realMasterState), assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined, resolved.resolvedDoc._rev);
            }
          });
        }));
        if (conflictWriteFork.length > 0) {
          hadConflictWrites = true;
          state.stats.up.persistToMasterConflictWrites = state.stats.up.persistToMasterConflictWrites + 1;
          var forkWriteResult = await state.input.forkInstance.bulkWrite(conflictWriteFork, 'replication-up-write-conflict');
          /**
           * Errors in the forkWriteResult must not be handled
           * because they have been caused by a write to the forkInstance
           * in between which will anyway trigger a new upstream cycle
           * that will then resolved the conflict again.
           */
          var useMetaWrites = [];
          Object.keys(forkWriteResult.success).forEach(docId => {
            useMetaWrites.push(conflictWriteMeta[docId]);
          });
          if (useMetaWrites.length > 0) {
            await state.input.metaInstance.bulkWrite(useMetaWrites, 'replication-up-write-conflict-meta');
          }
          // TODO what to do with conflicts while writing to the metaInstance?
        }
      }

      /**
       * For better performance we do not await checkpoint writes,
       * but to ensure order on parallel checkpoint writes,
       * we have to use a queue.
       */
      state.checkpointQueue = state.checkpointQueue.then(() => setCheckpoint(state, 'up', useCheckpoint));
      return hadConflictWrites;
    }).catch(unhandledError => {
      state.events.error.next(unhandledError);
      return false;
    });
    return persistenceQueue;
  }
}
//# sourceMappingURL=upstream.js.map