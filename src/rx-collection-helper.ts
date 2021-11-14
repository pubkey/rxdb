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
    flatClone
} from './util';
import {
    newRxError
} from './rx-error';
import { runPluginHooks } from './hooks';
import { getSingleDocument, writeSingle } from './rx-storage-helper';
import { RxCollectionBase } from './rx-collection';
import { overwritable } from './overwritable';


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
    const toStorageInstance: BulkWriteRow<any> = {
        previous: writeRow.previous ? _handleToStorageInstance(collection, flatClone(writeRow.previous)) : undefined,
        document: _handleToStorageInstance(collection, flatClone(writeRow.document))
    };

    while (true) {
        try {
            const writeResult = await collection.database.lockedRun(
                () => writeSingle(
                    collection.storageInstance,
                    toStorageInstance
                )
            );
            // on success, just return the result

            const ret = _handleFromStorageInstance(collection, writeResult);
            return ret;
        } catch (err: any) {
            const useErr: RxStorageBulkWriteError<RxDocumentType> = err as any;
            const primary = useErr.documentId;
            if (overwrite && useErr.status === 409) {
                // we have a conflict but must overwrite
                // so get the new revision
                const singleRes = await collection.database.lockedRun(
                    () => getSingleDocument(collection.storageInstance, primary)
                );
                if (!singleRes) {
                    throw newRxError('SNH', { args: { writeRow } });
                }
                toStorageInstance.previous = singleRes;
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
 * wrappers to process document data beofre/after it goes to the storage instnace.
 * Used to handle keycompression, encryption etc
 */
export function _handleToStorageInstance(
    col: RxCollection | RxCollectionBase<any, any, any>,
    data: any
) {
    // ensure primary key has not been changed
    if (overwritable.isDevMode()) {
        col.schema.fillPrimaryKey(data);
    }

    data = (col._crypter as any).encrypt(data);

    const hookParams = {
        collection: col,
        doc: data
    };
    runPluginHooks('preWriteToStorageInstance', hookParams);

    return hookParams.doc;
}

export function _handleFromStorageInstance(
    col: RxCollection | RxCollectionBase<any, any, any>,
    data: any,
    noDecrypt = false
) {

    const hookParams = {
        collection: col,
        doc: data
    };
    runPluginHooks('postReadFromInstance', hookParams);

    if (noDecrypt) {
        return hookParams.doc;
    }

    return (col._crypter as any).decrypt(hookParams.doc);
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

    storageInstanceCreationParams.broadcastChannel = rxDatabase.broadcastChannel;

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
            idleQueue: rxDatabase.idleQueue,
            broadcastChannel: rxDatabase.broadcastChannel
        })
    ]);

    return {
        storageInstance,
        localDocumentsStore
    };
}
