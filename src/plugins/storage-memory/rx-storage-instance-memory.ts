import {
    Observable,
    Subject
} from 'rxjs';
import {
    getStartIndexStringFromLowerBound,
    getStartIndexStringFromUpperBound
} from '../../custom-index.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import {
    categorizeBulkWriteRows
} from '../../rx-storage-helper.ts';
import type {
    BulkWriteRow,
    EventBulk,
    QueryMatcher,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxDocumentData,
    RxJsonSchema,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageDefaultCheckpoint,
    RxStorageInfoResult,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    StringKeys
} from '../../types/index.d.ts';
import {
    ensureNotFalsy,
    lastOfArray,
    now,
    PROMISE_RESOLVE_TRUE,
    PROMISE_RESOLVE_VOID,
    requestIdlePromise,
    RX_META_LWT_MINIMUM
} from '../../plugins/utils/index.ts';
import {
    boundGE,
    boundGT,
    boundLE,
    boundLT
} from './binary-search-bounds.ts';
import {
    attachmentMapKey,
    compareDocsWithIndex,
    ensureNotRemoved,
    getMemoryCollectionKey,
    putWriteRowToState,
    removeDocFromState
} from './memory-helper.ts';
import {
    addIndexesToInternalsState,
    getMemoryIndexName
} from './memory-indexes.ts';
import type {
    MemoryPreparedQuery,
    MemoryStorageInternals,
    RxStorageMemory,
    RxStorageMemoryInstanceCreationOptions,
    RxStorageMemorySettings
} from './memory-types.ts';
import { getQueryMatcher, getSortComparator } from '../../rx-query-helper.ts';


/**
 * Used in tests to ensure everything
 * is closed correctly
 */
export const OPEN_MEMORY_INSTANCES = new Set<RxStorageInstanceMemory<any>>();

export class RxStorageInstanceMemory<RxDocType> implements RxStorageInstance<
    RxDocType,
    MemoryStorageInternals<RxDocType>,
    RxStorageMemoryInstanceCreationOptions,
    RxStorageDefaultCheckpoint
