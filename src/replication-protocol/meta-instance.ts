import {
    fillWithDefaultSettings,
    getComposedPrimaryKeyOfDocumentData,
    getLengthOfPrimaryKey
} from '../rx-schema-helper.ts';
import { flatCloneDocWithMeta } from '../rx-storage-helper.ts';
import type {
    BulkWriteRow,
    ById,
    RxDocumentData,
    RxJsonSchema,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta,
    WithDeleted
} from '../types/index.d.ts';
import { getDefaultRevision, createRevision, now } from '../plugins/utils/index.ts';


export const META_INSTANCE_SCHEMA_TITLE = 'RxReplicationProtocolMetaData';

export function getRxReplicationMetaInstanceSchema(
    replicatedDocumentsSchema: RxJsonSchema<RxDocumentData<any>>,
    encrypted: boolean
): RxJsonSchema<RxDocumentData<RxStorageReplicationMeta>> {
    const parentPrimaryKeyLength = getLengthOfPrimaryKey(replicatedDocumentsSchema);

    const baseSchema: RxJsonSchema<RxStorageReplicationMeta> = {
        title: META_INSTANCE_SCHEMA_TITLE,
        primaryKey: {
            key: 'id',
            fields: [
                'itemId',
                'isCheckpoint'
            ],
            separator: '|'
        },
        type: 'object',
        version: replicatedDocumentsSchema.version,
        additionalProperties: false,
        properties: {
            id: {
                type: 'string',
                minLength: 1,
                // add +1 for the '|' and +1 for the 'isCheckpoint' flag
                maxLength: parentPrimaryKeyLength + 2
            },
            isCheckpoint: {
                type: 'string',
                enum: [
                    '0',
                    '1'
                ],
                minLength: 1,
                maxLength: 1
            },
            itemId: {
                type: 'string',
                /**
                 * ensure that all values of RxStorageReplicationDirection ('DOWN' has 4 chars) fit into it
                 * because checkpoints use the itemId field for that.
                 */
                maxLength: parentPrimaryKeyLength > 4 ? parentPrimaryKeyLength : 4
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
            'isCheckpoint',
            'itemId',
            'data'
        ]
    };
    if (encrypted) {
        baseSchema.encrypted = ['data'];
    }
    const metaInstanceSchema: RxJsonSchema<RxDocumentData<RxStorageReplicationMeta>> = fillWithDefaultSettings(baseSchema);
    return metaInstanceSchema;
}



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
                state.input.metaInstance.schema,
                {
                    itemId: docId,
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


export async function getMetaWriteRow<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    newMasterDocState: WithDeleted<RxDocType>,
    previous?: RxDocumentData<RxStorageReplicationMeta>,
    isResolvedConflict?: string
): Promise<BulkWriteRow<RxStorageReplicationMeta>> {
    const docId: string = (newMasterDocState as any)[state.primaryPath];
    const newMeta: RxDocumentData<RxStorageReplicationMeta> = previous ? flatCloneDocWithMeta(
        previous
    ) : {
        id: '',
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
        state.input.metaInstance.schema,
        newMeta
    );
    newMeta._rev = createRevision(
        await state.checkpointKey,
        previous
    );
    return {
        previous,
        document: newMeta
    };
}
