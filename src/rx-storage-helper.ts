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
import { HOOKS, runPluginHooks } from './hooks.ts';

export const INTERNAL_STORAGE_NAME = '_rxdb_internal';
export const RX_DATABASE_LOCAL_DOCS_STORAGE_NAME = 'rxdatabase_storage_local';

/**
 * Context string used by RxCollection.bulkInsert().
 * Documents written with this context are already cloned
 * by fillObjectDataBeforeInsert(), so the wrapped storage
 * can safely mutate them in place instead of cloning again.
 */
export const RX_COLLECTION_BULK_INSERT_CONTEXT = 'rx-collection-bulk-insert';

/**
 * Set of bulkWrite context strings whose documents
 * are already cloned by the caller and can be safely
 * mutated in place (skip flatClone in the insert path).
 *
 * Plugins can register additional contexts via
 * registerMutableWriteContext().
 */
const MUTABLE_DOCUMENT_WRITE_CONTEXTS: Set<string> = new Set([
    RX_COLLECTION_BULK_INSERT_CONTEXT
]);

/**
 * Register a bulkWrite context string as "mutable",
 * meaning the caller guarantees that insert documents
 * are already cloned and safe to mutate in place.
 * This allows the wrapped storage to skip a redundant
 * flatClone() call on the insert hot path.
 */
export function registerMutableWriteContext(context: string): void {
    MUTABLE_DOCUMENT_WRITE_CONTEXTS.add(context);
}

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
            map((evBulk: any) => evBulk.events.find((ev: any) => ev.documentId === documentId)),
            filter((ev: any) => !!ev),
            map((ev: any) => Promise.resolve(ensureNotFalsy(ev).documentData)),
            startWith(firstFindPromise),
            switchMap((v: any) => v),
            filter((v: any) => !!v)
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
 * Use a counter-based event bulk ID instead of randomToken()
 * for better performance. The prefix ensures uniqueness across instances.
 */
