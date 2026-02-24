/**
 * Helper functions for accessing the RxStorage instances.
 */

import { overwritable } from './overwritable.ts';
import { newRxError } from './rx-error.ts';
import {
    getPrimaryFieldOfPrimaryKey
} from './rx-schema-helper.ts';
import type {
    BulkWriteRow,
    BulkWriteRowProcessed,
    CategorizeBulkWriteRowsOutput,
    EventBulk,
    RxAttachmentData,
    RxAttachmentWriteData,
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
    RxStorageWriteErrorAttachment,
    RxStorage,
    RxStorageDefaultCheckpoint,
    FilledMangoQuery,
    RxStorageBulkWriteResponse
} from './types/index.d.ts';
import {
    PROMISE_RESOLVE_TRUE,
    RXDB_VERSION,
    RX_META_LWT_MINIMUM,
    createRevision,
    ensureNotFalsy,
    flatClone,
    getFromMapOrCreate,
    lastOfArray,
    now,
    promiseWait,
    randomToken
} from './plugins/utils/index.ts';
import { Observable, filter, map, startWith, switchMap } from 'rxjs';
import { normalizeMangoQuery, prepareQuery } from './rx-query-helper.ts';
import { runPluginHooks } from './hooks.ts';

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
        const primaryPath = getPrimaryFieldOfPrimaryKey(instance.schema.primaryKey);
        const success = getWrittenDocumentsFromBulkWriteResponse(primaryPath, [writeRow], writeResult);
        const ret = success[0];
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
    checkpoints: (CheckpointType | undefined)[]
): CheckpointType {
    return Object.assign(
        {},
        ...checkpoints.filter(x => !!x)
    );
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
    context: string,
    /**
     * Used by some storages for better performance.
     * For example when get-by-id and insert/update can run in parallel.
     */
    onInsert?: (docData: RxDocumentData<RxDocType>) => void,
    onUpdate?: (docData: RxDocumentData<RxDocType>) => void
): CategorizeBulkWriteRowsOutput<RxDocType> {
    const hasAttachments = !!storageInstance.schema.attachments;
    const bulkInsertDocs: BulkWriteRowProcessed<RxDocType>[] = [];
    const bulkUpdateDocs: BulkWriteRowProcessed<RxDocType>[] = [];
    const errors: RxStorageWriteError<RxDocType>[] = [];
    const eventBulkId = randomToken(10);
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
        const documentDeleted = document._deleted;
        const previousDeleted = previous && previous._deleted;

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
            const insertedIsDeleted = documentDeleted ? true : false;
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
                                attachmentId,
                                context
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
                    if (onInsert) {
                        onInsert(document);
                    }
                } else {
                    bulkInsertDocs.push(writeRow as any);
                    if (onInsert) {
                        onInsert(document);
                    }
                }

                newestRow = writeRow as any;
            }

            if (!insertedIsDeleted) {
                const event = {
                    documentId: docId,
                    operation: 'INSERT' as const,
                    documentData: hasAttachments ? stripAttachmentsDataFromDocument(document) : document as any,
                    previousDocumentData: hasAttachments && previous ? stripAttachmentsDataFromDocument(previous) : previous as any
                };
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
                    documentInDb,
                    context
                };
                errors.push(err);
                continue;
            }

            // handle attachments data

            const updatedRow: BulkWriteRowProcessed<RxDocType> = hasAttachments ? stripAttachmentsDataFromRow(writeRow) : writeRow as any;
            if (hasAttachments) {
                if (documentDeleted) {
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
                                    attachmentId,
                                    context
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
                if (hasAttachments) {
                    bulkUpdateDocs.push(stripAttachmentsDataFromRow(updatedRow));
                    if (onUpdate) {
                        onUpdate(document);
                    }
                } else {
                    bulkUpdateDocs.push(updatedRow);
                    if (onUpdate) {
                        onUpdate(document);
                    }
                }
                newestRow = updatedRow as any;
            }

            let eventDocumentData: RxDocumentData<RxDocType> | undefined;
            let previousEventDocumentData: RxDocumentData<RxDocType> | undefined = null as any;
            let operation: 'INSERT' | 'UPDATE' | 'DELETE';

            if (previousDeleted && !documentDeleted) {
                operation = 'INSERT';
                eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(document) : document as any;
            } else if (previous && !previousDeleted && !documentDeleted) {
                operation = 'UPDATE';
                eventDocumentData = hasAttachments ? stripAttachmentsDataFromDocument(document) : document as any;
                previousEventDocumentData = previous;
            } else if (documentDeleted) {
                operation = 'DELETE';
                eventDocumentData = ensureNotFalsy(document) as any;
                previousEventDocumentData = previous;
            } else {
                throw newRxError('SNH', { args: { writeRow } });
            }

            const event = {
                documentId: docId,
                documentData: eventDocumentData as RxDocumentData<RxDocType>,
                previousDocumentData: previousEventDocumentData,
                operation: operation
            };
            eventBulkEvents.push(event);
        }
    }

    return {
        bulkInsertDocs,
        bulkUpdateDocs,
        newestRow,
        errors,
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
    return Object.assign(
        {},
        doc,
        {
            _meta: flatClone(doc._meta)
        }
    );
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
    database: RxDatabase<{}, Internals, InstanceCreationOptions, any>,
    storageInstance: RxStorageInstance<RxDocType, Internals, InstanceCreationOptions, CheckpointType>,
    /**
     * The original RxJsonSchema
     * before it was mutated by hooks.
     */
    rxJsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>
): WrappedRxStorageInstance<RxDocType, Internals, InstanceCreationOptions> {
    overwritable.deepFreezeWhenDevMode(rxJsonSchema);

    const primaryPath = getPrimaryFieldOfPrimaryKey(storageInstance.schema.primaryKey);

    const ret: WrappedRxStorageInstance<RxDocType, Internals, InstanceCreationOptions> = {
        originalStorageInstance: storageInstance,
        schema: storageInstance.schema,
        internals: storageInstance.internals,
        collectionName: storageInstance.collectionName,
        databaseName: storageInstance.databaseName,
        options: storageInstance.options,
        async bulkWrite(
            rows: BulkWriteRow<RxDocType>[],
            context: string
        ) {
            const databaseToken = database.token;
            const toStorageWriteRows: BulkWriteRow<RxDocType>[] = new Array(rows.length);
            /**
             * Use the same timestamp for all docs of this rows-set.
             * This improves performance because calling Date.now() inside of the now() function
             * is too costly.
             */
            const time = now();
            for (let index = 0; index < rows.length; index++) {
                const writeRow = rows[index];
                const document = flatCloneDocWithMeta(writeRow.document);
                document._meta.lwt = time;

                /**
                 * Yes we really want to set the revision here.
                 * If you make a plugin that relies on having its own revision
                 * stored into the storage, use this.originalStorageInstance.bulkWrite() instead.
                 */
                const previous = writeRow.previous;
                document._rev = createRevision(
                    databaseToken,
                    previous
                );
                toStorageWriteRows[index] = {
                    document,
                    previous
                };
            }

            runPluginHooks('preStorageWrite', {
                storageInstance: this.originalStorageInstance,
                rows: toStorageWriteRows
            });

            const writeResult = await database.lockedRun(
                () => storageInstance.bulkWrite(
                    toStorageWriteRows,
                    context
                )
            );

            /**
             * The RxStorageInstance MUST NOT allow to insert already _deleted documents,
             * without sending the previous document version.
             * But for better developer experience, RxDB does allow to re-insert deleted documents.
             * We do this by automatically fixing the conflict errors for that case
             * by running another bulkWrite() and merging the results.
             * @link https://github.com/pubkey/rxdb/pull/3839
            */
            const useWriteResult: typeof writeResult = {
                error: []
            };
            BULK_WRITE_ROWS_BY_RESPONSE.set(useWriteResult, toStorageWriteRows);

            const reInsertErrors: RxStorageWriteErrorConflict<RxDocType>[] = writeResult.error.length === 0
                ? []
                : writeResult.error
                    .filter((error) => {
                        if (
                            error.status === 409 &&
                            !error.writeRow.previous &&
                            !error.writeRow.document._deleted &&
                            ensureNotFalsy(error.documentInDb)._deleted
                        ) {
                            return true;
                        }

                        // add the "normal" errors to the parent error array.
                        useWriteResult.error.push(error);
                        return false;
                    }) as any;
            if (reInsertErrors.length > 0) {
                const reInsertIds = new Set<string>();
                const reInserts: BulkWriteRow<RxDocType>[] = reInsertErrors
                    .map((error) => {
                        reInsertIds.add(error.documentId);
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

                const subResult = await database.lockedRun(
                    () => storageInstance.bulkWrite(
                        reInserts,
                        context
                    )
                );


                useWriteResult.error = useWriteResult.error.concat(subResult.error);
                const successArray = getWrittenDocumentsFromBulkWriteResponse(
                    primaryPath,
                    toStorageWriteRows,
                    useWriteResult,
                    reInsertIds
                );
                const subSuccess = getWrittenDocumentsFromBulkWriteResponse(
                    primaryPath,
                    reInserts,
                    subResult
                );
                successArray.push(...subSuccess);
                return useWriteResult;
            }

            return useWriteResult;
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
            attachmentId: string,
            digest: string
        ) {
            return database.lockedRun(
                () => storageInstance.getAttachmentData(documentId, attachmentId, digest)
            );
        },
        getChangedDocumentsSince: !storageInstance.getChangedDocumentsSince ? undefined : (limit: number, checkpoint?: any) => {
            return database.lockedRun(
                () => ((storageInstance as any).getChangedDocumentsSince)(ensureNotFalsy(limit), checkpoint)
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

export function getChangedDocumentsSinceQuery<RxDocType, CheckpointType>(
    storageInstance: RxStorageInstance<RxDocType, any, any, CheckpointType>,
    limit: number,
    checkpoint?: CheckpointType
): FilledMangoQuery<RxDocType> {
    const primaryPath = getPrimaryFieldOfPrimaryKey(storageInstance.schema.primaryKey);
    const sinceLwt = checkpoint ? (checkpoint as unknown as RxStorageDefaultCheckpoint).lwt : RX_META_LWT_MINIMUM;
    const sinceId = checkpoint ? (checkpoint as unknown as RxStorageDefaultCheckpoint).id : '';
    return normalizeMangoQuery(storageInstance.schema, {
        selector: {
            $or: [
                {
                    '_meta.lwt': {
                        $gt: sinceLwt
                    }
                },
                {
                    '_meta.lwt': {
                        $eq: sinceLwt
                    },
                    [primaryPath]: {
                        $gt: checkpoint ? sinceId : ''
                    }
                }
            ],
            // add this hint for better index usage
            '_meta.lwt': {
                $gte: sinceLwt
            }
        } as any,
        sort: [
            { '_meta.lwt': 'asc' },
            { [primaryPath]: 'asc' }
        ] as any,
        skip: 0,
        limit,
        /**
         * DO NOT SET A SPECIFIC INDEX HERE!
         * The query might be modified by some plugin
         * before sending it to the storage.
         * We can be sure that in the end the query planner
         * will find the best index.
         */
        // index: ['_meta.lwt', primaryPath]
    });
}

export async function getChangedDocumentsSince<RxDocType, CheckpointType>(
    storageInstance: RxStorageInstance<RxDocType, any, any, CheckpointType>,
    limit: number,
    checkpoint?: CheckpointType
): Promise<{
    documents: RxDocumentData<RxDocType>[];
    /**
     * The checkpoint contains data so that another
     * call to getChangedDocumentsSince() will continue
     * from exactly the last document that was returned before.
     */
    checkpoint: CheckpointType;
}> {
    if (storageInstance.getChangedDocumentsSince) {
        return storageInstance.getChangedDocumentsSince(limit, checkpoint);
    }

    const primaryPath = getPrimaryFieldOfPrimaryKey(storageInstance.schema.primaryKey);
    const query = prepareQuery<RxDocumentData<any>>(
        storageInstance.schema,
        getChangedDocumentsSinceQuery(
            storageInstance,
            limit,
            checkpoint
        )
    );

    const result = await storageInstance.query(query);
    const documents = result.documents;
    const lastDoc = lastOfArray(documents);

    return {
        documents: documents,
        checkpoint: lastDoc ? {
            id: (lastDoc as any)[primaryPath],
            lwt: lastDoc._meta.lwt
        } as any : checkpoint ? checkpoint : {
            id: '',
            lwt: 0
        }
    };
}


const BULK_WRITE_ROWS_BY_RESPONSE = new WeakMap<RxStorageBulkWriteResponse<any>, BulkWriteRow<any>[]>();
const BULK_WRITE_SUCCESS_MAP = new WeakMap<RxStorageBulkWriteResponse<any>, RxDocumentData<any>[]>();

/**
 * For better performance, this is done only when accessed
 * because most of the time we do not need the results, only the errors.
 */
export function getWrittenDocumentsFromBulkWriteResponse<RxDocType>(
    primaryPath: string,
    writeRows: BulkWriteRow<RxDocType>[],
    response: RxStorageBulkWriteResponse<RxDocType>,
    reInsertIds?: Set<string>
): RxDocumentData<RxDocType>[] {
    return getFromMapOrCreate(
        BULK_WRITE_SUCCESS_MAP,
        response,
        () => {
            const ret: RxDocumentData<RxDocType>[] = [];
            let realWriteRows = BULK_WRITE_ROWS_BY_RESPONSE.get(response);
            if (!realWriteRows) {
                realWriteRows = writeRows;
            }
            if (response.error.length > 0 || reInsertIds) {
                const errorIds = reInsertIds ? reInsertIds : new Set<string>();
                for (let index = 0; index < response.error.length; index++) {
                    const error = response.error[index];
                    errorIds.add(error.documentId);
                }

                for (let index = 0; index < realWriteRows.length; index++) {
                    const doc = realWriteRows[index].document;
                    if (!errorIds.has((doc as any)[primaryPath])) {
                        ret.push(stripAttachmentsDataFromDocument(doc));
                    }
                }
            } else {
                // pre-set array size for better performance
                ret.length = writeRows.length - response.error.length;
                for (let index = 0; index < realWriteRows.length; index++) {
                    const doc = realWriteRows[index].document;
                    ret[index] = stripAttachmentsDataFromDocument(doc);
                }
            }
            return ret;
        }
    );
}


/**
 * Wraps the storage and simluates
 * delays. Mostly used in tests.
 */
export function randomDelayStorage<Internals, InstanceCreationOptions>(
    input: {
        storage: RxStorage<Internals, InstanceCreationOptions>;
        delayTimeBefore: () => number;
        delayTimeAfter: () => number;
    }
): RxStorage<Internals, InstanceCreationOptions> {
    /**
     * Ensure writes to a delay storage
     * are still correctly run in order.
     */
    let randomDelayStorageWriteQueue: Promise<any> = PROMISE_RESOLVE_TRUE;

    const retStorage: RxStorage<Internals, InstanceCreationOptions> = {
        name: 'random-delay-' + input.storage.name,
        rxdbVersion: RXDB_VERSION,
        async createStorageInstance(params) {
            await promiseWait(input.delayTimeBefore());
            const storageInstance = await input.storage.createStorageInstance(params);
            await promiseWait(input.delayTimeAfter());

            return {
                databaseName: storageInstance.databaseName,
                internals: storageInstance.internals,
                options: storageInstance.options,
                schema: storageInstance.schema,
                collectionName: storageInstance.collectionName,
                bulkWrite(a, b) {
                    randomDelayStorageWriteQueue = randomDelayStorageWriteQueue.then(async () => {
                        await promiseWait(input.delayTimeBefore());
                        const response = await storageInstance.bulkWrite(a, b);
                        await promiseWait(input.delayTimeAfter());
                        return response;
                    });
                    const ret = randomDelayStorageWriteQueue;
                    return ret;
                },
                async findDocumentsById(a, b) {
                    await promiseWait(input.delayTimeBefore());
                    const ret = await storageInstance.findDocumentsById(a, b);
                    await promiseWait(input.delayTimeAfter());
                    return ret;
                },
                async query(a) {
                    await promiseWait(input.delayTimeBefore());
                    const ret = await storageInstance.query(a);
                    return ret;
                },
                async count(a) {
                    await promiseWait(input.delayTimeBefore());
                    const ret = await storageInstance.count(a);
                    await promiseWait(input.delayTimeAfter());
                    return ret;

                },
                async getAttachmentData(a, b, c) {
                    await promiseWait(input.delayTimeBefore());
                    const ret = await storageInstance.getAttachmentData(a, b, c);
                    await promiseWait(input.delayTimeAfter());
                    return ret;

                },
                getChangedDocumentsSince: !storageInstance.getChangedDocumentsSince ? undefined : async (a, b) => {
                    await promiseWait(input.delayTimeBefore());
                    const ret = await ensureNotFalsy(storageInstance.getChangedDocumentsSince)(a, b);
                    await promiseWait(input.delayTimeAfter());
                    return ret;

                },
                changeStream() {
                    return storageInstance.changeStream();
                },
                async cleanup(a) {
                    await promiseWait(input.delayTimeBefore());
                    const ret = await storageInstance.cleanup(a);
                    await promiseWait(input.delayTimeAfter());
                    return ret;

                },
                async close() {
                    await promiseWait(input.delayTimeBefore());
                    const ret = await storageInstance.close();
                    await promiseWait(input.delayTimeAfter());
                    return ret;

                },
                async remove() {
                    await promiseWait(input.delayTimeBefore());
                    const ret = await storageInstance.remove();
                    await promiseWait(input.delayTimeAfter());
                    return ret;
                },
            };


        }
    };
    return retStorage;
}
