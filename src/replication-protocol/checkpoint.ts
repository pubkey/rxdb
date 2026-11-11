import { getComposedPrimaryKeyOfDocumentData } from '../rx-schema-helper.ts';
import { getWrittenDocumentsFromBulkWriteResponse, stackCheckpoints } from '../rx-storage-helper.ts';
import type {
    RxDocumentData,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState,
    RxStorageReplicationDirection,
    RxStorageReplicationMeta
} from '../types/index.d.ts';
import {
    createRevision,
    ensureNotFalsy,
    errorToPlainJson,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    now,
    promiseWait,
    toArray
} from '../plugins/utils/index.ts';
import { newRxError } from '../rx-error.ts';

/**
 * Time in milliseconds to wait
 * before a failed read of the checkpoint document is retried.
 */
export const CHECKPOINT_READ_RETRY_TIME = 200;

export async function getLastCheckpointDoc<RxDocType, CheckpointType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection
): Promise<undefined | CheckpointType> {
    const checkpointDocId = getComposedPrimaryKeyOfDocumentData(
        state.input.metaInstance.schema,
        {
            isCheckpoint: '1',
            itemId: direction
        }
    );
    const checkpointResult = await state.input.metaInstance.findDocumentsById(
        [
            checkpointDocId
        ],
        false
    );

    const checkpointDoc = checkpointResult[0];
    state.lastCheckpointDoc[direction] = checkpointDoc;
    if (checkpointDoc) {
        return checkpointDoc.checkpointData;
    } else {
        return undefined;
    }
}

/**
 * Reads the checkpoint inside of the checkpointQueue.
 * A failed read is emitted to the error-event and retried,
 * so that the checkpointQueue never ends up rejected
 * which would block all later checkpoint reads and writes.
 */
export function getLastCheckpointDocQueued<RxDocType, CheckpointType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection
): Promise<undefined | CheckpointType> {
    const ret = state.checkpointQueue.then(async () => {
        while (!state.events.canceled.getValue()) {
            try {
                return await getLastCheckpointDoc<RxDocType, CheckpointType>(state, direction);
            } catch (err: any) {
                state.events.error.next(newRxError(direction === 'down' ? 'RC_PULL' : 'RC_PUSH', {
                    direction: direction === 'down' ? 'pull' : 'push',
                    errors: toArray(err).map(er => errorToPlainJson(er))
                }));
                await promiseWait(CHECKPOINT_READ_RETRY_TIME);
            }
        }
    });
    state.checkpointQueue = ret;
    return ret;
}

/**
 * Sets the checkpoint,
 * automatically resolves conflicts that appear.
 */
export async function setCheckpoint<RxDocType, CheckpointType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection,
    checkpoint: CheckpointType
) {
    state.checkpointQueue = state.checkpointQueue.then(async () => {
        let previousCheckpointDoc = state.lastCheckpointDoc[direction];
        if (
            checkpoint &&
            /**
             * If the replication is already canceled,
             * we do not write a checkpoint
             * because that could mean we write a checkpoint
             * for data that has been fetched from the master
             * but not been written to the child.
             */
            !state.events.canceled.getValue() &&
            /**
             * Only write checkpoint if it is different from before
             * to have less writes to the storage.
             */
            (
                !previousCheckpointDoc ||
                JSON.stringify(previousCheckpointDoc.checkpointData) !== JSON.stringify(checkpoint)
            )
        ) {
            const newDoc: RxDocumentData<RxStorageReplicationMeta<RxDocType, CheckpointType>> = {
                id: '',
                isCheckpoint: '1',
                itemId: direction,
                _deleted: false,
                _attachments: {},
                checkpointData: checkpoint,
                _meta: getDefaultRxDocumentMeta(),
                _rev: getDefaultRevision()
            };
            newDoc.id = getComposedPrimaryKeyOfDocumentData(
                state.input.metaInstance.schema,
                newDoc
            );
            while (!state.events.canceled.getValue()) {
                /**
                 * Instead of just storing the new checkpoint,
                 * we have to stack up the checkpoint with the previous one.
                 * This is required for plugins like the sharding RxStorage
                 * where the changeStream events only contain a Partial of the
                 * checkpoint.
                 */
                if (previousCheckpointDoc) {
                    newDoc.checkpointData = stackCheckpoints([
                        previousCheckpointDoc.checkpointData,
                        newDoc.checkpointData
                    ]);
                }
                newDoc._meta.lwt = now();
                newDoc._rev = createRevision(
                    await state.checkpointKey,
                    previousCheckpointDoc
                );

                if (state.events.canceled.getValue()) {
                    return;
                }

                const writeRows = [{
                    previous: previousCheckpointDoc,
                    document: newDoc
                }];
                const result = await state.input.metaInstance.bulkWrite(writeRows, 'replication-set-checkpoint');
                const successDoc = getWrittenDocumentsFromBulkWriteResponse(
                    state.primaryPath,
                    writeRows,
                    result
                )[0];
                if (successDoc) {
                    state.lastCheckpointDoc[direction] = successDoc;
                    return;
                } else {
                    const error = result.error[0];
                    if (error.status !== 409) {
                        throw error;
                    } else {
                        previousCheckpointDoc = ensureNotFalsy(error.documentInDb);
                        newDoc._rev = createRevision(
                            await state.checkpointKey,
                            previousCheckpointDoc
                        );
                    }
                }
            }
        }
    });
    await state.checkpointQueue;
}

export async function getCheckpointKey<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): Promise<string> {
    const hash = await input.hashFunction([
        input.identifier,
        input.forkInstance.databaseName,
        input.forkInstance.collectionName
    ].join('||'));
    return 'rx_storage_replication_' + hash;
}
