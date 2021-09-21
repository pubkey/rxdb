import type { BulkWriteRow, RxCollection, RxDatabase, RxDocumentData, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageKeyObjectInstance } from './types';
import { RxCollectionBase } from './rx-collection';
/**
 * Every write access on the storage engine,
 * goes throught this method
 * so we can run hooks and resolve stuff etc.
 */
export declare function writeToStorageInstance<RxDocumentType>(collection: RxCollection<RxDocumentType, any> | RxCollectionBase<any, RxDocumentType, any>, writeRow: BulkWriteRow<RxDocumentType>, overwrite?: boolean): Promise<RxDocumentData<RxDocumentType>>;
/**
 * wrappers to process document data beofre/after it goes to the storage instnace.
 * Used to handle keycompression, encryption etc
 */
export declare function _handleToStorageInstance(col: RxCollection | RxCollectionBase<any, any, any>, data: any): any;
export declare function _handleFromStorageInstance(col: RxCollection | RxCollectionBase<any, any, any>, data: any, noDecrypt?: boolean): any;
/**
 * fills in the default data.
 * This also clones the data.
 */
export declare function fillObjectDataBeforeInsert(collection: RxCollection | RxCollectionBase<any>, data: any): any;
export declare function getCollectionLocalInstanceName(collectionName: string): string;
/**
 * Creates the storage instances that are used internally in the collection
 */
export declare function createRxCollectionStorageInstances<RxDocumentType, Internals, InstanceCreationOptions>(collectionName: string, rxDatabase: RxDatabase, storageInstanceCreationParams: RxStorageInstanceCreationParams<RxDocumentType, InstanceCreationOptions>, instanceCreationOptions: InstanceCreationOptions): Promise<{
    storageInstance: RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>;
    localDocumentsStore: RxStorageKeyObjectInstance<any, InstanceCreationOptions>;
}>;
