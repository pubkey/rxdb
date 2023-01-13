import type {
    HashFunction,
    InternalStoreDocType,
    RxDatabase,
    RxDocumentData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from './types';
import {
    createRevision,
    flatClone,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    now
} from './plugins/utils';
import {
    fillObjectWithDefaults,
    fillPrimaryKey
} from './rx-schema-helper';
import type { RxSchema } from './rx-schema';
import { runAsyncPluginHooks } from './hooks';
import { getAllCollectionDocuments } from './rx-database-internal-store';
import { flatCloneDocWithMeta } from './rx-storage-helper';

/**
 * fills in the default data.
 * This also clones the data.
 */
export function fillObjectDataBeforeInsert<RxDocType>(
    schema: RxSchema<RxDocType>,
    data: Partial<RxDocumentData<RxDocType>> | any
): RxDocumentData<RxDocType> {
    data = flatClone(data);
    data = fillObjectWithDefaults(schema, data);
    data = fillPrimaryKey(
        schema.primaryPath,
        schema.jsonSchema,
        data
    );
    data._meta = getDefaultRxDocumentMeta();
    if (!data.hasOwnProperty('_deleted')) {
        data._deleted = false;
    }
    if (!data.hasOwnProperty('_attachments')) {
        data._attachments = {};
    }
    if (!data.hasOwnProperty('_rev')) {
        data._rev = getDefaultRevision();
    }
    return data;
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

/**
 * Removes the main storage of the collection
 * and all connected storages like the ones from the replication meta etc.
 */
export async function removeCollectionStorages(
    storage: RxStorage<any, any>,
    databaseInternalStorage: RxStorageInstance<InternalStoreDocType<any>, any, any>,
    databaseInstanceToken: string,
    databaseName: string,
    collectionName: string,
    /**
     * If no hash function is provided,
     * we assume that the whole internal store is removed anyway
     * so we do not have to delete the meta documents.
     */
    hashFunction?: HashFunction,
) {
    const allCollectionMetaDocs = await getAllCollectionDocuments(
        storage.statics,
        databaseInternalStorage
    );
    const relevantCollectionMetaDocs = allCollectionMetaDocs
        .filter(metaDoc => metaDoc.data.name === collectionName);

    let removeStorages: {
        collectionName: string;
        schema: RxJsonSchema<any>;
        isCollection: boolean;
    }[] = [];
    relevantCollectionMetaDocs.forEach(metaDoc => {
        removeStorages.push({
            collectionName: metaDoc.data.name,
            schema: metaDoc.data.schema,
            isCollection: true
        });
        metaDoc.data.connectedStorages.forEach(row => removeStorages.push({
            collectionName: row.collectionName,
            isCollection: false,
            schema: row.schema
        }));
    });

    // ensure uniqueness
    const alreadyAdded = new Set<string>();
    removeStorages = removeStorages.filter(row => {
        const key = row.collectionName + '||' + row.schema.version;
        if (alreadyAdded.has(key)) {
            return false;
        } else {
            alreadyAdded.add(key);
            return true;
        }
    });

    // remove all the storages
    await Promise.all(
        removeStorages
            .map(async (row) => {
                const storageInstance = await storage.createStorageInstance<any>({
                    collectionName: row.collectionName,
                    databaseInstanceToken,
                    databaseName,
                    multiInstance: false,
                    options: {},
                    schema: row.schema
                });
                await storageInstance.remove();
                if (row.isCollection) {
                    await runAsyncPluginHooks('postRemoveRxCollection', {
                        storage,
                        databaseName: databaseName,
                        collectionName
                    });
                }
            })
    );

    // remove the meta documents
    if (hashFunction) {
        const writeRows = relevantCollectionMetaDocs.map(doc => {
            const writeDoc = flatCloneDocWithMeta(doc);
            writeDoc._deleted = true;
            writeDoc._meta.lwt = now();
            writeDoc._rev = createRevision(
                databaseInstanceToken,
                doc
            );
            return {
                previous: doc,
                document: writeDoc
            };
        });
        await databaseInternalStorage.bulkWrite(
            writeRows,
            'rx-database-remove-collection-all'
        );
    }
}
