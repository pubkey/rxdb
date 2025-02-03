/**
 * These files contain the replication protocol.
 * It can be used to replicated RxStorageInstances or RxCollections
 * or even to do a client(s)-server replication.
 */


import {
    BehaviorSubject,
    combineLatest,
    filter,
    firstValueFrom,
    mergeMap,
    Subject
} from 'rxjs';
import {
    getPrimaryFieldOfPrimaryKey
} from '../rx-schema-helper.ts';
import type {
    BulkWriteRow,
    ById,
    DocumentsWithCheckpoint,
    RxConflictHandler,
    RxDocumentData,
    RxReplicationHandler,
    RxReplicationWriteToMasterRow,
    RxStorageInstance,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState,
    WithDeleted
} from '../types/index.d.ts';
import {
    clone,
    ensureNotFalsy,
    flatClone,
    PROMISE_RESOLVE_VOID
} from '../plugins/utils/index.ts';
import {
    getCheckpointKey
} from './checkpoint.ts';
import { startReplicationDownstream } from './downstream.ts';
import { docStateToWriteDoc, getUnderlyingPersistentStorage, writeDocToDocState } from './helper.ts';
import { startReplicationUpstream } from './upstream.ts';
import { fillWriteDataForAttachmentsChange } from '../plugins/attachments/index.ts';
import { getChangedDocumentsSince } from '../rx-storage-helper.ts';
import { newRxError } from '../rx-error.ts';


export * from './checkpoint.ts';
export * from './downstream.ts';
export * from './upstream.ts';
export * from './meta-instance.ts';
export * from './conflicts.ts';
export * from './helper.ts';
export * from './default-conflict-handler.ts';


