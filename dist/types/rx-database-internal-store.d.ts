/**
 * In this file we handle all accesses to the internal store of the database
 * This store is used to save hashes and checksums and metadata
 * ATM this only works with PouchDB but in the future
 * it should work by using the storage.interface
 */
import type { PouchDBInstance, RxDocumentTypeWithRev } from './types';
declare type RxStorageInstance = PouchDBInstance;
export declare const INTERNAL_STORAGE_NAME = "_rxdb_internal";
/**
 * returns to local document with the given id
 * or null if not exists
 */
export declare function getLocalDocument(storageInstance: RxStorageInstance, id: string): Promise<any | null>;
export declare function setLocalDocument(storageInstance: RxStorageInstance, id: string, value: any): Promise<void>;
export declare function putDocument<DocData>(storageInstance: RxStorageInstance, doc: DocData | RxDocumentTypeWithRev<DocData>): Promise<RxDocumentTypeWithRev<DocData>>;
/**
 * returns all NON-LOCAL documents
 */
export declare function getAllDocuments(storageInstance: RxStorageInstance): Promise<{
    id: string;
    key: string;
    value: any;
    doc: any;
}[]>;
/**
 * deletes the storage instance and all of it's data
 */
export declare function deleteStorageInstance(storageInstance: RxStorageInstance): Promise<void>;
export {};
