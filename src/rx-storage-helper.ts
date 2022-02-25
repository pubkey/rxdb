/**
 * Helper functions for accessing the RxStorage instances.
 */

import { map } from 'rxjs/operators';
import { runPluginHooks } from './hooks';
import { overwritable } from './overwritable';
import { newRxError } from './rx-error';
import { fillPrimaryKey } from './rx-schema-helper';
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
    RxJsonSchema,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorage,
    RxStorageBulkWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from './types';
import { clone, firstPropertyValueOfObject, flatClone } from './util';

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
export function getWrappedStorageInstance<RxDocType, Internals, InstanceCreationOptions>(
    collection: RxCollection<RxDocType, {}, {}, InstanceCreationOptions>,
    storageInstance: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions>,
    /**
     * The original RxJsonSchema
     * before it was mutated by hooks.
     */
    rxJsonSchema: RxJsonSchema<RxDocType>
): RxStorageInstance<RxDocType, Internals, InstanceCreationOptions> {
    const database = collection.database;
    overwritable.deepFreezeWhenDevMode(rxJsonSchema);

    const primaryPath = collection.schema.primaryPath;

    function transformDocumentDataFromRxDBToRxStorage(
        data: RxDocumentData<RxDocType> | RxDocumentWriteData<RxDocType>,
        updateLwt: boolean
    ) {
        data = flatClone(data);
        data._meta = flatClone(data._meta);

        // ensure primary key has not been changed
        if (overwritable.isDevMode()) {
            data = fillPrimaryKey(
                primaryPath,
                rxJsonSchema,
                data as any
            );
        }

        if (updateLwt) {
            data._meta.lwt = new Date().getTime();
        }

        const hookParams = {
            database: collection.database,
            primaryPath,
            schema: rxJsonSchema,
            doc: data
        };

        runPluginHooks('preWriteToStorageInstance', hookParams);

        return hookParams.doc as any;
    }

    function transformDocumentDataFromRxStorageToRxDB(
        data: any
    ): any {
        const hookParams = {
            database: collection.database,
            primaryPath,
            schema: rxJsonSchema,
            doc: data
        };


        runPluginHooks('postReadFromInstance', hookParams);

        return hookParams.doc;
    }

    const ret: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions> = {
        schema: storageInstance.schema,
        internals: storageInstance.internals,
        collectionName: storageInstance.collectionName,
        databaseName: storageInstance.databaseName,
        options: storageInstance.options,
        bulkAddRevisions(documents) {
            const toStorageDocuments = documents.map(doc => transformDocumentDataFromRxDBToRxStorage(doc, true))
            const ret = database.lockedRun(
                () => storageInstance.bulkAddRevisions(
                    toStorageDocuments
                )
            );
            return ret;
        },
        bulkWrite(rows: BulkWriteRow<RxDocType>[]) {
            const toStorageWriteRows: BulkWriteRow<RxDocType>[] = rows.map(row => {
                return {
                    previous: row.previous ? transformDocumentDataFromRxDBToRxStorage(row.previous, false) : undefined,
                    document: transformDocumentDataFromRxDBToRxStorage(row.document, true)
                }
            });
            return database.lockedRun(
                () => storageInstance.bulkWrite(
                    clone(toStorageWriteRows)
                )
            ).then(writeResult => {
                const ret: RxStorageBulkWriteResponse<RxDocType> = {
                    success: {},
                    error: {}
                };
                Object.entries(writeResult.error).forEach(([k, v]) => {
                    ret.error[k] = v;
                });
                Object.entries(writeResult.success).forEach(([k, v]) => {
                    ret.success[k] = transformDocumentDataFromRxStorageToRxDB(v);
                });

                return ret;
            });
        },
        query(preparedQuery) {
            return database.lockedRun(
                () => storageInstance.query(preparedQuery)
            ).then(queryResult => {
                return {
                    documents: queryResult.documents.map(doc => transformDocumentDataFromRxStorageToRxDB(doc))
                };
            });
        },
        findDocumentsById(ids, deleted) {
            return database.lockedRun(
                () => storageInstance.findDocumentsById(ids, deleted)
            ).then(findResult => {
                const ret: { [documentId: string]: RxDocumentData<RxDocType>; } = {};
                Object.entries(findResult).forEach(([key, doc]) => {
                    ret[key] = transformDocumentDataFromRxStorageToRxDB(doc);
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
                    const ret: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
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
                                    doc: event.change.doc ? transformDocumentDataFromRxStorageToRxDB(event.change.doc) : undefined,
                                    previous: event.change.previous ? transformDocumentDataFromRxStorageToRxDB(event.change.previous) : undefined
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
