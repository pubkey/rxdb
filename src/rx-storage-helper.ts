/**
 * Helper functions for accessing the RxStorage instances.
 */

import { overwritable } from './overwritable';
import { newRxError } from './rx-error';
import {
    fillPrimaryKey,
    getPrimaryFieldOfPrimaryKey
} from './rx-schema-helper';
import type {
    BulkWriteRow,
    BulkWriteRowProcessed,
    ById,
    CategorizeBulkWriteRowsOutput,
    EventBulk,
    RxAttachmentData,
    RxAttachmentWriteData,
    RxChangeEvent,
    RxCollection,
    RxDatabase,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorageBulkWriteError,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    StringKeys
} from './types';
import {
    createRevision,
    defaultHashFunction,
    ensureNotFalsy,
    firstPropertyValueOfObject,
    flatClone,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    now,
    randomCouchString
} from './util';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';
export const RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';

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
    writeRow: BulkWriteRow<RxDocType>,
    context: string
): Promise<RxDocumentData<RxDocType>> {
    const writeResult = await instance.bulkWrite(
        [writeRow],
        context
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
 * Checkpoints must be stackable over another.
 * This is required form some RxStorage implementations
 * like the sharding plugin, where a checkpoint only represents
 * the document state from some, but not all shards.
 */
export function stackCheckpoints<CheckpointType>(
    checkpoints: CheckpointType[]
): CheckpointType {
    return Object.assign(
        {},
        ...checkpoints
    );
}

export function storageChangeEventToRxChangeEvent<DocType>(
    isLocal: boolean,
    rxStorageChangeEvent: RxStorageChangeEvent<DocType>,
    rxCollection?: RxCollection,
): RxChangeEvent<DocType> {
    const documentData = rxStorageChangeEvent.documentData;
    const previousDocumentData = rxStorageChangeEvent.previousDocumentData;
    const ret: RxChangeEvent<DocType> = {
        eventId: rxStorageChangeEvent.eventId,
        documentId: rxStorageChangeEvent.documentId,
        collectionName: rxCollection ? rxCollection.name : undefined,
        startTime: rxStorageChangeEvent.startTime,
        endTime: rxStorageChangeEvent.endTime,
        isLocal,
        operation: rxStorageChangeEvent.operation,
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
 * From a list of documents,
 * it will return the document that has the 'newest' state
 * which must be used to create the correct checkpoint
 * for the whole list.
 */
export function getNewestOfDocumentStates<RxDocType>(
    primaryPath: string,
    docs: RxDocumentData<RxDocType>[]
): RxDocumentData<RxDocType> {
    let ret: RxDocumentData<RxDocType> | null = null;
    docs.forEach(doc => {
        if (
            !ret ||
            doc._meta.lwt > ret._meta.lwt ||
            (
                doc._meta.lwt === ret._meta.lwt &&
                (doc as any)[primaryPath] > (ret as any)[primaryPath]
            )
        ) {
            ret = doc;
        }

    });
    return ensureNotFalsy(ret as any);
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
     * This can be a Map for better performance
     * but it can also be an object because some storages
     * need to work with something that is JSON-stringify-able
     * and we do not want to transform a big object into a Map
     * each time we use it.
     */
    docsInDb:
    Map<RxDocumentData<RxDocType>[StringKeys<RxDocType>] | string, RxDocumentData<RxDocType>> |
    ById<RxDocumentData<RxDocType>>,
    /**
     * The write rows that are passed to
     * RxStorageInstance().bulkWrite().
     */
    bulkWriteRows: BulkWriteRow<RxDocType>[],
    context: string
): CategorizeBulkWriteRowsOutput<RxDocType> {
    const hasAttachments = !!storageInstance.schema.attachments;
    const bulkInsertDocs: BulkWriteRowProcessed<RxDocType>[] = [];
    const bulkUpdateDocs: BulkWriteRowProcessed<RxDocType>[] = [];
    const errors: ById<RxStorageBulkWriteError<RxDocType>> = {};
    const changedDocumentIds: RxDocType[StringKeys<RxDocType>][] = [];
    const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any> = {
        id: randomCouchString(10),
        events: [],
        checkpoint: null,
        context
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

    const docsByIdIsMap = typeof docsInDb.get === 'function';

    bulkWriteRows.forEach(writeRow => {
        const id = writeRow.document[primaryPath];
        const documentInDb = docsByIdIsMap ? (docsInDb as any).get(id) : (docsInDb as any)[id];
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
                    errors[id as any] = attachmentError;
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
                    bulkInsertDocs.push(writeRow as any);
                }
            }

            if (!insertedIsDeleted) {
                changedDocumentIds.push(id);
                eventBulk.events.push({
                    eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath as any, writeRow),
                    documentId: id as any,
                    operation: 'INSERT',
                    documentData: hasAttachments ? stripAttachmentsDataFromDocument(writeRow.document) : writeRow.document as any,
                    previousDocumentData: hasAttachments && writeRow.previous ? stripAttachmentsDataFromDocument(writeRow.previous) : writeRow.previous as any,
                    startTime,
                    endTime: now()
                });
            }
        } else {
            // update existing document
            const revInDb: string = documentInDb._rev;

            /**
             * Check for conflict
             */
            if (
                (
                    !writeRow.previous
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
                errors[id as any] = err;
                return;
            }

            // handle attachments data

            const updatedRow: BulkWriteRowProcessed<RxDocType> = hasAttachments ? stripAttachmentsDataFromRow(writeRow) : writeRow as any;
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
                                const newDigest = updatedRow.document._attachments[attachmentId].digest;
                                if (
                                    (attachmentData as RxAttachmentWriteData).data &&
                                    /**
                                     * Performance shortcut,
                                     * do not update the attachment data if it did not change.
                                     */
                                    previousAttachmentData.digest !== newDigest
                                ) {
                                    attachmentsUpdate.push({
                                        documentId: id as any,
                                        attachmentId,
                                        attachmentData: attachmentData as RxAttachmentWriteData
                                    });
                                }
                            }
                        });
                }
            }
            if (attachmentError) {
                errors[id as any] = attachmentError;
            } else {
                bulkUpdateDocs.push(updatedRow);
            }

            const writeDoc = writeRow.document;

            let eventDocumentData: RxDocumentData<RxDocType> | undefined = null as any;
            let previousEventDocumentData: RxDocumentData<RxDocType> | undefined = null as any;
            let operation: 'INSERT' | 'UPDATE' | 'DELETE' = null as any;

            if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
                operation = 'INSERT';
                eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc as any;
            } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
                operation = 'UPDATE';
                eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(writeDoc) : writeDoc as any;
                previousEventDocumentData = writeRow.previous;
            } else if (writeDoc._deleted) {
                operation = 'DELETE';
                eventDocumentData = ensureNotFalsy(writeRow.document) as any;
                previousEventDocumentData = writeRow.previous;
            } else {
                throw newRxError('SNH', { args: { writeRow } });
            }

            changedDocumentIds.push(id);
            eventBulk.events.push({
                eventId: getUniqueDeterministicEventKey(storageInstance, primaryPath as any, writeRow),
                documentId: id as any,
                documentData: ensureNotFalsy(eventDocumentData),
                previousDocumentData: previousEventDocumentData,
                operation: operation,
                startTime,
                endTime: now()
            });
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

