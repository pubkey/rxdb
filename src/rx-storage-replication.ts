/**
 * Replicates two RxStorageInstances
 * with each other.
 * 
 * Compared to the 'normal' replication plugins,
 * this one is made for internal use where:
 * - No permission handling is needed.
 * - It is made so that the write amount on the master is less but might increase on the child.
 * - It does not have to be easy to implement a compatible backend.
 *   Here we use another RxStorageImplementation as replication goal
 *   so it has to exactly behave like the RxStorage interface defines.
 * 
 * This is made to be used internally by plugins
 * to get a really fast replication performance.
 * 
 * The replication works like git, where the fork contains all new writes
 * and must be merged with the master before it can push it's new state to the master.
 */

import {
    BehaviorSubject,
    combineLatest,
    filter,
    firstValueFrom
} from 'rxjs';
import {
    fillWithDefaultSettings,
    getComposedPrimaryKeyOfDocumentData,
    getPrimaryFieldOfPrimaryKey
} from './rx-schema-helper';
import { flatCloneDocWithMeta } from './rx-storage-helper';
import type {
    BulkWriteRow,
    BulkWriteRowById,
    RxConflictHandler,
    RxDocumentData,
    RxDocumentDataById,
    RxJsonSchema,
    RxStorageBulkWriteError,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState,
    RxStorageReplicationDirection,
    RxStorageReplicationMeta
} from './types';
import {
    createRevision,
    ensureNotFalsy,
    fastUnsecureHash,
    lastOfArray,
    now,
    parseRevision,
    PROMISE_RESOLVE_VOID
} from './util';


/**
 * Flags that a document state was written to the master
 * by the upstream from the fork.
 * Used in the ._meta of the document data that is stored at the master
 * and contains only the revision.
 * We need this to detect if the document state was written from the upstream
 * so that it is not again replicated to the downstream.
 * TODO instead of doing that, we should have a way to 'mark' bulkWrite()
 * calls so that the emitted events can be detected as being from the upstream.
 */
const FROM_FORK_FLAG_SUFFIX = '-fork';


export const RX_REPLICATION_META_INSTANCE_SCHEMA: RxJsonSchema<RxDocumentData<RxStorageReplicationMeta>> = fillWithDefaultSettings({
    primaryKey: {
        key: 'id',
        fields: [
            'replicationIdentifier',
            'itemId',
            'isCheckpoint'
        ],
        separator: '|'
    },
    type: 'object',
    version: 0,
    additionalProperties: false,
    properties: {
        id: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        },
        replicationIdentifier: {
            type: 'string'
        },
        isCheckpoint: {
            type: 'string',
            enum: [
                '0',
                '1'
            ],
            maxLength: 1
        },
        itemId: {
            type: 'string'
        },
        data: {
            type: 'object',
            additionalProperties: true
        }
    },
    required: [
        'id',
        'replicationIdentifier',
        'isCheckpoint',
        'itemId',
        'data'
    ]
});

export function replicateRxStorageInstance<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): RxStorageInstanceReplicationState<RxDocType> {
    const state: RxStorageInstanceReplicationState<RxDocType> = {
        primaryPath: getPrimaryFieldOfPrimaryKey(input.masterInstance.schema.primaryKey),
        input,
        checkpointKey: getCheckpointKey(input),
        canceled: new BehaviorSubject<boolean>(false),
        firstSyncDone: {
            down: new BehaviorSubject<boolean>(false),
            up: new BehaviorSubject<boolean>(false)
        },
        lastCheckpoint: {},
        streamQueue: {
            down: PROMISE_RESOLVE_VOID,
            up: PROMISE_RESOLVE_VOID
        }
    };

    startReplicationDownstream(state);
    startReplicationUpstream(state);
    return state;
}


/**
 * Writes all documents from the master to the fork.
 */
