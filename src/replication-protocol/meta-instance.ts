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
import {
    getDefaultRevision,
    createRevision,
    now
} from '../plugins/utils/index.ts';


export const META_INSTANCE_SCHEMA_TITLE = 'RxReplicationProtocolMetaData';

export function getRxReplicationMetaInstanceSchema<RxDocType, CheckpointType>(
    replicatedDocumentsSchema: RxJsonSchema<RxDocumentData<RxDocType>>,
    encrypted: boolean
): RxJsonSchema<RxDocumentData<RxStorageReplicationMeta<RxDocType, CheckpointType>>> {
    const parentPrimaryKeyLength = getLengthOfPrimaryKey(replicatedDocumentsSchema);

    const minItemIdLength = 4; // 'DOWN' must fit into this
    const minIdLength = minItemIdLength + 2; // 'DOWN|1' must fit into this
    // add +1 for the '|' and +1 for the 'isCheckpoint' flag
    let idLength = parentPrimaryKeyLength + 2;
    if (idLength < minIdLength) {
        idLength = minIdLength;
    }

    const baseSchema: RxJsonSchema<RxStorageReplicationMeta<RxDocType, CheckpointType>> = {
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
                maxLength: idLength
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
                maxLength: parentPrimaryKeyLength > minItemIdLength ? parentPrimaryKeyLength : minItemIdLength
            },
            checkpointData: {
                type: 'object',
                additionalProperties: true
            },
            docData: {
                type: 'object',
                properties: replicatedDocumentsSchema.properties
            },
            isResolvedConflict: {
                type: 'string'
            }
        },
        keyCompression: replicatedDocumentsSchema.keyCompression,
        required: [
            'id',
            'isCheckpoint',
            'itemId'
        ]
    };
    if (encrypted) {
        baseSchema.encrypted = ['docData'];
    }
    const metaInstanceSchema: RxJsonSchema<RxDocumentData<RxStorageReplicationMeta<RxDocType, CheckpointType>>> = fillWithDefaultSettings(baseSchema);
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
    metaDocument: RxDocumentData<RxStorageReplicationMeta<RxDocType, any>>;
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
                metaDocument: RxDocumentData<RxStorageReplicationMeta<RxDocType, any>>;
            };
        } = {};
        Object
            .values(metaDocs)
            .forEach((metaDoc) => {
                ret[metaDoc.itemId] = {
                    docData: metaDoc.docData,
                    metaDocument: metaDoc
                };
            });

        return ret;
    });
}


export async function getMetaWriteRow<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    newMasterDocState: WithDeleted<RxDocType>,
    previous?: RxDocumentData<RxStorageReplicationMeta<RxDocType, any>>,
    isResolvedConflict?: string
): Promise<BulkWriteRow<RxStorageReplicationMeta<RxDocType, any>>> {
    const docId: string = (newMasterDocState as any)[state.primaryPath];
    const newMeta: RxDocumentData<RxStorageReplicationMeta<RxDocType, any>> = previous ? flatCloneDocWithMeta(
        previous
    ) : {
        id: '',
        isCheckpoint: '0',
        itemId: docId,
        docData: newMasterDocState,
        _attachments: {},
        _deleted: false,
        _rev: getDefaultRevision(),
        _meta: {
            lwt: 0
        }
    };
    newMeta.docData = newMasterDocState;

    /**
     * Sending isResolvedConflict with the value undefined
     * will throw a schema validation error because it must be either
     * not set or have a string.
     */
    if (isResolvedConflict) {
        newMeta.isResolvedConflict = isResolvedConflict;
    }

    newMeta._meta.lwt = now();
    newMeta.id = getComposedPrimaryKeyOfDocumentData(
        state.input.metaInstance.schema,
        newMeta
    );
    newMeta._rev = createRevision(
        await state.checkpointKey,
        previous
    );

    const ret = {
        previous,
        document: newMeta
    };

    return ret;
}
