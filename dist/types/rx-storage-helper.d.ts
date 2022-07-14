/**
 * Helper functions for accessing the RxStorage instances.
 */
import type { BulkWriteRow, EventBulk, RxAttachmentWriteData, RxChangeEvent, RxCollection, RxDatabase, RxDocumentData, RxDocumentWriteData, RxJsonSchema, RxStorageBulkWriteError, RxStorageChangeEvent, RxStorageInstance, RxStorageStatics, StringKeys } from './types';
export declare const INTERNAL_STORAGE_NAME = "_rxdb_internal";
export declare const RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = "rxdatabase_storage_local";
/**
 * Returns all non-deleted documents
 * of the storage.
 */
export declare function getAllDocuments<RxDocType>(primaryKey: keyof RxDocType, storageInstance: RxStorageInstance<RxDocType, any, any>): Promise<RxDocumentData<RxDocType>[]>;
export declare function getSingleDocument<RxDocType>(storageInstance: RxStorageInstance<RxDocType, any, any>, documentId: string): Promise<RxDocumentData<RxDocType> | null>;
/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
export declare function writeSingle<RxDocType>(instance: RxStorageInstance<RxDocType, any, any>, writeRow: BulkWriteRow<RxDocType>, context: string): Promise<RxDocumentData<RxDocType>>;
export declare function storageChangeEventToRxChangeEvent<DocType>(isLocal: boolean, rxStorageChangeEvent: RxStorageChangeEvent<DocType>, rxCollection?: RxCollection): RxChangeEvent<DocType>;
export declare function throwIfIsStorageWriteError<RxDocType>(collection: RxCollection<RxDocType>, documentId: string, writeData: RxDocumentWriteData<RxDocType> | RxDocType, error: RxStorageBulkWriteError<RxDocType> | undefined): void;
export declare function getNewestOfDocumentStates<RxDocType>(primaryPath: string, docs: RxDocumentData<RxDocType>[]): RxDocumentData<RxDocType>;
/**
 * Analyzes a list of BulkWriteRows and determines
 * which documents must be inserted, updated or deleted
 * and which events must be emitted and which documents cause a conflict
 * and must not be written.
 * Used as helper inside of some RxStorage implementations.
 */
export declare function categorizeBulkWriteRows<RxDocType>(storageInstance: RxStorageInstance<any, any, any>, primaryPath: StringKeys<RxDocType>, 
/**
 * Current state of the documents
 * inside of the storage. Used to determine
 * which writes cause conflicts.
 */
docsInDb: Map<RxDocumentData<RxDocType>[StringKeys<RxDocType>] | string, RxDocumentData<RxDocType>>, 
/**
 * The write rows that are passed to
 * RxStorageInstance().bulkWrite().
 */
bulkWriteRows: BulkWriteRow<RxDocType>[], context: string): {
    bulkInsertDocs: BulkWriteRow<RxDocType>[];
    bulkUpdateDocs: BulkWriteRow<RxDocType>[];
    /**
     * Ids of all documents that are changed
     * and so their change must be written into the
     * sequences table so that they can be fetched via
     * RxStorageInstance().getChangedDocumentsSince().
     */
    changedDocumentIds: RxDocumentData<RxDocType>[StringKeys<RxDocType>][];
    /**
     * TODO directly return a docId->error object
     * like in the return value of bulkWrite().
     * This will improve performance because we do not have to iterate
     * over the error array again.
     */
    errors: RxStorageBulkWriteError<RxDocType>[];
    eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>;
    attachmentsAdd: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
    }[];
    attachmentsRemove: {
        documentId: string;
        attachmentId: string;
    }[];
    attachmentsUpdate: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
    }[];
};
export declare function stripAttachmentsDataFromRow<RxDocType>(writeRow: BulkWriteRow<RxDocType>): BulkWriteRow<RxDocType>;
export declare function stripAttachmentsDataFromDocument<RxDocType>(doc: RxDocumentWriteData<RxDocType>): RxDocumentData<RxDocType>;
/**
 * Flat clone the document data
 * and also the _meta field.
 * Used many times when we want to change the meta
 * during replication etc.
 */
export declare function flatCloneDocWithMeta<RxDocType>(doc: RxDocumentData<RxDocType>): RxDocumentData<RxDocType>;
/**
 * Each event is labeled with the id
 * to make it easy to filter out duplicates.
 */
export declare function getUniqueDeterministicEventKey(storageInstance: RxStorageInstance<any, any, any>, primaryPath: string, writeRow: BulkWriteRow<any>): string;
export declare function hashAttachmentData(attachmentBase64String: string, storageStatics: RxStorageStatics): Promise<string>;
export declare function getAttachmentSize(attachmentBase64String: string): number;
/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */
export declare function getWrappedStorageInstance<RxDocType, Internals, InstanceCreationOptions, CheckpointType>(database: RxDatabase<{}, Internals, InstanceCreationOptions>, storageInstance: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions, CheckpointType>, 
/**
 * The original RxJsonSchema
 * before it was mutated by hooks.
 */
rxJsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>): RxStorageInstance<RxDocType, Internals, InstanceCreationOptions>;
