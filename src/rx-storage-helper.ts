/**
 * Helper functions for accessing the RxStorage instances.
 */

import { newRxError } from './rx-error';
import type {
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from './rx-storage.interface';
import type {
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocumentData
} from './types';
import { lastOfArray } from './util';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';

/**
 * returns all NON-LOCAL documents
 * TODO this is pouchdb specific should not be needed
 */
export async function getAllDocuments<RxDocType>(
    storageInstance: RxStorageInstance<RxDocType, any, any>
): Promise<RxDocumentData<RxDocType>[]> {

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
): Promise<RxDocumentData<RxDocType> | null> {
    const results = await storageInstance.findDocumentsById([documentId]);
    const doc = results.get(documentId);
    if (doc) {
        return doc;
    } else {
        return null;
    }
}


/**
 * get the number of all undeleted documents
 */
export async function countAllUndeleted<DocType>(
    storageInstance: RxStorageInstance<DocType, any, any>
): Promise<number> {
    const docs = await getAllDocuments(
        storageInstance
    );
    return docs.length;
}

/**
 * get a batch of documents from the storage-instance
 */
export async function getBatch<DocType>(
    storageInstance: RxStorageInstance<DocType, any, any>,
    limit: number
): Promise<any[]> {
    if (limit <= 1) {
        throw newRxError('P1', {
            limit
        });
    }

    const preparedQuery = storageInstance.prepareQuery(
        {
            selector: {},
            limit
        }
    );
    const result = await storageInstance.query(preparedQuery);
    return result.documents;
}

/**
 * Writes a single document,
 * throws RxStorageBulkWriteError on failure
 */
export async function writeSingle<RxDocType>(
    instance: RxStorageInstance<RxDocType, any, any>,
    overwrite: boolean,
    document: RxDocumentWriteData<RxDocType>
): Promise<RxDocumentData<RxDocType>> {
    console.log('writeSingle()');
    const writeResult = await instance.bulkWrite(
        overwrite,
        [document]
    );
    console.log('writeSingle() DONE');
    console.dir(writeResult);

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
    document: RxDocumentWriteData<RxLocalDocumentData>
): Promise<RxDocumentData<RxLocalDocumentData>> {
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
): Promise<RxDocumentData<RxLocalDocumentData> | null> {
    const docList = await instance.findLocalDocumentsById([id]);
    const doc = docList.get(id);
    if (!doc) {
        return null;
    } else {
        return doc;
    }
}

export async function getNewestSequence(
    storageInstance: RxStorageInstance<any, any, any>
): Promise<number> {
    const changes = await storageInstance.getChanges({
        order: 'desc',
        limit: 1,
        startSequence: 0
    });
    const last = lastOfArray(changes);
    if (last) {
        return last.sequence;
    } else {
        return 0;
    }
}
