/**
 * Helper functions for accessing the RxStorage instances.
 */

import { runPluginHooks } from './hooks';
import { overwritable } from './overwritable';
import { newRxError } from './rx-error';
import type {
    BulkWriteLocalRow,
    BulkWriteRow,
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocumentData,
    RxLocalDocumentData,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from './types';

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
    const results = await storageInstance.findDocumentsById([documentId], false);
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
    writeRow: BulkWriteRow<RxDocType>
): Promise<RxDocumentData<RxDocType>> {
    const writeResult = await instance.bulkWrite(
        [writeRow]
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
export async function writeSingleLocal<DocumentData>(
    instance: RxStorageKeyObjectInstance<any, any>,
    writeRow: BulkWriteLocalRow<DocumentData>
): Promise<RxDocumentData<RxLocalDocumentData>> {
    const writeResult = await instance.bulkWrite(
        [writeRow]
    );

    if (writeResult.error.size > 0) {
        const error = writeResult.error.values().next().value;
        throw error;
    } else {
        const ret = writeResult.success.values().next().value;
        return ret;
    }
}

export async function findLocalDocument<DocType>(
    instance: RxStorageKeyObjectInstance<any, any>,
    id: string
): Promise<RxDocumentData<RxLocalDocumentData<DocType>> | null> {
    const docList = await instance.findLocalDocumentsById([id]);
    const doc = docList.get(id);
    if (!doc) {
        return null;
    } else {
        return doc;
    }
}

export function storageChangeEventToRxChangeEvent<DocType>(
    isLocal: boolean,
    rxStorageChangeEvent: RxStorageChangeEvent<DocType>,
    rxDatabase: RxDatabase,
    rxCollection?: RxCollection,
): RxChangeEvent<DocType> {

    let documentData;
    if (rxStorageChangeEvent.change.operation !== 'DELETE') {
        if (!rxCollection) {
            documentData = rxStorageChangeEvent.change.doc;
        } else {

            const hookParams = {
                collection: rxCollection,
                doc: rxStorageChangeEvent.change.doc as any
            };
            runPluginHooks('postReadFromInstance', hookParams);
            documentData = hookParams.doc;
            documentData = rxCollection._crypter.decrypt(documentData);
        }
    }
    let previousDocumentData;
    if (rxStorageChangeEvent.change.operation !== 'INSERT') {
        if (!rxCollection) {
            previousDocumentData = rxStorageChangeEvent.change.previous;
        } else {

            const hookParams = {
                collection: rxCollection,
                doc: rxStorageChangeEvent.change.previous as any
            };
            runPluginHooks('postReadFromInstance', hookParams);
            previousDocumentData = hookParams.doc;
            previousDocumentData = rxCollection._crypter.decrypt(previousDocumentData);
        }
    }


    const ret: RxChangeEvent<DocType> = {
        eventId: rxStorageChangeEvent.eventId,
        documentId: rxStorageChangeEvent.documentId,
        databaseToken: rxDatabase.token,
        collectionName: rxCollection ? rxCollection.name : undefined,
        startTime: rxStorageChangeEvent.startTime,
        endTime: rxStorageChangeEvent.endTime,
        isLocal,

        operation: rxStorageChangeEvent.change.operation,
        documentData: overwritable.deepFreezeWhenDevMode(documentData),
        previousDocumentData: overwritable.deepFreezeWhenDevMode(previousDocumentData)
    };

    return ret;
}
