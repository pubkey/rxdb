/**
 * Replicates two RxStorageInstances
 * with each other.
 * 
 * Compared to the 'normal' replication plugins,
 * this one is made for internal use where:
 * - No permission handling is needed.
 * - It does not have to be easy to implement a compatible backend.
 *   Here we use another RxStorageImplementation as replication goal
 *   so it has to exactly behave like the RxStorage interface defines.
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
    now,
    promiseWait,
    PROMISE_RESOLVE_VOID
} from './util';

const META_FLAG_SUFFIX = '-rev';

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

    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaa');

    let inQueueCount = 0;
    let streamQueue: Promise<any> = downstreamSyncOnce();

    function addRunAgain() {
        console.log('downstream runAgain()');

        if (inQueueCount > 2) {
            return;
        }
        inQueueCount = inQueueCount + 1;
        streamQueue = streamQueue
            .then(() => downstreamSyncOnce())
            .catch(() => { })
            .then(() => inQueueCount = inQueueCount - 1);
    }

    const sub = state.input.parent.changeStream().subscribe((eventBulk) => {


        console.log('down event -- 1');
        console.dir(eventBulk);

        /**
         * Do not trigger on changes that came from the upstream
         */
        const hasNotFromUpstream = eventBulk.events.find(event => {
            const checkDoc = event.change.doc ? event.change.doc : event.change.previous;
            return !isDocumentStateFromUpstream(state, checkDoc as any);
        })
        console.log('down event -- 2 ' + hasNotFromUpstream);
        if (hasNotFromUpstream) {
            addRunAgain();
        }
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
        if (state.canceled.getValue()) {
            return;
        }

        console.log('downstreamSyncOnce()');

        const checkpointState = await getLastCheckpointDoc(state, 'down');
        const lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;

        let done = false;
        while (!done && !state.canceled.getValue()) {
            const downResult = await state.input.parent.getChangedDocumentsSince(
                state.input.bulkSize,
                state.lastCheckpoint.down
            );
            if (downResult.length !== 0) {
                state.lastCheckpoint.down = lastOfArray(downResult).checkpoint;
                writeToChildQueue = writeToChildQueue.then((async () => {
                    let writeRowsLeft: BulkWriteRow<RxDocType>[] = downResult
                        .filter(r => !isDocumentStateFromUpstream(state, r.document))
                        .map(r => {
                            const useDoc = flatClone(r.document);
                            useDoc._meta = flatClone(r.document._meta);
                            useDoc._meta[state.checkpointKey.down] = r.document;
                            /**
                             * Remember the revision from when
                             * the document was replicated via the downstream.
                             * This is used in the upstream to detect that we do not have
                             * to replicate this document state upwards.
                             */
                            useDoc._meta[state.checkpointKey.down + META_FLAG_SUFFIX] = useDoc._rev;
                            return { document: useDoc };
                        });

                    while (writeRowsLeft.length > 0 && !state.canceled.getValue()) {

                        console.log('down write to child:');
                        console.log(JSON.stringify(writeRowsLeft, null, 4));
                        const writeResult = await state.input.child.bulkWrite(writeRowsLeft);
                        console.log('down write to child result:');
                        console.dir(writeResult);
                        writeRowsLeft = [];

                        console.log('down resolve conflicts');
                        await Promise.all(
                            Object.values(writeResult.error)
                                .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                                    const resolved = await resolveConflictError(
                                        state.input.conflictHandler,
                                        error
                                    );
                                    console.log('down resolve conflicts  --- one done!');
                                    if (resolved) {
                                        /**
                                         * Keep the meta data of the original
                                         * document from the parent.
                                         */
                                        const resolvedDoc = flatClone(resolved);
                                        resolvedDoc._meta = flatClone(error.writeRow.document._meta);
                                        resolvedDoc._meta.lwt = now();

                                        writeRowsLeft.push({
                                            previous: ensureNotFalsy(error.documentInDb),
                                            document: resolvedDoc
                                        });
                                    }
                                })
                        );
                        console.log('down resolve conflicts DONE');
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
            lastCheckpointDoc
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
        console.log('upstream runAgain() ' + state.canceled.getValue());
        if (inQueueCount > 2) {
            return;
        }
        inQueueCount = inQueueCount + 1;
        streamQueue = streamQueue
            .then(() => upstreamSyncOnce())
            .catch(() => { })
            .then(() => inQueueCount = inQueueCount - 1);
    }
    const sub = state.input.child.changeStream().subscribe((eventBulk) => {
        /**
         * Do not trigger on changes that came from the downstream
         */
        const hasNotFromDownstream = eventBulk.events.find(event => {
            const checkDoc = event.change.doc ? event.change.doc : event.change.previous;
            return !isDocumentStateFromDownstream(state, checkDoc as any);
        })
        if (hasNotFromDownstream) {
            addRunAgain();
        }
    });
    firstValueFrom(
        state.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    async function upstreamSyncOnce() {
        if (state.canceled.getValue()) {
            return;
        }

        console.log('upstreamSyncOnce()');

        const checkpointState = await getLastCheckpointDoc(state, 'up');
        const lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;

        console.log('last checkpoint up:');
        console.dir(state.lastCheckpoint.up);
        let hadConflicts = false;

        let done = false;
        while (!done && !state.canceled.getValue()) {
            const upResult = await state.input.child.getChangedDocumentsSince(
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


            console.log('NEW LAST CHECKPOINT UP:');
            console.dir(state.lastCheckpoint.up);

            writeToParentQueue = writeToParentQueue.then((async () => {
                if (state.canceled.getValue()) {
                    return;
                }

                const writeRowsToParent: BulkWriteRow<RxDocType>[] = upResult
                    .filter(r => !isDocumentStateFromDownstream(state, r.document))
                    .map(r => {
                        const useDoc = flatClone(r.document);
                        useDoc._meta = flatClone(r.document._meta);
                        delete useDoc._meta[state.checkpointKey.up];
                        delete useDoc._meta[state.checkpointKey.down];
                        delete useDoc._meta[state.checkpointKey.down + META_FLAG_SUFFIX];
                        useDoc._meta[state.checkpointKey.up + META_FLAG_SUFFIX] = useDoc._rev;

                        return {
                            previous: r.document._meta[state.checkpointKey.down] as any,
                            document: useDoc
                        };
                    });

                console.log('upstream write to parent:');
                console.log(JSON.stringify(writeRowsToParent, null, 4));
                const parentWriteResult = await state.input.parent.bulkWrite(writeRowsToParent);
                console.log('upstream write to parent result:');
                console.log(JSON.stringify(parentWriteResult, null, 4));

                // TODO check if has non-409 errors and then throw
                hadConflicts = Object.keys(parentWriteResult.error).length > 0;




                // /**
                //  * If writing to the parent caused a conflict,
                //  * we resolve that conflict and write the solution into the child
                //  * (not into the parent!)
                //  * A later run of upstreamSyncOnce() will then cause the actual
                //  * write to the parent or might cause another conflict to be resolved.
                //  */
                // let writeToChildRowsLeft: BulkWriteRow<RxDocType>[] = [];
                // await Promise.all(
                //     Object
                //         .values(parentWriteResult.error)
                //         .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                //             const resolved = await resolveConflictError(
                //                 state.input.conflictHandler,
                //                 error
                //             );
                //             if (resolved) {
                //                 const resolvedDoc = flatClone(resolved);
                //                 resolvedDoc._meta = flatClone(resolvedDoc._meta);
                //                 resolvedDoc._meta[state.checkpointKey.up] = ensureNotFalsy(error.documentInDb);
                //                 resolvedDoc._meta[state.checkpointKey.up + META_FLAG_SUFFIX.up] = resolvedDoc._rev;
                //                 resolvedDoc._rev = createRevision(resolvedDoc, error.writeRow.document);
                //                 resolvedDoc._meta.lwt = now();
                //                 writeToChildRowsLeft.push({
                //                     previous: error.writeRow.document,
                //                     document: resolvedDoc
                //                 });
                //             }
                //         })
                // );


                // while (
                //     writeToChildRowsLeft.length > 0 &&
                //     !state.canceled.getValue()
                // ) {
                //     hadConflicts = true;

                //     console.log('upstream write resolved conflicts to child:');
                //     console.dir(writeToChildRowsLeft);
                //     const writeResult = await state.input.child.bulkWrite(writeToChildRowsLeft);
                //     console.log('upstream write resolved conflicts to child: RESULT:');
                //     console.dir(writeResult);
                //     writeToChildRowsLeft = [];
                //     /**
                //      * Writing the resolved conflicts back to the child again,
                //      * can also cause new conflicts, if a write happend on the child
                //      * in the meantime.
                //      */
                //     const errors = Object.values(writeResult.error);
                //     if (errors.length > 0) {
                //         await Promise.all(
                //             errors
                //                 .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                //                     const resolved = await resolveConflictError(
                //                         state.input.conflictHandler,
                //                         error
                //                     );
                //                     if (resolved) {
                //                         const resolvedDoc = flatClone(resolved);
                //                         resolvedDoc._meta = flatClone(resolvedDoc._meta);
                //                         resolvedDoc._meta[state.checkpointKey.up] = ensureNotFalsy(error.writeRow.document._meta[state.checkpointKey.up]);
                //                         writeToChildRowsLeft.push({
                //                             previous: ensureNotFalsy(error.documentInDb),
                //                             document: resolvedDoc
                //                         });
                //                     }
                //                 })
                //         );
                //     }
                // }
            }));
        }

        await writeToParentQueue;


        // if (
        //     !hadConflicts &&
        //     !state.firstSyncDone.up.getValue()
        // ) {
        //     state.firstSyncDone.up.next(true);
        // }


        /**
         * Write the new checkpoint
         */

        console.log('upstreram aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        await setCheckpoint(
            state,
            'up',
            lastCheckpointDoc
        );


        if (hadConflicts) {
            await promiseWait(0);
            addRunAgain();
        } else if (!state.firstSyncDone.up.getValue()) {
            state.firstSyncDone.up.next(true);
        }
    }
}


export async function getLastCheckpointDoc<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection
): Promise<undefined | {
    checkpoint: any;
    checkpointDoc?: RxDocumentData<InternalStoreDocType>;
}> {
    if (!state.input.checkPointInstance) {
        return {
            checkpoint: state.lastCheckpoint[direction]
        };
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
        return {
            checkpoint: checkpointDoc.data,
            checkpointDoc
        };
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
        input.identifier,
        input.parent.storage.name,
        input.parent.databaseName,
        input.parent.collectionName,
        input.child.storage.name,
        input.child.databaseName,
        input.child.collectionName
    ].join('||'));
    return 'rx-storage-replication-' + hash + '-' + direction;
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

    console.log('resolve conflict error:');
    console.dir(error);

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

        const resolvedDoc = flatClone(resolved.resolvedDocumentState);
        resolvedDoc._rev = createRevision(resolvedDoc, documentInDb);
        return resolvedDoc;
    }
}


export async function setCheckpoint<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection,
    checkpointDoc?: RxDocumentData<InternalStoreDocType>
) {
    const checkpoint = state.lastCheckpoint[direction];
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
            data: checkpoint,
            _meta: {
                lwt: now()
            },
            _rev: ''
        };
        newDoc._rev = createRevision(newDoc, checkpointDoc);

        console.log('######## write checkoint ' + direction);
        console.dir(newDoc);

        await state.input.checkPointInstance.bulkWrite([{
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

export function isDocumentStateFromDownstream<RxDocType>(
    state: RxStorageInstanceReplicationState<any>,
    docData: RxDocumentData<RxDocType>
): boolean {
    const downstreamRev = docData._meta[state.checkpointKey.down + META_FLAG_SUFFIX];
    if (downstreamRev && downstreamRev === docData._rev) {
        return true;
    } else {
        return false;
    }
}

export function isDocumentStateFromUpstream<RxDocType>(
    state: RxStorageInstanceReplicationState<any>,
    docData: RxDocumentData<RxDocType>
): boolean {
    const upstreamRev = docData._meta[state.checkpointKey.up + META_FLAG_SUFFIX];
    if (upstreamRev && upstreamRev === docData._rev) {
        return true;
    } else {
        return false;
    }
}

