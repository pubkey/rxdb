import type { RxCollection, RxDatabase, RxStorageInstance, RxStorageInstanceCreationParams } from './types';
import { RxCollectionBase } from './rx-collection';
/**
 * fills in the default data.
 * This also clones the data.
 */
export declare function fillObjectDataBeforeInsert(collection: RxCollection | RxCollectionBase<any>, data: any): any;
/**
 * Creates the storage instances that are used internally in the collection
 */
export declare function createRxCollectionStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>(rxDatabase: RxDatabase<{}, Internals, InstanceCreationOptions>, storageInstanceCreationParams: RxStorageInstanceCreationParams<RxDocumentType, InstanceCreationOptions>): Promise<RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>>;
