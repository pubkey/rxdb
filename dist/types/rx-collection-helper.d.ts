import type { RxDatabase, RxDocumentData, RxStorageInstance, RxStorageInstanceCreationParams } from './types';
import type { RxSchema } from './rx-schema';
/**
 * fills in the default data.
 * This also clones the data.
 */
export declare function fillObjectDataBeforeInsert<RxDocType>(schema: RxSchema<RxDocType>, data: Partial<RxDocumentData<RxDocType>> | any): RxDocumentData<RxDocType>;
/**
 * Creates the storage instances that are used internally in the collection
 */
export declare function createRxCollectionStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>(rxDatabase: RxDatabase<{}, Internals, InstanceCreationOptions>, storageInstanceCreationParams: RxStorageInstanceCreationParams<RxDocumentType, InstanceCreationOptions>): Promise<RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>>;