export function stripAttachmentsDataFromRow<RxDocType>(writeRow: BulkWriteRow<RxDocType>): BulkWriteRowProcessed<RxDocType> {
    return {
        previous: writeRow.previous,
        document: stripAttachmentsDataFromDocument(writeRow.document)
    };
}

export function getAttachmentSize(
    attachmentBase64String: string
): number {
    return atob(attachmentBase64String).length;
}

/**
 * Used in custom RxStorage implementations.
 */
export function attachmentWriteDataToNormalData(writeData: RxAttachmentData | RxAttachmentWriteData): RxAttachmentData {
    const data = (writeData as RxAttachmentWriteData).data;
    if (!data) {
        return writeData as any;
    }
    const ret: RxAttachmentData = {
        digest: defaultHashFunction(data),
        length: getAttachmentSize(data),
        type: writeData.type
    };
    return ret;
}

export function stripAttachmentsDataFromDocument<RxDocType>(doc: RxDocumentWriteData<RxDocType>): RxDocumentData<RxDocType> {
    const useDoc: RxDocumentData<RxDocType> = flatClone(doc) as any;
    useDoc._attachments = {};
    Object
        .entries(doc._attachments)
        .forEach(([attachmentId, attachmentData]) => {
            useDoc._attachments[attachmentId] = attachmentWriteDataToNormalData(attachmentData);
        });
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


/**
 * Wraps the normal storageInstance of a RxCollection
 * to ensure that all access is properly using the hooks
 * and other data transformations and also ensure that database.lockedRun()
 * is used properly.
 */
export function getWrappedStorageInstance<
    RxDocType,
    Internals,
    InstanceCreationOptions,
    CheckpointType
>(
    database: RxDatabase<{}, Internals, InstanceCreationOptions>,
    storageInstance: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions, CheckpointType>,
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
                // TODO run this in the dev-mode plugin
                // const prev = parseRevision(writeRow.previous._rev);
                // const current = parseRevision(writeRow.document._rev);
                // if (current.height <= prev.height) {
                //     throw newRxError('SNH', {
                //         dataBefore: writeRow.previous,
                //         dataAfter: writeRow.document,
                //         args: {
                //             prev,
                //             current
                //         }
                //     });
                // }
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

        /**
         * Yes we really want to set the revision here.
         * If you make a plugin that relies on having its own revision
         * stored into the storage, use this.originalStorageInstance.bulkWrite() instead.
         */
        data._rev = createRevision(
            database.hashFunction,
            data,
            writeRow.previous
        );

        return {
            document: data,
            previous: writeRow.previous
        };
    }

    const ret: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions> = {
        schema: storageInstance.schema,
        internals: storageInstance.internals,
        collectionName: storageInstance.collectionName,
        databaseName: storageInstance.databaseName,
        options: storageInstance.options,
        bulkWrite(
            rows: BulkWriteRow<RxDocType>[],
            context: string
        ) {
            const toStorageWriteRows: BulkWriteRow<RxDocType>[] = rows
                .map(row => transformDocumentDataFromRxDBToRxStorage(row));

            return database.lockedRun(
                () => storageInstance.bulkWrite(
                    toStorageWriteRows,
                    context
                )
            )
                /**
                 * The RxStorageInstance MUST NOT allow to insert already _deleted documents,
                 * without sending the previous document version.
                 * But for better developer experience, RxDB does allow to re-insert deleted documents.
                 * We do this by automatically fixing the conflict errors for that case
                 * by running another bulkWrite() and merging the results.
                 * @link https://github.com/pubkey/rxdb/pull/3839
                 */
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
                                            _rev: createRevision(
                                                database.hashFunction,
                                                error.writeRow.document,
                                                error.documentInDb
                                            )
                                        }
                                    )
                                };
                            });

                        return database.lockedRun(
                            () => storageInstance.bulkWrite(
                                reInserts,
                                context
                            )
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
                });
        },
        query(preparedQuery) {
            return database.lockedRun(
                () => storageInstance.query(preparedQuery)
            );
        },
        count(preparedQuery) {
            return database.lockedRun(
                () => storageInstance.count(preparedQuery)
            );
        },
        findDocumentsById(ids, deleted) {
            return database.lockedRun(
                () => storageInstance.findDocumentsById(ids, deleted)
            );
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
                () => storageInstance.getChangedDocumentsSince(ensureNotFalsy(limit), checkpoint)
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
            return storageInstance.changeStream();
        },
        conflictResultionTasks() {
            return storageInstance.conflictResultionTasks();
        },
        resolveConflictResultionTask(taskSolution) {
            if (taskSolution.output.isEqual) {
                return storageInstance.resolveConflictResultionTask(taskSolution);
            }

            const doc = Object.assign(
                {},
                taskSolution.output.documentData,
                {
                    _meta: getDefaultRxDocumentMeta(),
                    _rev: getDefaultRevision(),
                    _attachments: {}
                }
            );

            const documentData = flatClone(doc);
            delete (documentData as any)._meta;
            delete (documentData as any)._rev;
            delete (documentData as any)._attachments;

            return storageInstance.resolveConflictResultionTask({
                id: taskSolution.id,
                output: {
                    isEqual: false,
                    documentData
                }
            });
        }
    };

    (ret as any).originalStorageInstance = storageInstance;

    return ret;
}

/**
 * Each RxStorage implementation should
 * run this method at the first step of createStorageInstance()
 * to ensure that the configuration is correct.
 */
export function ensureRxStorageInstanceParamsAreCorrect(
    params: RxStorageInstanceCreationParams<any, any>
) {
    if (params.schema.keyCompression) {
        throw newRxError('UT5', { args: { params } });
    }
    if (hasEncryption(params.schema)) {
        throw newRxError('UT6', { args: { params } });
    }
}

export function hasEncryption(jsonSchema: RxJsonSchema<any>): boolean {
    if (
        (!!jsonSchema.encrypted && jsonSchema.encrypted.length > 0) ||
        (jsonSchema.attachments && jsonSchema.attachments.encrypted)
    ) {
        return true;
    } else {
        return false;
    }
}
