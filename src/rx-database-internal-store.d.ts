import type { CollectionsOfDatabase, InternalStoreCollectionDocType, InternalStoreDocType, InternalStoreStorageTokenDocType, RxCollection, RxDatabase, RxDocumentData, RxJsonSchema, RxStorageInstance } from './types/index.d.ts';
export declare const INTERNAL_CONTEXT_COLLECTION = "collection";
export declare const INTERNAL_CONTEXT_STORAGE_TOKEN = "storage-token";
export declare const INTERNAL_CONTEXT_MIGRATION_STATUS = "rx-migration-status";
export declare const INTERNAL_CONTEXT_PIPELINE_CHECKPOINT = "rx-pipeline-checkpoint";
/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */
export declare const INTERNAL_STORE_SCHEMA_TITLE = "RxInternalDocument";
export declare const INTERNAL_STORE_SCHEMA: RxJsonSchema<RxDocumentData<InternalStoreDocType<any>>>;
export declare function getPrimaryKeyOfInternalDocument(key: string, context: string): string;
/**
 * Returns all internal documents
 * with context 'collection'
 */
export declare function getAllCollectionDocuments(storageInstance: RxStorageInstance<InternalStoreDocType<any>, any, any>): Promise<RxDocumentData<InternalStoreCollectionDocType>[]>;
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
export declare const STORAGE_TOKEN_DOCUMENT_KEY = "storageToken";
export declare const STORAGE_TOKEN_DOCUMENT_ID: string;
export declare function ensureStorageTokenDocumentExists<Collections extends CollectionsOfDatabase = any>(rxDatabase: RxDatabase<Collections>): Promise<RxDocumentData<InternalStoreStorageTokenDocType>>;
export declare function isDatabaseStateVersionCompatibleWithDatabaseCode(databaseStateVersion: string, codeVersion: string): boolean;
export declare function addConnectedStorageToCollection(collection: RxCollection<any, unknown, unknown, unknown>, storageCollectionName: string, schema: RxJsonSchema<any>): Promise<void>;
export declare function removeConnectedStorageFromCollection(collection: RxCollection<any, unknown, unknown, unknown>, storageCollectionName: string, schema: RxJsonSchema<any>): Promise<void>;
/**
 * returns the primary for a given collection-data
 * used in the internal store of a RxDatabase
 */
export declare function _collectionNamePrimary(name: string, schema: RxJsonSchema<any>): string;
