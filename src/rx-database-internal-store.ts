import { getComposedPrimaryKeyOfDocumentData } from './rx-schema-helper';
import { getSingleDocument, writeSingle } from './rx-storage-helper';
import type {
    RxDatabase,
    RxDocumentData,
    RxJsonSchema,
    RxStorage,
    RxStorageBulkWriteError,
    RxStorageInstance
} from './types';
import { getDefaultRxDocumentMeta, randomCouchString } from './util';

export const INTERNAL_CONTEXT_COLLECTION = 'collection';
export const INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';
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
                INTERNAL_CONTEXT_STORAGE_TOKEN,
                INTERNAL_CONTEXT_ENCRYPTION,
                INTERNAL_CONTEXT_REPLICATION_PRIMITIVES,
                'OTHER'
            ]
        },
        data: {
            type: 'object',
            additionalProperties: true
        }
    },
    indexes: [],
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
export type InternalStoreStorageTokenDocType = InternalStoreDocType<{
    token: string;
}>;

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

/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
export const STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
export async function ensureStorageTokenExists<Collections = any>(rxDatabase: RxDatabase<Collections>): Promise<string> {
    const storageTokenDocumentId = getPrimaryKeyOfInternalDocument(
        STORAGE_TOKEN_DOCUMENT_KEY,
        INTERNAL_CONTEXT_STORAGE_TOKEN
    );

    /**
     * To have less read-write cycles,
     * we just try to insert a new document
     * and only fetch the existing one if a conflict happened.
     */
    const storageToken = randomCouchString(10);
    try {
        await writeSingle<InternalStoreStorageTokenDocType>(
            rxDatabase.internalStore,
            {
                document: {
                    id: storageTokenDocumentId,
                    context: INTERNAL_CONTEXT_STORAGE_TOKEN,
                    key: STORAGE_TOKEN_DOCUMENT_KEY,
                    data: {
                        token: storageToken
                    },
                    _deleted: false,
                    _meta: getDefaultRxDocumentMeta(),
                    _attachments: {}
                }
            }
        );
        return storageToken;
    } catch (err: RxStorageBulkWriteError<InternalStoreStorageTokenDocType> | any) {
        /**
         * If we get a 409 error,
         * it means another instance already inserted the storage token.
         * So we get that token from the database and return that one.
         */
        if (
            err.isError &&
            (err as RxStorageBulkWriteError<InternalStoreStorageTokenDocType>).status === 409
        ) {
            const useStorageTokenDoc = await getSingleDocument<InternalStoreStorageTokenDocType>(
                rxDatabase.internalStore,
                storageTokenDocumentId
            );
            if (useStorageTokenDoc) {
                return useStorageTokenDoc.data.token;
            }
        }
        throw err;
    }
}
