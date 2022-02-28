import type {
    RxCollection,
    RxDatabase,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from './types';
import { RxCollectionBase } from './rx-collection';
import { getDefaultRxDocumentMeta } from './util';
import {
    fillPrimaryKey
} from './rx-schema-helper';

/**
 * fills in the default data.
 * This also clones the data.
 */
export function fillObjectDataBeforeInsert(
    collection: RxCollection | RxCollectionBase<any>,
    data: any
): any {
    let useJson = collection.schema.fillObjectWithDefaults(data);
    useJson = fillPrimaryKey(
        collection.schema.primaryPath,
        collection.schema.jsonSchema,
        useJson
    );
    useJson._meta = getDefaultRxDocumentMeta();
    return useJson;
}

/**
 * Creates the storage instances that are used internally in the collection
 */
export async function createRxCollectionStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>(
    rxDatabase: RxDatabase<{}, Internals, InstanceCreationOptions>,
    storageInstanceCreationParams: RxStorageInstanceCreationParams<RxDocumentType, InstanceCreationOptions>
): Promise<RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>> {
    storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
    const storageInstance = await rxDatabase.storage.createStorageInstance<RxDocumentType>(
        storageInstanceCreationParams
    );
    return storageInstance;
}
