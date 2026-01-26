import {
    firstValueFrom,
    filter,
    mergeMap
} from 'rxjs';
import { newRxError } from '../rx-error.ts';
import { getWrittenDocumentsFromBulkWriteResponse, stackCheckpoints } from '../rx-storage-helper.ts';
import type {
    RxStorageInstanceReplicationState,
    BulkWriteRow,
    BulkWriteRowById,
    RxStorageReplicationMeta,
    RxDocumentData,
    ById,
    WithDeleted,
    DocumentsWithCheckpoint,
    WithDeletedAndAttachments,
    RxError
} from '../types/index.d.ts';
import {
    createRevision,
    ensureNotFalsy,
    flatClone,
    getDefaultRevision,
    getHeightOfRevision,
    now,
    PROMISE_RESOLVE_VOID
} from '../plugins/utils/index.ts';
import {
    getLastCheckpointDoc,
    setCheckpoint
} from './checkpoint.ts';
import {
    stripAttachmentsDataFromMetaWriteRows,
    writeDocToDocState
} from './helper.ts';
import {
    getAssumedMasterState,
    getMetaWriteRow
} from './meta-instance.ts';

/**
 * Writes all documents from the master to the fork.
 * The downstream has two operation modes
 * - Sync by iterating over the checkpoints via downstreamResyncOnce()
 * - Sync by listening to the changestream via downstreamProcessChanges()
 * We need this to be able to do initial syncs
 * and still can have fast event based sync when the client is not offline.
 */