export function replicateRxStorageInstance<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): RxStorageInstanceReplicationState<RxDocType> {
    input = flatClone(input);
    input.forkInstance = getUnderlyingPersistentStorage(input.forkInstance);
    input.metaInstance = getUnderlyingPersistentStorage(input.metaInstance);
    const checkpointKeyPromise = getCheckpointKey(input);
    const state: RxStorageInstanceReplicationState<RxDocType> = {
        primaryPath: getPrimaryFieldOfPrimaryKey(input.forkInstance.schema.primaryKey),
        hasAttachments: !!input.forkInstance.schema.attachments,
        input,
        checkpointKey: checkpointKeyPromise,
        downstreamBulkWriteFlag: checkpointKeyPromise.then(checkpointKey => 'replication-downstream-' + checkpointKey),
        events: {
            canceled: new BehaviorSubject<boolean>(false),
            paused: new BehaviorSubject<boolean>(false),
            active: {
                down: new BehaviorSubject<boolean>(true),
                up: new BehaviorSubject<boolean>(true)
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
            down: new BehaviorSubject<boolean>(false),
            up: new BehaviorSubject<boolean>(false)
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

export function awaitRxStorageReplicationFirstInSync(
    state: RxStorageInstanceReplicationState<any>
): Promise<void> {
    return firstValueFrom(
        combineLatest([
            state.firstSyncDone.down.pipe(
                filter(v => !!v)
            ),
            state.firstSyncDone.up.pipe(
                filter(v => !!v)
            )
        ])
    ).then(() => { });
}

export function awaitRxStorageReplicationInSync(
    replicationState: RxStorageInstanceReplicationState<any>
) {
    return Promise.all([
        replicationState.streamQueue.up,
        replicationState.streamQueue.down,
        replicationState.checkpointQueue
    ]);
}


export async function awaitRxStorageReplicationIdle(
    state: RxStorageInstanceReplicationState<any>
) {
    await awaitRxStorageReplicationFirstInSync(state);
    while (true) {
        const { down, up } = state.streamQueue;
        await Promise.all([
            up,
            down
        ]);
        /**
         * If the Promises have not been reassigned
         * after awaiting them, we know that the replication
         * is in idle state at this point in time.
         */
        if (
            down === state.streamQueue.down &&
            up === state.streamQueue.up
        ) {
            return;
        }
    }
}


export function rxStorageInstanceToReplicationHandler<RxDocType, MasterCheckpointType>(
    instance: RxStorageInstance<RxDocType, any, any, MasterCheckpointType>,
    conflictHandler: RxConflictHandler<RxDocType>,
    databaseInstanceToken: string,
    /**
     * If set to true,
     * the _meta.lwt from the pushed documents is kept.
     * (Used in the migration to ensure checkpoints are still valid)
     */
    keepMeta: boolean = false
): RxReplicationHandler<RxDocType, MasterCheckpointType> {
    instance = getUnderlyingPersistentStorage(instance);

    const hasAttachments = !!instance.schema.attachments;
    const primaryPath = getPrimaryFieldOfPrimaryKey(instance.schema.primaryKey);
    const replicationHandler: RxReplicationHandler<RxDocType, MasterCheckpointType> = {
        masterChangeStream$: instance.changeStream().pipe(
            mergeMap(async (eventBulk) => {
                const ret: DocumentsWithCheckpoint<RxDocType, MasterCheckpointType> = {
                    checkpoint: eventBulk.checkpoint,
                    documents: await Promise.all(
                        eventBulk.events.map(async (event) => {
                            let docData = writeDocToDocState(event.documentData, hasAttachments, keepMeta);
                            if (hasAttachments) {
                                docData = await fillWriteDataForAttachmentsChange(
                                    primaryPath,
                                    instance,
                                    clone(docData),
                                    /**
                                     * Notice that the master never knows
                                     * the client state of the document.
                                     * Therefore we always send all attachments data.
                                     */
                                    undefined
                                );
                            }
                            return docData;
                        })
                    )
                };
                return ret;
            })
        ),
        masterChangesSince(
            checkpoint,
            batchSize
        ) {
            return getChangedDocumentsSince(
                instance,
                batchSize,
                checkpoint
            ).then(async (result) => {
                return {
                    checkpoint: result.documents.length > 0 ? result.checkpoint : checkpoint,
                    documents: await Promise.all(
                        result.documents.map(async (plainDocumentData) => {
                            let docData = writeDocToDocState(plainDocumentData, hasAttachments, keepMeta);
                            if (hasAttachments) {
                                docData = await fillWriteDataForAttachmentsChange(
                                    primaryPath,
                                    instance,
                                    clone(docData),
                                    /**
                                     * Notice the the master never knows
                                     * the client state of the document.
                                     * Therefore we always send all attachments data.
                                     */
                                    undefined
                                );
                            }
                            return docData;
                        })
                    )
                };
            });
        },
        async masterWrite(
            rows
        ) {
            const rowById: ById<RxReplicationWriteToMasterRow<RxDocType>> = {};
            rows.forEach(row => {
                const docId: string = (row.newDocumentState as any)[primaryPath];
                rowById[docId] = row;
            });
            const ids = Object.keys(rowById);

            const masterDocsStateList = await instance.findDocumentsById(
                ids,
                true
            );
            const masterDocsState = new Map<string, RxDocumentData<RxDocType>>();
            masterDocsStateList.forEach(doc => masterDocsState.set((doc as any)[primaryPath], doc));
            const conflicts: WithDeleted<RxDocType>[] = [];
            const writeRows: BulkWriteRow<RxDocType>[] = [];
            await Promise.all(
                Object.entries(rowById)
                    .map(([id, row]) => {
                        const masterState = masterDocsState.get(id);
                        if (!masterState) {
                            writeRows.push({
                                document: docStateToWriteDoc(databaseInstanceToken, hasAttachments, keepMeta, row.newDocumentState)
                            });
                        } else if (
                            masterState &&
                            !row.assumedMasterState
                        ) {
                            conflicts.push(writeDocToDocState(masterState, hasAttachments, keepMeta));
                        } else if (
                            conflictHandler.isEqual(
                                writeDocToDocState(masterState, hasAttachments, keepMeta),
                                ensureNotFalsy(row.assumedMasterState),
                                'rxStorageInstanceToReplicationHandler-masterWrite'
                            ) === true
                        ) {
                            writeRows.push({
                                previous: masterState,
                                document: docStateToWriteDoc(databaseInstanceToken, hasAttachments, keepMeta, row.newDocumentState, masterState)
                            });
                        } else {
                            conflicts.push(writeDocToDocState(masterState, hasAttachments, keepMeta));
                        }
                    })
            );

            if (writeRows.length > 0) {
                const result = await instance.bulkWrite(
                    writeRows,
                    'replication-master-write'
                );

                result.error.forEach(err => {
                    if (err.status !== 409) {
                        throw newRxError('SNH', {
                            name: 'non conflict error',
                            error: err as any
                        });
                    } else {
                        conflicts.push(
                            writeDocToDocState(ensureNotFalsy(err.documentInDb), hasAttachments, keepMeta)
                        );
                    }
                });
            }
            return conflicts;
        }
    };

    return replicationHandler;
}


export async function cancelRxStorageReplication(
    replicationState: RxStorageInstanceReplicationState<any>
) {
    replicationState.events.canceled.next(true);
    replicationState.events.active.up.complete();
    replicationState.events.active.down.complete();
    replicationState.events.processed.up.complete();
    replicationState.events.processed.down.complete();
    replicationState.events.resolvedConflicts.complete();
    replicationState.events.canceled.complete();
    await replicationState.checkpointQueue;
}
