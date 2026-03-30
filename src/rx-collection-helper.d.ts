import type { HashFunction, InternalStoreDocType, RxAttachmentWriteData, RxCollection, RxDatabase, RxDocumentData, RxStorage, RxStorageInstance, RxStorageInstanceCreationParams } from './types/index.d.ts';
import type { RxSchema } from './rx-schema.ts';
import type { RxCollectionBase } from './rx-collection.ts';
/**
 * fills in the default data.
 * This also clones the data.
 */
export declare function fillObjectDataBeforeInsert<RxDocType>(schema: RxSchema<RxDocType>, data: Partial<RxDocumentData<RxDocType>> | any): RxDocumentData<RxDocType>;
/**
 * Normalizes inline attachment inputs on a document's _attachments.
 * Accepts an array of { id, type, data } objects (aligned with putAttachment API)
 * and converts to the internal map format { [id]: { type, data, digest, length } }.
 * For each entry where data is a Blob and digest is missing,
 * computes digest via hashFunction and sets length from Blob.size.
 * Already-complete RxAttachmentWriteData entries are left untouched.
 */
export declare function normalizeInlineAttachments(hashFunction: HashFunction, attachments: Array<{
    id: string;
    type: string;
    data: Blob;
}> | {
    [attachmentId: string]: any;
}): Promise<{
    [attachmentId: string]: RxAttachmentWriteData;
}>;
/**
 * Creates the storage instances that are used internally in the collection
 */
export declare function createRxCollectionStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>(rxDatabase: RxDatabase<{}, Internals, InstanceCreationOptions>, storageInstanceCreationParams: RxStorageInstanceCreationParams<RxDocumentType, InstanceCreationOptions>): Promise<RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>>;
/**
 * Removes the main storage of the collection
 * and all connected storages like the ones from the replication meta etc.
 */
export declare function removeCollectionStorages(storage: RxStorage<any, any>, databaseInternalStorage: RxStorageInstance<InternalStoreDocType<any>, any, any>, databaseInstanceToken: string, databaseName: string, collectionName: string, multiInstance: boolean, password?: string, 
/**
 * If no hash function is provided,
 * we assume that the whole internal store is removed anyway
 * so we do not have to delete the meta documents.
 */
hashFunction?: HashFunction): Promise<void>;
export declare function ensureRxCollectionIsNotClosed(collection: RxCollection | RxCollectionBase<any, any, any, any, any>): void;
