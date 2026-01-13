import {
    isBulkWriteConflictError,
    newRxError
} from './rx-error.ts';
import {
    fillWithDefaultSettings,
    getComposedPrimaryKeyOfDocumentData
} from './rx-schema-helper.ts';
import { getSingleDocument, getWrittenDocumentsFromBulkWriteResponse, writeSingle } from './rx-storage-helper.ts';
import type {
    CollectionsOfDatabase,
    InternalStoreCollectionDocType,
    InternalStoreDocType,
    InternalStoreStorageTokenDocType,
    RxCollection,
    RxDatabase,
    RxDocumentData,
    RxJsonSchema,
    RxStorageInstance,
    RxStorageWriteErrorConflict
} from './types/index.d.ts';
import {
    clone,
    ensureNotFalsy,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    randomToken
} from './plugins/utils/index.ts';
import { prepareQuery } from './rx-query-helper.ts';

export const INTERNAL_CONTEXT_COLLECTION = 'collection';
export const INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';
export const INTERNAL_CONTEXT_MIGRATION_STATUS = 'rx-migration-status';
export const INTERNAL_CONTEXT_PIPELINE_CHECKPOINT = 'rx-pipeline-checkpoint';

/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */
export const INTERNAL_STORE_SCHEMA_TITLE = 'RxInternalDocument';

export const INTERNAL_STORE_SCHEMA: RxJsonSchema<RxDocumentData<InternalStoreDocType<any>>> = fillWithDefaultSettings({
    version: 0,
    title: INTERNAL_STORE_SCHEMA_TITLE,
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
            type: 'string',
            maxLength: 200
        },
        key: {
            type: 'string'
        },
        context: {
            type: 'string',
            enum: [
                INTERNAL_CONTEXT_COLLECTION,
                INTERNAL_CONTEXT_STORAGE_TOKEN,
                INTERNAL_CONTEXT_MIGRATION_STATUS,
                INTERNAL_CONTEXT_PIPELINE_CHECKPOINT,
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
    additionalProperties: false,
    /**
     * If the sharding plugin is used,
     * it must not shard on the internal RxStorageInstance
     * because that one anyway has only a small amount of documents
     * and also its creation is in the hot path of the initial page load,
     * so we should spend less time creating multiple RxStorageInstances.
     */
    sharding: {
        shards: 1,
        mode: 'collection'
    }
});


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
    );
}

/**
 * Returns all internal documents
 * with context 'collection'
 */
