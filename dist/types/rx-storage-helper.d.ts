/**
 * Helper functions for accessing the RxStorage instances.
 */
import { RxCollectionBase } from './rx-collection';
import type { BulkWriteLocalRow, BulkWriteRow, RxChangeEvent, RxCollection, RxDatabase, RxDocumentData, RxDocumentWriteData, RxLocalDocumentData, RxStorage, RxStorageBulkWriteError, RxStorageChangeEvent, RxStorageInstance, RxStorageKeyObjectInstance } from './types';
export declare const INTERNAL_STORAGE_NAME = "_rxdb_internal";
/**
 * returns all NON-LOCAL documents
 */
export declare function getAllDocuments<RxDocType>(primaryKey: keyof RxDocType, storage: RxStorage<any, any>, storageInstance: RxStorageInstance<RxDocType, any, any>): Promise<RxDocumentData<RxDocType>[]>;
export declare function getSingleDocument<RxDocType>(storageInstance: RxStorageInstance<RxDocType, any, any>, documentId: string): Promise<RxDocumentData<RxDocType> | null>;
/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
export declare function writeSingle<RxDocType>(instance: RxStorageInstance<RxDocType, any, any>, writeRow: BulkWriteRow<RxDocType>): Promise<RxDocumentData<RxDocType>>;
/**
 * Writes a single local document,
 * throws RxStorageBulkWriteError on failure
 */
export declare function writeSingleLocal<DocumentData>(instance: RxStorageKeyObjectInstance<any, any>, writeRow: BulkWriteLocalRow<DocumentData>): Promise<RxLocalDocumentData<RxLocalDocumentData>>;
export declare function findLocalDocument<DocType>(instance: RxStorageKeyObjectInstance<any, any>, id: string, withDeleted: boolean): Promise<RxDocumentData<RxLocalDocumentData<DocType>> | null>;
export declare function storageChangeEventToRxChangeEvent<DocType>(isLocal: boolean, rxStorageChangeEvent: RxStorageChangeEvent<DocType>, rxCollection?: RxCollection): RxChangeEvent<DocType>;
export declare function transformDocumentDataFromRxDBToRxStorage(col: RxCollection | RxCollectionBase<any, any, any>, data: any, updateLwt: boolean): any;
export declare function transformDocumentDataFromRxStorageToRxDB(col: RxCollection | RxCollectionBase<any, any, any>, data: any): any;
export declare function throwIfIsStorageWriteError<RxDocType>(collection: RxCollection<RxDocType>, documentId: string, writeData: RxDocumentWriteData<RxDocType> | RxDocType, error: RxStorageBulkWriteError<RxDocType> | undefined): void;
/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */
export declare function getWrappedStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>(collection: RxCollection<RxDocumentType, {}, {}, InstanceCreationOptions>, storageInstance: RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>): RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>;
export declare function transformLocalDocumentDataFromRxDBToRxStorage<D>(parent: RxCollection | RxDatabase, data: RxLocalDocumentData<D>, updateLwt: boolean): RxLocalDocumentData<D>;
export declare function transformLocalDocumentDataFromRxStorageToRxDB<D>(parent: RxCollection | RxDatabase, data: RxLocalDocumentData<D>): RxLocalDocumentData<D>;
/**
 * Does the same as getWrappedStorageInstance()
 * but for a key->object store.
 */
export declare function getWrappedKeyObjectInstance<Internals, InstanceCreationOptions>(parent: RxCollection | RxDatabase, keyObjectInstance: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>): RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>;
