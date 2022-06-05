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

import { BehaviorSubject } from 'rxjs';
import { getPrimaryKeyOfInternalDocument, InternalStoreDocType } from './rx-database-internal-store';
import type {
    BulkWriteRow,
    RxConflictHandler,
    RxDocumentData,
    RxStorageBulkWriteError,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState
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
        firstSyncDone: new BehaviorSubject<boolean>(false)
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

    state.input.parent.changeStream().subscribe(() => {
        /**
         * TODO add a filter
         * to detect if the change came from the upstream.
         */
        addRunAgain();
    });


    /**
     * For faster performance, we directly start each write
     * and then await all writes at the end.
     */
    let writeToChildQueue: Promise<any> = PROMISE_RESOLVE_VOID;


    async function downstreamSyncOnce() {
        const lastCheckpointDoc = await getLastCheckpointDoc(state, 'down');
        let lastCheckpoint = lastCheckpointDoc ? lastCheckpointDoc.data : undefined;

        let done = false;
        while (!done) {
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
                    while (writeRowsLeft.length > 0) {
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


        /**
         * Write the new checkpoint
         */
        if (state.input.checkPointInstance) {
            const newDoc: RxDocumentData<InternalStoreDocType<any>> = {
                key: state.checkpointKey.down,
                id: getPrimaryKeyOfInternalDocument(
                    state.checkpointKey.down,
                    'OTHER'
                ),
                context: 'OTHER',
                _deleted: false,
                _attachments: {},
                data: lastCheckpoint,
                _meta: {
                    lwt: new Date().getTime()
                },
                _rev: ''
            };
            newDoc._rev = createRevision(newDoc, lastCheckpointDoc);
            await state.input.checkPointInstance.bulkWrite([{
                previous: lastCheckpointDoc,
                document: newDoc
            }]);
        }
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
    state.input.child.changeStream().subscribe(() => {
        /**
         * TODO add a filter to detect
         * if the write did not happen
         * by the downstream.
         */
        addRunAgain();
    });



    async function upstreamSyncOnce() {
        const lastCheckpointDoc = await getLastCheckpointDoc(state, 'up');
        let lastCheckpoint = lastCheckpointDoc ? lastCheckpointDoc.data : undefined;

        let done = false;
        while (!done) {
            const upResult = await state.input.child.getChangedDocumentsSince(
                state.input.bulkSize,
                lastCheckpoint
            );
            if (upResult.length === 0) {
                done = true;
                continue;
            }

            lastCheckpoint = lastOfArray(upResult).checkpoint;
            writeToParentQueue = writeToParentQueue.then((async () => {
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


                while (writeToChildRowsLeft.length > 0) {
                    const writeResult = await state.input.child.bulkWrite(writeToChildRowsLeft);
                    writeToChildRowsLeft = [];
                    /**
                     * Writing the resolved conflicts back to the child again,
                     * can also cause new conflicts, if a write happend on the child
                     * in the meantime.
                     */
                    await Promise.all(
                        Object.values(writeResult.error)
                            .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                                const resolved = await resolveConflictError(
                                    state.input.conflictHandler,
                                    error
                                );
                                if (resolved) {
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
            }));
        }


        /**
         * Write the new checkpoint
         */
        if (state.input.checkPointInstance) {
            const newDoc: RxDocumentData<InternalStoreDocType<any>> = {
                key: state.checkpointKey.up,
                id: getPrimaryKeyOfInternalDocument(
                    state.checkpointKey.up,
                    'OTHER'
                ),
                context: 'OTHER',
                _deleted: false,
                _attachments: {},
                data: lastCheckpoint,
                _meta: {
                    lwt: new Date().getTime()
                },
                _rev: ''
            };
            newDoc._rev = createRevision(newDoc, lastCheckpointDoc);
            await state.input.checkPointInstance.bulkWrite([{
                previous: lastCheckpointDoc,
                document: newDoc
            }]);
        }
    }
}


export async function getLastCheckpointDoc<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    which: 'down' | 'up'
): Promise<RxDocumentData<InternalStoreDocType> | undefined> {
    if (!state.input.checkPointInstance) {
        return state.lastDownstreamCheckpoint;
    }

    const checkpointDocId = getPrimaryKeyOfInternalDocument(
        state.checkpointKey[which],
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
    which: 'down' | 'up'
): string {
    const hash = fastUnsecureHash([
        which,
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