export async function startReplicationDownstream<RxDocType, CheckpointType = any>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    if (
        state.input.initialCheckpoint &&
        state.input.initialCheckpoint.downstream
    ) {
        const checkpointDoc = await getLastCheckpointDoc(state, 'down');
        if (!checkpointDoc) {
            await setCheckpoint(
                state,
                'down',
                state.input.initialCheckpoint.downstream
            );
        }
    }

    const identifierHash = await state.input.hashFunction(state.input.identifier);
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
                    const innerTaskWithTime = ensureNotFalsy(openTasks.shift());

                    /**
                     * If the task came in before the last time we started the pull
                     * from the master, then we can drop the task.
                     */
                    if (innerTaskWithTime.time < lastTimeMasterChangesRequested) {
                        continue;
                    }

                    if (innerTaskWithTime.task === 'RESYNC') {
                        if (useTasks.length === 0) {
                            useTasks.push(innerTaskWithTime.task);
                            break;
                        } else {
                            break;
                        }
                    }

                    useTasks.push(innerTaskWithTime.task);
                }
                if (useTasks.length === 0) {
                    return;
                }

                if (useTasks[0] === 'RESYNC') {
                    return downstreamResyncOnce();
                } else {
                    return downstreamProcessChanges(useTasks);
                }
            }).then(() => {
                state.events.active.down.next(false);
                if (
                    !state.firstSyncDone.down.getValue() &&
                    !state.events.canceled.getValue()
                ) {
                    state.firstSyncDone.down.next(true);
                }
            });
    }
    addNewTask('RESYNC');

    /**
     * If a write on the master happens, we have to trigger the downstream.
     * Only do this if not canceled yet, otherwise firstValueFrom errors
     * when running on a completed observable.
     */
    if (!state.events.canceled.getValue()) {
        const sub = replicationHandler
            .masterChangeStream$
            .pipe(
                mergeMap(async (ev) => {
                    /**
                     * While a push is running, we have to delay all incoming
                     * events from the server to not mix up the replication state.
                     */
                    await firstValueFrom(
                        state.events.active.up.pipe(filter(s => !s))
                    );
                    return ev;
                })
            )
            .subscribe((task: Task) => {
                state.stats.down.masterChangeStreamEmit = state.stats.down.masterChangeStreamEmit + 1;
                addNewTask(task);
            });
        // unsubscribe when replication is canceled
        firstValueFrom(
            state.events.canceled.pipe(
                filter(canceled => !!canceled)
            )
        ).then(() => sub.unsubscribe());
    }


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

        state.checkpointQueue = state.checkpointQueue.then(() => getLastCheckpointDoc(state, 'down'));
        let lastCheckpoint: CheckpointType = await state.checkpointQueue;


        const promises: Promise<any>[] = [];
        while (!state.events.canceled.getValue()) {
            lastTimeMasterChangesRequested = timer++;
            const downResult = await replicationHandler.masterChangesSince(
                lastCheckpoint,
                state.input.pullBatchSize
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

            /**
             * By definition we stop pull when the pulled documents
             * do not fill up the pullBatchSize because we
             * can assume that the remote has no more documents.
             */
            if (downResult.documents.length < state.input.pullBatchSize) {
                break;
            }

        }
        await Promise.all(promises);
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
        const primaryPath = state.primaryPath;
        state.stats.down.persistFromMaster = state.stats.down.persistFromMaster + 1;

        /**
         * Add the new docs to the non-persistent list
         */
        docs.forEach(docData => {
            const docId: string = (docData as any)[primaryPath];
            nonPersistedFromMaster.docs[docId] = docData;
        });
        nonPersistedFromMaster.checkpoint = checkpoint;

        /**
         * Run in the queue
         * with all open documents from nonPersistedFromMaster.
         */
        persistenceQueue = persistenceQueue.then(() => {
            const downDocsById: ById<WithDeletedAndAttachments<RxDocType>> = nonPersistedFromMaster.docs;
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
            const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta<RxDocType, CheckpointType>> = {};
            const useMetaWriteRows: BulkWriteRow<RxStorageReplicationMeta<RxDocType, CheckpointType>>[] = [];

            return Promise.all([
                state.input.forkInstance.findDocumentsById(docIds, true),
                getAssumedMasterState(
                    state,
                    docIds
                )
            ]).then(([
                currentForkStateList,
                assumedMasterState
            ]) => {
                const currentForkState = new Map<string, RxDocumentData<RxDocType>>();
                currentForkStateList.forEach(doc => currentForkState.set((doc as any)[primaryPath], doc));
                return Promise.all(
                    docIds.map(async (docId) => {
                        const forkStateFullDoc: RxDocumentData<RxDocType> | undefined = currentForkState.get(docId);
                        const forkStateDocData: WithDeletedAndAttachments<RxDocType> | undefined = forkStateFullDoc
                            ? writeDocToDocState(forkStateFullDoc, state.hasAttachments, false)
                            : undefined
                            ;
                        const masterState = downDocsById[docId];
                        const assumedMaster = assumedMasterState[docId];

                        if (
                            assumedMaster &&
                            forkStateFullDoc &&
                            assumedMaster.metaDocument.isResolvedConflict === forkStateFullDoc._rev
                        ) {
                            /**
                             * The current fork state represents a resolved conflict
                             * that first must be send to the master in the upstream.
                             * All conflicts are resolved by the upstream.
                             */
                            // return PROMISE_RESOLVE_VOID;
                            await state.streamQueue.up;
                        }

                        let isAssumedMasterEqualToForkState = !assumedMaster || !forkStateDocData ?
                            false :
                            state.input.conflictHandler.isEqual(
                                assumedMaster.docData,
                                forkStateDocData,
                                'downstream-check-if-equal-0'
                            );
                        if (
                            !isAssumedMasterEqualToForkState &&
                            (
                                assumedMaster &&
                                (assumedMaster.docData as any)._rev &&
                                forkStateFullDoc &&
                                forkStateFullDoc._meta[state.input.identifier] &&
                                getHeightOfRevision(forkStateFullDoc._rev) === forkStateFullDoc._meta[state.input.identifier]
                            )
                        ) {
                            isAssumedMasterEqualToForkState = true;
                        }
                        if (
                            (
                                (
                                    forkStateFullDoc &&
                                    assumedMaster &&
                                    isAssumedMasterEqualToForkState === false
                                ) ||
                                (
                                    forkStateFullDoc && !assumedMaster
                                )
                            ) && !state.skipStoringPullMeta
                        ) {
                            /**
                             * We have a non-upstream-replicated
                             * local write to the fork.
                             * This means we ignore the downstream of this document
                             * because anyway the upstream will first resolve the conflict.
                             */
                            return PROMISE_RESOLVE_VOID;
                        }

                        const areStatesExactlyEqual = !forkStateDocData
                            ? false
                            : state.input.conflictHandler.isEqual(
                                masterState,
                                forkStateDocData,
                                'downstream-check-if-equal-1'
                            );
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
                                    await getMetaWriteRow(
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
                                _attachments: state.hasAttachments && masterState._attachments ? masterState._attachments : {},
                                _rev: getDefaultRevision()
                            } : {
                                _meta: {
                                    lwt: now()
                                },
                                _rev: getDefaultRevision(),
                                _attachments: state.hasAttachments && masterState._attachments ? masterState._attachments : {}
                            }
                        );
                        /**
                         * If the remote works with revisions,
                         * we store the height of the next fork-state revision
                         * inside of the documents meta data.
                         * By doing so we can filter it out in the upstream
                         * and detect the document as being equal to master or not.
                         * This is used for example in the CouchDB replication plugin.
                         */
                        if ((masterState as any)._rev) {
                            const nextRevisionHeight = !forkStateFullDoc ? 1 : getHeightOfRevision(forkStateFullDoc._rev) + 1;
                            newForkState._meta[state.input.identifier] = nextRevisionHeight;
                            if (state.input.keepMeta) {
                                newForkState._rev = (masterState as any)._rev;
                            }
                        }
                        if (
                            state.input.keepMeta &&
                            (masterState as any)._meta
                        ) {
                            newForkState._meta = (masterState as any)._meta;
                        }

                        const forkWriteRow = {
                            previous: forkStateFullDoc,
                            document: newForkState
                        };

                        forkWriteRow.document._rev = forkWriteRow.document._rev ? forkWriteRow.document._rev : createRevision(
                            identifierHash,
                            forkWriteRow.previous
                        );
                        writeRowsToFork.push(forkWriteRow);
                        writeRowsToForkById[docId] = forkWriteRow;
                        writeRowsToMeta[docId] = await getMetaWriteRow(
                            state,
                            masterState,
                            assumedMaster ? assumedMaster.metaDocument : undefined
                        );
                    })
                );
            }).then(async () => {
                if (writeRowsToFork.length > 0) {
                    return state.input.forkInstance.bulkWrite(
                        writeRowsToFork,
                        await state.downstreamBulkWriteFlag
                    ).then((forkWriteResult) => {
                        const success = getWrittenDocumentsFromBulkWriteResponse(
                            state.primaryPath,
                            writeRowsToFork,
                            forkWriteResult
                        );
                        success.forEach(doc => {
                            const docId = (doc as any)[primaryPath];
                            state.events.processed.down.next(writeRowsToForkById[docId]);
                            useMetaWriteRows.push(writeRowsToMeta[docId]);
                        });
                        let mustThrow: RxError | undefined;
                        forkWriteResult.error.forEach(error => {
                            /**
                             * We do not have to care about downstream conflict errors here
                             * because on conflict, it will be solved locally and result in another write.
                             */
                            if (error.status === 409) {
                                return;
                            }
                            // other non-conflict errors must be handled
                            const throwMe = newRxError('RC_PULL', {
                                writeError: error
                            });
                            state.events.error.next(throwMe);
                            mustThrow = throwMe;
                        });
                        if (mustThrow) {
                            throw mustThrow;
                        }
                    });
                }
            }).then(() => {
                if (!state.skipStoringPullMeta && useMetaWriteRows.length > 0) {
                    return state.input.metaInstance.bulkWrite(
                        stripAttachmentsDataFromMetaWriteRows(state, useMetaWriteRows),
                        'replication-down-write-meta'
                    ).then(metaWriteResult => {
                        metaWriteResult.error
                            .forEach(writeError => {
                                state.events.error.next(newRxError('RC_PULL', {
                                    id: writeError.documentId,
                                    writeError
                                }));
                            });
                    });
                }
            }).then(() => {
                /**
                 * For better performance we do not await checkpoint writes,
                 * but to ensure order on parallel checkpoint writes,
                 * we have to use a queue.
                 */
                setCheckpoint(
                    state,
                    'down',
                    useCheckpoint
                );
            });
        }).catch(unhandledError => state.events.error.next(unhandledError));
        return persistenceQueue;
    }
}
