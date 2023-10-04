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
    RxStorageWriteError,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    StringKeys,
    RxStorageWriteErrorConflict,
    RxStorageWriteErrorAttachment
} from './types';
import {
    appendToArray,
    createRevision,
    ensureNotFalsy,
    flatClone,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    now,
    randomCouchString
} from './plugins/utils';
import { Observable, filter, map, startWith, switchMap } from 'rxjs';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';
export const RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';

export async function getSingleDocument<RxDocType>(
    storageInstance: RxStorageInstance<RxDocType, any, any>,
    documentId: string
): Promise<RxDocumentData<RxDocType> | undefined> {
    const results = await storageInstance.findDocumentsById([documentId], false);
    const doc = results[0];
    if (doc) {
        return doc;
    } else {
        return undefined;
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
    if (writeResult.error.length > 0) {
        const error = writeResult.error[0];
        throw error;
    } else {
        const ret = writeResult.success[0];
        return ret;
    }
}

/**
 * Observe the plain document data of a single document.
 * Do not forget to unsubscribe.
 */
export function observeSingle<RxDocType>(
    storageInstance: RxStorageInstance<RxDocType, any, any>,
    documentId: string
): Observable<RxDocumentData<RxDocType>> {
    const firstFindPromise = getSingleDocument(storageInstance, documentId);
    const ret = storageInstance
        .changeStream()
        .pipe(
            map(evBulk => evBulk.events.find(ev => ev.documentId === documentId)),
            filter(ev => !!ev),
            map(ev => Promise.resolve(ensureNotFalsy(ev).documentData)),
            startWith(firstFindPromise),
            switchMap(v => v),
            filter(v => !!v)
        ) as any;
    return ret;
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
    collection: RxCollection<RxDocType, any, any>,
    documentId: string,
    writeData: RxDocumentWriteData<RxDocType> | RxDocType,
    error: RxStorageWriteError<RxDocType> | undefined
) {
    if (error) {
        if (error.status === 409) {
            throw newRxError('CONFLICT', {
                collection: collection.name,
                id: documentId,
                writeError: error,
                data: writeData
            });
        } else if (error.status === 422) {
            throw newRxError('VD2', {
                collection: collection.name,
                id: documentId,
                writeError: error,
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
 * @hotPath The performance of this function is critical
 */
export function categorizeBulkWriteRows<RxDocType>(
    storageInstance: RxStorageInstance<any, any, any>,
    primaryPath: StringKeys<RxDocType>,
    /**
     * Current state of the documents
     * inside of the storage. Used to determine
     * which writes cause conflicts.
     * This must be a Map for better performance.
     */
    docsInDb: Map<RxDocumentData<RxDocType>[StringKeys<RxDocType>] | string, RxDocumentData<RxDocType>>,
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
    const errors: RxStorageWriteError<RxDocType>[] = [];
    const changeByDocId = new Map<string, RxStorageChangeEvent<RxDocumentData<RxDocType>>>();
    const eventBulkId = randomCouchString(10);
    const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any> = {
        id: eventBulkId,
        events: [],
        checkpoint: null,
        context
    };
    const eventBulkEvents = eventBulk.events;

    const attachmentsAdd: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
        digest: string;
    }[] = [];
    const attachmentsRemove: {
        documentId: string;
        attachmentId: string;
        digest: string;
    }[] = [];
    const attachmentsUpdate: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
        digest: string;
    }[] = [];


    const startTime = now();

    const hasDocsInDb = docsInDb.size > 0;
    let newestRow: BulkWriteRowProcessed<RxDocType> | undefined;

    /**
     * @performance is really important in this loop!
     */
    const rowAmount = bulkWriteRows.length;
    for (let rowId = 0; rowId < rowAmount; rowId++) {
        const writeRow = bulkWriteRows[rowId];

        // use these variables to have less property accesses
        const document = writeRow.document;
        const previous = writeRow.previous;
        const docId = document[primaryPath] as string;

        let documentInDb: RxDocumentData<RxDocType> | undefined = undefined as any;
        if (hasDocsInDb) {
            documentInDb = docsInDb.get(docId);
        }
        let attachmentError: RxStorageWriteErrorAttachment<RxDocType> | undefined;

        if (!documentInDb) {
            /**
             * It is possible to insert already deleted documents,
             * this can happen on replication.
             */
            const insertedIsDeleted = document._deleted ? true : false;
            if (hasAttachments) {
                Object
                    .entries(document._attachments)
                    .forEach(([attachmentId, attachmentData]) => {
                        if (
                            !(attachmentData as RxAttachmentWriteData).data
                        ) {
                            attachmentError = {
                                documentId: docId,
                                isError: true,
                                status: 510,
                                writeRow,
                                attachmentId
                            };
                            errors.push(attachmentError);
                        } else {
                            attachmentsAdd.push({
                                documentId: docId,
                                attachmentId,
                                attachmentData: attachmentData as any,
                                digest: attachmentData.digest
                            });
                        }
                    });
            }
            if (!attachmentError) {
                if (hasAttachments) {
                    bulkInsertDocs.push(stripAttachmentsDataFromRow(writeRow));
                } else {
                    bulkInsertDocs.push(writeRow as any);
                }

                // TODO can we assume the the last row always has the hightes _meta.lwt?
                if (
                    !newestRow ||
                    newestRow.document._meta.lwt < document._meta.lwt
                ) {
                    newestRow = writeRow as any;
                }
            }

            if (!insertedIsDeleted) {
                const event = {
                    eventId: getUniqueDeterministicEventKey(
                        eventBulkId,
                        rowId,
                        docId,
                        writeRow
                    ),
                    documentId: docId,
                    operation: 'INSERT' as const,
                    documentData: hasAttachments ? stripAttachmentsDataFromDocument(document) : document as any,
                    previousDocumentData: hasAttachments && previous ? stripAttachmentsDataFromDocument(previous) : previous as any,
                    // TODO do we even need the startTime and endTime?
                    // maybe it should be defined per event-bulk, not per each single event
                    startTime,
                    endTime: now()
                };
                changeByDocId.set(docId, event);
                eventBulkEvents.push(event);
            }
        } else {
            // update existing document
            const revInDb: string = documentInDb._rev;

            /**
             * Check for conflict
             */
            if (
                (
                    !previous
                ) ||
                (
                    !!previous &&
                    revInDb !== previous._rev
                )
            ) {
                // is conflict error
                const err: RxStorageWriteError<RxDocType> = {
                    isError: true,
                    status: 409,
                    documentId: docId,
                    writeRow: writeRow,
                    documentInDb
                };
                errors.push(err);
                continue;
            }

            // handle attachments data

            const updatedRow: BulkWriteRowProcessed<RxDocType> = hasAttachments ? stripAttachmentsDataFromRow(writeRow) : writeRow as any;
            if (hasAttachments) {
                if (document._deleted) {
                    /**
                     * Deleted documents must have cleared all their attachments.
                     */
                    if (previous) {
                        Object
                            .keys(previous._attachments)
                            .forEach(attachmentId => {
                                attachmentsRemove.push({
                                    documentId: docId,
                                    attachmentId,
                                    digest: ensureNotFalsy(previous)._attachments[attachmentId].digest
                                });
                            });
                    }
                } else {
                    // first check for errors
                    Object
                        .entries(document._attachments)
                        .find(([attachmentId, attachmentData]) => {
                            const previousAttachmentData = previous ? previous._attachments[attachmentId] : undefined;
                            if (
                                !previousAttachmentData &&
                                !(attachmentData as RxAttachmentWriteData).data
                            ) {
                                attachmentError = {
                                    documentId: docId,
                                    documentInDb: documentInDb as any,
                                    isError: true,
                                    status: 510,
                                    writeRow,
                                    attachmentId
                                };
                            }
                            return true;
                        });
                    if (!attachmentError) {
                        Object
                            .entries(document._attachments)
                            .forEach(([attachmentId, attachmentData]) => {
                                const previousAttachmentData = previous ? previous._attachments[attachmentId] : undefined;
                                if (!previousAttachmentData) {
                                    attachmentsAdd.push({
                                        documentId: docId,
                                        attachmentId,
                                        attachmentData: attachmentData as any,
                                        digest: attachmentData.digest
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
                                            documentId: docId,
                                            attachmentId,
                                            attachmentData: attachmentData as RxAttachmentWriteData,
                                            digest: attachmentData.digest
                                        });
                                    }
                                }
                            });
                    }
                }
            }

            if (attachmentError) {
                errors.push(attachmentError);
            } else {
                bulkUpdateDocs.push(updatedRow);
                if (
                    !newestRow ||
                    newestRow.document._meta.lwt < updatedRow.document._meta.lwt
                ) {
                    newestRow = updatedRow as any;
                }
            }

            let eventDocumentData: RxDocumentData<RxDocType> | undefined = null as any;
            let previousEventDocumentData: RxDocumentData<RxDocType> | undefined = null as any;
            let operation: 'INSERT' | 'UPDATE' | 'DELETE' = null as any;

            if (previous && previous._deleted && !document._deleted) {
                operation = 'INSERT';
                eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(document) : document as any;
            } else if (previous && !previous._deleted && !document._deleted) {
                operation = 'UPDATE';
                eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(document) : document as any;
                previousEventDocumentData = previous;
            } else if (document._deleted) {
                operation = 'DELETE';
                eventDocumentData = ensureNotFalsy(document) as any;
                previousEventDocumentData = previous;
            } else {
                throw newRxError('SNH', { args: { writeRow } });
            }

            const event = {
                eventId: getUniqueDeterministicEventKey(
                    eventBulkId,
                    rowId,
                    docId,
                    document
                ),
                documentId: docId,
                documentData: eventDocumentData as RxDocumentData<RxDocType>,
                previousDocumentData: previousEventDocumentData,
                operation: operation,
                startTime,
                endTime: now()
            };
            changeByDocId.set(docId, event);
            eventBulkEvents.push(event);
        }
    }

    return {
        bulkInsertDocs,
        bulkUpdateDocs,
        newestRow,
        errors,
        changeByDocId,
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
        length: getAttachmentSize(data),
        digest: writeData.digest,
        type: writeData.type
    };
    return ret;
}

export function stripAttachmentsDataFromDocument<RxDocType>(doc: RxDocumentWriteData<RxDocType>): RxDocumentData<RxDocType> {

    if (!doc._attachments || Object.keys(doc._attachments).length === 0) {
        return doc;
    }

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
 * to make it easy to filter out duplicates
 * even on flattened eventBulks
 */
export function getUniqueDeterministicEventKey(
    eventBulkId: string,
    rowId: number,
    docId: string,
    writeRowDocument: RxDocumentWriteData<any>
): string {
    return eventBulkId + '|' + rowId + '|' + docId + '|' + writeRowDocument._rev;
}


export type WrappedRxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions> = RxStorageInstance<RxDocumentType, any, InstanceCreationOptions> & {
    originalStorageInstance: RxStorageInstance<RxDocumentType, Internals, InstanceCreationOptions>;
};

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
): WrappedRxStorageInstance<RxDocType, Internals, InstanceCreationOptions> {
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
            database.token,
            writeRow.previous
        );

        return {
            document: data,
            previous: writeRow.previous
        };
    }

    const ret: WrappedRxStorageInstance<RxDocType, Internals, InstanceCreationOptions> = {
        originalStorageInstance: storageInstance,
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
                    const useWriteResult: typeof writeResult = {
                        error: [],
                        success: writeResult.success.slice(0)
                    };
                    const reInsertErrors: RxStorageWriteErrorConflict<RxDocType>[] =
                        writeResult.error
                            .filter((error) => {
                                if (
                                    error.status === 409 &&
                                    !error.writeRow.previous &&
                                    !error.writeRow.document._deleted &&
                                    ensureNotFalsy(error.documentInDb)._deleted
                                ) {
                                    return true;
                                }
                                useWriteResult.error.push(error);
                                return false;
                            }) as any;
                    if (reInsertErrors.length > 0) {
                        const reInserts: BulkWriteRow<RxDocType>[] = reInsertErrors
                            .map((error) => {
                                return {
                                    previous: error.documentInDb,
                                    document: Object.assign(
                                        {},
                                        error.writeRow.document,
                                        {
                                            _rev: createRevision(
                                                database.token,
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
                            appendToArray(useWriteResult.error, subResult.error);
                            appendToArray(useWriteResult.success, subResult.success);
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
        info() {
            return database.lockedRun(
                () => storageInstance.info()
            );
        },
        findDocumentsById(ids, deleted) {
            return database.lockedRun(
                () => storageInstance.findDocumentsById(ids, deleted)
            );
        },
        getAttachmentData(
            documentId: string,
            attachmentId: string,
            digest: string
        ) {
            return database.lockedRun(
                () => storageInstance.getAttachmentData(documentId, attachmentId, digest)
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
            database.storageInstances.delete(ret);
            return database.lockedRun(
                () => storageInstance.remove()
            );
        },
        close() {
            database.storageInstances.delete(ret);
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

    database.storageInstances.add(ret);
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
    if (
        params.schema.attachments &&
        params.schema.attachments.compression
    ) {
        throw newRxError('UT7', { args: { params } });
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
