/**
 * These files contain the replication protocol.
 * It can be used to replicated RxStorageInstances or RxCollections
 * or even to do a client(s)-server replication.
 */

import { BehaviorSubject, combineLatest, filter, firstValueFrom, mergeMap, Subject } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from "../rx-schema-helper.js";
import { clone, ensureNotFalsy, flatClone, PROMISE_RESOLVE_VOID } from "../plugins/utils/index.js";
import { getCheckpointKey } from "./checkpoint.js";
import { startReplicationDownstream } from "./downstream.js";
import { docStateToWriteDoc, getUnderlyingPersistentStorage, writeDocToDocState } from "./helper.js";
import { startReplicationUpstream } from "./upstream.js";
import { fillWriteDataForAttachmentsChange } from "../plugins/attachments/index.js";
import { getChangedDocumentsSince } from "../rx-storage-helper.js";
import { newRxError } from "../rx-error.js";
export * from "./checkpoint.js";
export * from "./downstream.js";
export * from "./upstream.js";
export * from "./meta-instance.js";
export * from "./conflicts.js";
export * from "./helper.js";
export * from "./default-conflict-handler.js";
export function replicateRxStorageInstance(input) {
  input = flatClone(input);
  input.forkInstance = getUnderlyingPersistentStorage(input.forkInstance);
  input.metaInstance = getUnderlyingPersistentStorage(input.metaInstance);
  var checkpointKeyPromise = getCheckpointKey(input);
  var state = {
    primaryPath: getPrimaryFieldOfPrimaryKey(input.forkInstance.schema.primaryKey),
    hasAttachments: !!input.forkInstance.schema.attachments,
    input,
    checkpointKey: checkpointKeyPromise,
    downstreamBulkWriteFlag: checkpointKeyPromise.then(checkpointKey => 'replication-downstream-' + checkpointKey),
    events: {
      canceled: new BehaviorSubject(false),
      paused: new BehaviorSubject(false),
      active: {
        down: new BehaviorSubject(true),
        up: new BehaviorSubject(true)
      },
      processed: {
        down: new Subject(),
        up: new Subject()
      },
      resolvedConflicts: new Subject(),
      error: new Subject()
    },
    stats: {
      down: {
        addNewTask: 0,
        downstreamProcessChanges: 0,
        downstreamResyncOnce: 0,
        masterChangeStreamEmit: 0,
        persistFromMaster: 0
      },
      up: {
        forkChangeStreamEmit: 0,
        persistToMaster: 0,
        persistToMasterConflictWrites: 0,
        persistToMasterHadConflicts: 0,
        processTasks: 0,
        upstreamInitialSync: 0
      }
    },
    firstSyncDone: {
      down: new BehaviorSubject(false),
      up: new BehaviorSubject(false)
    },
    streamQueue: {
      down: PROMISE_RESOLVE_VOID,
      up: PROMISE_RESOLVE_VOID
    },
    checkpointQueue: PROMISE_RESOLVE_VOID,
    lastCheckpointDoc: {}
  };
  startReplicationDownstream(state);
  startReplicationUpstream(state);
  return state;
}
export function awaitRxStorageReplicationFirstInSync(state) {
  return firstValueFrom(combineLatest([state.firstSyncDone.down.pipe(filter(v => !!v)), state.firstSyncDone.up.pipe(filter(v => !!v))])).then(() => {});
}
export function awaitRxStorageReplicationInSync(replicationState) {
  return Promise.all([replicationState.streamQueue.up, replicationState.streamQueue.down, replicationState.checkpointQueue]);
}
export async function awaitRxStorageReplicationIdle(state) {
  await awaitRxStorageReplicationFirstInSync(state);
  while (true) {
    var {
      down,
      up
    } = state.streamQueue;
    await Promise.all([up, down]);
    /**
     * If the Promises have not been reassigned
     * after awaiting them, we know that the replication
     * is in idle state at this point in time.
     */
    if (down === state.streamQueue.down && up === state.streamQueue.up) {
      return;
    }
  }
}
export function rxStorageInstanceToReplicationHandler(instance, conflictHandler, databaseInstanceToken,
/**
 * If set to true,
 * the _meta.lwt from the pushed documents is kept.
 * (Used in the migration to ensure checkpoints are still valid)
 */
keepMeta = false) {
  instance = getUnderlyingPersistentStorage(instance);
  var hasAttachments = !!instance.schema.attachments;
  var primaryPath = getPrimaryFieldOfPrimaryKey(instance.schema.primaryKey);
  var replicationHandler = {
    masterChangeStream$: instance.changeStream().pipe(mergeMap(async eventBulk => {
      var ret = {
        checkpoint: eventBulk.checkpoint,
        documents: await Promise.all(eventBulk.events.map(async event => {
          var docData = writeDocToDocState(event.documentData, hasAttachments, keepMeta);
          if (hasAttachments) {
            docData = await fillWriteDataForAttachmentsChange(primaryPath, instance, clone(docData),
            /**
             * Notice that the master never knows
             * the client state of the document.
             * Therefore we always send all attachments data.
             */
            undefined);
          }
          return docData;
        }))
      };
      return ret;
    })),
    masterChangesSince(checkpoint, batchSize) {
      return getChangedDocumentsSince(instance, batchSize, checkpoint).then(async result => {
        return {
          checkpoint: result.documents.length > 0 ? result.checkpoint : checkpoint,
          documents: await Promise.all(result.documents.map(async plainDocumentData => {
            var docData = writeDocToDocState(plainDocumentData, hasAttachments, keepMeta);
            if (hasAttachments) {
              docData = await fillWriteDataForAttachmentsChange(primaryPath, instance, clone(docData),
              /**
               * Notice the the master never knows
               * the client state of the document.
               * Therefore we always send all attachments data.
               */
              undefined);
            }
            return docData;
          }))
        };
      });
    },
    async masterWrite(rows) {
      var rowById = {};
      rows.forEach(row => {
        var docId = row.newDocumentState[primaryPath];
        rowById[docId] = row;
      });
      var ids = Object.keys(rowById);
      var masterDocsStateList = await instance.findDocumentsById(ids, true);
      var masterDocsState = new Map();
      masterDocsStateList.forEach(doc => masterDocsState.set(doc[primaryPath], doc));
      var conflicts = [];
      var writeRows = [];
      await Promise.all(Object.entries(rowById).map(([id, row]) => {
        var masterState = masterDocsState.get(id);
        if (!masterState) {
          writeRows.push({
            document: docStateToWriteDoc(databaseInstanceToken, hasAttachments, keepMeta, row.newDocumentState)
          });
        } else if (masterState && !row.assumedMasterState) {
          conflicts.push(writeDocToDocState(masterState, hasAttachments, keepMeta));
        } else if (conflictHandler.isEqual(writeDocToDocState(masterState, hasAttachments, keepMeta), ensureNotFalsy(row.assumedMasterState), 'rxStorageInstanceToReplicationHandler-masterWrite') === true) {
          writeRows.push({
            previous: masterState,
            document: docStateToWriteDoc(databaseInstanceToken, hasAttachments, keepMeta, row.newDocumentState, masterState)
          });
        } else {
          conflicts.push(writeDocToDocState(masterState, hasAttachments, keepMeta));
        }
      }));
      if (writeRows.length > 0) {
        var result = await instance.bulkWrite(writeRows, 'replication-master-write');
        result.error.forEach(err => {
          if (err.status !== 409) {
            throw newRxError('SNH', {
              name: 'non conflict error',
              error: err
            });
          } else {
            conflicts.push(writeDocToDocState(ensureNotFalsy(err.documentInDb), hasAttachments, keepMeta));
          }
        });
      }
      return conflicts;
    }
  };
  return replicationHandler;
}
export async function cancelRxStorageReplication(replicationState) {
  replicationState.events.canceled.next(true);
  replicationState.events.active.up.complete();
  replicationState.events.active.down.complete();
  replicationState.events.processed.up.complete();
  replicationState.events.processed.down.complete();
  replicationState.events.resolvedConflicts.complete();
  replicationState.events.canceled.complete();
  await replicationState.checkpointQueue;
}
//# sourceMappingURL=index.js.map