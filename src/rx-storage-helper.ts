/**
 * Helper functions for accessing the RxStorage instances.
 */

import type { ChangeEvent } from 'event-reduce-js';
import { map } from 'rxjs/operators';
import { runPluginHooks } from './hooks';
import { overwritable } from './overwritable';
import { newRxError } from './rx-error';
import {
    fillPrimaryKey,
    getPrimaryFieldOfPrimaryKey
} from './rx-schema-helper';
import type {
    BulkWriteRow,
    EventBulk,
    RxAttachmentWriteData,
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocumentData,
    RxDocumentDataById,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorageBulkWriteError,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageStatics,
    StringKeys
} from './types';
import {
    createRevision,
    ensureNotFalsy,
    firstPropertyValueOfObject,
    flatClone,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    now,
    parseRevision,
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
    storageInstance: RxStorageInstance<RxDocType, any, any>
): Promise<RxDocumentData<RxDocType>[]> {
    const storage = storageInstance.storage;
    const getAllQueryPrepared = storage.statics.prepareQuery(
        storageInstance.schema,
        {
            selector: {},
            sort: [{ [primaryKey]: 'asc' } as any],
            skip: 0
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
    /**
     * TODO
     * this data design is shit,
     * instead of having the documentData depending on the operation,
     * we should always have a current doc data, that might or might not
     * have set _deleted to true.
     */
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
                error,
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
    storageInstance: RxStorageInstance<any, any, any>,
    primaryPath: StringKeys<RxDocType>,
    /**
     * Current state of the documents
     * inside of the storage. Used to determine
     * which writes cause conflicts.
     */
    docsInDb: Map<RxDocumentData<RxDocType>[StringKeys<RxDocType>] | string, RxDocumentData<RxDocType>>,
    /**
     * The write rows that are passed to
     * RxStorageInstance().bulkWrite().
     */
    bulkWriteRows: BulkWriteRow<RxDocType>[]
): {
    bulkInsertDocs: BulkWriteRow<RxDocType>[];
    bulkUpdateDocs: BulkWriteRow<RxDocType>[];
    /**
     * Ids of all documents that are changed
     * and so their change must be written into the
     * sequences table so that they can be fetched via
     * RxStorageInstance().getChangedDocumentsSince().
     */
    changedDocumentIds: RxDocumentData<RxDocType>[StringKeys<RxDocType>][];

    /**
     * TODO directly return a docId->error object
     * like in the return value of bulkWrite().
     * This will improve performance because we do not have to iterate
     * over the error array again.
     */
    errors: RxStorageBulkWriteError<RxDocType>[];
    eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>;
    attachmentsAdd: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
    }[];
    attachmentsRemove: {
        documentId: string;
        attachmentId: string;
    }[];
    attachmentsUpdate: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
    }[];
} {
    const hasAttachments = !!storageInstance.schema.attachments;
    const bulkInsertDocs: BulkWriteRow<RxDocType>[] = [];
    const bulkUpdateDocs: BulkWriteRow<RxDocType>[] = [];
    const errors: RxStorageBulkWriteError<RxDocType>[] = [];
    const changedDocumentIds: RxDocumentData<RxDocType>[StringKeys<RxDocType>][] = [];
    const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
        id: randomCouchString(10),
        events: []
    };

    const attachmentsAdd: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
    }[] = [];
    const attachmentsRemove: {
        documentId: string;
        attachmentId: string;
    }[] = [];
    const attachmentsUpdate: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
    }[] = [];


    const startTime = now();
    bulkWriteRows.forEach(writeRow => {
        const id = writeRow.document[primaryPath];
        const documentInDb = docsInDb.get(id);
        let attachmentError: RxStorageBulkWriteError<RxDocType> | undefined;

        if (!documentInDb) {
            /**
             * It is possible to insert already deleted documents,
             * this can happen on replication.
             */
            const insertedIsDeleted = writeRow.document._deleted ? true : false;
            Object.entries(writeRow.document._attachments).forEach(([attachmentId, attachmentData]) => {
                if (
                    !(attachmentData as RxAttachmentWriteData).data
                ) {
                    attachmentError = {
                        documentId: id as any,
                        isError: true,
                        status: 510,
                        writeRow
                    };
                    errors.push(attachmentError);
                } else {
                    attachmentsAdd.push({
                        documentId: id as any,
                        attachmentId,
                        attachmentData: attachmentData as any
                    });
                }
            });
            if (!attachmentError) {
                if (hasAttachments) {
                    bulkInsertDocs.push(stripAttachmentsDataFromRow(writeRow));
                } else {
                    bulkInsertDocs.push(writeRow);
                }
            }

            if (!insertedIsDeleted) {
                changedDocumentIds.push(id);
                eventBulk.events.push({
                    eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath as any, writeRow),
                    documentId: id as any,
                    change: {
                        doc: hasAttachments ? stripAttachmentsDataFromDocument(writeRow.document) : writeRow.document,
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

            // handle attachments data
            if (writeRow.document._deleted) {
                /**
                 * Deleted documents must have cleared all their attachments.
                 */
                if (writeRow.previous) {
                    Object
                        .keys(writeRow.previous._attachments)
                        .forEach(attachmentId => {
                            attachmentsRemove.push({
                                documentId: id as any,
                                attachmentId
                            });
                        });
                }
            } else {
                // first check for errors
                Object
                    .entries(writeRow.document._attachments)
                    .find(([attachmentId, attachmentData]) => {
                        const previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;
                        if (
                            !previousAttachmentData &&
                            !(attachmentData as RxAttachmentWriteData).data
                        ) {
                            attachmentError = {
                                documentId: id as any,
                                documentInDb: documentInDb,
                                isError: true,
                                status: 510,
                                writeRow
                            };
                        }
                        return true;
                    });
                if (!attachmentError) {
                    Object
                        .entries(writeRow.document._attachments)
                        .forEach(([attachmentId, attachmentData]) => {
                            const previousAttachmentData = writeRow.previous ? writeRow.previous._attachments[attachmentId] : undefined;
                            if (!previousAttachmentData) {
                                attachmentsAdd.push({
                                    documentId: id as any,
                                    attachmentId,
                                    attachmentData: attachmentData as any
                                });
                            } else {
                                attachmentsUpdate.push({
                                    documentId: id as any,
                                    attachmentId,
                                    attachmentData: attachmentData as any
                                });
                            }
                        });
                }
            }
            if (attachmentError) {
                errors.push(attachmentError);
            } else {
                if (hasAttachments) {
                    bulkUpdateDocs.push(stripAttachmentsDataFromRow(writeRow));
                } else {
                    bulkUpdateDocs.push(writeRow);
                }
            }

            let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
            const writeDoc = writeRow.document;
            if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
                change = {
                    id: id as any,
                    operation: 'INSERT',
                    previous: null,
                    doc: hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc
                };
            } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
                change = {
                    id: id as any,
                    operation: 'UPDATE',
                    previous: writeRow.previous,
                    doc: hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc
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
                    eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath as any, writeRow),
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
        eventBulk,
        attachmentsAdd,
        attachmentsRemove,
        attachmentsUpdate
    };
}

export function stripAttachmentsDataFromRow<RxDocType>(writeRow: BulkWriteRow<RxDocType>): BulkWriteRow<RxDocType> {
    return {
        previous: writeRow.previous,
        document: stripAttachmentsDataFromDocument(writeRow.document)
    };
}
export function stripAttachmentsDataFromDocument<RxDocType>(doc: RxDocumentWriteData<RxDocType>): RxDocumentData<RxDocType> {
    const useDoc: RxDocumentData<RxDocType> = flatClone(doc);
    useDoc._attachments = {};
    Object
        .entries(doc._attachments)
        .forEach(([attachmentId, attachmentData]) => {
            useDoc._attachments[attachmentId] = {
                digest: attachmentData.digest,
                length: attachmentData.length,
                type: attachmentData.type
            };
        })
    return useDoc;
}

/**
 * Flat clone the document data
 * and also the _meta field.
 * Used many times when we want to change the meta
 * during replication etc.
 */
export function flatCloneDocWithMeta<RxDocType>(
    doc: RxDocumentData<RxDocType>
): RxDocumentData<RxDocType> {
    const ret = flatClone(doc);
    ret._meta = flatClone(doc._meta);
    return ret;
}

/**
 * Each event is labeled with the id
 * to make it easy to filter out duplicates.
 */
export function getUniqueDeterministicEventKey(
    storageInstance: RxStorageInstance<any, any, any>,
    primaryPath: string,
    writeRow: BulkWriteRow<any>
): string {
    const docId = writeRow.document[primaryPath];
    const binaryValues: boolean[] = [
        !!writeRow.previous,
        (writeRow.previous && writeRow.previous._deleted),
        !!writeRow.document._deleted
    ];
    const binary = binaryValues.map(v => v ? '1' : '0').join('');
    const eventKey = storageInstance.databaseName + '|' + storageInstance.collectionName + '|' + docId + '|' + '|' + binary + '|' + writeRow.document._rev;
    return eventKey;
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
    rxJsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>
): RxStorageInstance<RxDocType, Internals, InstanceCreationOptions> {
    overwritable.deepFreezeWhenDevMode(rxJsonSchema);
    const primaryPath = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);

    function transformDocumentDataFromRxDBToRxStorage(
        writeRow: BulkWriteRow<RxDocType>
    ) {
        let data = flatClone(writeRow.document);
        data._meta = flatClone(data._meta);

        /**
         * Do some checks in dev-mode
         * that would be too performance expensive
         * in production.
         */
        if (overwritable.isDevMode()) {
            // ensure that the primary key has not been changed
            data = fillPrimaryKey(
                primaryPath,
                rxJsonSchema,
                data as any
            );

            /**
             * Ensure that the new revision is higher
             * then the previous one
             */
            if (writeRow.previous) {
                const prev = parseRevision(writeRow.previous._rev);
                const current = parseRevision(writeRow.document._rev);
                if (current.height <= prev.height) {
                    throw newRxError('SNH', {
                        dataBefore: writeRow.previous,
                        dataAfter: writeRow.document,
                        args: {
                            prev,
                            current
                        }
                    });
                }
            }

            /**
             * Ensure that _meta fields have been merged
             * and not replaced.
             * This is important so that when one plugin A
             * sets a _meta field and another plugin B does a write
             * to the document, it must be ensured that the
             * field of plugin A was not removed.
             */
            if (writeRow.previous) {
                Object.keys(writeRow.previous._meta)
                    .forEach(metaFieldName => {
                        if (!writeRow.document._meta.hasOwnProperty(metaFieldName)) {
                            throw newRxError('SNH', {
                                dataBefore: writeRow.previous,
                                dataAfter: writeRow.document
                            });
                        }
                    });
            }
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
         * Do not update the revision here.
         * The caller of bulkWrite() must be able to set
         * the revision and to be sure that the given revision
         * is used when storing the document.
         * The revision must be provided by the caller of bulkWrite().
         */
        if (!data._rev) {
            throw newRxError('SNH', {
                data
            });
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

    function transformErrorDataFromRxStorageToRxDB<RxDocType>(
        error: RxStorageBulkWriteError<RxDocType>
    ): RxStorageBulkWriteError<RxDocType> {
        const ret = flatClone(error);
        ret.writeRow = flatClone(ret.writeRow);

        if (ret.documentInDb) {
            ret.documentInDb = transformDocumentDataFromRxStorageToRxDB(ret.documentInDb);
        }

        ret.writeRow.document = transformDocumentDataFromRxStorageToRxDB(ret.writeRow.document);
        if (ret.writeRow.previous) {
            ret.writeRow.previous = transformDocumentDataFromRxStorageToRxDB(ret.writeRow.previous);
        }

        return ret;
    }

    const ret: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions> = {
        storage: storageInstance.storage,
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
            )
                .then(writeResult => {

                    const reInsertErrors: RxStorageBulkWriteError<RxDocType>[] = Object
                        .values(writeResult.error)
                        .filter((error) => {
                            if (
                                error.status === 409 &&
                                !error.writeRow.previous &&
                                !error.writeRow.document._deleted &&
                                ensureNotFalsy(error.documentInDb)._deleted
                            ) {
                                return true;
                            }
                            return false;
                        });

                    if (reInsertErrors.length > 0) {
                        const useWriteResult: typeof writeResult = {
                            error: flatClone(writeResult.error),
                            success: flatClone(writeResult.success)
                        };
                        const reInserts: BulkWriteRow<RxDocType>[] = reInsertErrors
                            .map((error) => {
                                delete useWriteResult.error[error.documentId];
                                return {
                                    previous: error.documentInDb,
                                    document: Object.assign(
                                        {},
                                        error.writeRow.document,
                                        {
                                            _rev: createRevision(error.writeRow.document, error.documentInDb)
                                        }
                                    )
                                };
                            });

                        return database.lockedRun(
                            () => storageInstance.bulkWrite(reInserts)
                        ).then(subResult => {
                            useWriteResult.error = Object.assign(
                                useWriteResult.error,
                                subResult.error
                            );
                            useWriteResult.success = Object.assign(
                                useWriteResult.success,
                                subResult.success
                            );
                            return useWriteResult;
                        });
                    }

                    return writeResult;
                })
                .then(writeResult => {
                    const ret: RxStorageBulkWriteResponse<RxDocType> = {
                        success: {},
                        error: {}
                    };
                    Object.entries(writeResult.success).forEach(([k, v]) => {
                        ret.success[k] = transformDocumentDataFromRxStorageToRxDB(v);
                    });
                    Object.entries(writeResult.error).forEach(([k, error]) => {
                        ret.error[k] = transformErrorDataFromRxStorageToRxDB(error);
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
                const ret: RxDocumentDataById<RxDocType> = {};
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
        getChangedDocumentsSince(limit: number, checkpoint?: any) {
            return database.lockedRun(
                () => storageInstance.getChangedDocumentsSince(limit, checkpoint)
            ).then(result => {
                return result.map(row => ({
                    checkpoint: row.checkpoint,
                    document: transformDocumentDataFromRxStorageToRxDB(row.document)
                }));
            });
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
        },
        conflictResultionTasks() {
            return storageInstance.conflictResultionTasks().pipe(
                map(task => {
                    const assumedMasterState = task.input.assumedMasterState ? transformDocumentDataFromRxStorageToRxDB(task.input.assumedMasterState) : undefined;
                    const newDocumentState = transformDocumentDataFromRxStorageToRxDB(task.input.newDocumentState);
                    const realMasterState = transformDocumentDataFromRxStorageToRxDB(task.input.realMasterState);
                    return {
                        id: task.id,
                        context: task.context,
                        input: {
                            assumedMasterState,
                            realMasterState,
                            newDocumentState
                        }
                    };
                })
            );
        },
        resolveConflictResultionTask(taskSolution) {
            const hookParams = {
                database,
                primaryPath,
                schema: rxJsonSchema,
                doc: Object.assign(
                    {},
                    taskSolution.output.documentData,
                    {
                        _meta: getDefaultRxDocumentMeta(),
                        _rev: getDefaultRevision(),
                        _attachments: {}
                    }
                )
            };
            hookParams.doc._rev = createRevision(hookParams.doc);

            runPluginHooks('preWriteToStorageInstance', hookParams);
            const postHookDocData = hookParams.doc;

            const documentData = flatClone(postHookDocData);
            delete (documentData as any)._meta;
            delete (documentData as any)._rev;
            delete (documentData as any)._attachments;

            return storageInstance.resolveConflictResultionTask({
                id: taskSolution.id,
                output: {
                    documentData
                }
            });
        }
    };
    return ret;
}
