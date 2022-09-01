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
    map,
    Subject
} from 'rxjs';
import {
    getPrimaryFieldOfPrimaryKey
} from '../rx-schema-helper';
import type {
    BulkWriteRow,
    ById,
    DocumentsWithCheckpoint,
    HashFunction,
    RxConflictHandler,
    RxReplicationHandler,
    RxReplicationWriteToMasterRow,
    RxStorageInstance,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState,
    WithDeleted
} from '../types';
import {
    ensureNotFalsy,
    flatClone,
    PROMISE_RESOLVE_VOID
} from '../util';
import {
    getCheckpointKey
} from './checkpoint';
import { startReplicationDownstream } from './downstream';
import { docStateToWriteDoc, writeDocToDocState } from './helper';
import { startReplicationUpstream } from './upstream';


export * from './checkpoint';
export * from './downstream';
export * from './upstream';
export * from './meta-instance';
export * from './conflicts';
export * from './helper';


export function replicateRxStorageInstance<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): RxStorageInstanceReplicationState<RxDocType> {
    const checkpointKey = getCheckpointKey(input);
    const state: RxStorageInstanceReplicationState<RxDocType> = {
        primaryPath: getPrimaryFieldOfPrimaryKey(input.forkInstance.schema.primaryKey),
        input,
        checkpointKey,
        downstreamBulkWriteFlag: 'replication-downstream-' + checkpointKey,
        events: {
            canceled: new BehaviorSubject<boolean>(false),
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
        replicationState.streamQueue.down
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
         * If the Promises have not been reasigned
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
    hashFunction: HashFunction
): RxReplicationHandler<RxDocType, MasterCheckpointType> {
    const primaryPath = getPrimaryFieldOfPrimaryKey(instance.schema.primaryKey);
    const replicationHandler: RxReplicationHandler<RxDocType, MasterCheckpointType> = {
        masterChangeStream$: instance.changeStream().pipe(
            map(eventBulk => {
                const ret: DocumentsWithCheckpoint<RxDocType, MasterCheckpointType> = {
                    checkpoint: eventBulk.checkpoint,
                    documents: eventBulk.events.map(event => {
                        /**
                         * TODO the event object should be properly redesigned
                         * to how RxDB does use it.
                         * This requires touching the event-reduce-js library
                         * and others. But it would remove much complexity
                         * from RxDBs event handling.
                         */
                        if (event.change.doc) {
                            return writeDocToDocState(event.change.doc as any);
                        } else {
                            let useDoc = ensureNotFalsy(event.change.previous);
                            if (event.change.operation === 'DELETE') {
                                useDoc = flatClone(useDoc);
                                (useDoc as any)._deleted = true;
                            }
                            return writeDocToDocState(useDoc as any);
                        }
                    })
                };
                return ret;
            })
        ),
        masterChangesSince(
            checkpoint,
            batchSize
        ) {
            return instance.getChangedDocumentsSince(
                batchSize,
                checkpoint
            ).then(result => {
                return {
                    checkpoint: result.documents.length > 0 ? result.checkpoint : checkpoint,
                    documents: result.documents.map(d => writeDocToDocState(d))
                }
            })
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

            const masterDocsState = await instance.findDocumentsById(
                ids,
                true
            );
            const conflicts: WithDeleted<RxDocType>[] = [];
            const writeRows: BulkWriteRow<RxDocType>[] = [];
            await Promise.all(
                Object.entries(rowById)
                    .map(async ([id, row]) => {
                        const masterState = masterDocsState[id];
                        if (!masterState) {
                            writeRows.push({
                                document: docStateToWriteDoc(hashFunction, row.newDocumentState)
                            });
                        } else if (
                            masterState &&
                            !row.assumedMasterState
                        ) {
                            conflicts.push(writeDocToDocState(masterState));
                        } else if (
                            (await conflictHandler({
                                realMasterState: writeDocToDocState(masterState),
                                newDocumentState: ensureNotFalsy(row.assumedMasterState)
                            }, 'rxStorageInstanceToReplicationHandler-masterWrite')).isEqual === true
                        ) {
                            writeRows.push({
                                previous: masterState,
                                document: docStateToWriteDoc(hashFunction, row.newDocumentState, masterState)
                            });
                        } else {
                            conflicts.push(writeDocToDocState(masterState));
                        }
                    })
            );


            if (writeRows.length > 0) {
                const result = await instance.bulkWrite(
                    writeRows,
                    'replication-master-write'
                );
                Object
                    .values(result.error)
                    .forEach(err => {
                        if (err.status !== 409) {
                            throw new Error('non conflict error');
                        } else {
                            conflicts.push(
                                writeDocToDocState(ensureNotFalsy(err.documentInDb))
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
): Promise<void> {
    replicationState.events.canceled.next(true);

    await replicationState.streamQueue.down;
    await replicationState.streamQueue.up;
    await replicationState.checkpointQueue;

    replicationState.events.active.up.complete();
    replicationState.events.active.down.complete();
    replicationState.events.processed.up.complete();
    replicationState.events.processed.down.complete();
    replicationState.events.resolvedConflicts.complete();
}
