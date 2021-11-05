/**
 * Helper functions for accessing the RxStorage instances.
 */
import type { BulkWriteLocalRow, BulkWriteRow, RxChangeEvent, RxCollection, RxDatabase, RxDocumentData, RxLocalDocumentData, RxStorageChangeEvent, RxStorageInstance, RxStorageKeyObjectInstance } from './types';
export declare const INTERNAL_STORAGE_NAME = "_rxdb_internal";
/**
 * returns all NON-LOCAL documents
 * TODO this is pouchdb specific should not be needed
 */
export declare function getAllDocuments<RxDocType>(storageInstance: RxStorageInstance<RxDocType, any, any>): Promise<RxDocumentData<RxDocType>[]>;
export declare function getSingleDocument<RxDocType>(storageInstance: RxStorageInstance<RxDocType, any, any>, documentId: string): Promise<RxDocumentData<RxDocType> | null>;
/**
 * get the number of all undeleted documents
 */
export declare function countAllUndeleted<DocType>(storageInstance: RxStorageInstance<DocType, any, any>): Promise<number>;
/**
 * get a batch of documents from the storage-instance
 */
export declare function getBatch<DocType>(storageInstance: RxStorageInstance<DocType, any, any>, limit: number): Promise<any[]>;
/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
export declare function writeSingle<RxDocType>(instance: RxStorageInstance<RxDocType, any, any>, writeRow: BulkWriteRow<RxDocType>): Promise<RxDocumentData<RxDocType>>;
/**
 * Writes a single local document,
 * throws RxStorageBulkWriteError on failure
 */
export declare function writeSingleLocal<DocumentData>(instance: RxStorageKeyObjectInstance<any, any>, writeRow: BulkWriteLocalRow<DocumentData>): Promise<RxDocumentData<RxLocalDocumentData>>;
export declare function findLocalDocument<DocType>(instance: RxStorageKeyObjectInstance<any, any>, id: string): Promise<RxDocumentData<RxLocalDocumentData<DocType>> | null>;
export declare function storageChangeEventToRxChangeEvent<DocType>(isLocal: boolean, rxStorageChangeEvent: RxStorageChangeEvent<DocType>, rxDatabase: RxDatabase, rxCollection?: RxCollection): RxChangeEvent<DocType>;
