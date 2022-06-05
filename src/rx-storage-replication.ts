/**
 * Replicates two RxStorageInstances
 * with each other.
 * 
 * Compared to the 'normal' replication plugins,
 * this one is made for internal use where:
 * - No permission handling is needed.
 * - It does not have to be easy to implement a compatible backend.
 * 
 * This is made to be used internally by plugins
 * to get a really fast replication performance.
 */

import {
    BehaviorSubject,
    combineLatest,
    filter,
    firstValueFrom
} from 'rxjs';
import {
    getPrimaryKeyOfInternalDocument,
    InternalStoreDocType
} from './rx-database-internal-store';
import type {
    BulkWriteRow,
    RxConflictHandler,
    RxDocumentData,
    RxStorageBulkWriteError,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState,
    RxStorageReplicationDirection
} from './types';
import {
    createRevision,
    ensureNotFalsy,
    fastUnsecureHash,
    flatClone,
    lastOfArray,
    PROMISE_RESOLVE_VOID
} from './util';

export function replicateRxStorageInstance<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): RxStorageInstanceReplicationState<RxDocType> {
    const state: RxStorageInstanceReplicationState<RxDocType> = {
        input,
        checkpointKey: {
            down: getCheckpointKey(input, 'down'),
            up: getCheckpointKey(input, 'up')
        },
        canceled: new BehaviorSubject<boolean>(false),
        firstSyncDone: {
            down: new BehaviorSubject<boolean>(false),
            up: new BehaviorSubject<boolean>(false)
        },
        lastCheckpoint: {}
    };

    startReplicationDownstream(state);
    startReplicationUpstream(state);
    return state;
}


/**
 * Writes all documents from the parent to the child.
 */
export function startReplicationDownstream<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {

    let inQueueCount = 0;
    let streamQueue: Promise<any> = downstreamSyncOnce();

    function addRunAgain() {
        if (inQueueCount > 2) {
            return;
        }
        inQueueCount = inQueueCount + 1;
        streamQueue = streamQueue
            .then(() => downstreamSyncOnce())
            .catch(() => { })
            .then(() => inQueueCount = inQueueCount - 1);
    }

    const sub = state.input.parent.changeStream().subscribe(() => {
        /**
         * TODO add a filter
         * to detect if the change came from the upstream.
         */
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
        const lastCheckpointDoc = await getLastCheckpointDoc(state, 'down');
        let lastCheckpoint = lastCheckpointDoc ? lastCheckpointDoc.data : undefined;

        let done = false;
        while (!done && !state.canceled.getValue()) {
            const downResult = await state.input.parent.getChangedDocumentsSince(
                state.input.bulkSize,
                lastCheckpoint
            );
            if (downResult.length !== 0) {
                lastCheckpoint = lastOfArray(downResult).checkpoint;
                writeToChildQueue = writeToChildQueue.then((async () => {
                    let writeRowsLeft: BulkWriteRow<RxDocType>[] = downResult.map(r => {
                        const useDoc = flatClone(r.document);
                        useDoc._meta = flatClone(r.document._meta);
                        useDoc._meta[state.checkpointKey.down] = r.document;
                        return { document: useDoc };
                    });
                    while (writeRowsLeft.length > 0 && !state.canceled.getValue()) {
                        const writeResult = await state.input.child.bulkWrite(writeRowsLeft);
                        writeRowsLeft = [];
                        await Promise.all(
                            Object.values(writeResult.error)
                                .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                                    const resolved = await resolveConflictError(
                                        state.input.conflictHandler,
                                        error
                                    );
                                    if (resolved) {
                                        /**
                                         * Keep the meta data of the original
                                         * document from the parent.
                                         */
                                        const resolvedDoc = flatClone(resolved);
                                        resolvedDoc._meta = error.writeRow.document._meta;

                                        writeRowsLeft.push({
                                            previous: ensureNotFalsy(error.documentInDb),
                                            document: resolvedDoc
                                        });
                                    }
                                })
                        );
                    }
                }));
            } else {
                done = true;
            }
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
            lastCheckpointDoc ? {
                checkpointDoc: lastCheckpointDoc,
                checkpoint: lastCheckpoint
            } : undefined
        );
    }
}


/**
 * Writes all document changes from the client to the parent.
 */
