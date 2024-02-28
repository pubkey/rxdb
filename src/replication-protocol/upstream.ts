import { firstValueFrom, filter } from 'rxjs';
import {
    getChangedDocumentsSince,
    stackCheckpoints
} from '../rx-storage-helper.ts';
import type {
    BulkWriteRow,
    BulkWriteRowById,
    ById,
    EventBulk,
    RxDocumentData,
    RxReplicationWriteToMasterRow,
    RxStorageChangeEvent,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta,
    WithDeleted
} from '../types/index.d.ts';
import {
    appendToArray,
    batchArray,
    clone,
    ensureNotFalsy,
    parseRevision,
    PROMISE_RESOLVE_FALSE
} from '../plugins/utils/index.ts';
import {
    getLastCheckpointDoc,
    setCheckpoint
} from './checkpoint.ts';
import {
    resolveConflictError
} from './conflicts.ts';
import {
    stripAttachmentsDataFromMetaWriteRows,
    writeDocToDocState
} from './helper.ts';
import {
    getAssumedMasterState,
    getMetaWriteRow
} from './meta-instance.ts';
import { fillWriteDataForAttachmentsChange } from '../plugins/attachments/index.ts';

/**
 * Writes all document changes from the fork to the master.
 * The upstream runs on two modes:
 * - For initial replication, a checkpoint-iteration is used
 * - For ongoing local writes, we just subscribe to the changeStream of the fork.
 *   In contrast to the master, the fork can be assumed to never loose connection,
 *   so we do not have to prepare for missed out events.
 */
