/**
 * Helper functions for accessing the RxStorage instances.
 */

import type {
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from './rx-storage.interface';
import type {
    RxLocalDocumentData,
    WithDeleted,
    WithRevision,
    WithWriteRevision
} from './types';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';

/**
 * returns all NON-LOCAL documents
 * TODO this is pouchdb specific should not be needed
 */
export async function getAllDocuments<RxDocType>(
    storageInstance: RxStorageInstance<RxDocType, any, any>
): Promise<WithRevision<RxDocType>[]> {

    const getAllQueryPrepared = storageInstance.prepareQuery(
        {
            selector: {}
        }
    );
    const queryResult = await storageInstance.query(getAllQueryPrepared);
    const allDocs = queryResult.documents;
    return allDocs;
}

export async function getSingleDocument<RxDocType>(
    storageInstance: RxStorageInstance<RxDocType, any, any>,
    documentId: string
): Promise<WithRevision<RxDocType> | null> {
    const results = await storageInstance.findDocumentsById([documentId]);
    const doc = results.get(documentId);
    if (doc) {
        return doc;
    } else {
        return null;
    }
}


/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
export async function writeSingle<RxDocType>(
    instance: RxStorageInstance<RxDocType, any, any>,
    overwrite: boolean,
    document: WithDeleted<WithWriteRevision<RxDocType>>
): Promise<WithRevision<RxDocType>> {
    const writeResult = await instance.bulkWrite(
        overwrite,
        [document]
    );

    if (writeResult.error.size > 0) {
        const error = writeResult.error.values().next().value;
        throw error;
    } else {
        const ret = writeResult.success.values().next().value;
        return ret;
    }
}

/**
 * Writes a single local document,
 * throws RxStorageBulkWriteError on failure
 */
export async function writeSingleLocal(
    instance: RxStorageKeyObjectInstance<any, any>,
    overwrite: boolean,
    document: WithDeleted<WithWriteRevision<RxLocalDocumentData>>
): Promise<WithRevision<RxLocalDocumentData>> {
    console.log('writeSingleLocal:');
    console.dir(document);
    const writeResult = await instance.bulkWrite(
        overwrite,
        [document]
    );

    if (writeResult.error.size > 0) {
        const error = writeResult.error.values().next().value;
        throw error;
    } else {
        const ret = writeResult.success.values().next().value;
        return ret;
    }
}

export async function findLocalDocument(
    instance: RxStorageKeyObjectInstance<any, any>,
    id: string
): Promise<WithRevision<RxLocalDocumentData> | null> {
    const docList = await instance.findLocalDocumentsById([id]);
    const doc = docList.get(id);
    if (!doc) {
        return null;
    } else {
        return doc;
    }
}