export function startReplicationUpstream<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    let writeToParentQueue: Promise<any> = PROMISE_RESOLVE_VOID;

    let inQueueCount = 0;
    let streamQueue: Promise<any> = upstreamSyncOnce();

    function addRunAgain() {
        if (inQueueCount > 2) {
            return;
        }
        inQueueCount = inQueueCount + 1;
        streamQueue = streamQueue
            .then(() => upstreamSyncOnce())
            .catch(() => { })
            .then(() => inQueueCount = inQueueCount - 1);
    }
    const sub = state.input.child.changeStream().subscribe(() => {
        /**
         * TODO add a filter to detect
         * if the write did not happen
         * by the downstream.
         */
        addRunAgain();
    });
    firstValueFrom(
        state.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    async function upstreamSyncOnce() {
        const lastCheckpointDoc = await getLastCheckpointDoc(state, 'up');
        let lastCheckpoint = lastCheckpointDoc ? lastCheckpointDoc.data : undefined;
        let hadConflicts = false;

        let done = false;
        while (!done && !state.canceled.getValue()) {
            const upResult = await state.input.child.getChangedDocumentsSince(
                state.input.bulkSize,
                lastCheckpoint
            );
            if (
                upResult.length === 0 ||
                state.canceled.getValue()
            ) {
                done = true;
                continue;
            }

            lastCheckpoint = lastOfArray(upResult).checkpoint;
            writeToParentQueue = writeToParentQueue.then((async () => {
                if (state.canceled.getValue()) {
                    return;
                }

                const writeRowsToParent: BulkWriteRow<RxDocType>[] = upResult.map(r => {
                    const useDoc = flatClone(r.document);
                    useDoc._meta = flatClone(r.document._meta);
                    delete useDoc._meta[state.checkpointKey.up];

                    return {
                        previous: r.document._meta[state.checkpointKey.up] as any,
                        document: useDoc
                    };
                });
                const parentWriteResult = await state.input.parent.bulkWrite(writeRowsToParent);

                /**
                 * If writing to the parent caused a conflict,
                 * we resolve that conflict and write the solution into the child
                 * (not into the parent!)
                 * A later run of upstreamSyncOnce() will then cause the actual
                 * write to the parent or might cause another conflict to be resolved.
                 */
                let writeToChildRowsLeft: BulkWriteRow<RxDocType>[] = [];
                await Promise.all(
                    Object
                        .values(parentWriteResult.error)
                        .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                            const resolved = await resolveConflictError(
                                state.input.conflictHandler,
                                error
                            );
                            if (resolved) {
                                const resolvedDoc = flatClone(resolved);
                                resolvedDoc._meta = flatClone(resolvedDoc._meta);
                                resolvedDoc._meta[state.checkpointKey.up] = ensureNotFalsy(error.documentInDb);
                                writeToChildRowsLeft.push({
                                    previous: error.writeRow.document,
                                    document: resolvedDoc
                                });
                            }
                        })
                );


                while (
                    writeToChildRowsLeft.length > 0 &&
                    !state.canceled.getValue()
                ) {
                    const writeResult = await state.input.child.bulkWrite(writeToChildRowsLeft);
                    writeToChildRowsLeft = [];
                    /**
                     * Writing the resolved conflicts back to the child again,
                     * can also cause new conflicts, if a write happend on the child
                     * in the meantime.
                     */
                    const errors = Object.values(writeResult.error);
                    if (errors.length > 0) {
                        await Promise.all(
                            errors
                                .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                                    const resolved = await resolveConflictError(
                                        state.input.conflictHandler,
                                        error
                                    );
                                    if (resolved) {
                                        hadConflicts = true;
                                        const resolvedDoc = flatClone(resolved);
                                        resolvedDoc._meta = flatClone(resolvedDoc._meta);
                                        resolvedDoc._meta[state.checkpointKey.up] = ensureNotFalsy(error.writeRow.document._meta[state.checkpointKey.up]);
                                        writeToChildRowsLeft.push({
                                            previous: ensureNotFalsy(error.documentInDb),
                                            document: resolvedDoc
                                        });
                                    }
                                })
                        );
                    }
                }
            }));
        }

        await writeToParentQueue;

        if (
            !hadConflicts &&
            !state.firstSyncDone.up.getValue()
        ) {
            state.firstSyncDone.up.next(true);
        }


        /**
         * Write the new checkpoint
         */
        await setCheckpoint(
            state,
            'up',
            lastCheckpointDoc ? {
                checkpointDoc: lastCheckpointDoc,
                checkpoint: lastCheckpoint
            } : undefined
        );
    }
}


export async function getLastCheckpointDoc<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection
): Promise<RxDocumentData<InternalStoreDocType> | undefined> {
    if (!state.input.checkPointInstance) {
        return state.lastCheckpoint[direction];
    }

    const checkpointDocId = getPrimaryKeyOfInternalDocument(
        state.checkpointKey[direction],
        'OTHER'
    );
    const checkpointResult = await state.input.checkPointInstance.findDocumentsById(
        [
            checkpointDocId
        ],
        false
    );

    const checkpointDoc = checkpointResult[checkpointDocId];
    if (checkpointDoc) {
        return checkpointDoc;
    } else {
        return undefined;
    }
}


export function getCheckpointKey<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>,
    direction: RxStorageReplicationDirection
): string {
    const hash = fastUnsecureHash([
        direction,
        input.parent.storage.name,
        input.parent.databaseName,
        input.parent.collectionName,
        input.child.storage.name,
        input.child.databaseName,
        input.child.collectionName
    ].join('||'));
    return 'rx-storage-replication-' + hash;
}



/**
 * Resolves a conflict error.
 * Returns the resolved document.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
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
            newDocumentState: error.writeRow.document,
            assumedParentDocumentState: error.writeRow.previous,
            parentDocumentState: documentInDb,
        });
        return resolved.resolvedDocumentState;
    }
}


export async function setCheckpoint<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection,
    checkpoint?: {
        checkpointDoc: RxDocumentData<InternalStoreDocType>;
        checkpoint: any;
    }
) {
    if (
        checkpoint &&
        state.input.checkPointInstance &&
        /**
         * If the replication is already canceled,
         * we do not write a checkpoint
         * because that could mean we write a checkpoint
         * for data that has been fetched from the parent
         * but not been written to the child.
         */
        !state.canceled.getValue()
    ) {
        const checkpointKey = state.checkpointKey[direction];
        const newDoc: RxDocumentData<InternalStoreDocType<any>> = {
            key: checkpointKey,
            id: getPrimaryKeyOfInternalDocument(
                checkpointKey,
                'OTHER'
            ),
            context: 'OTHER',
            _deleted: false,
            _attachments: {},
            data: checkpoint.checkpoint,
            _meta: {
                lwt: new Date().getTime()
            },
            _rev: ''
        };
        newDoc._rev = createRevision(newDoc, checkpoint.checkpointDoc);
        await state.input.checkPointInstance.bulkWrite([{
            previous: checkpoint.checkpointDoc,
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
