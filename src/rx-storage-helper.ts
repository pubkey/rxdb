/**
 * Helper functions for accessing the RxStorage instances.
 */

import { RxStorageInstancePouch } from './rx-storage-pouchdb';
import { RxStorageInstance, RxStorageKeyObjectInstance } from './rx-storage.interface';
import { RxLocalDocumentData, WithDeleted, WithRevision, WithWriteRevision } from './types';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';

/**
 * returns all NON-LOCAL documents
 * TODO this is pouchdb specific should not be needed
 */
export function getAllDocuments<RxDocType>(
    storageInstance: RxStorageInstancePouch<RxDocType>
): Promise<{
    id: string;
    key: string;
    value: any;
    doc: any;
}[]> {
    return storageInstance.internals.pouch.allDocs({
        include_docs: true
    }).then(result => result.rows);
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
