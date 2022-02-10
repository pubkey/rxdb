import type {
    BulkWriteRow,
    RxCollection,
    RxDatabase,
    RxDocumentData,
    RxStorageBulkWriteError,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageKeyObjectInstance
} from './types';
import {
    newRxError
} from './rx-error';
import { getSingleDocument, writeSingle } from './rx-storage-helper';
import { RxCollectionBase } from './rx-collection';

/**
 * Every write access on the storage engine,
 * goes throught this method
 * so we can run hooks and resolve stuff etc.
 */
export async function writeToStorageInstance<RxDocumentType>(
    collection: RxCollection<RxDocumentType, any> | RxCollectionBase<any, RxDocumentType, any>,
    writeRow: BulkWriteRow<RxDocumentType>,
    overwrite: boolean = false
): Promise<
    RxDocumentData<RxDocumentType>
> {
    while (true) {
        try {
            const writeResult = await writeSingle(
                collection.storageInstance,
                writeRow
            );
            // on success, just return the result
            return writeResult;
        } catch (err: any) {
            const useErr: RxStorageBulkWriteError<RxDocumentType> = err as any;
            const primary = useErr.documentId;
            if (overwrite && useErr.status === 409) {
                // we have a conflict but must overwrite
                // so get the new revision
                const singleRes = await getSingleDocument(collection.storageInstance, primary);
                if (!singleRes) {
                    throw newRxError('SNH', { args: { writeRow } });
                }
                writeRow.previous = singleRes;
                // now we can retry
            } else if (useErr.status === 409) {
                throw newRxError('COL19', {
                    collection: collection.name,
                    id: primary,
                    pouchDbError: useErr,
                    data: writeRow
                });
            } else {
                throw useErr;
            }
        }
    }
}

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
