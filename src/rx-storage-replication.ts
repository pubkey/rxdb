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
    parseRevision,
    PROMISE_RESOLVE_VOID
} from './util';

/**
 * Flags which document state is assumed
 * to be the current state at the master RxStorage instance.
 * Used in the ._meta of the document data that is stored at the client
 * and contains the full document.
 */
const MASTER_CURRENT_STATE_FLAG_SUFFIX = '-master';

/**
 * Flags that a document write happened to
 * update the 'current master' meta field, after
 * the document has been pushed by the upstream.
 * Contains the revision.
 * Document states where this flag is equal to the current
 * revision, must not be upstreamed again.
 */
const UPSTREAM_MARKING_WRITE_FLAG_SUFFIX = '-after-up';

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
    const sub = state.input.masterInstance.changeStream().subscribe(async (eventBulk) => {
        addRunAgain(); // TODO move down again
        return;
        /**
         * Do not trigger on changes that came from the upstream
         */
        const hasNotFromUpstream = eventBulk.events.find(event => {
            const checkDoc = event.change.doc ? event.change.doc : event.change.previous;
            return !isDocumentStateFromUpstream(state, checkDoc as any);
        });
        if (hasNotFromUpstream) {
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
            state.lastCheckpoint.down = lastOfArray(downResult).checkpoint;
            writeToChildQueue = writeToChildQueue.then((async () => {
                let writeRowsLeft: BulkWriteRow<RxDocType>[] = downResult
                    .filter(r => !isDocumentStateFromUpstream(state, r.document))
                    .map(r => {
                        const useDoc = flatCloneDocWithMeta(r.document);
                        useDoc._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX] = r.document;
                        delete useDoc._meta[state.checkpointKey + FROM_FORK_FLAG_SUFFIX];
                        return { document: useDoc };
                    });

                while (writeRowsLeft.length > 0 && !state.canceled.getValue()) {
                    const writeResult = await state.input.forkInstance.bulkWrite(writeRowsLeft);
                    writeRowsLeft = [];

                    await Promise.all(
                        Object.values(writeResult.error)
                            .map(async (error: RxStorageBulkWriteError<RxDocType>) => {
                                /**
                                 * The PouchDB RxStorage sometimes emits too old
                                 * document states when calling getChangedDocumentsSince()
                                 * Therefore we filter out conflicts where the new master state
                                 * is older then the master state at fork time.
                                 * 
                                 * On other RxStorage implementations this should never be the case
                                 * because getChangedDocumentsSince() must always return the current newest
                                 * document state, not the state at the write time of the event.
                                 */
                                const docInDb = ensureNotFalsy(error.documentInDb);
                                const docAtForkTime: RxDocumentData<RxDocType> | undefined = docInDb._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX] as any;
                                if (docAtForkTime) {
                                    const newRevHeigth = parseRevision(error.writeRow.document._rev).height;
                                    const docInMasterRevHeight = parseRevision(docAtForkTime._rev).height;
                                    if (newRevHeigth <= docInMasterRevHeight) {
                                        return;
                                    }
                                }


                                const resolved = await resolveConflictError(
                                    state.input.conflictHandler,
                                    error
                                );
                                if (resolved) {
                                    /**
                                     * Keep the meta data of the original
                                     * document from the master.
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
    const sub = state.input.forkInstance.changeStream().subscribe(async (eventBulk) => {
        /**
         * Do not trigger on changes that came from the downstream
         */
        const hasNotFromDownstream = eventBulk.events.find(event => {
            const checkDoc = event.change.doc ? event.change.doc : event.change.previous;
            return !isDocumentStateFromDownstream(state, checkDoc as any);
        })
        if (hasNotFromDownstream) {
            if (state.input.waitBeforePersist) {
                await state.input.waitBeforePersist();
            }
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

        const checkpointState = await getLastCheckpointDoc(state, 'up');
        const lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;
        let hadConflicts = false;

        let done = false;
        while (!done && !state.canceled.getValue()) {
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
                if (state.canceled.getValue()) {
                    return;
                }

                const writeRowsToChild: {
                    [docId: string]: BulkWriteRow<RxDocType>
                } = {};
                const writeRowsToMaster: BulkWriteRow<RxDocType>[] = [];
                upResult.forEach(r => {
                    if (isDocumentStateFromDownstream(state, r.document)) {
                        return;
                    }
                    if (isDocumentStateFromUpstream(state, r.document)) {
                        return;
                    }
                    const docId: string = (r.document as any)[state.primaryPath];
                    const useDoc = flatCloneDocWithMeta(r.document);
                    delete useDoc._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX];
                    useDoc._meta[state.checkpointKey + FROM_FORK_FLAG_SUFFIX] = useDoc._rev;
                    const previous = r.document._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX] as any;


                    const toChildNewData = flatCloneDocWithMeta(r.document);
                    toChildNewData._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX] = useDoc;
                    toChildNewData._meta.lwt = now();
                    toChildNewData._rev = createRevision(toChildNewData, r.document);
                    toChildNewData._meta[state.checkpointKey + UPSTREAM_MARKING_WRITE_FLAG_SUFFIX] = toChildNewData._rev;


                    writeRowsToChild[docId] = {
                        previous: r.document,
                        document: toChildNewData
                    };
                    writeRowsToMaster.push({
                        previous,
                        document: useDoc
                    });
                });

                if (writeRowsToMaster.length === 0) {
                    hadConflicts = false;
                    return;
                }

                const masterWriteResult = await state.input.masterInstance.bulkWrite(writeRowsToMaster);
                const masterWriteErrors = new Set(Object.keys(masterWriteResult.error));
                /**
                 * TODO here we have the most critical point in the replicaiton.
                 * If the child RxStorage is closed or the process exits between
                 * the write to master and the write to the child,
                 * we can land in a state where the child does not remember
                 * that a document was already pushed to the master
                 * and will try to do that again which will lead to a replication conflict
                 * even if there should be none.
                 */
                const useWriteRowsToChild: BulkWriteRow<RxDocType>[] = [];
                Object.entries(writeRowsToChild).forEach(([docId, writeRow]) => {
                    if (!masterWriteErrors.has(docId)) {
                        useWriteRowsToChild.push(writeRow);
                    }
                })
                let childWriteResult;
                if (useWriteRowsToChild.length > 0) {
                    childWriteResult = await state.input.forkInstance.bulkWrite(useWriteRowsToChild);
                }

                // TODO check if has non-409 errors and then throw
                hadConflicts = Object.keys(masterWriteResult.error).length > 0 ||
                    (!!childWriteResult && Object.keys(childWriteResult.error).length > 0);
            }));
        }

        await writeToMasterQueue;

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
        state.checkpointKey + '-' + direction,
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
 * Returns the resolved document.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the downstream, never in the upstream.
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
            documentStateAtForkTime: error.writeRow.previous,
            newDocumentStateInMaster: error.writeRow.document,
            currentForkDocumentState: documentInDb
        });

        const resolvedDoc = flatCloneDocWithMeta(resolved.resolvedDocumentState);
        resolvedDoc._meta.lwt = now();
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
        const checkpointKeyWithDirection = state.checkpointKey + '-' + direction;
        const newDoc: RxDocumentData<InternalStoreDocType<any>> = {
            key: checkpointKeyWithDirection,
            id: getPrimaryKeyOfInternalDocument(
                checkpointKeyWithDirection,
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
    const latestMasterDocState: RxDocumentData<RxDocType> | undefined = docData._meta[state.checkpointKey + MASTER_CURRENT_STATE_FLAG_SUFFIX] as any;
    if (latestMasterDocState && latestMasterDocState._rev === docData._rev) {
        return true;
    } else {
        return false;
    }
}

export function isDocumentStateFromUpstream<RxDocType>(
    state: RxStorageInstanceReplicationState<any>,
    docData: RxDocumentData<RxDocType>
): boolean {
    const upstreamRev = docData._meta[state.checkpointKey + FROM_FORK_FLAG_SUFFIX];
    if (
        (upstreamRev && upstreamRev === docData._rev) ||
        (
            docData._meta[state.checkpointKey + UPSTREAM_MARKING_WRITE_FLAG_SUFFIX] === docData._rev
        )
    ) {
        return true;
    } else {
        return false;
    }
}

