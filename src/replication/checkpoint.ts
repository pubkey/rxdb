import { getComposedPrimaryKeyOfDocumentData } from '../rx-schema-helper';
import type {
    RxDocumentData,
    RxStorageInstanceReplicationInput,
    RxStorageInstanceReplicationState,
    RxStorageReplicationDirection,
    RxStorageReplicationMeta
} from '../types';
import { createRevision, fastUnsecureHash, getDefaultRevision, now } from '../util';
import { RX_REPLICATION_META_INSTANCE_SCHEMA } from './meta-instance';

export async function getLastCheckpointDoc<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection
): Promise<undefined | {
    checkpoint: any;
    checkpointDoc?: RxDocumentData<RxStorageReplicationMeta>;
}> {
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
    if (checkpointDoc) {
        return {
            checkpoint: checkpointDoc.data,
            checkpointDoc
        };
    } else {
        return undefined;
    }
}

export async function setCheckpoint<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    direction: RxStorageReplicationDirection,
    checkpointDoc?: RxDocumentData<RxStorageReplicationMeta>
) {
    const checkpoint = state.lastCheckpoint[direction];
    if (
        checkpoint &&
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
        const newDoc: RxDocumentData<RxStorageReplicationMeta> = {
            id: '',
            isCheckpoint: '1',
            itemId: direction,
            replicationIdentifier: state.checkpointKey,
            _deleted: false,
            _attachments: {},
            data: checkpoint,
            _meta: {
                lwt: now()
            },
            _rev: getDefaultRevision()
        };
        newDoc.id = getComposedPrimaryKeyOfDocumentData(
            RX_REPLICATION_META_INSTANCE_SCHEMA,
            newDoc
        );
        newDoc._rev = createRevision(newDoc, checkpointDoc);
        await state.input.metaInstance.bulkWrite([{
            previous: checkpointDoc,
            document: newDoc
        }]);
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
