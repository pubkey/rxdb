import { now } from 'oblivious-set';
import { fillWithDefaultSettings, getComposedPrimaryKeyOfDocumentData } from '../rx-schema-helper';
import { flatCloneDocWithMeta } from '../rx-storage-helper';
import type {
    BulkWriteRow,
    RxDocumentData,
    RxJsonSchema,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta
} from '../types';
import { getDefaultRevision, createRevision } from '../util';

export const RX_REPLICATION_META_INSTANCE_SCHEMA: RxJsonSchema<RxDocumentData<RxStorageReplicationMeta>> = fillWithDefaultSettings({
    primaryKey: {
        key: 'id',
        fields: [
            'replicationIdentifier',
            'itemId',
            'isCheckpoint'
        ],
        separator: '|'
    },
    type: 'object',
    version: 0,
    additionalProperties: false,
    properties: {
        id: {
            type: 'string',
            minLength: 1,
            maxLength: 100
        },
        replicationIdentifier: {
            type: 'string'
        },
        isCheckpoint: {
            type: 'string',
            enum: [
                '0',
                '1'
            ],
            maxLength: 1
        },
        itemId: {
            type: 'string'
        },
        data: {
            type: 'object',
            additionalProperties: true
        }
    },
    required: [
        'id',
        'replicationIdentifier',
        'isCheckpoint',
        'itemId',
        'data'
    ]
});


/**
 * Returns the document states of what the fork instance
 * assumes to be the latest state on the master instance.
 */
export async function getAssumedMasterState<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    docIds: string[]
): Promise<{
    [docId: string]: {
        docData: RxDocumentData<RxDocType>;
        metaDocument: RxDocumentData<RxStorageReplicationMeta>
    }
}> {
    const metaDocs = await state.input.metaInstance.findDocumentsById(
        docIds.map(docId => {
            const useId = getComposedPrimaryKeyOfDocumentData(
                RX_REPLICATION_META_INSTANCE_SCHEMA,
                {
                    itemId: docId,
                    replicationIdentifier: state.checkpointKey,
                    isCheckpoint: '0'
                }
            );
            return useId;
        }),
        true
    );

    const ret: {
        [docId: string]: {
            docData: RxDocumentData<RxDocType>;
            metaDocument: RxDocumentData<RxStorageReplicationMeta>
        }
    } = {};
    Object
        .values(metaDocs)
        .forEach((metaDoc) => {
            ret[metaDoc.itemId] = {
                docData: metaDoc.data,
                metaDocument: metaDoc
            };
        });

    return ret;
}


export function getMetaWriteRow<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    newMasterDocState: RxDocumentData<RxDocType>,
    previous?: RxDocumentData<RxStorageReplicationMeta>
): BulkWriteRow<RxStorageReplicationMeta> {
    const docId: string = (newMasterDocState as any)[state.primaryPath];
    const newMeta: RxDocumentData<RxStorageReplicationMeta> = previous ? flatCloneDocWithMeta(
        previous
    ) : {
        id: '',
        replicationIdentifier: state.checkpointKey,
        isCheckpoint: '0',
        itemId: docId,
        data: newMasterDocState,
        _attachments: {},
        _deleted: false,
        _rev: getDefaultRevision(),
        _meta: {
            lwt: 0
        }
    };
    newMeta.data = newMasterDocState;
    newMeta._rev = createRevision(newMeta, previous);
    newMeta._meta.lwt = now();
    newMeta.id = getComposedPrimaryKeyOfDocumentData(
        RX_REPLICATION_META_INSTANCE_SCHEMA,
        newMeta
    );
    return {
        previous,
        document: newMeta
    };
}
