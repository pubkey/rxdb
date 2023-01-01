import { getComposedPrimaryKeyOfDocumentData } from '../rx-schema-helper';
import { stackCheckpoints } from '../rx-storage-helper';
import type {
    RxDocumentData,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState,
    RxStorageReplicationDirection,
    RxStorageReplicationMeta
} from '../types';
import {
    createRevision,
    ensureNotFalsy,
    fastUnsecureHash,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    getFromObjectOrThrow,
    now
} from '../plugins/utils';
import { RX_REPLICATION_META_INSTANCE_SCHEMA } from './meta-instance';

export async function getLastCheckpointDoc<RxDocType, CheckpointType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection
): Promise<undefined | CheckpointType> {
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
    state.lastCheckpointDoc[direction] = checkpointDoc;
    if (checkpointDoc) {
        return checkpointDoc.data;
    } else {
        return undefined;
    }
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
            JSON.stringify(previousCheckpointDoc.data) !== JSON.stringify(checkpoint)
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
            _meta: getDefaultRxDocumentMeta(),
            _rev: getDefaultRevision()
        };
        newDoc.id = getComposedPrimaryKeyOfDocumentData(
            RX_REPLICATION_META_INSTANCE_SCHEMA,
            newDoc
        );
        while (true) {
            /**
             * Instead of just storign the new checkpoint,
             * we have to stack up the checkpoint with the previous one.
             * This is required for plugins like the sharding RxStorage
             * where the changeStream events only contain a Partial of the
             * checkpoint.
             */
            if (previousCheckpointDoc) {
                newDoc.data = stackCheckpoints([
                    previousCheckpointDoc.data,
                    newDoc.data
                ]);
            }
            newDoc._meta.lwt = now();
            newDoc._rev = createRevision(
                state.input.identifier,
                previousCheckpointDoc
            );
            const result = await state.input.metaInstance.bulkWrite([{
                previous: previousCheckpointDoc,
                document: newDoc
            }], 'replication-set-checkpoint');

            if (result.success[newDoc.id]) {
                state.lastCheckpointDoc[direction] = getFromObjectOrThrow(
                    result.success,
                    newDoc.id
                );
                return;
            } else {
                const error = getFromObjectOrThrow(
                    result.error,
                    newDoc.id
                );
                if (error.status !== 409) {
                    throw error;
                } else {
                    previousCheckpointDoc = ensureNotFalsy(error.documentInDb);
                    newDoc._rev = createRevision(
                        state.input.identifier,
                        previousCheckpointDoc
                    );
                }
            }
        }
    }
}

export function getCheckpointKey<RxDocType>(
    input: RxStorageInstanceReplicationInput<RxDocType>
): string {
    const hash = fastUnsecureHash([
        input.identifier,
        input.forkInstance.databaseName,
        input.forkInstance.collectionName
    ].join('||'));
    return 'rx-storage-replication-' + hash;
}
