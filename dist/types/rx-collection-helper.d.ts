import type { RxCollection, RxDatabase, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageKeyObjectInstance } from './types';
import { RxCollectionBase } from './rx-collection';
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
