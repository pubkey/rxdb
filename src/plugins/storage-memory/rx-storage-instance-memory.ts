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
    CategorizeBulkWriteRowsOutput,
    EventBulk,
    PreparedQuery,
    QueryMatcher,
    RxDocumentData,
    RxJsonSchema,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageDefaultCheckpoint,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    StringKeys
} from '../../types/index.d.ts';
import {
    deepEqual,
    ensureNotFalsy,
    now,
    PROMISE_RESOLVE_TRUE,
    PROMISE_RESOLVE_VOID,
    randomToken,
    requestIdlePromiseNoQueue
} from '../../plugins/utils/index.ts';
import {
    boundGEByIndexString,
    boundGTByIndexString,
    boundLEByIndexString,
    boundLTByIndexString
} from './binary-search-bounds.ts';
import {
    attachmentMapKey,
    bulkInsertToState,
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
    MemoryStorageInternals,
    RxStorageMemory,
    RxStorageMemoryInstanceCreationOptions,
    RxStorageMemorySettings
} from './memory-types.ts';
import { getQueryMatcher, getSortComparator } from '../../rx-query-helper.ts';
import { newRxError } from '../../rx-error.ts';

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

    /**
     * Used by some plugins and storage wrappers
     * to find out details about the internals of a write operation.
     * For example if you want to know which documents really have been replaced
     * or newly inserted.
     */
    public categorizedByWriteInput = new WeakMap<BulkWriteRow<RxDocType>[], CategorizeBulkWriteRowsOutput<RxDocType>>();

    constructor(
        public readonly storage: RxStorageMemory,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: MemoryStorageInternals<RxDocType>,
        public readonly options: Readonly<RxStorageMemoryInstanceCreationOptions>,
        public readonly settings: RxStorageMemorySettings,
        public readonly devMode: boolean
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
        /**
         * @performance
         * We have to return a Promise but we do not want to wait
         * one tick, so we directly create the promise
         * which makes it likely to be already resolved later.
         */
        const awaitMe = Promise.resolve({ error });

        this.categorizedByWriteInput.set(documentWrites, categorized);
        this.internals.ensurePersistenceTask = categorized;

        if (!this.internals.ensurePersistenceIdlePromise) {
            this.internals.ensurePersistenceIdlePromise = requestIdlePromiseNoQueue().then(() => {
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

        return awaitMe;
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
        const primaryPath = this.primaryPath;

        const categorized = this.internals.ensurePersistenceTask;
        this.internals.ensurePersistenceTask = undefined;

        /**
         * Do inserts/updates
         * @performance Use cached byIndexArray instead of Object.values()
         */
        const stateByIndex = internals.byIndexArray;

        /**
         * @performance Use batch insert for bulk inserts to avoid
         * repeated Array.splice() calls which are O(n) each.
         * Instead, batch-compute index entries, sort them,
         * and merge into existing sorted arrays.
         */
        const bulkInsertDocs = categorized.bulkInsertDocs;
        if (bulkInsertDocs.length > 0) {
            bulkInsertToState(
                primaryPath as any,
                internals,
                stateByIndex,
                bulkInsertDocs
            );
        }

        const bulkUpdateDocs = categorized.bulkUpdateDocs;
        for (let i = 0; i < bulkUpdateDocs.length; ++i) {
            const writeRow = bulkUpdateDocs[i];
            const doc = writeRow.document;
            const docId = doc[primaryPath];
            /**
             * @performance
             * Pass writeRow.previous directly as the old document state
             * instead of re-looking it up from the documents Map.
             * This is safe because categorizeBulkWriteRows already verified
             * that previous._rev matches the document in the Map (conflict check).
             */
            putWriteRowToState(
                docId as any,
                internals,
                stateByIndex,
                doc,
                writeRow.previous
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
        /**
         * @performance
         * Split into two paths to avoid checking withDeleted on every iteration.
         */
        if (withDeleted) {
            for (let i = 0; i < docIds.length; ++i) {
                const docInDb = documentsById.get(docIds[i]);
                if (docInDb) {
                    ret.push(docInDb);
                }
            }
        } else {
            for (let i = 0; i < docIds.length; ++i) {
                const docInDb = documentsById.get(docIds[i]);
                if (docInDb && !docInDb._deleted) {
                    ret.push(docInDb);
                }
            }
        }
        return Promise.resolve(ret);
    }

    query(
        preparedQuery: PreparedQuery<RxDocType>
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
        const mustManuallyResort = !queryPlan.sortSatisfiedByIndex;
        const index: string[] | undefined = queryPlanFields;
        const lowerBound: any[] = queryPlan.startKeys;
        const lowerBoundString = getStartIndexStringFromLowerBound(
            this.schema,
            index,
            lowerBound
        );

        const upperBound: any[] = queryPlan.endKeys;
        const upperBoundString = getStartIndexStringFromUpperBound(
            this.schema,
            index,
            upperBound
        );
        const indexName = getMemoryIndexName(index);

        if (!this.internals.byIndex[indexName]) {
            throw new Error('index does not exist ' + indexName);
        }
        const docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;


        /**
         * @performance Use string-specialized binary search to avoid
         * temporary array allocations on every query.
         */
        let indexOfLower = queryPlan.inclusiveStart
            ? boundGEByIndexString(docsWithIndex, lowerBoundString)
            : boundGTByIndexString(docsWithIndex, lowerBoundString);

        const indexOfUpper = queryPlan.inclusiveEnd
            ? boundLEByIndexString(docsWithIndex, upperBoundString)
            : boundLTByIndexString(docsWithIndex, upperBoundString);

        let rows: RxDocumentData<RxDocType>[] = [];

        /**
         * @performance
         * If the selector is satisfied by the index,
         * we can extract all documents in the range without
         * running a per-document queryMatcher check.
         * This is a common case for queries like find-by-query
         * where the selector is empty or fully covered by the index.
         */
        if (!queryMatcher) {
            const rangeLength = indexOfUpper - indexOfLower + 1;
            if (rangeLength > 0) {
                const extractLength = mustManuallyResort
                    ? rangeLength
                    : Math.min(rangeLength, skipPlusLimit);
                rows = new Array(extractLength);
                for (let i = 0; i < extractLength; i++) {
                    rows[i] = docsWithIndex[indexOfLower + i][1];
                }
            }
        } else {
            let done = false;
            while (!done) {
                const currentRow = docsWithIndex[indexOfLower];
                if (
                    !currentRow ||
                    indexOfLower > indexOfUpper
                ) {
                    break;
                }
                const currentDoc = currentRow[1];

                if (queryMatcher(currentDoc)) {
                    rows.push(currentDoc);
                }

                if (
                    (rows.length >= skipPlusLimit && !mustManuallyResort)
                ) {
                    done = true;
                }

                indexOfLower++;
            }
        }

        if (mustManuallyResort) {
            const sortComparator = getSortComparator(this.schema, preparedQuery.query);
            rows = rows.sort(sortComparator);
        }

        // apply skip and limit boundaries.
        if (skip !== 0 || rows.length > skipPlusLimit) {
            rows = rows.slice(skip, skipPlusLimit);
        }

        return Promise.resolve({
            documents: rows
        });
    }

    count(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        this.ensurePersistence();

        const queryPlan = preparedQuery.queryPlan;

        /**
         * @performance
         * If the selector is satisfied by the index,
         * we can compute the count directly from the index range
         * without extracting document data into an array.
         * Uses string-specialized binary search to avoid allocations.
         */
        if (queryPlan.selectorSatisfiedByIndex) {
            const queryPlanFields: string[] = queryPlan.index;
            const index: string[] = queryPlanFields;
            const lowerBound: any[] = queryPlan.startKeys;
            const lowerBoundString = getStartIndexStringFromLowerBound(
                this.schema,
                index,
                lowerBound
            );
            const upperBound: any[] = queryPlan.endKeys;
            const upperBoundString = getStartIndexStringFromUpperBound(
                this.schema,
                index,
                upperBound
            );
            const indexName = getMemoryIndexName(index);

            if (!this.internals.byIndex[indexName]) {
                throw newRxError('SNH', { args: { indexName } });
            }
            const docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;

            const indexOfLower = queryPlan.inclusiveStart
                ? boundGEByIndexString(docsWithIndex, lowerBoundString)
                : boundGTByIndexString(docsWithIndex, lowerBoundString);

            const indexOfUpper = queryPlan.inclusiveEnd
                ? boundLEByIndexString(docsWithIndex, upperBoundString)
                : boundLTByIndexString(docsWithIndex, upperBoundString);

            const count = Math.max(0, indexOfUpper - indexOfLower + 1);
            return Promise.resolve({
                count,
                mode: 'fast'
            });
        }

        const queryMatcher = getQueryMatcher(
            this.schema,
            preparedQuery.query
        );
        const queryPlanFields: string[] = queryPlan.index;
        const index: string[] = queryPlanFields;
        const lowerBound: any[] = queryPlan.startKeys;
        const lowerBoundString = getStartIndexStringFromLowerBound(
            this.schema,
            index,
            lowerBound
        );
        const upperBound: any[] = queryPlan.endKeys;
        const upperBoundString = getStartIndexStringFromUpperBound(
            this.schema,
            index,
            upperBound
        );
        const indexName = getMemoryIndexName(index);
        if (!this.internals.byIndex[indexName]) {
            throw newRxError('SNH', { args: { indexName } });
        }
        const docsWithIndex = this.internals.byIndex[indexName].docsWithIndex;

        let indexOfLower = queryPlan.inclusiveStart
            ? boundGEByIndexString(docsWithIndex, lowerBoundString)
            : boundGTByIndexString(docsWithIndex, lowerBoundString);

        const indexOfUpper = queryPlan.inclusiveEnd
            ? boundLEByIndexString(docsWithIndex, upperBoundString)
            : boundLTByIndexString(docsWithIndex, upperBoundString);

        let count = 0;
        while (indexOfLower <= indexOfUpper) {
            const currentRow = docsWithIndex[indexOfLower];
            if (!currentRow) {
                break;
            }
            if (queryMatcher(currentRow[1])) {
                count++;
            }
            indexOfLower++;
        }

        return Promise.resolve({
            count,
            mode: 'fast' as const
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
            ]
        );

        let indexOfLower = boundGTByIndexString(
            docsWithIndex,
            lowerBoundString
        );

        let done = false;
        while (!done) {
            const currentDoc = docsWithIndex[indexOfLower];
            if (!currentDoc || currentDoc[1]._meta.lwt > maxDeletionTime) {
                done = true;
            } else {
                removeDocFromState(
                    this.primaryPath as any,
                    this.schema,
                    this.internals,
                    currentDoc[1]
                );
                /**
                 * Do NOT increment indexOfLower after removal.
                 * removeDocFromState() splices the element out of the array,
                 * so the next element shifts into the current position.
                 * Incrementing would skip it.
                 */
            }
        }
        return PROMISE_RESOLVE_TRUE;
    }

    getAttachmentData(
        documentId: string,
        attachmentId: string,
        digest: string
    ): Promise<Blob> {
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
            id: randomToken(5),
            schema: params.schema,
            removed: false,
            refCount: 1,
            documents: new Map(),
            attachments: params.schema.attachments ? new Map() : undefined as any,
            byIndex: {},
            byIndexArray: [],
            changes$: new Subject()
        };
        addIndexesToInternalsState(internals, params.schema);
        storage.collectionStates.set(collectionKey, internals);
    } else {
        /**
         * Ensure that the storage was not already
         * created with a different schema.
         * This is very important because if this check
         * does not exist here, we have hard-to-debug problems
         * downstream.
         */
        if (
            params.devMode &&
            !deepEqual(internals.schema, params.schema)
        ) {
            throw new Error('storage was already created with a different schema');
        }
        internals.refCount = internals.refCount + 1;
    }

    const instance = new RxStorageInstanceMemory(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        settings,
        params.devMode
    );
    return Promise.resolve(instance);
}
