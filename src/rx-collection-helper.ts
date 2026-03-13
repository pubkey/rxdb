import type {
    HashFunction,
    InternalStoreDocType,
    RxAttachmentWriteData,
    RxCollection,
    RxDatabase,
    RxDocumentData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from './types/index.d.ts';
import {
    createRevision,
    flatClone,
    now
} from './plugins/utils/index.ts';
import {
    fillObjectWithDefaults,
    fillPrimaryKey
} from './rx-schema-helper.ts';
import type { RxSchema } from './rx-schema.ts';
import { runAsyncPluginHooks } from './hooks.ts';
import { getAllCollectionDocuments } from './rx-database-internal-store.ts';
import { flatCloneDocWithMeta } from './rx-storage-helper.ts';
import { overwritable } from './overwritable.ts';
import type { RxCollectionBase } from './rx-collection.ts';
import { newRxError } from './rx-error.ts';

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
    if (typeof schema.jsonSchema.primaryKey !== 'string') {
        data = fillPrimaryKey(
            schema.primaryPath,
            schema.jsonSchema,
            data
        );
    }
    /**
     * _meta and _rev are not set here because
     * they are always overwritten by the wrapped storage instance
     * in getWrappedStorageInstance() before the actual write.
     * Skipping them here avoids unnecessary object allocations on the hot path.
     *
     * _deleted and _attachments still need to be initialized here because
     * the wrapped storage does NOT set them, and they are required
     * for the document to be valid before the storage write
     * (e.g. _attachments is checked during attachment normalization in bulkInsert).
     */
    if (!('_deleted' in data)) {
        data._deleted = false;
    }
    if (!('_attachments' in data)) {
        data._attachments = {};
    }
    return data;
}

/**
 * Normalizes inline attachment inputs on a document's _attachments.
 * Accepts an array of { id, type, data } objects (aligned with putAttachment API)
 * and converts to the internal map format { [id]: { type, data, digest, length } }.
 * For each entry where data is a Blob and digest is missing,
 * computes digest via hashFunction and sets length from Blob.size.
 * Already-complete RxAttachmentWriteData entries are left untouched.
 */
export async function normalizeInlineAttachments(
    hashFunction: HashFunction,
    attachments: Array<{ id: string; type: string; data: Blob; }> | { [attachmentId: string]: any; }
): Promise<{ [attachmentId: string]: RxAttachmentWriteData; }> {
    // Guard against null/undefined/non-object values
    if (attachments == null || typeof attachments !== 'object') {
        throw newRxError('COL24', { data: attachments });
    }

    let entries: [string, any][];
    // Only accept array format for inline attachments.
    // An empty object {} (set by fillObjectDataBeforeInsert) is also valid.
    if (Array.isArray(attachments)) {
        const attachmentMap: { [attachmentId: string]: any; } = {};
        for (const att of attachments) {
            if (
                !att ||
                typeof att.id !== 'string' || att.id.length === 0 ||
                typeof att.type !== 'string' || att.type.length === 0 ||
                !(att.data instanceof Blob)
            ) {
                throw newRxError('AT2', { obj: att });
            }
            if (Object.prototype.hasOwnProperty.call(attachmentMap, att.id)) {
                throw newRxError('AT3', { obj: att });
            }
            attachmentMap[att.id] = {
                type: att.type,
                data: att.data
            };
        }
        entries = Object.entries(attachmentMap);
        await Promise.all(
            entries.map(async ([, att]) => {
                if (att.data instanceof Blob && !att.digest) {
                    att.digest = await hashFunction(att.data);
                    att.length = att.data.size;
                }
            })
        );
        return attachmentMap;
    }

    // Empty object from fillObjectDataBeforeInsert — pass through
    if (typeof attachments === 'object' && Object.keys(attachments).length === 0) {
        return attachments;
    }

    // Already-normalized map (from internal paths like bulkUpsert's 409 handler)
    // where entries already have digest/length — pass through
    entries = Object.entries(attachments);
    const allNormalized = entries.every(([, att]) => att.digest);
    if (allNormalized) {
        return attachments;
    }

    throw newRxError('COL24', { data: attachments });
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
    multiInstance: boolean,
    password?: string,
    /**
     * If no hash function is provided,
     * we assume that the whole internal store is removed anyway
     * so we do not have to delete the meta documents.
     */
    hashFunction?: HashFunction,
) {
    const allCollectionMetaDocs = await getAllCollectionDocuments(
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
                    /**
                     * multiInstance must be set to true if multiInstance
                     * was true on the database
                     * so that the storageInstance can inform other
                     * instances about being removed.
                     */
                    multiInstance,
                    options: {},
                    schema: row.schema,
                    password,
                    devMode: overwritable.isDevMode()
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


export function ensureRxCollectionIsNotClosed(
    collection: RxCollection | RxCollectionBase<any, any, any, any, any>
) {
    if (collection.closed) {
        throw newRxError(
            'COL21',
            {
                collection: collection.name,
                version: collection.schema.version
            }
        );
    }
}
