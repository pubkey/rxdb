/**
 * Replicates two RxStorageInstances
 * with each other.
 * 
 * Compared to the 'normal' replication plugins,
 * this one is made for internal use where:
 * - No permission handling is needed.
 * - It is made so that the write amount on the parent is less but might increase on the child.
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
    firstValueFrom,
    Subscription
} from 'rxjs';
import {
    getPrimaryKeyOfInternalDocument,
    InternalStoreDocType
} from './rx-database-internal-store';
import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import { flatCloneDocWithMeta } from './rx-storage-helper';
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

/**
 * Flags which state is assumed
 * to be at the master RxStorage instance.
 */
const MASTER_STATE_FLAG = '-master';

const META_FLAG_SUFFIX = '-rev';

export function replicateRxStorageInstance<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): RxStorageInstanceReplicationState<RxDocType> {
    const state: RxStorageInstanceReplicationState<RxDocType> = {
        primaryPath: getPrimaryFieldOfPrimaryKey(input.parent.schema.primaryKey),
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
 * Writes all documents from the parent to the child.
 */
export function startReplicationDownstream<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    let inQueueCount = 0;
    state.streamQueue.down = state.streamQueue.down.then(() => downstreamSyncOnce());

    function addRunAgain() {
        console.log('DOWN addRunAgain()');
        if (inQueueCount > 2) {
            return;
        }
        inQueueCount = inQueueCount + 1;
        state.streamQueue.down = state.streamQueue.down
            .then(() => downstreamSyncOnce())
            .catch(() => { })
            .then(() => inQueueCount = inQueueCount - 1);
    }

    const subs: Subscription[] = [];

    /**
     * If a write on the parent happens, we have to trigger the downstream.
     */
    subs.push(
        state.input.parent.changeStream().subscribe(async (eventBulk) => {
            console.log('DOWN SUB EMITTED (parent)!');
            console.log(JSON.stringify(eventBulk.events[0], null, 4));
            /**
             * Do not trigger on changes that came from the upstream
             */
            const hasNotFromUpstream = eventBulk.events.find(event => {
                const checkDoc = event.change.doc ? event.change.doc : event.change.previous;
                return !isDocumentStateFromUpstream(state, checkDoc as any);
            });
            if (hasNotFromUpstream) {
            }
            addRunAgain(); // TODO move up one line
        })
    );
    /**
     * If a write on the child happens,
     * we also have to trigger a downstream because
     * the downstream is the one that handles conflicts
     * which might be required.
     */
    subs.push(
        state.input.child.changeStream().subscribe(async (eventBulk) => {
            return; // TODO
            console.log('DOWN SUB EMITTED (child)!');
            console.log(JSON.stringify(eventBulk.events[0], null, 4));
            /**
             * Do not trigger on changes that came from the upstream
             */
            const hasNotFromUpstream = eventBulk.events.find(event => {
                const checkDoc = event.change.doc ? event.change.doc : event.change.previous;
                return !isDocumentStateFromUpstream(state, checkDoc as any);
            });
            if (hasNotFromUpstream) {
            }
            addRunAgain(); // TODO move up one line
        })
    );
    firstValueFrom(
        state.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => subs.map(sub => sub.unsubscribe()));


    /**
     * For faster performance, we directly start each write
     * and then await all writes at the end.
     */
    let writeToChildQueue: Promise<any> = PROMISE_RESOLVE_VOID;


    async function downstreamSyncOnce() {
        console.log('# downstreamSyncOnce() START');
        if (state.canceled.getValue()) {
            console.log('# downstreamSyncOnce() DONE (canceled)');
            return;
        }
        const checkpointState = await getLastCheckpointDoc(state, 'down');
        const lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;

        let done = false;
        while (!done && !state.canceled.getValue()) {
            const downResult = await state.input.parent.getChangedDocumentsSince(
                state.input.bulkSize,
                state.lastCheckpoint.down
            );
            if (downResult.length === 0) {
                done = true;
                continue;
            }
            state.lastCheckpoint.down = lastOfArray(downResult).checkpoint;
            writeToChildQueue = writeToChildQueue.then((async () => {
                let writeRowsLeft: BulkWriteRow<RxDocType>[] = downResult
                    .filter(r => !isDocumentStateFromUpstream(state, r.document))
                    .map(r => {
                        const useDoc = flatCloneDocWithMeta(r.document);
                        useDoc._meta[state.checkpointKey.up] = r.document;
                        /**
                         * Remember the revision from when
                         * the document was replicated via the downstream.
                         * This is used in the upstream to detect that we do not have
                         * to replicate this document state upwards.
                         */
                        useDoc._meta[state.checkpointKey.down + META_FLAG_SUFFIX] = useDoc._rev;
                        return { document: useDoc };
                    });

                console.log('writeRowsLeft: ' + writeRowsLeft.length);
                while (writeRowsLeft.length > 0 && !state.canceled.getValue()) {
                    const writeResult = await state.input.child.bulkWrite(writeRowsLeft);
                    console.log('downstream write result:');
                    console.log(JSON.stringify(writeResult, null, 4));
                    writeRowsLeft = [];

                    await Promise.all(
                        Object.values(writeResult.error)
                            .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                                const resolved = await resolveConflictError(
                                    state.input.conflictHandler,
                                    error
                                );
                                console.log('down: resolved conflict:');
                                console.dir(resolved);

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
 * Writes all document changes from the client to the parent.
 */
export function startReplicationUpstream<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    let writeToParentQueue: Promise<any> = PROMISE_RESOLVE_VOID;

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
    const sub = state.input.child.changeStream().subscribe(async (eventBulk) => {
        /**
         * Do not trigger on changes that came from the downstream
         */
        const hasNotFromDownstream = eventBulk.events.find(event => {
            const checkDoc = event.change.doc ? event.change.doc : event.change.previous;
            return !isDocumentStateFromDownstream(state, checkDoc as any);
        })
        if (hasNotFromDownstream) {
        }
        addRunAgain(); // TODO move up one line
    });
    firstValueFrom(
        state.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    async function upstreamSyncOnce() {
        console.log('# upstreamSyncOnce() START');
        if (state.canceled.getValue()) {
            return;
        }

        const checkpointState = await getLastCheckpointDoc(state, 'up');
        const lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;
        let hadConflicts = false;

        let done = false;
        while (!done && !state.canceled.getValue()) {
            console.log('--- 1');
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
            writeToParentQueue = writeToParentQueue.then((async () => {
                if (state.canceled.getValue()) {
                    return;
                }

                const writeRowsToChild: {
                    [docId: string]: BulkWriteRow<RxDocType>
                } = {};
                const writeRowsToParent: BulkWriteRow<RxDocType>[] = [];
                upResult.forEach(r => {
                    if (isDocumentStateFromDownstream(state, r.document)) {
                        return;
                    }
                    const docId: string = (r.document as any)[state.primaryPath];
                    const useDoc = flatCloneDocWithMeta(r.document);
                    delete useDoc._meta[state.checkpointKey.up];
                    delete useDoc._meta[state.checkpointKey.down];
                    delete useDoc._meta[state.checkpointKey.down + META_FLAG_SUFFIX];
                    useDoc._meta[state.checkpointKey.up + META_FLAG_SUFFIX] = useDoc._rev;
                    const previous = r.document._meta[state.checkpointKey.up] as any;
                    useDoc._rev = createRevision(useDoc, previous);


                    const toChildNewData = flatCloneDocWithMeta(r.document);
                    toChildNewData._rev = createRevision(toChildNewData, r.document);
                    toChildNewData._meta[state.checkpointKey.up + META_FLAG_SUFFIX] = toChildNewData._rev;
                    toChildNewData._meta[state.checkpointKey.up] = useDoc;


                    writeRowsToChild[docId] = {
                        previous: r.document,
                        document: toChildNewData
                    };
                    writeRowsToParent.push({
                        previous,
                        document: useDoc
                    });
                });
                const parentWriteResult = await state.input.parent.bulkWrite(writeRowsToParent);
                console.log('up parentWriteResult:');
                console.dir(parentWriteResult);

                const parentWriteErrors = new Set(Object.keys(parentWriteResult.error));
                /**
                 * TODO here we have the most critical point in the replicaiton.
                 * If the child RxStorage is closed or the process exits between
                 * the write to parent and the write to the child,
                 * we can land in a state where the child does not remember
                 * that a document was already pushed to the parent
                 * and will try to do that again which will lead to a replication conflict
                 * even if there should be none.
                 */
                const useWriteRowsToChild: BulkWriteRow<RxDocType>[] = [];
                Object.entries(writeRowsToChild).forEach(([docId, writeRow]) => {
                    if (!parentWriteErrors.has(docId)) {
                        useWriteRowsToChild.push(writeRow);
                    }
                })
                const childWriteResult = await state.input.child.bulkWrite(useWriteRowsToChild);

                console.log('upstream write result:');
                console.log(JSON.stringify(parentWriteResult, null, 4));

                // TODO check if has non-409 errors and then throw
                hadConflicts = Object.keys(parentWriteResult.error).length > 0 ||
                    Object.keys(childWriteResult.error).length > 0;
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
        await setCheckpoint(
            state,
            'up',
            lastCheckpointDoc
        );


        if (hadConflicts) {
            /**
             * If we had a conflict,
             * we have to first wait until the downstream
             * is idle so we know that it had resolved all conflicts.
             * Then we can run the upstream again.
             */
            state.streamQueue.up = state.streamQueue.up
                .then(() => state.streamQueue.down)
                .then(() => {
                    addRunAgain();
                });
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
    /**
     * TODO only write checkpoint if it is different from before.
     */
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

export function isDocumentStateFromDownstream<RxDocType>(
    state: RxStorageInstanceReplicationState<any>,
    docData: RxDocumentData<RxDocType>
): boolean {
    /**
     * TODO this can be done without the META_FLAG_SUFFIX
     * by instead just comparing the revision of the current state
     * and the assumed parent state.
     */
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

