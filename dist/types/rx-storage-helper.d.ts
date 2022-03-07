/**
 * Helper functions for accessing the RxStorage instances.
 */
import type { BulkWriteRow, RxChangeEvent, RxCollection, RxDatabase, RxDocumentData, RxDocumentWriteData, RxJsonSchema, RxStorage, RxStorageBulkWriteError, RxStorageChangeEvent, RxStorageInstance, RxStorageStatics } from './types';
export declare const INTERNAL_STORAGE_NAME = "_rxdb_internal";
export declare const RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = "rxdatabase_storage_local";
/**
 * Returns all non-deleted documents
 * of the storage.
 */
export declare function getAllDocuments<RxDocType>(primaryKey: keyof RxDocType, storage: RxStorage<any, any>, storageInstance: RxStorageInstance<RxDocType, any, any>): Promise<RxDocumentData<RxDocType>[]>;
export declare function getSingleDocument<RxDocType>(storageInstance: RxStorageInstance<RxDocType, any, any>, documentId: string): Promise<RxDocumentData<RxDocType> | null>;
/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
export declare function writeSingle<RxDocType>(instance: RxStorageInstance<RxDocType, any, any>, writeRow: BulkWriteRow<RxDocType>): Promise<RxDocumentData<RxDocType>>;
export declare function storageChangeEventToRxChangeEvent<DocType>(isLocal: boolean, rxStorageChangeEvent: RxStorageChangeEvent<DocType>, rxCollection?: RxCollection): RxChangeEvent<DocType>;
export declare function throwIfIsStorageWriteError<RxDocType>(collection: RxCollection<RxDocType>, documentId: string, writeData: RxDocumentWriteData<RxDocType> | RxDocType, error: RxStorageBulkWriteError<RxDocType> | undefined): void;
export declare function hashAttachmentData(attachmentBase64String: string, storageStatics: RxStorageStatics): Promise<string>;
export declare function getAttachmentSize(attachmentBase64String: string): number;
/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */
export declare function getWrappedStorageInstance<RxDocType, Internals, InstanceCreationOptions>(database: RxDatabase<{}, Internals, InstanceCreationOptions>, storageInstance: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions>, 
/**
 * The original RxJsonSchema
 * before it was mutated by hooks.
 */
rxJsonSchema: RxJsonSchema<RxDocType>): RxStorageInstance<RxDocType, Internals, InstanceCreationOptions>;
