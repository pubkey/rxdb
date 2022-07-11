import { firstValueFrom, filter } from 'rxjs';
import { flatCloneDocWithMeta } from '../rx-storage-helper';
import type {
    BulkWriteRow,
    BulkWriteRowById,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta
} from '../types';
import { PROMISE_RESOLVE_VOID, parseRevision, now, lastOfArray, ensureNotFalsy } from '../util';
import { getLastCheckpointDoc, setCheckpoint } from './checkpoint';
import { resolveConflictError } from './conflicts';
import { getAssumedMasterState, getMetaWriteRow } from './meta-instance';
import { FROM_FORK_FLAG_SUFFIX } from './replication-helper';

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
                const writeRowsToMaster: BulkWriteRow<RxDocType>[] = [];
                const writeRowsToMeta: BulkWriteRowById<RxStorageReplicationMeta> = {};

                useUpDocs.forEach(doc => {
                    const docId: string = (doc as any)[state.primaryPath];
                    const useDoc = flatCloneDocWithMeta(doc);
                    useDoc._meta[state.checkpointKey + FROM_FORK_FLAG_SUFFIX] = useDoc._rev;
                    useDoc._meta.lwt = now();

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
                     * TODO there is no real reason why this should ever happen,
                     * however the replication did not work on the PouchDB RxStorage
                     * without this fix.
                     */
                    if (
                        assumedMasterDoc &&
                        parseRevision(assumedMasterDoc.docData._rev).height >= parseRevision(useDoc._rev).height
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

                if (writeRowsToMaster.length === 0) {
                    return;
                }
                const masterWriteResult = await state.input.masterInstance.bulkWrite(writeRowsToMaster);

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
                 * Non-409 errors will be detected by resolveConflictError()
                 */
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

                    if (conflictWriteFork.length > 0) {
                        hadConflictWrites = true;

                        const forkWriteResult = await state.input.forkInstance.bulkWrite(conflictWriteFork);
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
                            await state.input.metaInstance.bulkWrite(useMetaWrites);
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

