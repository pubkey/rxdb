/**
 * Helper functions for accessing the RxStorage instances.
 */

import { map } from 'rxjs/operators';
import { runPluginHooks } from './hooks';
import { overwritable } from './overwritable';
import { RxCollectionBase } from './rx-collection';
import { newRxError } from './rx-error';
import type {
    BulkWriteLocalRow,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    EventBulk,
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorage,
    RxStorageBulkWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from './types';
import { firstPropertyValueOfObject, flatClone } from './util';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';

/**
 * returns all NON-LOCAL documents
 */
export async function getAllDocuments<RxDocType>(
    primaryKey: keyof RxDocType,
    storage: RxStorage<any, any>,
    storageInstance: RxStorageInstance<RxDocType, any, any>
): Promise<RxDocumentData<RxDocType>[]> {
    const getAllQueryPrepared = storage.statics.prepareQuery(
        storageInstance.schema,
        {
            selector: {},
            sort: [{ [primaryKey]: 'asc' } as any]
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
    data: any,
    updateLwt: boolean
) {
    data = flatClone(data);
    data._meta = flatClone(data._meta);

    // ensure primary key has not been changed
    if (overwritable.isDevMode()) {
        col.schema.fillPrimaryKey(data);
    }

    data = (col._crypter as any).encrypt(data);

    if (updateLwt) {
        data._meta.lwt = new Date().getTime();
    }

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

export function throwIfIsStorageWriteError<RxDocType>(
    collection: RxCollection<RxDocType>,
    documentId: string,
    writeData: RxDocumentWriteData<RxDocType> | RxDocType,
    error: RxStorageBulkWriteError<RxDocType> | undefined
) {
    if (error) {
        if (error.status === 409) {
            throw newRxError('COL19', {
                collection: collection.name,
                id: documentId,
                pouchDbError: error,
                data: writeData
            });
        } else {
            throw error;
        }
    }
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
            const toStorageDocuments = documents.map(doc => transformDocumentDataFromRxDBToRxStorage(collection, doc, true))
            return database.lockedRun(
                () => storageInstance.bulkAddRevisions(
                    toStorageDocuments
                )
            );
        },
        bulkWrite(rows: BulkWriteRow<RxDocumentType>[]) {
            const toStorageWriteRows: BulkWriteRow<RxDocumentType>[] = rows.map(row => {
                return {
                    document: transformDocumentDataFromRxDBToRxStorage(collection, row.document, true),
                    previous: row.previous ? transformDocumentDataFromRxDBToRxStorage(collection, row.previous, false) : undefined,
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
                    ret.error[k] = v;
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



export function transformLocalDocumentDataFromRxDBToRxStorage<D>(
    parent: RxCollection | RxDatabase,
    data: RxLocalDocumentData<D>,
    updateLwt: boolean
): RxLocalDocumentData<D> {
    data = flatClone(data);
    data._meta = flatClone(data._meta);

    if (updateLwt) {
        data._meta.lwt = new Date().getTime();
    }

    return data;
}

export function transformLocalDocumentDataFromRxStorageToRxDB<D>(
    parent: RxCollection | RxDatabase,
    data: RxLocalDocumentData<D>
): RxLocalDocumentData<D> {
    return data;
}


/**
 * Does the same as getWrappedStorageInstance()
 * but for a key->object store.
 */
export function getWrappedKeyObjectInstance<Internals, InstanceCreationOptions>(
    parent: RxCollection | RxDatabase,
    keyObjectInstance: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>
): RxStorageKeyObjectInstance<Internals, InstanceCreationOptions> {
    const database: RxDatabase = parent.database ? parent.database as any : parent as any;
    const ret: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions> = {
        databaseName: database.name,
        internals: keyObjectInstance.internals,
        options: keyObjectInstance.options,
        bulkWrite<D = any>(rows: BulkWriteLocalRow<D>[]): Promise<RxLocalStorageBulkWriteResponse<D>> {
            const toStorageWriteRows: BulkWriteLocalRow<D>[] = rows.map(row => {
                return {
                    document: transformLocalDocumentDataFromRxDBToRxStorage(parent, row.document, true),
                    previous: row.previous ? transformLocalDocumentDataFromRxDBToRxStorage(parent, row.previous, false) : undefined,
                }
            });

            return database.lockedRun(
                () => keyObjectInstance.bulkWrite(
                    toStorageWriteRows
                )
            ).then(writeResult => {
                const ret: RxLocalStorageBulkWriteResponse<D> = {
                    success: {},
                    error: {}
                };
                Object.entries(writeResult.error).forEach(([k, v]) => {
                    ret.error[k] = v;
                });
                Object.entries(writeResult.success).forEach(([k, v]) => {
                    ret.success[k] = transformLocalDocumentDataFromRxStorageToRxDB(parent, v);
                });
                return ret;
            });
        },
        findLocalDocumentsById<D = any>(
            ids: string[],
            withDeleted: boolean
        ): Promise<{
            [documentId: string]: RxLocalDocumentData<D>
        }> {
            return database.lockedRun(
                () => keyObjectInstance.findLocalDocumentsById(ids, withDeleted)
            ).then(findResult => {
                const ret: { [documentId: string]: RxLocalDocumentData<D>; } = {};
                Object.entries(findResult).forEach(([key, doc]) => {
                    ret[key] = transformLocalDocumentDataFromRxStorageToRxDB(parent, doc);
                });
                return ret;
            });
        },
        changeStream() {
            return keyObjectInstance.changeStream().pipe(
                map(eventBulk => {
                    const ret: EventBulk<RxStorageChangeEvent<RxLocalDocumentData>> = {
                        id: eventBulk.id,
                        events: eventBulk.events.map(event => {
                            const changeDoc = event.change.doc;

                            if (changeDoc && !changeDoc._meta) {
                                console.dir(changeDoc);
                                console.error('local changeSTream meta is missing');
                                // process.exit(1);
                            }

                            return {
                                eventId: event.eventId,
                                documentId: event.documentId,
                                endTime: event.endTime,
                                startTime: event.startTime,
                                change: {
                                    id: event.change.id,
                                    operation: event.change.operation,
                                    doc: event.change.doc ? transformLocalDocumentDataFromRxStorageToRxDB(parent, event.change.doc) as any : undefined,
                                    previous: event.change.previous ? transformLocalDocumentDataFromRxStorageToRxDB(parent, event.change.previous as any) : undefined
                                }
                            }

                        })
                    };
                    return ret;
                })
            )
        },
        remove() {
            return database.lockedRun(
                () => keyObjectInstance.remove()
            );
        },
        close() {
            return database.lockedRun(
                () => keyObjectInstance.close()
            );
        }
    };
    return ret;
}
