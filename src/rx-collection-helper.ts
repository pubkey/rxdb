import type {
    RxCollection,
    RxDatabase,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageKeyObjectInstance
} from './types';
import { RxCollectionBase } from './rx-collection';

/**
 * fills in the default data.
 * This also clones the data.
 */
export function fillObjectDataBeforeInsert(
    collection: RxCollection | RxCollectionBase<any>,
    data: any
): any {
    let useJson = collection.schema.fillObjectWithDefaults(data);
    useJson = collection.schema.fillPrimaryKey(useJson);

    return useJson;
}


export function getCollectionLocalInstanceName(collectionName: string): string {
    return collectionName + '-local';
}

/**
 * Creates the storage instances that are used internally in the collection
 */
export async function createRxCollectionStorageInstances<RxDocumentType, Internals, InstanceCreationOptions>(
    collectionName: string,
    rxDatabase: RxDatabase,
    storageInstanceCreationParams: RxStorageInstanceCreationParams<RxDocumentType, InstanceCreationOptions>,
    instanceCreationOptions: InstanceCreationOptions
): Promise<{
    storageInstance: RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>,
    localDocumentsStore: RxStorageKeyObjectInstance<any, InstanceCreationOptions>
}> {
    storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
    const [
        storageInstance,
        localDocumentsStore
    ] = await Promise.all([
        rxDatabase.storage.createStorageInstance<RxDocumentType>(
            storageInstanceCreationParams
        ),
        rxDatabase.storage.createKeyObjectStorageInstance({
            databaseName: rxDatabase.name,
            /**
             * Use a different collection name for the local documents instance
             * so that the local docs can be kept while deleting the normal instance
             * after migration.
             */
            collectionName: getCollectionLocalInstanceName(collectionName),
            options: instanceCreationOptions,
            multiInstance: rxDatabase.multiInstance
        })
    ]);

    return {
        storageInstance,
        localDocumentsStore
    };
}
