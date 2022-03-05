/**
 * Helper functions for accessing the RxStorage instances.
 */

import { map } from 'rxjs/operators';
import { runPluginHooks } from './hooks';
import { overwritable } from './overwritable';
import { newRxError } from './rx-error';
import { fillPrimaryKey, getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import type {
    BulkWriteRow,
    ChangeStreamOnceOptions,
    EventBulk,
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorage,
    RxStorageBulkWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageStatics
} from './types';
import { clone, createRevision, firstPropertyValueOfObject, flatClone } from './util';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';
export const RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';

/**
 * Returns all non-deleted documents
 * of the storage.
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

export function hashAttachmentData(
    attachmentBase64String: string,
    storageStatics: RxStorageStatics
): Promise<string> {
    return storageStatics.hash(atob(attachmentBase64String));
}
export function getAttachmentSize(
    attachmentBase64String: string
): number {
    return atob(attachmentBase64String).length;
}

/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */

export function getWrappedStorageInstance<RxDocType, Internals, InstanceCreationOptions>(
    database: RxDatabase<{}, Internals, InstanceCreationOptions>,
    storageInstance: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions>,
    /**
     * The original RxJsonSchema
     * before it was mutated by hooks.
     */
    rxJsonSchema: RxJsonSchema<RxDocType>
): RxStorageInstance<RxDocType, Internals, InstanceCreationOptions> {
    overwritable.deepFreezeWhenDevMode(rxJsonSchema);
    const primaryPath = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);

    function transformDocumentDataFromRxDBToRxStorage(
        writeRow: BulkWriteRow<RxDocType>
    ) {
        let data = flatClone(writeRow.document);
        data._meta = flatClone(data._meta);

        // ensure primary key has not been changed
        if (overwritable.isDevMode()) {
            data = fillPrimaryKey(
                primaryPath,
                rxJsonSchema,
                data as any
            );
        }

        data._meta.lwt = new Date().getTime();
        const hookParams = {
            database,
            primaryPath,
            schema: rxJsonSchema,
            doc: data
        };


        /**
         * Run the hooks once for the previous doc,
         * once for the new write data
         */
        let previous = writeRow.previous;
        if (previous) {
            hookParams.doc = previous;
            runPluginHooks('preWriteToStorageInstance', hookParams);
            previous = hookParams.doc;
        }

        hookParams.doc = data;
        runPluginHooks('preWriteToStorageInstance', hookParams);
        data = hookParams.doc;

        /**
         * Update the revision after the hooks have run.
         * Do not update the revision if no previous is given,
         * because the migration plugin must be able to do an insert
         * with a pre-created revision.
         */
        if (
            writeRow.previous ||
            !data._rev
        ) {
            data._rev = createRevision(data, writeRow.previous);
        }

        return {
            document: data,
            previous
        };
    }

    function transformDocumentDataFromRxStorageToRxDB(
        data: any
    ): any {
        const hookParams = {
            database,
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
        bulkWrite(rows: BulkWriteRow<RxDocType>[]) {
            const toStorageWriteRows: BulkWriteRow<RxDocType>[] = rows
                .map(row => transformDocumentDataFromRxDBToRxStorage(row));
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
