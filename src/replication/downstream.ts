import {
    firstValueFrom,
    filter
} from 'rxjs';
import type {
    RxStorageInstanceReplicationState,
    BulkWriteRow,
    BulkWriteRowById,
    RxStorageReplicationMeta,
    RxDocumentData,
    ById,
    WithDeleted,
    EventBulk
} from '../types';
import {
    createRevision,
    ensureNotFalsy,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    now,
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


    type Task = EventBulk<WithDeleted<RxDocType>, any> | 'RESYNC';
    type TaskWithTime = {
        time: number;
        task: Task;
    };
    const openTasks: TaskWithTime[] = [];


    function addNewTask(task: Task) {
        const taskWithTime = {
            time: timer++,
            task
        };
        openTasks.push(taskWithTime);
        state.streamQueue.down = state.streamQueue.down
            .then(() => {
                const useTasks: Task[] = [];
                while (openTasks.length > 0) {
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
            addNewTask(task);
        });
    firstValueFrom(
        state.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    /**
     * For faster performance, we directly start each write
     * and then await all writes at the end.
     */
    let lastTimeMasterChangesRequested: number = -1;
    async function downstreamResyncOnce() {
        if (state.canceled.getValue()) {
            return;
        }

        checkpointQueue = checkpointQueue.then(() => getLastCheckpointDoc(state, 'down'));
        let lastCheckpoint: CheckpointType = await checkpointQueue;

        const promises: Promise<any>[] = [];
        while (!state.canceled.getValue()) {
            lastTimeMasterChangesRequested = timer++;
            const downResult = await replicationHandler.masterChangesSince(
                lastCheckpoint,
                state.input.bulkSize
            );

            if (downResult.documentsData.length === 0) {
                break;
            }

            lastCheckpoint = downResult.checkpoint;
            promises.push(
                persistFromMaster(
                    downResult.documentsData,
                    downResult.checkpoint
                )
            );
        }
        await Promise.all(promises);
        if (!state.firstSyncDone.down.getValue()) {
            state.firstSyncDone.down.next(true);
        }
    }


    function downstreamProcessChanges(tasks: Task[]) {
        let docsOfAllTasks: WithDeleted<RxDocType>[] = [];
        let lastCheckpoint: CheckpointType | undefined = null as any;

        tasks.forEach(task => {
            if (task === 'RESYNC') {
                throw new Error('SNH');
            }
            docsOfAllTasks = docsOfAllTasks.concat(task.events);
            lastCheckpoint = task.checkpoint;
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
    ) {

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
        persistenceQueue = persistenceQueue.then(async () => {
            if (state.canceled.getValue()) {
                return;
            }

            const downDocsById: ById<WithDeleted<RxDocType>> = nonPersistedFromMaster.docs;
            nonPersistedFromMaster.docs = {};
            const useCheckpoint = nonPersistedFromMaster.checkpoint;
            const docIds = Object.keys(downDocsById);
            if (docIds.length === 0) {
                return;
            }
            const [
                currentForkState,
                assumedMasterState
            ] = await Promise.all([
                state.input.forkInstance.findDocumentsById(docIds, true),
                getAssumedMasterState(
                    state,
                    docIds
                )
            ]);

            const writeRowsToFork: BulkWriteRow<RxDocType>[] = [];
            const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};
            const useMetaWriteRows: BulkWriteRow<RxStorageReplicationMeta>[] = [];

            await Promise.all(
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
                        return;
                    }

                    const isAssumedMasterEqualToForkState = assumedMaster && forkStateDocData ? (await state.input.conflictHandler({
                        realMasterState: assumedMaster.docData,
                        newDocumentState: forkStateDocData
                    }, 'downstream-check-if-equal-0')).isEqual === true : false;

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
                        return;
                    }

                    if (
                        forkStateDocData &&
                        (await state.input.conflictHandler({
                            realMasterState: masterState,
                            newDocumentState: forkStateDocData
                        }, 'downstream-check-if-equal-1')).isEqual
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
                        return;
                    }

                    /**
                     * All other master states need to be written to the forkInstance
                     * and metaInstance.
                     */
                    const newForkState = Object.assign(
                        {},
                        masterState,
                        forkStateFullDoc ? {
                            _meta: forkStateFullDoc._meta,
                            _attachments: {},
                            _rev: getDefaultRevision()
                        } : {
                            _meta: getDefaultRxDocumentMeta(),
                            _rev: getDefaultRevision(),
                            _attachments: {}
                        });
                    newForkState._meta.lwt = now();
                    newForkState._rev = (masterState as any)._rev ? (masterState as any)._rev : createRevision(
                        newForkState,
                        forkStateFullDoc
                    );
                    writeRowsToFork.push({
                        previous: forkStateFullDoc,
                        document: newForkState
                    });
                    writeRowsToMeta[docId] = getMetaWriteRow(
                        state,
                        masterState,
                        assumedMaster ? assumedMaster.metaDocument : undefined
                    );
                })
            );
            if (writeRowsToFork.length > 0) {
                const forkWriteResult = await state.input.forkInstance.bulkWrite(
                    writeRowsToFork,
                    state.downstreamBulkWriteFlag
                );
                Object.keys(forkWriteResult.success).forEach((docId) => {
                    useMetaWriteRows.push(writeRowsToMeta[docId]);
                });
            }
            if (useMetaWriteRows.length > 0) {
                await state.input.metaInstance.bulkWrite(
                    useMetaWriteRows,
                    'replication-down-write-meta'
                );
            }


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

        return persistenceQueue;
    }
}