> {

    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    public closed = false;

    constructor(
        public readonly storage: RxStorageMemory,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: MemoryStorageInternals<RxDocType>,
        public readonly options: Readonly<RxStorageMemoryInstanceCreationOptions>,
        public readonly settings: RxStorageMemorySettings
    ) {
        OPEN_MEMORY_INSTANCES.add(this);
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    }

    bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        this.ensurePersistence();
        ensureNotRemoved(this);
        const internals = this.internals;
        const documentsById = this.internals.documents;
        const primaryPath = this.primaryPath;

        const categorized = categorizeBulkWriteRows<RxDocType>(
            this,
            primaryPath as any,
            documentsById,
            documentWrites,
            context
        );
        const error = categorized.errors;
        const success: RxDocumentData<RxDocType>[] = new Array(categorized.bulkInsertDocs.length);
        const bulkInsertDocs = categorized.bulkInsertDocs;
        for (let i = 0; i < bulkInsertDocs.length; ++i) {
            const writeRow = bulkInsertDocs[i];
            const doc = writeRow.document;
            success[i] = doc;
        }
        const bulkUpdateDocs = categorized.bulkUpdateDocs;
        for (let i = 0; i < bulkUpdateDocs.length; ++i) {
            const writeRow = bulkUpdateDocs[i];
            const doc = writeRow.document;
            success.push(doc);
        }

        this.internals.ensurePersistenceTask = categorized;
        if (!this.internals.ensurePersistenceIdlePromise) {
            this.internals.ensurePersistenceIdlePromise = requestIdlePromise(1000).then(() => {
                this.internals.ensurePersistenceIdlePromise = undefined;
                this.ensurePersistence();
            });
        }

        /**
         * Important: The events must be emitted AFTER the persistence
         * task has been added.
         */
        if (categorized.eventBulk.events.length > 0) {
            const lastState = ensureNotFalsy(categorized.newestRow).document;
            categorized.eventBulk.checkpoint = {
                id: lastState[primaryPath],
                lwt: lastState._meta.lwt
            };
            internals.changes$.next(categorized.eventBulk);
        }



        return Promise.resolve({ success, error });
    }

    /**
     * Instead of directly inserting the documents into all indexes,
     * we do it lazy in the background. This gives the application time
     * to directly work with the write-result and to do stuff like rendering DOM
     * notes and processing RxDB queries.
     * Then in some later time, or just before the next read/write,
     * it is ensured that the indexes have been written.
     */
    public ensurePersistence() {
        if (
            !this.internals.ensurePersistenceTask
        ) {
            return;
        }
        const internals = this.internals;
        const documentsById = this.internals.documents;
        const primaryPath = this.primaryPath;

        const categorized = this.internals.ensurePersistenceTask;
        delete this.internals.ensurePersistenceTask;

        /**
         * Do inserts/updates
         */
        const stateByIndex = Object.values(this.internals.byIndex);

        const bulkInsertDocs = categorized.bulkInsertDocs;
        for (let i = 0; i < bulkInsertDocs.length; ++i) {
            const writeRow = bulkInsertDocs[i];
            const doc = writeRow.document;
            const docId = doc[primaryPath];
            putWriteRowToState(
                docId as any,
                internals,
                stateByIndex,
                writeRow,
                undefined
            );
        }

        const bulkUpdateDocs = categorized.bulkUpdateDocs;
        for (let i = 0; i < bulkUpdateDocs.length; ++i) {
            const writeRow = bulkUpdateDocs[i];
            const doc = writeRow.document;
            const docId = doc[primaryPath];
            putWriteRowToState(
                docId as any,
                internals,
                stateByIndex,
                writeRow,
                documentsById.get(docId as any)
            );
        }

        /**
         * Handle attachments
         */
        if (this.schema.attachments) {
            const attachmentsMap = internals.attachments;
            categorized.attachmentsAdd.forEach(attachment => {
                attachmentsMap.set(
                    attachmentMapKey(attachment.documentId, attachment.attachmentId),
                    {
                        writeData: attachment.attachmentData,
                        digest: attachment.digest
                    }
                );
            });
            if (this.schema.attachments) {
                categorized.attachmentsUpdate.forEach(attachment => {
                    attachmentsMap.set(
                        attachmentMapKey(attachment.documentId, attachment.attachmentId),
                        {
                            writeData: attachment.attachmentData,
                            digest: attachment.digest
                        }
                    );
                });
                categorized.attachmentsRemove.forEach(attachment => {
                    attachmentsMap.delete(
                        attachmentMapKey(attachment.documentId, attachment.attachmentId)
                    );
                });
            }
        }
    }

    findDocumentsById(
        docIds: string[],
        withDeleted: boolean
    ): Promise<RxDocumentData<RxDocType>[]> {
        this.ensurePersistence();
        const documentsById = this.internals.documents;
        const ret: RxDocumentData<RxDocType>[] = [];
        if (documentsById.size === 0) {
            return Promise.resolve(ret);
        }
        for (let i = 0; i < docIds.length; ++i) {
            const docId = docIds[i];
            const docInDb = documentsById.get(docId);
            if (
                docInDb &&
                (
                    !docInDb._deleted ||
                    withDeleted
                )
            ) {
                ret.push(docInDb);
            }
        }
        return Promise.resolve(ret);
    }

    query(
        preparedQuery: MemoryPreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
        this.ensurePersistence();
        const queryPlan = preparedQuery.queryPlan;
        const query = preparedQuery.query;

        const skip = query.skip ? query.skip : 0;
        const limit = query.limit ? query.limit : Infinity;
        const skipPlusLimit = skip + limit;

        let queryMatcher: QueryMatcher<RxDocumentData<RxDocType>> | false = false;
        if (!queryPlan.selectorSatisfiedByIndex) {
            queryMatcher = getQueryMatcher(
                this.schema,
                preparedQuery.query
            );
        }

        const queryPlanFields: string[] = queryPlan.index;
        const mustManuallyResort = !queryPlan.sortFieldsSameAsIndexFields;
        const index: string[] | undefined = ['_deleted'].concat(queryPlanFields);
        let lowerBound: any[] = queryPlan.startKeys;
        lowerBound = [false].concat(lowerBound);
        const lowerBoundString = getStartIndexStringFromLowerBound(
            this.schema,
            index,
            lowerBound,
            queryPlan.inclusiveStart
        );

        let upperBound: any[] = queryPlan.endKeys;
        upperBound = [false].concat(upperBound);
        const upperBoundString = getStartIndexStringFromUpperBound(
            this.schema,
            index,
            upperBound,
            queryPlan.inclusiveEnd
        );
        const indexName = getMemoryIndexName(index);
        const docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;

        let indexOfLower = (queryPlan.inclusiveStart ? boundGE : boundGT)(
            docsWithIndex,
            {
                indexString: lowerBoundString
            } as any,
            compareDocsWithIndex
        );
        const indexOfUpper = (queryPlan.inclusiveEnd ? boundLE : boundLT)(
            docsWithIndex,
            {
                indexString: upperBoundString
            } as any,
            compareDocsWithIndex
        );

        let rows: RxDocumentData<RxDocType>[] = [];
        let done = false;
        while (!done) {
            const currentRow = docsWithIndex[indexOfLower];
            if (
                !currentRow ||
                indexOfLower > indexOfUpper
            ) {
                break;
            }
            const currentDoc = currentRow.doc;

            if (!queryMatcher || queryMatcher(currentDoc)) {
                rows.push(currentDoc);
            }

            if (
                (rows.length >= skipPlusLimit && !mustManuallyResort) ||
                indexOfLower >= docsWithIndex.length
            ) {
                done = true;
            }

            indexOfLower++;
        }

        if (mustManuallyResort) {
            const sortComparator = getSortComparator(this.schema, preparedQuery.query);
            rows = rows.sort(sortComparator);
        }

        // apply skip and limit boundaries.
        rows = rows.slice(skip, skipPlusLimit);
        return Promise.resolve({
            documents: rows
        });
    }

    async count(
        preparedQuery: MemoryPreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        this.ensurePersistence();
        const result = await this.query(preparedQuery);
        return {
            count: result.documents.length,
            mode: 'fast'
        };
    }

    info(): Promise<RxStorageInfoResult> {
        this.ensurePersistence();
        return Promise.resolve({
            totalCount: this.internals.documents.size
        });
    }

    getChangedDocumentsSince(
        limit: number,
        checkpoint?: RxStorageDefaultCheckpoint
    ): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: RxStorageDefaultCheckpoint;
    }> {
        this.ensurePersistence();
        const sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
        const sinceId = checkpoint ? checkpoint.id : '';

        const index = ['_meta.lwt', this.primaryPath as any];
        const indexName = getMemoryIndexName(index);

        const lowerBoundString = getStartIndexStringFromLowerBound(
            this.schema,
            ['_meta.lwt', this.primaryPath as any],
            [
                sinceLwt,
                sinceId
            ],
            false
        );

        const docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;
        let indexOfLower = boundGT(
            docsWithIndex,
            {
                indexString: lowerBoundString
            } as any,
            compareDocsWithIndex
        );

        // TODO use array.slice() so we do not have to iterate here
        const rows: RxDocumentData<RxDocType>[] = [];
        while (rows.length < limit && indexOfLower < docsWithIndex.length) {
            const currentDoc = docsWithIndex[indexOfLower];
            rows.push(currentDoc.doc);
            indexOfLower++;
        }

        const lastDoc = lastOfArray(rows);
        return Promise.resolve({
            documents: rows,
            checkpoint: lastDoc ? {
                id: lastDoc[this.primaryPath] as any,
                lwt: lastDoc._meta.lwt
            } : checkpoint ? checkpoint : {
                id: '',
                lwt: 0
            }
        });
    }

    cleanup(minimumDeletedTime: number): Promise<boolean> {
        this.ensurePersistence();
        const maxDeletionTime = now() - minimumDeletedTime;
        const index = ['_deleted', '_meta.lwt', this.primaryPath as any];
        const indexName = getMemoryIndexName(index);
        const docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;

        const lowerBoundString = getStartIndexStringFromLowerBound(
            this.schema,
            index,
            [
                true,
                0,
                ''
            ],
            false
        );

        let indexOfLower = boundGT(
            docsWithIndex,
            {
                indexString: lowerBoundString
            } as any,
            compareDocsWithIndex
        );

        let done = false;
        while (!done) {
            const currentDoc = docsWithIndex[indexOfLower];
            if (!currentDoc || currentDoc.doc._meta.lwt > maxDeletionTime) {
                done = true;
            } else {
                removeDocFromState(
                    this.primaryPath as any,
                    this.schema,
                    this.internals,
                    currentDoc.doc
                );
                indexOfLower++;
            }
        }
        return PROMISE_RESOLVE_TRUE;
    }

    getAttachmentData(
        documentId: string,
        attachmentId: string,
        digest: string
    ): Promise<string> {
        this.ensurePersistence();
        ensureNotRemoved(this);
        const key = attachmentMapKey(documentId, attachmentId);
        const data = this.internals.attachments.get(key);

        if (
            !digest ||
            !data ||
            data.digest !== digest
        ) {
            throw new Error('attachment does not exist: ' + key);
        }
        return Promise.resolve(data.writeData.data);
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
        ensureNotRemoved(this);
        return this.internals.changes$.asObservable();
    }

    async remove(): Promise<void> {
        if (this.closed) {
            throw new Error('closed');
        }
        this.ensurePersistence();
        ensureNotRemoved(this);

        this.internals.removed = true;
        this.storage.collectionStates.delete(
            getMemoryCollectionKey(
                this.databaseName,
                this.collectionName,
                this.schema.version
            )
        );
        await this.close();
    }

    close(): Promise<void> {
        OPEN_MEMORY_INSTANCES.delete(this);

        this.ensurePersistence();
        if (this.closed) {
            return PROMISE_RESOLVE_VOID;
        }
        this.closed = true;

        this.internals.refCount = this.internals.refCount - 1;
        return PROMISE_RESOLVE_VOID;
    }

    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return this.internals.conflictResultionTasks$.asObservable();
    }
    resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> {
        return PROMISE_RESOLVE_VOID;
    }
}

export function createMemoryStorageInstance<RxDocType>(
    storage: RxStorageMemory,
    params: RxStorageInstanceCreationParams<RxDocType, RxStorageMemoryInstanceCreationOptions>,
    settings: RxStorageMemorySettings
): Promise<RxStorageInstanceMemory<RxDocType>> {
    const collectionKey = getMemoryCollectionKey(
        params.databaseName,
        params.collectionName,
        params.schema.version
    );

    let internals = storage.collectionStates.get(collectionKey);
    if (!internals) {
        internals = {
            removed: false,
            refCount: 1,
            documents: new Map(),
            attachments: params.schema.attachments ? new Map() : undefined as any,
            byIndex: {},
            conflictResultionTasks$: new Subject(),
            changes$: new Subject()
        };
        addIndexesToInternalsState(internals, params.schema);
        storage.collectionStates.set(collectionKey, internals);
    } else {
        internals.refCount = internals.refCount + 1;
    }

    const instance = new RxStorageInstanceMemory(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        settings
    );
    return Promise.resolve(instance);
}