export async function getAllCollectionDocuments(
    storageInstance: RxStorageInstance<InternalStoreDocType<any>, any, any>
): Promise<RxDocumentData<InternalStoreCollectionDocType>[]> {
    const getAllQueryPrepared = prepareQuery<InternalStoreDocType<any>>(
        storageInstance.schema,
        {
            selector: {
                context: INTERNAL_CONTEXT_COLLECTION,
                _deleted: {
                    $eq: false
                }
            },
            sort: [{ id: 'asc' }],
            skip: 0
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

export const STORAGE_TOKEN_DOCUMENT_ID = getPrimaryKeyOfInternalDocument(
    STORAGE_TOKEN_DOCUMENT_KEY,
    INTERNAL_CONTEXT_STORAGE_TOKEN
);

export async function ensureStorageTokenDocumentExists<Collections extends CollectionsOfDatabase = any>(
    rxDatabase: RxDatabase<Collections>
): Promise<RxDocumentData<InternalStoreStorageTokenDocType>> {

    /**
     * To have less read-write cycles,
     * we just try to insert a new document
     * and only fetch the existing one if a conflict happened.
     */
    const storageToken = randomToken(10);

    const passwordHash = rxDatabase.password ?
        await rxDatabase.hashFunction(JSON.stringify(rxDatabase.password)) :
        undefined;

    const docData: RxDocumentData<InternalStoreStorageTokenDocType> = {
        id: STORAGE_TOKEN_DOCUMENT_ID,
        context: INTERNAL_CONTEXT_STORAGE_TOKEN,
        key: STORAGE_TOKEN_DOCUMENT_KEY,
        data: {
            rxdbVersion: rxDatabase.rxdbVersion,
            token: storageToken,
            /**
             * We add the instance token here
             * to be able to detect if a given RxDatabase instance
             * is the first instance that was ever created
             * or if databases have existed earlier on that storage
             * with the same database name.
             */
            instanceToken: rxDatabase.token,
            passwordHash
        },
        _deleted: false,
        _meta: getDefaultRxDocumentMeta(),
        _rev: getDefaultRevision(),
        _attachments: {}
    };

    const writeRows = [{ document: docData }];
    const writeResult = await rxDatabase.internalStore.bulkWrite(
        writeRows,
        'internal-add-storage-token'
    );
    if (!writeResult.error[0]) {
        return getWrittenDocumentsFromBulkWriteResponse(
            'id',
            writeRows,
            writeResult
        )[0];
    }

    /**
     * If we get a 409 error,
     * it means another instance already inserted the storage token.
     * So we get that token from the database and return that one.
     */
    const error = ensureNotFalsy(writeResult.error[0]);
    if (
        error.isError &&
        isBulkWriteConflictError(error)
    ) {
        const conflictError = (error as RxStorageWriteErrorConflict<InternalStoreStorageTokenDocType>);

        if (
            !isDatabaseStateVersionCompatibleWithDatabaseCode(
                conflictError.documentInDb.data.rxdbVersion,
                rxDatabase.rxdbVersion
            )
        ) {
            throw newRxError('DM5', {
                args: {
                    database: rxDatabase.name,
                    databaseStateVersion: conflictError.documentInDb.data.rxdbVersion,
                    codeVersion: rxDatabase.rxdbVersion
                }
            });
        }

        if (
            passwordHash &&
            passwordHash !== conflictError.documentInDb.data.passwordHash
        ) {
            throw newRxError('DB1', {
                passwordHash,
                existingPasswordHash: conflictError.documentInDb.data.passwordHash
            });
        }

        const storageTokenDocInDb = conflictError.documentInDb;
        return ensureNotFalsy(storageTokenDocInDb);
    }
    throw error;
}


export function isDatabaseStateVersionCompatibleWithDatabaseCode(
    databaseStateVersion: string,
    codeVersion: string
): boolean {
    if (!databaseStateVersion) {
        return false;
    }

    const stateMajor = databaseStateVersion.split('.')[0];
    const codeMajor = codeVersion.split('.')[0];

    /**
     * Version data must be upwards compatible to next one
     */
    if (stateMajor === '16' && codeMajor === '17') {
        return true;
    }

    if (stateMajor !== codeMajor) {
        return false;
    }

    return true;
}





export async function addConnectedStorageToCollection(
    collection: RxCollection<any, unknown, unknown, unknown>,
    storageCollectionName: string,
    schema: RxJsonSchema<any>
) {

    if (collection.schema.version !== schema.version) {
        throw newRxError('SNH', {
            schema,
            version: collection.schema.version,
            name: collection.name,
            collection,
            args: {
                storageCollectionName
            }
        });
    }

    const collectionNameWithVersion = _collectionNamePrimary(collection.name, collection.schema.jsonSchema);
    const collectionDocId = getPrimaryKeyOfInternalDocument(
        collectionNameWithVersion,
        INTERNAL_CONTEXT_COLLECTION
    );

    while (true) {
        const collectionDoc = await getSingleDocument(
            collection.database.internalStore,
            collectionDocId
        );
        const saveData: RxDocumentData<InternalStoreCollectionDocType> = clone(ensureNotFalsy(collectionDoc));

        // do nothing if already in array
        const alreadyThere = saveData.data.connectedStorages
            .find(row => row.collectionName === storageCollectionName && row.schema.version === schema.version);
        if (alreadyThere) {
            return;
        }

        // otherwise add to array and save
        saveData.data.connectedStorages.push({
            collectionName: storageCollectionName,
            schema
        });
        try {
            await writeSingle(
                collection.database.internalStore,
                {
                    previous: ensureNotFalsy(collectionDoc),
                    document: saveData
                },
                'add-connected-storage-to-collection'
            );
        } catch (err) {
            if (!isBulkWriteConflictError(err)) {
                throw err;
            }
            // retry on conflict
        }
    }
}

export async function removeConnectedStorageFromCollection(
    collection: RxCollection<any, unknown, unknown, unknown>,
    storageCollectionName: string,
    schema: RxJsonSchema<any>
) {
    if (collection.schema.version !== schema.version) {
        throw newRxError('SNH', {
            schema,
            version: collection.schema.version,
            name: collection.name,
            collection,
            args: {
                storageCollectionName
            }
        });
    }

    const collectionNameWithVersion = _collectionNamePrimary(collection.name, collection.schema.jsonSchema);
    const collectionDocId = getPrimaryKeyOfInternalDocument(
        collectionNameWithVersion,
        INTERNAL_CONTEXT_COLLECTION
    );

    while (true) {
        const collectionDoc = await getSingleDocument(
            collection.database.internalStore,
            collectionDocId
        );
        const saveData: RxDocumentData<InternalStoreCollectionDocType> = clone(ensureNotFalsy(collectionDoc));

        // do nothing if not there
        const isThere = saveData.data.connectedStorages
            .find(row => row.collectionName === storageCollectionName && row.schema.version === schema.version);
        if (!isThere) {
            return;
        }

        // otherwise remove from array and save
        saveData.data.connectedStorages = saveData.data.connectedStorages.filter(item => item.collectionName !== storageCollectionName);
        try {
            await writeSingle(
                collection.database.internalStore,
                {
                    previous: ensureNotFalsy(collectionDoc),
                    document: saveData
                },
                'remove-connected-storage-from-collection'
            );
        } catch (err) {
            if (!isBulkWriteConflictError(err)) {
                throw err;
            }
            // retry on conflict
        }
    }
}



/**
 * returns the primary for a given collection-data
 * used in the internal store of a RxDatabase
 */
export function _collectionNamePrimary(name: string, schema: RxJsonSchema<any>) {
    return name + '-' + schema.version;
}
