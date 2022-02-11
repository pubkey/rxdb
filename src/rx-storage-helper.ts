/**
 * Helper functions for accessing the RxStorage instances.
 */

import { map } from 'rxjs/operators';
import { RxCollectionBase } from './core';
import { runPluginHooks } from './hooks';
import { overwritable } from './overwritable';
import type {
    BulkWriteLocalRow,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    EventBulk,
    RxChangeEvent,
    RxCollection,
    RxDocumentData,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorage,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from './types';
import { firstPropertyValueOfObject } from './util';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';

/**
 * returns all NON-LOCAL documents
 * TODO this is pouchdb specific should not be needed
 */
export async function getAllDocuments<RxDocType>(
    storage: RxStorage<any, any>,
    storageInstance: RxStorageInstance<RxDocType, any, any>
): Promise<RxDocumentData<RxDocType>[]> {

    const getAllQueryPrepared = storage.statics.prepareQuery(
        storageInstance.schema,
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
    const doc = results[documentId];
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
    writeRow: BulkWriteRow<RxDocType>
): Promise<RxDocumentData<RxDocType>> {
    const writeResult = await instance.bulkWrite(
        [writeRow]
    );

    if (Object.keys(writeResult.error).length > 0) {
        const error = firstPropertyValueOfObject(writeResult.error);
        throw error;
    } else {
        const ret = firstPropertyValueOfObject(writeResult.success);
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
): Promise<RxLocalDocumentData<RxLocalDocumentData>> {
    const writeResult: RxLocalStorageBulkWriteResponse<DocumentData> = await instance.bulkWrite(
        [writeRow]
    );

    if (Object.keys(writeResult.error).length > 0) {
        const error = firstPropertyValueOfObject(writeResult.error);
        throw error;
    } else {
        const ret = firstPropertyValueOfObject(writeResult.success);
        return ret;
    }
}

export async function findLocalDocument<DocType>(
    instance: RxStorageKeyObjectInstance<any, any>,
    id: string,
    withDeleted: boolean
): Promise<RxDocumentData<RxLocalDocumentData<DocType>> | null> {
    const docList = await instance.findLocalDocumentsById([id], withDeleted);
    const doc = docList[id];
    if (!doc) {
        return null;
    } else {
        return doc;
    }
}

export function storageChangeEventToRxChangeEvent<DocType>(
    isLocal: boolean,
    rxStorageChangeEvent: RxStorageChangeEvent<DocType>,
    rxCollection?: RxCollection,
): RxChangeEvent<DocType> {
    let documentData;
    if (rxStorageChangeEvent.change.operation !== 'DELETE') {
        documentData = rxStorageChangeEvent.change.doc;
    }
    let previousDocumentData;
    if (rxStorageChangeEvent.change.operation !== 'INSERT') {
        previousDocumentData = rxStorageChangeEvent.change.previous;
    }
    const ret: RxChangeEvent<DocType> = {
        eventId: rxStorageChangeEvent.eventId,
        documentId: rxStorageChangeEvent.documentId,
        collectionName: rxCollection ? rxCollection.name : undefined,
        startTime: rxStorageChangeEvent.startTime,
        endTime: rxStorageChangeEvent.endTime,
        isLocal,
        operation: rxStorageChangeEvent.change.operation,
        documentData: overwritable.deepFreezeWhenDevMode(documentData as any),
        previousDocumentData: overwritable.deepFreezeWhenDevMode(previousDocumentData as any)
    };
    return ret;
}




export function transformDocumentDataFromRxDBToRxStorage(
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

export function transformDocumentDataFromRxStorageToRxDB(
    col: RxCollection | RxCollectionBase<any, any, any>,
    data: any
) {
    const hookParams = {
        collection: col,
        doc: data
    };
    runPluginHooks('postReadFromInstance', hookParams);
    return (col._crypter as any).decrypt(hookParams.doc);
}


/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */
export function getWrappedStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>(
    collection: RxCollection<RxDocumentType, {}, {}, InstanceCreationOptions>,
    storageInstance: RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>
): RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions> {
    const database = collection.database;
    const ret: RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions> = {
        schema: storageInstance.schema,
        internals: storageInstance.internals,
        collectionName: storageInstance.collectionName,
        databaseName: storageInstance.databaseName,
        options: storageInstance.options,
        bulkAddRevisions(documents) {
            const toStorageDocuments = documents.map(doc => transformDocumentDataFromRxDBToRxStorage(collection, doc))
            return database.lockedRun(
                () => storageInstance.bulkAddRevisions(
                    toStorageDocuments
                )
            );
        },
        bulkWrite(rows: BulkWriteRow<RxDocumentType>[]) {
            const toStorageWriteRows: BulkWriteRow<RxDocumentType>[] = rows.map(row => {
                return {
                    document: transformDocumentDataFromRxDBToRxStorage(collection, row.document),
                    previous: row.previous ? transformDocumentDataFromRxDBToRxStorage(collection, row.previous) : undefined,
                }
            });

            return database.lockedRun(
                () => storageInstance.bulkWrite(
                    toStorageWriteRows
                )
            ).then(writeResult => {
                const ret: RxStorageBulkWriteResponse<RxDocumentType> = {
                    success: {},
                    error: {}
                };
                Object.entries(writeResult.error).forEach(([k, v]) => {
                    ret.error[k] = transformDocumentDataFromRxStorageToRxDB(collection, v);
                });
                Object.entries(writeResult.success).forEach(([k, v]) => {
                    ret.success[k] = transformDocumentDataFromRxStorageToRxDB(collection, v);
                });
                return ret;
            });
        },
        query(preparedQuery) {
            return database.lockedRun(
                () => storageInstance.query(preparedQuery)
            ).then(queryResult => {
                return {
                    documents: queryResult.documents.map(doc => transformDocumentDataFromRxStorageToRxDB(collection, doc))
                };
            });
        },
        findDocumentsById(ids, deleted) {
            return database.lockedRun(
                () => storageInstance.findDocumentsById(ids, deleted)
            ).then(findResult => {
                const ret: { [documentId: string]: RxDocumentData<RxDocumentType>; } = {};
                Object.entries(findResult).forEach(([key, doc]) => {
                    ret[key] = transformDocumentDataFromRxStorageToRxDB(collection, doc);
                });
                return ret;
            });
        },
        getAttachmentData(
            documentId: string,
            attachmentId: string
        ) {
            return database.lockedRun(
                () => storageInstance.getAttachmentData(documentId, attachmentId)
            );
        },
        getChangedDocuments(options: ChangeStreamOnceOptions) {
            return database.lockedRun(
                () => storageInstance.getChangedDocuments(options)
            );
        },
        remove() {
            return database.lockedRun(
                () => storageInstance.remove()
            );
        },
        close() {
            return database.lockedRun(
                () => storageInstance.close()
            );
        },
        changeStream() {
            return storageInstance.changeStream().pipe(
                map(eventBulk => {
                    const ret: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocumentType>>> = {
                        id: eventBulk.id,
                        events: eventBulk.events.map(event => {

                            const changeDoc = event.change.doc;
                            if (changeDoc) {

                            }

                            return {
                                eventId: event.eventId,
                                documentId: event.documentId,
                                endTime: event.endTime,
                                startTime: event.startTime,
                                change: {
                                    id: event.change.id,
                                    operation: event.change.operation,
                                    doc: event.change.doc ? transformDocumentDataFromRxStorageToRxDB(collection, event.change.doc) : undefined,
                                    previous: event.change.previous ? transformDocumentDataFromRxStorageToRxDB(collection, event.change.previous) : undefined
                                }
                            }

                        })
                    };
                    return ret;
                })
            )
        }
    };
    return ret;
}