const EVENT_BULK_ID_PREFIX = randomToken(10);
let eventBulkCounter = 0;
function nextEventBulkId(): string {
    return EVENT_BULK_ID_PREFIX + (++eventBulkCounter);
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
    const eventBulkId = nextEventBulkId();
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
            if (hasAttachments) {
                const atts = document._attachments;
                const attKeys = Object.keys(atts);
                for (let a = 0; a < attKeys.length; a++) {
                    const attachmentId = attKeys[a];
                    const attachmentData = atts[attachmentId];
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
                }
            }
            let insertedRow: BulkWriteRowProcessed<RxDocType> | undefined;
            if (!attachmentError) {
                const row: BulkWriteRowProcessed<RxDocType> = hasAttachments ? stripAttachmentsDataFromRow(writeRow) : writeRow as any;
                insertedRow = row;
                bulkInsertDocs.push(row);
                if (onInsert) {
                    onInsert(document);
                }
                newestRow = row;
            }

            if (!documentDeleted) {
                let eventDocData = document as RxDocumentData<RxDocType>;
                if (hasAttachments) {
                    eventDocData = insertedRow ? insertedRow.document : stripAttachmentsDataFromDocument(document);
                }
                const event = {
                    documentId: docId,
                    operation: 'INSERT' as const,
                    documentData: eventDocData,
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
                        const prevAtts = previous._attachments;
                        const prevAttKeys = Object.keys(prevAtts);
                        for (let a = 0; a < prevAttKeys.length; a++) {
                            const attachmentId = prevAttKeys[a];
                            attachmentsRemove.push({
                                documentId: docId,
                                attachmentId,
                                digest: prevAtts[attachmentId].digest
                            });
                        }
                    }
                } else {
                    // first check for errors
                    const docAtts = document._attachments;
                    const docAttKeys = Object.keys(docAtts);
                    for (let a = 0; a < docAttKeys.length; a++) {
                        const attachmentId = docAttKeys[a];
                        const attachmentData = docAtts[attachmentId];
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
                            break;
                        }
                    }
                    if (!attachmentError) {
                        for (let a = 0; a < docAttKeys.length; a++) {
                            const attachmentId = docAttKeys[a];
                            const attachmentData = docAtts[attachmentId];
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
                        }
                    }
                }
            }

            if (attachmentError) {
                errors.push(attachmentError);
            } else {
                /**
                 * updatedRow already has attachments stripped (line above),
                 * so push it directly without stripping again.
                 */
                bulkUpdateDocs.push(updatedRow);
                if (onUpdate) {
                    onUpdate(document);
                }
                newestRow = updatedRow as any;
            }

            let eventDocumentData: RxDocumentData<RxDocType> | undefined;
            let previousEventDocumentData: RxDocumentData<RxDocType> | undefined = null as any;
            let operation: 'INSERT' | 'UPDATE' | 'DELETE';

            if (previousDeleted && !documentDeleted) {
                operation = 'INSERT';
                /**
                 * Reuse the already-stripped document from updatedRow
                 * instead of calling stripAttachmentsDataFromDocument() again.
                 */
                eventDocumentData = hasAttachments ? updatedRow.document : document as any;
            } else if (previous && !previousDeleted && !documentDeleted) {
                operation = 'UPDATE';
                eventDocumentData = hasAttachments ? updatedRow.document : document as any;
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

/**
 * Used in custom RxStorage implementations.
 */
export function attachmentWriteDataToNormalData(writeData: RxAttachmentData | RxAttachmentWriteData): RxAttachmentData {
    const data = (writeData as RxAttachmentWriteData).data;
    if (!data) {
        return writeData as any;
    }
    const ret: RxAttachmentData = {
        length: data.size,
        digest: writeData.digest,
        type: writeData.type
    };
    return ret;
}

export function stripAttachmentsDataFromDocument<RxDocType>(doc: RxDocumentWriteData<RxDocType>): RxDocumentData<RxDocType> {
    const atts = doc._attachments;
    if (!atts) {
        return doc;
    }

    // Use for..in loop to check for any keys without creating an array via Object.keys()
    let hasAnyAttachment = false;
    for (const key in atts) {
        if (Object.prototype.hasOwnProperty.call(atts, key)) {
            hasAnyAttachment = true;
            break;
        }
    }
    if (!hasAnyAttachment) {
        return doc;
    }

    const useDoc: RxDocumentData<RxDocType> = flatClone(doc) as any;
    const destAtts: Record<string, RxAttachmentData> = {};
    const attKeys = Object.keys(atts);
    for (let i = 0; i < attKeys.length; i++) {
        const attachmentId = attKeys[i];
        destAtts[attachmentId] = attachmentWriteDataToNormalData(atts[attachmentId]);
    }
    useDoc._attachments = destAtts;
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
    return {
        ...doc,
        _meta: { ...doc._meta }
    } as any;
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
            /**
             * Use the same timestamp for all docs of this rows-set.
             * This improves performance because calling Date.now() inside of the now() function
             * is too costly.
             */
            const time = now();
            /**
             * Pre-compute the first revision string for inserts (no previous document).
             * This avoids repeated string concatenation and getHeightOfRevision() calls
             * inside the hot loop.
             */
            const firstRevision = '1-' + databaseToken;
            /**
             * Share a single _meta object for all insert rows in this batch.
             * All inserts in the same bulkWrite share the same timestamp,
             * so we avoid creating a new { lwt: time } object per row.
             * This shared reference is safe because:
             * - All documents in one batch receive identical metadata values.
             * - When a document is later updated, flatCloneDocWithMeta() creates
             *   a new _meta object, so the shared reference is never mutated.
             */
            const insertMeta = { lwt: time };

            /**
             * When the caller has already cloned the documents (registered
             * via MUTABLE_DOCUMENT_WRITE_CONTEXTS), we can mutate them
             * in place and reuse the input array, avoiding redundant
             * flatClone() and wrapper-object allocations on every insert row.
             */
            const isMutableContext = MUTABLE_DOCUMENT_WRITE_CONTEXTS.has(context);
            let toStorageWriteRows: BulkWriteRow<RxDocType>[];

            if (isMutableContext) {
                /**
                 * Fast path: documents are already cloned by the caller.
                 * Set _meta/_rev directly on the document and reuse the
                 * input rows array without allocating wrapper objects.
                 */
                for (let index = 0; index < rows.length; index++) {
                    const document = rows[index].document;
                    document._meta = insertMeta;
                    document._rev = firstRevision;
                }
                toStorageWriteRows = rows;
            } else {
                toStorageWriteRows = new Array(rows.length);
                for (let index = 0; index < rows.length; index++) {
                    const writeRow = rows[index];
                    const previous = writeRow.previous;
                    let document;
                    if (previous) {
                        document = flatCloneDocWithMeta(writeRow.document);
                        document._meta.lwt = time;
                        document._rev = createRevision(
                            databaseToken,
                            previous
                        );
                    } else {
                        /**
                         * Insert path: flatClone is required because the input document
                         * may be a direct reference to another storage's internal data
                         * (e.g., during migration, query results from the old storage are
                         * passed directly as insert rows to the new storage).
                         *
                         * Use a shared insertMeta object instead of allocating { lwt: time }
                         * per row, since all inserts in the same batch share the same timestamp.
                         */
                        document = flatClone(writeRow.document);
                        document._meta = insertMeta;
                        document._rev = firstRevision;
                    }
                    toStorageWriteRows[index] = {
                        document,
                        previous
                    };
                }
            }

            if (HOOKS.preStorageWrite.length > 0) {
                runPluginHooks('preStorageWrite', {
                    storageInstance: this.originalStorageInstance,
                    rows: toStorageWriteRows
                });
            }

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

            /**
             * Fast path: when there are no errors, skip the wrapper object creation
             * and error filtering to reduce allocations.
             */
            if (writeResult.error.length === 0) {
                BULK_WRITE_ROWS_BY_RESPONSE.set(writeResult, toStorageWriteRows);
                return writeResult;
            }

            const useWriteResult: typeof writeResult = {
                error: []
            };
            BULK_WRITE_ROWS_BY_RESPONSE.set(useWriteResult, toStorageWriteRows);

            // No need to check writeResult.error.length === 0 here because
            // the fast path above already returns early when there are no errors.
            const reInsertErrors: RxStorageWriteErrorConflict<RxDocType>[] = writeResult.error
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
