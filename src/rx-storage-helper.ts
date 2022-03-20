/**
 * Helper functions for accessing the RxStorage instances.
 */

import type { ChangeEvent } from 'event-reduce-js';
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
import {
    createRevision,
    firstPropertyValueOfObject,
    flatClone,
    now,
    randomCouchString
} from './util';

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

/**
 * Analyzes a list of BulkWriteRows and determines
 * which documents must be inserted, updated or deleted
 * and which events must be emitted and which documents cause a conflict
 * and must not be written.
 * Used as helper inside of some RxStorage implementations.
 */
export function categorizeBulkWriteRows<RxDocType>(
    primaryPath: keyof RxDocType,
    /**
     * Current state of the documents
     * inside of the storage. Used to determine
     * which writes cause conflicts.
     */
    docsInDb: Map<RxDocumentData<RxDocType>[keyof RxDocType], RxDocumentData<RxDocType>>,
    /**
     * The write rows that are passed to
     * RxStorageInstance().bulkWrite().
     */
    bulkWriteRows: BulkWriteRow<RxDocType>[],
    getEventKey: (row: BulkWriteRow<RxDocType>) => string
): {
    bulkInsertDocs: BulkWriteRow<RxDocType>[];
    bulkUpdateDocs: BulkWriteRow<RxDocType>[];
    /**
     * Ids of all documents that are changed
     * and so their change must be written into the
     * sequences table so that they can be fetched via
     * RxStorageInstance().getChangedDocuments().
     */
    changedDocumentIds: RxDocumentData<RxDocType>[keyof RxDocType][];
    errors: RxStorageBulkWriteError<RxDocType>[];
    eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>;
} {
    const bulkInsertDocs: BulkWriteRow<RxDocType>[] = [];
    const bulkUpdateDocs: BulkWriteRow<RxDocType>[] = [];
    const errors: RxStorageBulkWriteError<RxDocType>[] = [];
    const changedDocumentIds: RxDocumentData<RxDocType>[keyof RxDocType][] = [];
    const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
        id: randomCouchString(10),
        events: []
    };


    const startTime = now();
    bulkWriteRows.forEach(writeRow => {
        const id = writeRow.document[primaryPath];
        const documentInDb = docsInDb.get(id);

        if (!documentInDb) {
            /**
             * It is possible to insert already deleted documents,
             * this can happen on replication.
             */
            const insertedIsDeleted = writeRow.document._deleted ? true : false;
            bulkInsertDocs.push(writeRow);
            if (!insertedIsDeleted) {
                changedDocumentIds.push(id);
                eventBulk.events.push({
                    eventId: getEventKey(writeRow),
                    documentId: id as any,
                    change: {
                        doc: writeRow.document,
                        id: id as any,
                        operation: 'INSERT',
                        previous: null
                    },
                    startTime,
                    endTime: now()
                });
            }
        } else {
            // update existing document
            const revInDb: string = documentInDb._rev;

            // inserting a deleted document is possible
            // without sending the previous data.
            if (!writeRow.previous && documentInDb._deleted) {
                writeRow.previous = documentInDb;
            }

            /**
             * Check for conflict
             */
            if (
                (
                    !writeRow.previous &&
                    !documentInDb._deleted
                ) ||
                (
                    !!writeRow.previous &&
                    revInDb !== writeRow.previous._rev
                )
            ) {
                // is conflict error
                const err: RxStorageBulkWriteError<RxDocType> = {
                    isError: true,
                    status: 409,
                    documentId: id as any,
                    writeRow: writeRow,
                    documentInDb
                };
                errors.push(err);
                return;
            }

            bulkUpdateDocs.push(writeRow);
            let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
            const writeDoc = writeRow.document;
            if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
                change = {
                    id: id as any,
                    operation: 'INSERT',
                    previous: null,
                    doc: writeDoc
                };
            } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
                change = {
                    id: id as any,
                    operation: 'UPDATE',
                    previous: writeRow.previous,
                    doc: writeDoc
                };
            } else if (writeRow.previous && !writeRow.previous._deleted && writeDoc._deleted) {
                change = {
                    id: id as any,
                    operation: 'DELETE',
                    previous: writeRow.previous,
                    doc: null
                };
            }
            if (!change) {
                if (
                    writeRow.previous && writeRow.previous._deleted &&
                    writeRow.document._deleted
                ) {
                    // deleted doc got overwritten with other deleted doc -> do not send an event
                } else {
                    throw newRxError('SNH', { args: { writeRow } });
                }
            } else {
                changedDocumentIds.push(id);
                eventBulk.events.push({
                    eventId: getEventKey(writeRow),
                    documentId: id as any,
                    change,
                    startTime,
                    endTime: now()
                });
            }
        }
    });


    return {
        bulkInsertDocs,
        bulkUpdateDocs,
        errors,
        changedDocumentIds,
        eventBulk
    };
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

        data._meta.lwt = now();
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
                    toStorageWriteRows
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
        cleanup(minDeletedTime: number) {
            return database.lockedRun(
                () => storageInstance.cleanup(minDeletedTime)
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