export function startReplicationDownstream<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    let inQueueCount = 0;
    state.streamQueue.down = state.streamQueue.down.then(() => downstreamSyncOnce());

    function addRunAgain() {
        if (inQueueCount > 2) {
            return;
        }
        inQueueCount = inQueueCount + 1;
        state.streamQueue.down = state.streamQueue.down
            .then(() => downstreamSyncOnce())
            .catch(() => { })
            .then(() => inQueueCount = inQueueCount - 1);
    }

    /**
     * If a write on the master happens, we have to trigger the downstream.
     */
    const sub = state.input.masterInstance.changeStream().subscribe(() => {
        addRunAgain();
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
    let writeToChildQueue: Promise<any> = PROMISE_RESOLVE_VOID;


    async function downstreamSyncOnce() {
        console.log('downstreamSyncOnce()');
        if (state.canceled.getValue()) {
            return;
        }
        const checkpointState = await getLastCheckpointDoc(state, 'down');
        const lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;

        let done = false;
        while (!done && !state.canceled.getValue()) {
            const downResult = await state.input.masterInstance.getChangedDocumentsSince(
                state.input.bulkSize,
                state.lastCheckpoint.down
            );
            if (downResult.length === 0) {
                done = true;
                continue;
            }

            const useDownDocs = downResult.map(r => r.document);
            state.lastCheckpoint.down = lastOfArray(downResult).checkpoint;
            writeToChildQueue = writeToChildQueue.then((async () => {
                const downDocsById: RxDocumentDataById<RxDocType> = {};
                const docIds = useDownDocs
                    .map(d => {
                        const id = (d as any)[state.primaryPath];
                        downDocsById[id] = d;
                        return id;
                    });

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
                docIds.forEach(docId => {
                    const forkState: RxDocumentData<RxDocType> | undefined = currentForkState[docId];
                    const masterState = downDocsById[docId];
                    const assumedMaster = assumedMasterState[docId];


                    console.log('--------------- downstream state AA');
                    console.dir(forkState);
                    console.dir(masterState);
                    console.dir(assumedMaster);
                    console.log('--------------- downstream state BB');

                    if (
                        (
                            forkState && assumedMaster &&
                            assumedMaster.docData._rev !== forkState._rev
                        ) ||
                        (
                            forkState && !assumedMaster
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
                        forkState &&
                        forkState._rev === masterState._rev
                    ) {
                        /**
                         * Document states are exactly equal.
                         * This can happen when the replication is shut down
                         * unexpected like when the user goes offline.
                         * 
                         * Only when the assumedMaster is differnt from the forkState,
                         * we have to patch the document in the meta instance.
                         */
                        if (
                            !assumedMaster ||
                            assumedMaster.docData._rev !== forkState._rev
                        ) {
                            useMetaWriteRows.push(
                                getMetaWriteRow(
                                    state,
                                    forkState,
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
                    writeRowsToFork.push({
                        previous: forkState,
                        document: masterState
                    });
                    writeRowsToMeta[docId] = getMetaWriteRow(
                        state,
                        masterState,
                        assumedMaster ? assumedMaster.metaDocument : undefined
                    );
                });

                if (writeRowsToFork.length > 0) {
                    console.log('down writeRowsToFork:');
                    console.dir(writeRowsToFork);
                    const forkWriteResult = await state.input.forkInstance.bulkWrite(writeRowsToFork);
                    Object.keys(forkWriteResult.success).forEach((docId) => {
                        useMetaWriteRows.push(writeRowsToMeta[docId]);
                    });
                }
                if (useMetaWriteRows.length > 0) {
                    await state.input.metaInstance.bulkWrite(useMetaWriteRows);
                }
            }));
        }
        await writeToChildQueue;

        if (!state.firstSyncDone.down.getValue()) {
            state.firstSyncDone.down.next(true);
        }

        /**
         * Write the new checkpoint
         */
        await setCheckpoint(
            state,
            'down',
            lastCheckpointDoc
        );
    }
}


/**
 * Writes all document changes from the client to the master.
 */
export function startReplicationUpstream<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    let writeToMasterQueue: Promise<any> = PROMISE_RESOLVE_VOID;

    let inQueueCount = 0;
    state.streamQueue.up = state.streamQueue.up.then(() => upstreamSyncOnce());

    function addRunAgain() {
        if (inQueueCount > 2) {
            return state.streamQueue.up;
        }
        inQueueCount = inQueueCount + 1;
        state.streamQueue.up = state.streamQueue.up
            .then(() => upstreamSyncOnce())
            .catch(() => { })
            .then(() => inQueueCount = inQueueCount - 1);
        return state.streamQueue.up;
    }
    const sub = state.input.forkInstance.changeStream().subscribe(async () => {
        console.log('# UP fork instance emitted change');
        if (state.input.waitBeforePersist) {
            await state.input.waitBeforePersist();
        }
        console.log('# UP fork instance emitted change run again');
        addRunAgain();
    });
    firstValueFrom(
        state.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    async function upstreamSyncOnce() {
        console.log('upstreamSyncOnce()');
        if (state.canceled.getValue()) {
            return;
        }

        const checkpointState = await getLastCheckpointDoc(state, 'up');
        const lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;

        /**
         * If this goes to true,
         * it means that we have to do a new write to the
         * fork instance to resolve a conflict.
         * In that case, state.firstSyncDone.up
         * must not be set to true, because
         * an additional upstream cycle must be used
         * to push the resolved conflict state.
         */
        let hadConflictWrites = false;

        let done = false;
        while (!done && !state.canceled.getValue()) {
            console.log('upstreamSyncOnce() one checkpoint cycle');
            const upResult = await state.input.forkInstance.getChangedDocumentsSince(
                state.input.bulkSize,
                state.lastCheckpoint.up
            );
            if (
                upResult.length === 0 ||
                state.canceled.getValue()
            ) {
                done = true;
                continue;
            }

            state.lastCheckpoint.up = lastOfArray(upResult).checkpoint;
            writeToMasterQueue = writeToMasterQueue.then((async () => {

                // used to not have infinity loop during development
                // that cannot be exited via Ctrl+C
                // await promiseWait(0);

                if (state.canceled.getValue()) {
                    return;
                }

                console.log('up writeToMasterQueue inner START');


                const useUpDocs = upResult.map(r => r.document);
                if (useUpDocs.length === 0) {
                    return;
                }

                console.log('useUpDocs:');
                console.dir(useUpDocs);

                const assumedMasterState = await getAssumedMasterState(
                    state,
                    useUpDocs.map(d => (d as any)[state.primaryPath])
                );
                //console.log('assumed master state:');
                //console.dir(assumedMasterState);

                console.log('up writeToMasterQueue inner START - 1');
                const writeRowsToMaster: BulkWriteRow<RxDocType>[] = [];
                const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};

                useUpDocs.forEach(doc => {
                    const docId: string = (doc as any)[state.primaryPath];
                    const useDoc = flatCloneDocWithMeta(doc);
                    useDoc._meta[state.checkpointKey + FROM_FORK_FLAG_SUFFIX] = useDoc._rev;

                    const assumedMasterDoc = assumedMasterState[docId];

                    /**
                     * If the master state is equal to the
                     * fork state, we can assume that the document state is already
                     * replicated.
                     */
                    if (
                        assumedMasterDoc &&
                        assumedMasterDoc.docData._rev === useDoc._rev
                    ) {
                        return;
                    }

                    /**
                     * If the assumed master state has a heigher revision height
                     * then the current document state,
                     * we can assume that a downstream replication has happend in between
                     * and we can drop this upstream replication.
                     * 
                     */
                    if (
                        assumedMasterDoc &&
                        parseRevision(assumedMasterDoc.docData._rev).height > parseRevision(useDoc._rev).height
                    ) {
                        return;
                    }

                    writeRowsToMaster.push({
                        previous: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
                        document: useDoc
                    });
                    writeRowsToMeta[docId] = getMetaWriteRow(
                        state,
                        useDoc,
                        assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined
                    );
                });

                console.log('#### UP:');
                console.dir(writeRowsToMaster);

                console.log('up writeToMasterQueue inner START - 2');
                console.dir(writeRowsToMaster);
                if (writeRowsToMaster.length === 0) {
                    return;
                }
                const masterWriteResult = await state.input.masterInstance.bulkWrite(writeRowsToMaster);

                console.log('UP masterWriteResult:');
                console.log(JSON.stringify(masterWriteResult, null, 4));


                const useWriteRowsToMeta: BulkWriteRow<RxStorageReplicationMeta>[] = [];
                Object.keys(masterWriteResult.success).forEach(docId => {
                    useWriteRowsToMeta.push(writeRowsToMeta[docId]);
                });
                if (useWriteRowsToMeta.length > 0) {
                    await state.input.metaInstance.bulkWrite(useWriteRowsToMeta);
                    // TODO what happens when we have conflicts here?
                }

                /**
                 * Resolve conflicts by writing a new document
                 * state to the fork instance and the 'real' master state
                 * to the meta instance.
                 * 
                 * TODO check if has non-409 errors and then throw
                 */
                console.log('up writeToMasterQueue inner START - 3');
                if (Object.keys(masterWriteResult.error).length > 0) {
                    const conflictWriteFork: BulkWriteRow<RxDocType>[] = [];
                    const conflictWriteMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};
                    await Promise.all(
                        Object
                            .entries(masterWriteResult.error)
                            .map(async ([docId, error]) => {
                                const resolved = await resolveConflictError(
                                    state.input.conflictHandler,
                                    error
                                );
                                if (resolved) {
                                    conflictWriteFork.push({
                                        previous: error.writeRow.document,
                                        document: resolved
                                    });
                                }
                                const assumedMasterDoc = assumedMasterState[docId];
                                conflictWriteMeta[docId] = getMetaWriteRow(
                                    state,
                                    ensureNotFalsy(error.documentInDb),
                                    assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined
                                );
                            })
                    );

                    console.log('UP conflictWriteFork:');
                    console.dir(conflictWriteFork);

                    if (conflictWriteFork.length > 0) {
                        hadConflictWrites = true;

                        const forkWriteResult = await state.input.forkInstance.bulkWrite(conflictWriteFork);
                        /**
                         * Errors in the forkWriteResult must not be handled
                         * because they have been caused by a write to the forkInstance
                         * in between which will anyway trigger a new upstream cycle
                         * that will then resolved the conflict again.
                         */

                        console.log('up writeToMasterQueue inner START - 4');
                        console.dir(forkWriteResult);
                        console.dir(Object.keys(forkWriteResult.success));

                        const useMetaWrites: BulkWriteRow<RxStorageReplicationMeta>[] = [];
                        Object
                            .keys(forkWriteResult.success)
                            .forEach((docId) => {
                                useMetaWrites.push(
                                    conflictWriteMeta[docId]
                                );
                            });
                        console.log('up writeToMasterQueue inner START - 4.5');
                        console.log(JSON.stringify(useMetaWrites, null, 4));
                        try {
                            if (useMetaWrites.length > 0) {
                                await state.input.metaInstance.bulkWrite(useMetaWrites);
                            }
                        } catch (err) {
                            console.log('ERROR IN UP CYCLE');
                            console.dir(err);
                            process.exit(5);
                        }
                        // TODO what to do with conflicts while writing to the metaInstance?
                        console.log('up writeToMasterQueue inner START - 5');
                    }
                }
            }));
        }

        console.log('up await writeToMasterQueue');
        await writeToMasterQueue;
        console.log('up await writeToMasterQueue DONE');

        await setCheckpoint(
            state,
            'up',
            lastCheckpointDoc
        );

        console.log('upstream hadConflictWrites: ' + hadConflictWrites);
        if (
            !hadConflictWrites &&
            !state.firstSyncDone.up.getValue()
        ) {
            state.firstSyncDone.up.next(true);
        }
    }
}


export async function getLastCheckpointDoc<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection
): Promise<undefined | {
    checkpoint: any;
    checkpointDoc?: RxDocumentData<RxStorageReplicationMeta>;
}> {
    const checkpointDocId = getComposedPrimaryKeyOfDocumentData(
        RX_REPLICATION_META_INSTANCE_SCHEMA,
        {
            isCheckpoint: '1',
            itemId: direction,
            replicationIdentifier: state.checkpointKey
        }
    );
    const checkpointResult = await state.input.metaInstance.findDocumentsById(
        [
            checkpointDocId
        ],
        false
    );

    const checkpointDoc = checkpointResult[checkpointDocId];
    if (checkpointDoc) {
        return {
            checkpoint: checkpointDoc.data,
            checkpointDoc
        };
    } else {
        return undefined;
    }
}


export function getCheckpointKey<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): string {
    const hash = fastUnsecureHash([
        input.identifier,
        input.masterInstance.storage.name,
        input.masterInstance.databaseName,
        input.masterInstance.collectionName,
        input.forkInstance.storage.name,
        input.forkInstance.databaseName,
        input.forkInstance.collectionName
    ].join('||'));
    return 'rx-storage-replication-' + hash;
}


/**
 * Resolves a conflict error.
 * Returns the resolved document that must be written to the fork.
 * Then the new document state can be pushed upstream.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the upstream, never in the downstream.
 */
export async function resolveConflictError<RxDocType>(
    conflictHandler: RxConflictHandler<RxDocType>,
    error: RxStorageBulkWriteError<RxDocType>
): Promise<RxDocumentData<RxDocType> | undefined> {
    if (error.status !== 409) {
        /**
         * If this ever happens,
         * make a PR with a unit test to reproduce it.
         */
        throw new Error('Non conflict error');
    }
    const documentInDb = ensureNotFalsy(error.documentInDb);
    if (documentInDb._rev === error.writeRow.document._rev) {
        /**
         * Documents are equal,
         * so this is not a conflict -> do nothing.
         */
        return undefined;
    } else {
        /**
         * We have a conflict, resolve it!
         */
        const resolved = await conflictHandler({
            assumedMasterState: error.writeRow.previous,
            newDocumentState: error.writeRow.document,
            realMasterState: documentInDb
        });

        const resolvedDoc = flatCloneDocWithMeta(resolved.resolvedDocumentState);
        resolvedDoc._meta.lwt = now();
        resolvedDoc._rev = createRevision(resolvedDoc, error.writeRow.document);
        return resolvedDoc;
    }
}


export async function setCheckpoint<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection,
    checkpointDoc?: RxDocumentData<RxStorageReplicationMeta>
) {
    const checkpoint = state.lastCheckpoint[direction];
    if (
        checkpoint &&
        /**
         * If the replication is already canceled,
         * we do not write a checkpoint
         * because that could mean we write a checkpoint
         * for data that has been fetched from the master
         * but not been written to the child.
         */
        !state.canceled.getValue() &&
        /**
         * Only write checkpoint if it is different from before
         * to have less writes to the storage.
         */
        (
            !checkpointDoc ||
            JSON.stringify(checkpointDoc.data) !== JSON.stringify(checkpoint)
        )
    ) {
        const newDoc: RxDocumentData<RxStorageReplicationMeta> = {
            id: '',
            isCheckpoint: '1',
            itemId: direction,
            replicationIdentifier: state.checkpointKey,
            _deleted: false,
            _attachments: {},
            data: checkpoint,
            _meta: {
                lwt: now()
            },
            _rev: ''
        };
        newDoc.id = getComposedPrimaryKeyOfDocumentData(
            RX_REPLICATION_META_INSTANCE_SCHEMA,
            newDoc
        );
        newDoc._rev = createRevision(newDoc, checkpointDoc);
        await state.input.metaInstance.bulkWrite([{
            previous: checkpointDoc,
            document: newDoc
        }]);
    }
}


export async function awaitRxStorageReplicationFirstInSync(
    state: RxStorageInstanceReplicationState<any>
) {
    return firstValueFrom(
        combineLatest([
            state.firstSyncDone.down.pipe(
                filter(v => !!v)
            ),
            state.firstSyncDone.up.pipe(
                filter(v => !!v)
            )
        ])
    );
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

export async function getAssumedMasterState<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    docIds: string[]
): Promise<{
    [docId: string]: {
        docData: RxDocumentData<RxDocType>;
        metaDocument: RxDocumentData<RxStorageReplicationMeta>
    }
}> {
    const metaDocs = await state.input.metaInstance.findDocumentsById(
        docIds.map(docId => {
            const useId = getComposedPrimaryKeyOfDocumentData(
                RX_REPLICATION_META_INSTANCE_SCHEMA,
                {
                    itemId: docId,
                    replicationIdentifier: state.checkpointKey,
                    isCheckpoint: '0'
                }
            );
            return useId;
        }),
        true
    );

    const ret: {
        [docId: string]: {
            docData: RxDocumentData<RxDocType>;
            metaDocument: RxDocumentData<RxStorageReplicationMeta>
        }
    } = {};
    Object
        .values(metaDocs)
        .forEach((metaDoc) => {
            ret[metaDoc.itemId] = {
                docData: metaDoc.data,
                metaDocument: metaDoc
            };
        });

    return ret;
}


export function getMetaWriteRow<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    newMasterDocState: RxDocumentData<RxDocType>,
    previous?: RxDocumentData<RxStorageReplicationMeta>
): BulkWriteRow<RxStorageReplicationMeta> {
    const docId: string = (newMasterDocState as any)[state.primaryPath];
    const newMeta: RxDocumentData<RxStorageReplicationMeta> = previous ? flatCloneDocWithMeta(
        previous
    ) : {
        id: '',
        replicationIdentifier: state.checkpointKey,
        isCheckpoint: '0',
        itemId: docId,
        data: newMasterDocState,
        _attachments: {},
        _deleted: false,
        _rev: '',
        _meta: {
            lwt: 0
        }
    };
    newMeta.data = newMasterDocState;
    newMeta._rev = createRevision(newMeta, previous);
    newMeta._meta.lwt = now();
    newMeta.id = getComposedPrimaryKeyOfDocumentData(
        RX_REPLICATION_META_INSTANCE_SCHEMA,
        newMeta
    );
    return {
        previous,
        document: newMeta
    };
}

