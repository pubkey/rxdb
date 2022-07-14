import { firstValueFrom, filter } from 'rxjs';
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
    lastOfArray,
    ensureNotFalsy,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_VOID
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
    state.streamQueue.up = state.streamQueue.up.then(async () => {
        await upstreamInitialSync();


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
        ).subscribe(async (eventBulk) => {
            openTasks.push({
                task: eventBulk,
                time: timer++
            });
            if (state.input.waitBeforePersist) {
                await state.input.waitBeforePersist();
            }
            processTasks();
        });
    firstValueFrom(
        state.events.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    async function upstreamInitialSync() {
        if (state.events.canceled.getValue()) {
            return;
        }

        checkpointQueue = checkpointQueue.then(() => getLastCheckpointDoc(state, 'up'));
        let lastCheckpoint: CheckpointType = await checkpointQueue;

        const promises: Promise<any>[] = [];
        while (!state.events.canceled.getValue()) {
            initialSyncStartTime = timer++;
            const upResult = await state.input.forkInstance.getChangedDocumentsSince(
                state.input.bulkSize,
                lastCheckpoint
            );
            if (upResult.length === 0) {
                break;
            }

            lastCheckpoint = lastOfArray(upResult).checkpoint;

            promises.push(
                persistToMaster(
                    upResult.map(r => r.document),
                    ensureNotFalsy(lastCheckpoint)
                )
            );
        }

        /**
         * If we had conflicts during the inital sync,
         * it means that we likely have new writes to the fork
         * and so we have to run the initial sync again to upastream these new writes.
         */
        const hadConflicts = (await Promise.all(promises)).find(r => !!r);
        if (hadConflicts) {
            await upstreamInitialSync();
        } else if (!state.firstSyncDone.up.getValue()) {
            state.firstSyncDone.up.next(true);
        }
    }

    function processTasks() {
        if (
            state.events.canceled.getValue() ||
            openTasks.length === 0
        ) {
            return;
        }

        state.streamQueue.up = state.streamQueue.up.then(async () => {
            let docs: RxDocumentData<RxDocType>[] = [];
            let checkpoint: CheckpointType;
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
                        if (r.change.doc) {
                            return r.change.doc;
                        } else {
                            return r.change.previous as any;
                        }
                    })
                );
                checkpoint = taskWithTime.task.checkpoint;

                return persistToMaster(
                    docs,
                    checkpoint
                );
            }
        });
    }

    let persistenceQueue: Promise<boolean> = PROMISE_RESOLVE_FALSE;
    let checkpointQueue: Promise<any> = PROMISE_RESOLVE_VOID;
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
    async function persistToMaster(
        docs: RxDocumentData<RxDocType>[],
        checkpoint: CheckpointType
    ): Promise<boolean> {
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
                const conflictWriteFork: BulkWriteRow<RxDocType>[] = [];
                const conflictWriteMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};
                await Promise.all(
                    Object
                        .entries(conflictsById)
                        .map(async ([docId, realMasterState]) => {
                            const writeToMasterRow = writeRowsToMaster[docId];

                            const resolved = await resolveConflictError(
                                state.input.conflictHandler,
                                {
                                    newDocumentState: writeToMasterRow.newDocumentState,
                                    assumedMasterState: writeToMasterRow.assumedMasterState,
                                    realMasterState
                                },
                                forkStateById[docId]
                            );
                            if (resolved) {
                                conflictWriteFork.push({
                                    previous: forkStateById[docId],
                                    document: resolved
                                });
                                const assumedMasterDoc = assumedMasterState[docId];
                                conflictWriteMeta[docId] = getMetaWriteRow(
                                    state,
                                    ensureNotFalsy(realMasterState),
                                    assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined,
                                    resolved._rev
                                );
                            }
                        })
                );

                if (conflictWriteFork.length > 0) {
                    hadConflictWrites = true;

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
            checkpointQueue = checkpointQueue.then(() => setCheckpoint(
                state,
                'up',
                useCheckpoint
            ));

            return hadConflictWrites;
        });

        return persistenceQueue;
    }
}

