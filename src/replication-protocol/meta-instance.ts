import {
    fillWithDefaultSettings,
    getComposedPrimaryKeyOfDocumentData
} from '../rx-schema-helper';
import { flatCloneDocWithMeta } from '../rx-storage-helper';
import type {
    BulkWriteRow,
    ById,
    RxDocumentData,
    RxJsonSchema,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta,
    WithDeleted
} from '../types';
import { getDefaultRevision, createRevision, now } from '../plugins/utils';

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
        },
        isResolvedConflict: {
            type: 'string'
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
export function getAssumedMasterState<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    docIds: string[]
): Promise<ById<{
        docData: WithDeleted<RxDocType>;
        metaDocument: RxDocumentData<RxStorageReplicationMeta>;
    }>> {
    return state.input.metaInstance.findDocumentsById(
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
    ).then(metaDocs => {
        const ret: {
            [docId: string]: {
                docData: RxDocumentData<RxDocType>;
                metaDocument: RxDocumentData<RxStorageReplicationMeta>;
            };
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
    });
}


export function getMetaWriteRow<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    newMasterDocState: WithDeleted<RxDocType>,
    previous?: RxDocumentData<RxStorageReplicationMeta>,
    isResolvedConflict?: string
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
    newMeta.isResolvedConflict = isResolvedConflict;
    newMeta._meta.lwt = now();
    newMeta.id = getComposedPrimaryKeyOfDocumentData(
        RX_REPLICATION_META_INSTANCE_SCHEMA,
        newMeta
    );
    newMeta._rev = createRevision(
        state.input.identifier,
        previous
    );
    return {
        previous,
        document: newMeta
    };
}
