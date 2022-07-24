import type {
    RxDatabase,
    RxDocumentData,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from './types';
import {
    getDefaultRevision,
    getDefaultRxDocumentMeta
} from './util';
import {
    fillPrimaryKey
} from './rx-schema-helper';
import type { RxSchema } from './rx-schema';

/**
 * fills in the default data.
 * This also clones the data.
 */
export function fillObjectDataBeforeInsert<RxDocType>(
    schema: RxSchema<RxDocType>,
    data: Partial<RxDocumentData<RxDocType>> | any
): RxDocumentData<RxDocType> {
    let useJson = schema.fillObjectWithDefaults(data);
    useJson = fillPrimaryKey(
        schema.primaryPath,
        schema.jsonSchema,
        useJson
    );
    useJson._meta = getDefaultRxDocumentMeta();
    if (!useJson.hasOwnProperty('_deleted')) {
        useJson._deleted = false;
    }
    if (!useJson.hasOwnProperty('_attachments')) {
        useJson._attachments = {};
    }
    if (!useJson.hasOwnProperty('_rev')) {
        useJson._rev = getDefaultRevision();
    }
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
