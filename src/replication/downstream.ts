import { lastOfArray } from 'event-reduce-js';
import { firstValueFrom, filter } from 'rxjs';
import type {
    RxStorageInstanceReplicationState,
    RxDocumentDataById,
    BulkWriteRow,
    BulkWriteRowById,
    RxStorageReplicationMeta,
    RxDocumentData

} from '../types';
import { PROMISE_RESOLVE_VOID } from '../util';
import { getLastCheckpointDoc, setCheckpoint } from './checkpoint';
import { getAssumedMasterState, getMetaWriteRow } from './meta-instance';

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
