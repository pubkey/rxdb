import { getComposedPrimaryKeyOfDocumentData } from './rx-schema-helper';
import type { RxDocumentData, RxJsonSchema, RxStorage, RxStorageInstance } from './types';


export const INTERNAL_CONTEXT_COLLECTION = 'collection';
export const INTERNAL_CONTEXT_ENCRYPTION = 'plugin-encryption';
export const INTERNAL_CONTEXT_REPLICATION_PRIMITIVES = 'plugin-replication-primitives';

export const INTERNAL_STORE_SCHEMA: RxJsonSchema<InternalStoreDocType<any>> = {
    version: 0,
    primaryKey: {
        key: 'id',
        fields: [
            'context',
            'key'
        ],
        separator: '|'
    },
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        key: {
            type: 'string'
        },
        context: {
            type: 'string',
            enum: [
                INTERNAL_CONTEXT_COLLECTION,
                INTERNAL_CONTEXT_ENCRYPTION,
                INTERNAL_CONTEXT_REPLICATION_PRIMITIVES
            ]
        },
        data: {
            type: 'object',
            additionalProperties: true
        }
    },
    indexes: [
        'context'
    ],
    required: [
        'key',
        'context',
        'data'
    ],
    additionalProperties: false
};


export type InternalStoreDocType<Data = any> = {
    id: string;
    key: string;
    context: string;
    data: Data;
}


/**
 * Stores information about the collections.
 * The collection.name is the 'key' value.
 */
export type InternalStoreCollectionDocType = InternalStoreDocType<{
    schema: RxJsonSchema<any>;
    schemaHash: string;
    version: number;
}>;


export function getPrimaryKeyOfInternalDocument(
    key: string,
    context: string
): string {
    return getComposedPrimaryKeyOfDocumentData<InternalStoreDocType>(
        INTERNAL_STORE_SCHEMA,
        {
            key,
            context
        }
    )
}

/**
 * Returns all internal documents
 * with context 'collection'
 */
export async function getAllCollectionDocuments(
    storageInstance: RxStorageInstance<InternalStoreDocType<any>, any, any>,
    storage: RxStorage<any, any>
): Promise<RxDocumentData<InternalStoreCollectionDocType>[]> {
    const getAllQueryPrepared = storage.statics.prepareQuery(
        storageInstance.schema,
        {
            selector: {
                context: INTERNAL_CONTEXT_COLLECTION
            },
            sort: [{ id: 'asc' }]
        }
    );
    const queryResult = await storageInstance.query(getAllQueryPrepared);
    const allDocs = queryResult.documents;
    return allDocs;
}
