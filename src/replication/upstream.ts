import { firstValueFrom, filter } from 'rxjs';
import { flatCloneDocWithMeta } from '../rx-storage-helper';
import type {
    BulkWriteRow,
    BulkWriteRowById,
    ById,
    RxDocumentData,
    RxReplicationWriteToMasterRow,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta,
    WithDeleted
} from '../types';
import {
    PROMISE_RESOLVE_VOID,
    now,
    lastOfArray,
    ensureNotFalsy
} from '../util';
import {
    getLastCheckpointDoc,
    setCheckpoint
} from './checkpoint';
import { resolveConflictError } from './conflicts';
import {
    getAssumedMasterState,
    getMetaWriteRow
} from './meta-instance';

/**
 * Writes all document changes from the fork to the master.
 * The upstream runs on two modes:
 * - For inital replication, a checkpoint-iteration is used
 * - For ongoing local writes, we just subscribe to the changeStream of the fork.
 *   In contrast to the master, the fork can be assumed to never loose connection,
 *   so we do not have to prepare for missed out events.
 */
export function startReplicationUpstream<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>
) {
    const replicationHandler = state.input.replicationHandler;
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
    const sub = state.input.forkInstance.changeStream()
        .pipe(
            filter(eventBulk => eventBulk.context !== state.downstreamBulkWriteFlag)
        ).subscribe(async () => {
            if (state.input.waitBeforePersist) {
                await state.input.waitBeforePersist();
            }
            addRunAgain();
        });
    firstValueFrom(
        state.canceled.pipe(
            filter(canceled => !!canceled)
        )
    ).then(() => sub.unsubscribe());


    // async function upstreamInitialSync() {
    //     if (state.canceled.getValue()) {
    //         return;
    //     }
    //     const checkpointState = await getLastCheckpointDoc(state, 'up');
    //     const lastCheckpointDoc = checkpointState ? checkpointState.checkpointDoc : undefined;


    //     /**
    //      * If this goes to true,
    //      * it means that we have to do a new write to the
    //      * fork instance to resolve a conflict.
    //      * In that case, we have to run upstreamInitialSync() so
    //      * an additional upstream cycle must be used
    //      * to push the resolved conflict state.
    //      */
    //     let hadConflictWrites = false;


    //     let done = false;
    //     const promises: Promise<any>[] = [];
    //     while (!done && !state.canceled.getValue()) {
    //         const upResult = await state.input.forkInstance.getChangedDocumentsSince(
    //             state.input.bulkSize,
    //             state.lastCheckpoint.up
    //         );
    //         if (
    //             upResult.length === 0 ||
    //             state.canceled.getValue()
    //         ) {
    //             done = true;
    //             break;
    //         }
    //         state.lastCheckpoint.up = lastOfArray(upResult).checkpoint;

    //         promises.push((async () => {
    //             const useUpDocs = upResult.map(r => r.document);
    //             if (useUpDocs.length === 0) {
    //                 return;
    //             }

    //             const assumedMasterState = await getAssumedMasterState(
    //                 state,
    //                 useUpDocs.map(d => (d as any)[state.primaryPath])
    //             );
    //             const writeRowsToMaster: ById<RxReplicationWriteToMasterRow<RxDocType>> = {};
    //             const writeRowsToMasterIds: string[] = [];
    //             const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};

    //             const forkStateById: ById<RxDocumentData<RxDocType>> = {};
    //             await Promise.all(
    //                 useUpDocs.map(async (doc) => {
    //                     const docId: string = (doc as any)[state.primaryPath];
    //                     forkStateById[docId] = doc;
    //                     const useDoc = flatCloneDocWithMeta(doc);
    //                     useDoc._meta.lwt = now();

    //                     const assumedMasterDoc = assumedMasterState[docId];

    //                     /**
    //                      * If the master state is equal to the
    //                      * fork state, we can assume that the document state is already
    //                      * replicated.
    //                      */
    //                     if (

    //                         assumedMasterDoc &&
    //                         // if the isResolvedConflict is correct, we do not have to compare the documents.
    //                         assumedMasterDoc.metaDocument.isResolvedConflict !== useDoc._rev &&
    //                         (await state.input.conflictHandler({
    //                             realMasterState: assumedMasterDoc.docData,
    //                             newDocumentState: useDoc
    //                         }, 'upstream-check-if-equal')).isEqual
    //                     ) {
    //                         return;
    //                     }

    //                     writeRowsToMasterIds.push(docId);
    //                     writeRowsToMaster[docId] = {
    //                         assumedMasterState: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
    //                         newDocumentState: useDoc
    //                     };
    //                     writeRowsToMeta[docId] = getMetaWriteRow(
    //                         state,
    //                         useDoc,
    //                         assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined
    //                     );
    //                 })
    //             );

    //             if (writeRowsToMasterIds.length === 0) {
    //                 return;
    //             }

    //             const masterWriteResult = await replicationHandler.masterWrite(Object.values(writeRowsToMaster));
    //             const conflictIds: Set<string> = new Set();
    //             const conflictsById: ById<WithDeleted<RxDocType>> = {};
    //             masterWriteResult.forEach(conflictDoc => {
    //                 const id = (conflictDoc as any)[state.primaryPath];
    //                 conflictIds.add(id);
    //                 conflictsById[id] = conflictDoc;
    //             });

    //             const useWriteRowsToMeta: BulkWriteRow<RxStorageReplicationMeta>[] = [];


    //             writeRowsToMasterIds.forEach(docId => {
    //                 if (!conflictIds.has(docId)) {
    //                     useWriteRowsToMeta.push(writeRowsToMeta[docId]);
    //                 }
    //             });

    //             if (useWriteRowsToMeta.length > 0) {
    //                 await state.input.metaInstance.bulkWrite(
    //                     useWriteRowsToMeta,
    //                     'replication-up-write-meta'
    //                 );
    //                 // TODO what happens when we have conflicts here?
    //             }

    //             /**
    //              * Resolve conflicts by writing a new document
    //              * state to the fork instance and the 'real' master state
    //              * to the meta instance.
    //              * Non-409 errors will be detected by resolveConflictError()
    //              */
    //             if (conflictIds.size > 0) {
    //                 const conflictWriteFork: BulkWriteRow<RxDocType>[] = [];
    //                 const conflictWriteMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};
    //                 await Promise.all(
    //                     Object
    //                         .entries(conflictsById)
    //                         .map(async ([docId, realMasterState]) => {
    //                             const writeToMasterRow = writeRowsToMaster[docId];

    //                             const resolved = await resolveConflictError(
    //                                 state.input.conflictHandler,
    //                                 {
    //                                     newDocumentState: writeToMasterRow.newDocumentState,
    //                                     assumedMasterState: writeToMasterRow.assumedMasterState,
    //                                     realMasterState
    //                                 },
    //                                 forkStateById[docId]
    //                             );
    //                             if (resolved) {
    //                                 conflictWriteFork.push({
    //                                     previous: forkStateById[docId],
    //                                     document: resolved
    //                                 });
    //                                 const assumedMasterDoc = assumedMasterState[docId];
    //                                 conflictWriteMeta[docId] = getMetaWriteRow(
    //                                     state,
    //                                     ensureNotFalsy(realMasterState),
    //                                     assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined,
    //                                     resolved._rev
    //                                 );
    //                             }
    //                         })
    //                 );

    //                 if (conflictWriteFork.length > 0) {
    //                     hadConflictWrites = true;

    //                     const forkWriteResult = await state.input.forkInstance.bulkWrite(
    //                         conflictWriteFork,
    //                         'replication-up-write-conflict'
    //                     );
    //                     /**
    //                      * Errors in the forkWriteResult must not be handled
    //                      * because they have been caused by a write to the forkInstance
    //                      * in between which will anyway trigger a new upstream cycle
    //                      * that will then resolved the conflict again.
    //                      */
    //                     const useMetaWrites: BulkWriteRow<RxStorageReplicationMeta>[] = [];
    //                     Object
    //                         .keys(forkWriteResult.success)
    //                         .forEach((docId) => {
    //                             useMetaWrites.push(
    //                                 conflictWriteMeta[docId]
    //                             );
    //                         });
    //                     if (useMetaWrites.length > 0) {
    //                         await state.input.metaInstance.bulkWrite(
    //                             useMetaWrites,
    //                             'replication-up-write-conflict-meta'
    //                         );
    //                     }
    //                     // TODO what to do with conflicts while writing to the metaInstance?
    //                 }
    //             }


    //             await setCheckpoint(
    //                 state,
    //                 'up',
    //                 lastCheckpointDoc
    //             );
    //         })());

    //     }
    //     await Promise.all(promises);
    // }

    async function upstreamSyncOnce() {
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
        let currentCheckpoint: any;
        while (!done && !state.canceled.getValue()) {
            const upResult = await state.input.forkInstance.getChangedDocumentsSince(
                state.input.bulkSize,
                currentCheckpoint
            );
            if (
                upResult.length === 0 ||
                state.canceled.getValue()
            ) {
                done = true;
                continue;
            }

            currentCheckpoint = lastOfArray(upResult).checkpoint;
            writeToMasterQueue = writeToMasterQueue.then((async () => {

                // used to not have infinity loop during development
                // that cannot be exited via Ctrl+C
                // await promiseWait(0);

                if (state.canceled.getValue()) {
                    return;
                }

                const useUpDocs = upResult.map(r => r.document);
                if (useUpDocs.length === 0) {
                    return;
                }

                const assumedMasterState = await getAssumedMasterState(
                    state,
                    useUpDocs.map(d => (d as any)[state.primaryPath])
                );
                const writeRowsToMaster: ById<RxReplicationWriteToMasterRow<RxDocType>> = {};
                const writeRowsToMasterIds: string[] = [];
                const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};

                const forkStateById: ById<RxDocumentData<RxDocType>> = {};
                await Promise.all(
                    useUpDocs.map(async (doc) => {
                        const docId: string = (doc as any)[state.primaryPath];
                        forkStateById[docId] = doc;
                        const useDoc = flatCloneDocWithMeta(doc);
                        useDoc._meta.lwt = now();

                        const assumedMasterDoc = assumedMasterState[docId];

                        /**
                         * If the master state is equal to the
                         * fork state, we can assume that the document state is already
                         * replicated.
                         */
                        if (

                            assumedMasterDoc &&
                            // if the isResolvedConflict is correct, we do not have to compare the documents.
                            assumedMasterDoc.metaDocument.isResolvedConflict !== useDoc._rev &&
                            (await state.input.conflictHandler({
                                realMasterState: assumedMasterDoc.docData,
                                newDocumentState: useDoc
                            }, 'upstream-check-if-equal')).isEqual
                        ) {
                            return;
                        }

                        writeRowsToMasterIds.push(docId);
                        writeRowsToMaster[docId] = {
                            assumedMasterState: assumedMasterDoc ? assumedMasterDoc.docData : undefined,
                            newDocumentState: useDoc
                        };
                        writeRowsToMeta[docId] = getMetaWriteRow(
                            state,
                            useDoc,
                            assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined
                        );
                    })
                );

                if (writeRowsToMasterIds.length === 0) {
                    return;
                }

                const masterWriteResult = await replicationHandler.masterWrite(Object.values(writeRowsToMaster));
                const conflictIds: Set<string> = new Set();
                const conflictsById: ById<WithDeleted<RxDocType>> = {};
                masterWriteResult.forEach(conflictDoc => {
                    const id = (conflictDoc as any)[state.primaryPath];
                    conflictIds.add(id);
                    conflictsById[id] = conflictDoc;
                });

                const useWriteRowsToMeta: BulkWriteRow<RxStorageReplicationMeta>[] = [];


                writeRowsToMasterIds.forEach(docId => {
                    if (!conflictIds.has(docId)) {
                        useWriteRowsToMeta.push(writeRowsToMeta[docId]);
                    }
                });

                if (useWriteRowsToMeta.length > 0) {
                    await state.input.metaInstance.bulkWrite(
                        useWriteRowsToMeta,
                        'replication-up-write-meta'
                    );
                    // TODO what happens when we have conflicts here?
                }

                /**
                 * Resolve conflicts by writing a new document
                 * state to the fork instance and the 'real' master state
                 * to the meta instance.
                 * Non-409 errors will be detected by resolveConflictError()
                 */
                if (conflictIds.size > 0) {
                    const conflictWriteFork: BulkWriteRow<RxDocType>[] = [];
                    const conflictWriteMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};
                    await Promise.all(
                        Object
                            .entries(conflictsById)
                            .map(async ([docId, realMasterState]) => {
                                const writeToMasterRow = writeRowsToMaster[docId];

                                const resolved = await resolveConflictError(
                                    state.input.conflictHandler,
                                    {
                                        newDocumentState: writeToMasterRow.newDocumentState,
                                        assumedMasterState: writeToMasterRow.assumedMasterState,
                                        realMasterState
                                    },
                                    forkStateById[docId]
                                );
                                if (resolved) {
                                    conflictWriteFork.push({
                                        previous: forkStateById[docId],
                                        document: resolved
                                    });
                                    const assumedMasterDoc = assumedMasterState[docId];
                                    conflictWriteMeta[docId] = getMetaWriteRow(
                                        state,
                                        ensureNotFalsy(realMasterState),
                                        assumedMasterDoc ? assumedMasterDoc.metaDocument : undefined,
                                        resolved._rev
                                    );
                                }
                            })
                    );

                    if (conflictWriteFork.length > 0) {
                        hadConflictWrites = true;

                        const forkWriteResult = await state.input.forkInstance.bulkWrite(
                            conflictWriteFork,
                            'replication-up-write-conflict'
                        );
                        /**
                         * Errors in the forkWriteResult must not be handled
                         * because they have been caused by a write to the forkInstance
                         * in between which will anyway trigger a new upstream cycle
                         * that will then resolved the conflict again.
                         */
                        const useMetaWrites: BulkWriteRow<RxStorageReplicationMeta>[] = [];
                        Object
                            .keys(forkWriteResult.success)
                            .forEach((docId) => {
                                useMetaWrites.push(
                                    conflictWriteMeta[docId]
                                );
                            });
                        if (useMetaWrites.length > 0) {
                            await state.input.metaInstance.bulkWrite(
                                useMetaWrites,
                                'replication-up-write-conflict-meta'
                            );
                        }
                        // TODO what to do with conflicts while writing to the metaInstance?
                    }
                }
            }));
        }

        await writeToMasterQueue;

        await setCheckpoint(
            state,
            'up',
            currentCheckpoint,
            lastCheckpointDoc
        );
        if (
            !hadConflictWrites &&
            !state.firstSyncDone.up.getValue()
        ) {
            state.firstSyncDone.up.next(true);
        }
    }
}

