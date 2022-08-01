import {
    firstValueFrom,
    filter
} from 'rxjs';
import { stackCheckpoints } from '../rx-storage-helper';
import type {
    RxStorageInstanceReplicationState,
    BulkWriteRow,
    BulkWriteRowById,
    RxStorageReplicationMeta,
    RxDocumentData,
    ById,
    WithDeleted,
    DocumentsWithCheckpoint
} from '../types';
import {
    createRevision,
    ensureNotFalsy,
    flatClone,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    now,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_VOID
} from '../util';
import {
    getLastCheckpointDoc,
    setCheckpoint
} from './checkpoint';
import { writeDocToDocState } from './helper';
import {
    getAssumedMasterState,
    getMetaWriteRow
} from './meta-instance';

/**
 * Writes all documents from the master to the fork.
 * The downstream has two operation modes
 * - Sync by iterating over the checkpoints via downstreamResyncOnce()
 * - Sync by listening to the changestream via downstreamProcessChanges()
 * We need this to be able to do initial syncs
 * and still can have fast event based sync when the client is not offline.
 */
export function startReplicationDownstream<RxDocType, CheckpointType = any>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    const replicationHandler = state.input.replicationHandler;

    // used to detect which tasks etc can in it at which order.
    let timer = 0;


    type Task = DocumentsWithCheckpoint<RxDocType, any> | 'RESYNC';
    type TaskWithTime = {
        time: number;
        task: Task;
    };
    const openTasks: TaskWithTime[] = [];


    function addNewTask(task: Task): void {
        state.stats.down.addNewTask = state.stats.down.addNewTask + 1;
        const taskWithTime = {
            time: timer++,
            task
        };
        openTasks.push(taskWithTime);
        state.streamQueue.down = state.streamQueue.down
            .then(() => {
                const useTasks: Task[] = [];
                while (openTasks.length > 0) {
                    state.events.active.down.next(true);
                    const taskWithTime = ensureNotFalsy(openTasks.shift());

                    /**
                     * If the task came in before the last time we started the pull 
                     * from the master, then we can drop the task.
                     */
                    if (taskWithTime.time < lastTimeMasterChangesRequested) {
                        continue;
                    }

                    if (taskWithTime.task === 'RESYNC') {
                        if (useTasks.length === 0) {
                            useTasks.push(taskWithTime.task);
                            break;
                        } else {
                            break;
                        }
                    }

                    useTasks.push(taskWithTime.task);
                }

                if (useTasks.length === 0) {
                    state.events.active.down.next(false);
                    return;
                }

                if (useTasks[0] === 'RESYNC') {
                    return downstreamResyncOnce();
                } else {
                    return downstreamProcessChanges(useTasks);
                }
            });
    }
    addNewTask('RESYNC');

    /**
     * If a write on the master happens, we have to trigger the downstream.
     */
    const sub = replicationHandler
        .masterChangeStream$
        .subscribe((task: Task) => {
            state.stats.down.masterChangeStreamEmit = state.stats.down.masterChangeStreamEmit + 1;
            addNewTask(task);
        });
    firstValueFrom(
        state.events.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    /**
     * For faster performance, we directly start each write
     * and then await all writes at the end.
     */
    let lastTimeMasterChangesRequested: number = -1;
    async function downstreamResyncOnce() {
        state.stats.down.downstreamResyncOnce = state.stats.down.downstreamResyncOnce + 1;
        if (state.events.canceled.getValue()) {
            return;
        }

        checkpointQueue = checkpointQueue.then(() => getLastCheckpointDoc(state, 'down'));
        let lastCheckpoint: CheckpointType = await checkpointQueue;

        const promises: Promise<any>[] = [];
        while (!state.events.canceled.getValue()) {
            lastTimeMasterChangesRequested = timer++;
            const downResult = await replicationHandler.masterChangesSince(
                lastCheckpoint,
                state.input.bulkSize
            );

            if (downResult.documents.length === 0) {
                break;
            }

            lastCheckpoint = stackCheckpoints([lastCheckpoint, downResult.checkpoint]);
            promises.push(
                persistFromMaster(
                    downResult.documents,
                    lastCheckpoint
                )
            );
        }
        return Promise.all(promises)
            .then(() => {
                if (!state.firstSyncDone.down.getValue()) {
                    state.firstSyncDone.down.next(true);
                }
            });
    }


    function downstreamProcessChanges(tasks: Task[]) {
        state.stats.down.downstreamProcessChanges = state.stats.down.downstreamProcessChanges + 1;
        let docsOfAllTasks: WithDeleted<RxDocType>[] = [];
        let lastCheckpoint: CheckpointType | undefined = null as any;

        tasks.forEach(task => {
            if (task === 'RESYNC') {
                throw new Error('SNH');
            }
            docsOfAllTasks = docsOfAllTasks.concat(task.documents);
            lastCheckpoint = stackCheckpoints([lastCheckpoint, task.checkpoint]);
        });

        return persistFromMaster(
            docsOfAllTasks,
            ensureNotFalsy(lastCheckpoint)
        );
    }


    /**
     * It can happen that the calls to masterChangesSince() or the changeStream()
     * are way faster then how fast the documents can be persisted.
     * Therefore we merge all incoming downResults into the nonPersistedFromMaster object
     * and process them together if possible.
     * This often bundles up single writes and improves performance
     * by processing the documents in bulks.
     */
    let persistenceQueue = PROMISE_RESOLVE_VOID;
    let checkpointQueue: Promise<any> = PROMISE_RESOLVE_VOID;
    const nonPersistedFromMaster: {
        checkpoint?: CheckpointType;
        docs: ById<WithDeleted<RxDocType>>;
    } = {
        docs: {}
    };

    function persistFromMaster(
        docs: WithDeleted<RxDocType>[],
        checkpoint: CheckpointType
    ): Promise<void> {
        state.stats.down.persistFromMaster = state.stats.down.persistFromMaster + 1;

        /**
         * Add the new docs to the non-persistend list
         */
        docs.forEach(docData => {
            const docId: string = (docData as any)[state.primaryPath];
            nonPersistedFromMaster.docs[docId] = docData;
        });
        nonPersistedFromMaster.checkpoint = checkpoint;


        /**
         * Run in the queue
         * with all open documents from nonPersistedFromMaster.
         */
        persistenceQueue = persistenceQueue.then(() => {
            const downDocsById: ById<WithDeleted<RxDocType>> = nonPersistedFromMaster.docs;
            nonPersistedFromMaster.docs = {};
            const useCheckpoint = nonPersistedFromMaster.checkpoint;
            const docIds = Object.keys(downDocsById);

            if (
                state.events.canceled.getValue() ||
                docIds.length === 0
            ) {
                return PROMISE_RESOLVE_VOID;
            }

            const writeRowsToFork: BulkWriteRow<RxDocType>[] = [];
            const writeRowsToForkById: ById<BulkWriteRow<RxDocType>> = {};
            const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};
            const useMetaWriteRows: BulkWriteRow<RxStorageReplicationMeta>[] = [];

            return Promise.all([
                state.input.forkInstance.findDocumentsById(docIds, true),
                getAssumedMasterState(
                    state,
                    docIds
                )
            ]).then(([
                currentForkState,
                assumedMasterState
            ]) => {
                return Promise.all(
                    docIds.map(async (docId) => {
                        const forkStateFullDoc: RxDocumentData<RxDocType> | undefined = currentForkState[docId];
                        const forkStateDocData: WithDeleted<RxDocType> | undefined = forkStateFullDoc ? writeDocToDocState(forkStateFullDoc) : undefined;
                        const masterState = downDocsById[docId];
                        const assumedMaster = assumedMasterState[docId];

                        if (
                            assumedMaster &&
                            assumedMaster.metaDocument.isResolvedConflict === forkStateFullDoc._rev
                        ) {
                            /**
                             * The current fork state represents a resolved conflict
                             * that first must be send to the master in the upstream.
                             * All conflicts are resolved by the upstream.
                             */
                            return PROMISE_RESOLVE_VOID;
                        }


                        const isAssumedMasterEqualToForkStatePromise = !assumedMaster || !forkStateDocData ?
                            PROMISE_RESOLVE_FALSE :
                            state.input.conflictHandler({
                                realMasterState: assumedMaster.docData,
                                newDocumentState: forkStateDocData
                            }, 'downstream-check-if-equal-0').then(r => r.isEqual);
                        const isAssumedMasterEqualToForkState = await isAssumedMasterEqualToForkStatePromise;
                        if (
                            (
                                forkStateFullDoc &&
                                assumedMaster &&
                                isAssumedMasterEqualToForkState === false
                            ) ||
                            (
                                forkStateFullDoc && !assumedMaster
                            )
                        ) {
                            /**
                             * We have a non-upstream-replicated
                             * local write to the fork.
                             * This means we ignore the downstream of this document
                             * because anyway the upstream will first resolve the conflict.
                             */
                            return PROMISE_RESOLVE_VOID;
                        }


                        const areStatesExactlyEqualPromise = !forkStateDocData ?
                            PROMISE_RESOLVE_FALSE :
                            state.input.conflictHandler({
                                realMasterState: masterState,
                                newDocumentState: forkStateDocData
                            }, 'downstream-check-if-equal-1').then(r => r.isEqual);
                        const areStatesExactlyEqual = await areStatesExactlyEqualPromise;

                        if (
                            forkStateDocData &&
                            areStatesExactlyEqual
                        ) {
                            /**
                             * Document states are exactly equal.
                             * This can happen when the replication is shut down
                             * unexpected like when the user goes offline.
                             * 
                             * Only when the assumedMaster is different from the forkState,
                             * we have to patch the document in the meta instance.
                             */
                            if (
                                !assumedMaster ||
                                isAssumedMasterEqualToForkState === false
                            ) {
                                useMetaWriteRows.push(
                                    getMetaWriteRow(
                                        state,
                                        forkStateDocData,
                                        assumedMaster ? assumedMaster.metaDocument : undefined
                                    )
                                );
                            }
                            return PROMISE_RESOLVE_VOID;
                        }

                        /**
                         * All other master states need to be written to the forkInstance
                         * and metaInstance.
                         */
                        const newForkState = Object.assign(
                            {},
                            masterState,
                            forkStateFullDoc ? {
                                _meta: flatClone(forkStateFullDoc._meta),
                                _attachments: {},
                                _rev: getDefaultRevision()
                            } : {
                                _meta: getDefaultRxDocumentMeta(),
                                _rev: getDefaultRevision(),
                                _attachments: {}
                            });
                        newForkState._meta.lwt = now();
                        newForkState._rev = (masterState as any)._rev ? (masterState as any)._rev : createRevision(
                            state.input.hashFunction,
                            newForkState,
                            forkStateFullDoc
                        );
                        const forkWriteRow = {
                            previous: forkStateFullDoc,
                            document: newForkState
                        };
                        writeRowsToFork.push(forkWriteRow);
                        writeRowsToForkById[docId] = forkWriteRow;
                        writeRowsToMeta[docId] = getMetaWriteRow(
                            state,
                            masterState,
                            assumedMaster ? assumedMaster.metaDocument : undefined
                        );
                    })
                );
            }).then(() => {
                if (writeRowsToFork.length > 0) {
                    return state.input.forkInstance.bulkWrite(
                        writeRowsToFork,
                        state.downstreamBulkWriteFlag
                    ).then((forkWriteResult) => {
                        Object.keys(forkWriteResult.success).forEach((docId) => {
                            state.events.processed.down.next(writeRowsToForkById[docId]);
                            useMetaWriteRows.push(writeRowsToMeta[docId]);
                        });
                    });
                }
            }).then(() => {
                if (useMetaWriteRows.length > 0) {
                    return state.input.metaInstance.bulkWrite(
                        useMetaWriteRows,
                        'replication-down-write-meta'
                    );
                }
            }).then(() => {
                /**
                 * For better performance we do not await checkpoint writes,
                 * but to ensure order on parrallel checkpoint writes,
                 * we have to use a queue.
                 */
                checkpointQueue = checkpointQueue.then(() => setCheckpoint(
                    state,
                    'down',
                    useCheckpoint
                ));
            });
        }).catch(unhandledError => state.events.error.next(unhandledError));
        return persistenceQueue;
    }
}
