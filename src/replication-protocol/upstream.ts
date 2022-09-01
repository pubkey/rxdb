import { firstValueFrom, filter } from 'rxjs';
import { stackCheckpoints } from '../rx-storage-helper';
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
} from '../types';
import {
    ensureNotFalsy,
    flatClone,
    PROMISE_RESOLVE_FALSE
} from '../util';
import {
    getLastCheckpointDoc,
    setCheckpoint
} from './checkpoint';
import { resolveConflictError } from './conflicts';
import { writeDocToDocState } from './helper';
import {
    getAssumedMasterState,
    getMetaWriteRow
} from './meta-instance';

/**
 * Writes all document changes from the fork to the master.
 * The upstream runs on two modes:
 * - For inital replication, a checkpoint-iteration is used
 * - For ongoing local writes, we just subscribe to the changeStream of the fork.
 *   In contrast to the master, the fork can be assumed to never loose connection,
 *   so we do not have to prepare for missed out events.
 */
export function startReplicationUpstream<RxDocType, CheckpointType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
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


    const sub = state.input.forkInstance.changeStream()
        .pipe(
            filter(eventBulk => eventBulk.context !== state.downstreamBulkWriteFlag)
        ).subscribe(eventBulk => {
            state.stats.up.forkChangeStreamEmit = state.stats.up.forkChangeStreamEmit + 1;
            openTasks.push({
                task: eventBulk,
                time: timer++
            });
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

        const promises: Promise<any>[] = [];
        while (!state.events.canceled.getValue()) {
            initialSyncStartTime = timer++;
            const upResult = await state.input.forkInstance.getChangedDocumentsSince(
                state.input.pushBatchSize,
                lastCheckpoint
            );
            if (upResult.documents.length === 0) {
                break;
            }

            lastCheckpoint = stackCheckpoints([lastCheckpoint, upResult.checkpoint]);

            promises.push(
                persistToMaster(
                    upResult.documents,
                    ensureNotFalsy(lastCheckpoint)
                )
            );
        }

        /**
         * If we had conflicts during the inital sync,
         * it means that we likely have new writes to the fork
         * and so we have to run the initial sync again to upastream these new writes.
         */
        const resolvedPromises = await Promise.all(promises);
        const hadConflicts = resolvedPromises.find(r => !!r);
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
            let docs: RxDocumentData<RxDocType>[] = [];
            let checkpoint: CheckpointType = {} as any;
            while (openTasks.length > 0) {
                const taskWithTime = ensureNotFalsy(openTasks.shift());
                /**
                 * If the task came in before the last time the inital sync fetching
                 * has run, we can ignore the task because the inital sync already processed
                 * these documents.
                 */
                if (taskWithTime.time < initialSyncStartTime) {
                    continue;
                }

                docs = docs.concat(
                    taskWithTime.task.events.map(r => {
                        if (r.change.operation === 'DELETE') {
                            const ret: any = flatClone(r.change.previous);
                            ret._deleted = true;
                            return ret;
                        } else {
                            return r.change.doc;
                        }
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

    let persistenceQueue: Promise<boolean> = PROMISE_RESOLVE_FALSE;
    const nonPersistedFromMaster: {
        checkpoint?: CheckpointType;
        docs: ById<RxDocumentData<RxDocType>>;
    } = {
        docs: {}
    };

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
         * Add the new docs to the non-persistend list
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
            const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};
            const forkStateById: ById<RxDocumentData<RxDocType>> = {};

            await Promise.all(
                docIds.map(async (docId) => {
                    const fullDocData: RxDocumentData<RxDocType> = upDocsById[docId];
                    forkStateById[docId] = fullDocData;
                    const docData: WithDeleted<RxDocType> = writeDocToDocState(fullDocData);
                    const assumedMasterDoc = assumedMasterState[docId];

                    /**
                     * If the master state is equal to the
                     * fork state, we can assume that the document state is already
                     * replicated.
                     */
                    if (
                        assumedMasterDoc &&
                        // if the isResolvedConflict is correct, we do not have to compare the documents.
                        assumedMasterDoc.metaDocument.isResolvedConflict !== fullDocData._rev &&
                        (await state.input.conflictHandler({
                            realMasterState: assumedMasterDoc.docData,
                            newDocumentState: docData
                        }, 'upstream-check-if-equal')).isEqual
                    ) {
                        return;
                    }

                    writeRowsToMasterIds.push(docId);

                    writeRowsToMaster[docId] = {
                        assumedMasterState: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
                        newDocumentState: docData
                    };
                    writeRowsToMeta[docId] = getMetaWriteRow(
                        state,
                        docData,
                        assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined
                    );
                })
            );

            if (writeRowsToMasterIds.length === 0) {
                return false;
            }

            const masterWriteResult = await replicationHandler.masterWrite(Object.values(writeRowsToMaster));
            const conflictIds: Set<string> = new Set();
            const conflictsById: ById<WithDeleted<RxDocType>> = {};
            masterWriteResult.forEach(conflictDoc => {
                const id = (conflictDoc as any)[state.primaryPath];
                conflictIds.add(id);
                conflictsById[id] = conflictDoc;
            });

            const useWriteRowsToMeta: BulkWriteRow<RxStorageReplicationMeta>[] = [];


            writeRowsToMasterIds.forEach(docId => {
                if (!conflictIds.has(docId)) {
                    state.events.processed.up.next(writeRowsToMaster[docId]);
                    useWriteRowsToMeta.push(writeRowsToMeta[docId]);
                }
            });

            if (useWriteRowsToMeta.length > 0) {
                await state.input.metaInstance.bulkWrite(
                    useWriteRowsToMeta,
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
                const conflictWriteMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};
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
                            ).then(resolved => {
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
                                    conflictWriteMeta[docId] = getMetaWriteRow(
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
                    const useMetaWrites: BulkWriteRow<RxStorageReplicationMeta>[] = [];
                    Object
                        .keys(forkWriteResult.success)
                        .forEach((docId) => {
                            useMetaWrites.push(
                                conflictWriteMeta[docId]
                            );
                        });
                    if (useMetaWrites.length > 0) {
                        await state.input.metaInstance.bulkWrite(
                            useMetaWrites,
                            'replication-up-write-conflict-meta'
                        );
                    }
                    // TODO what to do with conflicts while writing to the metaInstance?
                }
            }

            /**
             * For better performance we do not await checkpoint writes,
             * but to ensure order on parrallel checkpoint writes,
             * we have to use a queue.
             */
            state.checkpointQueue = state.checkpointQueue.then(() => setCheckpoint(
                state,
                'up',
                useCheckpoint
            ));

            return hadConflictWrites;
        }).catch(unhandledError => {
            state.events.error.next(unhandledError);
            return false;
        });

        return persistenceQueue;
    }
}