export async function startReplicationUpstream<RxDocType, CheckpointType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    if (
        state.input.initialCheckpoint &&
        state.input.initialCheckpoint.upstream
    ) {
        const checkpointDoc = await getLastCheckpointDoc(state, 'up');
        if (!checkpointDoc) {
            await setCheckpoint(
                state,
                'up',
                state.input.initialCheckpoint.upstream
            );
        }
    }

    const replicationHandler = state.input.replicationHandler;
    state.streamQueue.up = state.streamQueue.up.then(() => {
        return upstreamInitialSync().then(() => {
            processTasks();
        });
    });

    // used to detect which tasks etc can in it at which order.
    let timer = 0;
    let initialSyncStartTime = -1;

    type Task = EventBulk<RxStorageChangeEvent<RxDocType>, any>;
    type TaskWithTime = {
        task: Task;
        time: number;
    };
    const openTasks: TaskWithTime[] = [];
    let persistenceQueue: Promise<boolean> = PROMISE_RESOLVE_FALSE;
    const nonPersistedFromMaster: {
        checkpoint?: CheckpointType;
        docs: ById<RxDocumentData<RxDocType>>;
    } = {
        docs: {}
    };

    const sub = state.input.forkInstance.changeStream()
        .subscribe(async (eventBulk) => {
            // ignore writes that came from the downstream
            if (eventBulk.context === await state.downstreamBulkWriteFlag) {
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
                return state.input.waitBeforePersist()
                    .then(() => processTasks());
            } else {
                return processTasks();
            }
        });
    firstValueFrom(
        state.events.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    async function upstreamInitialSync() {
        state.stats.up.upstreamInitialSync = state.stats.up.upstreamInitialSync + 1;
        if (state.events.canceled.getValue()) {
            return;
        }

        state.checkpointQueue = state.checkpointQueue.then(() => getLastCheckpointDoc(state, 'up'));
        let lastCheckpoint: CheckpointType = await state.checkpointQueue;

        const promises: Set<Promise<any>> = new Set();

        while (!state.events.canceled.getValue()) {
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

            const upResult = await getChangedDocumentsSince(
                state.input.forkInstance,
                state.input.pushBatchSize,
                lastCheckpoint
            );
            if (upResult.documents.length === 0) {
                break;
            }

            lastCheckpoint = stackCheckpoints([lastCheckpoint, upResult.checkpoint]);

            const promise = persistToMaster(
                upResult.documents,
                ensureNotFalsy(lastCheckpoint)
            );
            promises.add(promise);
            promise.catch().then(() => promises.delete(promise));
        }

        /**
         * If we had conflicts during the initial sync,
         * it means that we likely have new writes to the fork
         * and so we have to run the initial sync again to upstream these new writes.
         */
        const resolvedPromises = await Promise.all(promises);
        const hadConflicts = resolvedPromises.find(r => !!r);
        if (hadConflicts) {
            await upstreamInitialSync();
        } else if (
            !state.firstSyncDone.up.getValue() &&
            !state.events.canceled.getValue()
        ) {
            state.firstSyncDone.up.next(true);
        }
    }


    /**
     * Takes all open tasks an processes them at once.
     */
    function processTasks() {
        if (
            state.events.canceled.getValue() ||
            openTasks.length === 0
        ) {
            state.events.active.up.next(false);
            return;
        }
        state.stats.up.processTasks = state.stats.up.processTasks + 1;
        state.events.active.up.next(true);
        state.streamQueue.up = state.streamQueue.up.then(() => {
            /**
             * Merge/filter all open tasks
             */
            const docs: RxDocumentData<RxDocType>[] = [];
            let checkpoint: CheckpointType = {} as any;
            while (openTasks.length > 0) {
                const taskWithTime = ensureNotFalsy(openTasks.shift());
                /**
                 * If the task came in before the last time the initial sync fetching
                 * has run, we can ignore the task because the initial sync already processed
                 * these documents.
                 */
                if (taskWithTime.time < initialSyncStartTime) {
                    continue;
                }
                appendToArray(
                    docs,
                    taskWithTime.task.events.map(r => {
                        return r.documentData as any;
                    })
                );
                checkpoint = stackCheckpoints([checkpoint, taskWithTime.task.checkpoint]);
            }

            const promise = docs.length === 0 ? PROMISE_RESOLVE_FALSE : persistToMaster(
                docs,
                checkpoint
            );
            return promise.then(() => {
                if (openTasks.length === 0) {
                    state.events.active.up.next(false);
                } else {
                    processTasks();
                }
            });
        });
    }

    /**
     * Returns true if had conflicts,
     * false if not.
     */
    function persistToMaster(
        docs: RxDocumentData<RxDocType>[],
        checkpoint: CheckpointType
    ): Promise<boolean> {
        state.stats.up.persistToMaster = state.stats.up.persistToMaster + 1;

        /**
         * Add the new docs to the non-persistent list
         */
        docs.forEach(docData => {
            const docId: string = (docData as any)[state.primaryPath];
            nonPersistedFromMaster.docs[docId] = docData;
        });
        nonPersistedFromMaster.checkpoint = checkpoint;

        persistenceQueue = persistenceQueue.then(async () => {
            if (state.events.canceled.getValue()) {
                return false;
            }

            const upDocsById: ById<RxDocumentData<RxDocType>> = nonPersistedFromMaster.docs;
            nonPersistedFromMaster.docs = {};
            const useCheckpoint = nonPersistedFromMaster.checkpoint;
            const docIds = Object.keys(upDocsById);
            if (docIds.length === 0) {
                return false;
            }

            const assumedMasterState = await getAssumedMasterState(
                state,
                docIds
            );

            const writeRowsToMaster: ById<RxReplicationWriteToMasterRow<RxDocType>> = {};
            const writeRowsToMasterIds: string[] = [];
            const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta<RxDocType, any>> = {};
            const forkStateById: ById<RxDocumentData<RxDocType>> = {};

            await Promise.all(
                docIds.map(async (docId) => {
                    const fullDocData: RxDocumentData<RxDocType> = upDocsById[docId];
                    forkStateById[docId] = fullDocData;
                    const docData: WithDeleted<RxDocType> = writeDocToDocState(fullDocData, state.hasAttachments, !!state.input.keepMeta);
                    const assumedMasterDoc = assumedMasterState[docId];

                    /**
                     * If the master state is equal to the
                     * fork state, we can assume that the document state is already
                     * replicated.
                     */
                    if (
                        (
                            assumedMasterDoc &&
                            // if the isResolvedConflict is correct, we do not have to compare the documents.
                            assumedMasterDoc.metaDocument.isResolvedConflict !== fullDocData._rev
                            &&
                            (await state.input.conflictHandler({
                                realMasterState: assumedMasterDoc.docData,
                                newDocumentState: docData
                            }, 'upstream-check-if-equal')).isEqual
                        )
                        ||
                        /**
                         * If the master works with _rev fields,
                         * we use that to check if our current doc state
                         * is different from the assumedMasterDoc.
                         */
                        (
                            assumedMasterDoc &&
                            (assumedMasterDoc.docData as any)._rev &&
                            parseRevision(fullDocData._rev).height === fullDocData._meta[state.input.identifier]
                        )
                    ) {
                        return;
                    }

                    writeRowsToMasterIds.push(docId);

                    writeRowsToMaster[docId] = {
                        assumedMasterState: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
                        newDocumentState: docData
                    };
                    writeRowsToMeta[docId] = await getMetaWriteRow(
                        state,
                        docData,
                        assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined
                    );
                })
            );

            if (writeRowsToMasterIds.length === 0) {
                return false;
            }


            const writeRowsArray = Object.values(writeRowsToMaster);
            const conflictIds: Set<string> = new Set();
            const conflictsById: ById<WithDeleted<RxDocType>> = {};

            /**
             * To always respect the push.batchSize,
             * we have to split the write rows into batches
             * to ensure that replicationHandler.masterWrite() is never
             * called with more documents than what the batchSize limits.
             */
            const writeBatches = batchArray(writeRowsArray, state.input.pushBatchSize);
            await Promise.all(
                writeBatches.map(async (writeBatch) => {

                    // enhance docs with attachments
                    if (state.hasAttachments) {
                        await Promise.all(
                            writeBatch.map(async (row) => {
                                row.newDocumentState = await fillWriteDataForAttachmentsChange(
                                    state.primaryPath,
                                    state.input.forkInstance,
                                    clone(row.newDocumentState),
                                    row.assumedMasterState
                                );
                            })
                        );
                    }
                    const masterWriteResult = await replicationHandler.masterWrite(writeBatch);
                    masterWriteResult.forEach(conflictDoc => {
                        const id = (conflictDoc as any)[state.primaryPath];
                        conflictIds.add(id);
                        conflictsById[id] = conflictDoc;
                    });
                })
            );

            const useWriteRowsToMeta: BulkWriteRow<RxStorageReplicationMeta<RxDocType, any>>[] = [];

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
                await state.input.metaInstance.bulkWrite(
                    stripAttachmentsDataFromMetaWriteRows(state, useWriteRowsToMeta),
                    'replication-up-write-meta'
                );
                // TODO what happens when we have conflicts here?
            }

            /**
             * Resolve conflicts by writing a new document
             * state to the fork instance and the 'real' master state
             * to the meta instance.
             * Non-409 errors will be detected by resolveConflictError()
             */
            let hadConflictWrites = false;
            if (conflictIds.size > 0) {
                state.stats.up.persistToMasterHadConflicts = state.stats.up.persistToMasterHadConflicts + 1;
                const conflictWriteFork: BulkWriteRow<RxDocType>[] = [];
                const conflictWriteMeta: BulkWriteRowById<RxStorageReplicationMeta<RxDocType, any>> = {};
                await Promise.all(
                    Object
                        .entries(conflictsById)
                        .map(([docId, realMasterState]) => {
                            const writeToMasterRow = writeRowsToMaster[docId];
                            const input = {
                                newDocumentState: writeToMasterRow.newDocumentState,
                                assumedMasterState: writeToMasterRow.assumedMasterState,
                                realMasterState
                            };
                            return resolveConflictError(
                                state,
                                input,
                                forkStateById[docId]
                            ).then(async (resolved) => {
                                if (resolved) {
                                    state.events.resolvedConflicts.next({
                                        input,
                                        output: resolved.output
                                    });
                                    conflictWriteFork.push({
                                        previous: forkStateById[docId],
                                        document: resolved.resolvedDoc
                                    });
                                    const assumedMasterDoc = assumedMasterState[docId];
                                    conflictWriteMeta[docId] = await getMetaWriteRow(
                                        state,
                                        ensureNotFalsy(realMasterState),
                                        assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined,
                                        resolved.resolvedDoc._rev
                                    );
                                }
                            });
                        })
                );

                if (conflictWriteFork.length > 0) {
                    hadConflictWrites = true;

                    state.stats.up.persistToMasterConflictWrites = state.stats.up.persistToMasterConflictWrites + 1;
                    const forkWriteResult = await state.input.forkInstance.bulkWrite(
                        conflictWriteFork,
                        'replication-up-write-conflict'
                    );
                    /**
                     * Errors in the forkWriteResult must not be handled
                     * because they have been caused by a write to the forkInstance
                     * in between which will anyway trigger a new upstream cycle
                     * that will then resolved the conflict again.
                     */
                    const useMetaWrites: BulkWriteRow<RxStorageReplicationMeta<RxDocType, any>>[] = [];
                    forkWriteResult.success
                        .forEach(docData => {
                            const docId = (docData as any)[state.primaryPath];
                            useMetaWrites.push(
                                conflictWriteMeta[docId]
                            );
                        });
                    if (useMetaWrites.length > 0) {
                        await state.input.metaInstance.bulkWrite(
                            stripAttachmentsDataFromMetaWriteRows(state, useMetaWrites),
                            'replication-up-write-conflict-meta'
                        );
                    }
                    // TODO what to do with conflicts while writing to the metaInstance?
                }
            }

            /**
             * For better performance we do not await checkpoint writes,
             * but to ensure order on parallel checkpoint writes,
             * we have to use a queue.
             */
            setCheckpoint(
                state,
                'up',
                useCheckpoint
            );

            return hadConflictWrites;
        }).catch(unhandledError => {
            state.events.error.next(unhandledError);
            return false;
        });

        return persistenceQueue;
    }
}
