import {
    Observable,
    Subject
} from 'rxjs';
import {
    getStartIndexStringFromLowerBound,
    getStartIndexStringFromUpperBound
} from '../../custom-index';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import {
    categorizeBulkWriteRows
} from '../../rx-storage-helper';
import type {
    BulkWriteRow,
    EventBulk,
    QueryMatcher,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxDocumentData,
    RxDocumentDataById,
    RxJsonSchema,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageDefaultCheckpoint,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    StringKeys
} from '../../types';
import {
    ensureNotFalsy,
    getFromMapOrThrow,
    lastOfArray,
    now,
    PROMISE_RESOLVE_TRUE,
    PROMISE_RESOLVE_VOID,
    RX_META_LWT_MINIMUM
} from '../../plugins/utils';
import {
    boundGE,
    boundGT,
    boundLE
} from './binary-search-bounds';
import {
    attachmentMapKey,
    compareDocsWithIndex,
    ensureNotRemoved,
    getMemoryCollectionKey,
    putWriteRowToState,
    removeDocFromState
} from './memory-helper';
import {
    addIndexesToInternalsState,
    getMemoryIndexName
} from './memory-indexes';
import type {
    MemoryPreparedQuery,
    MemoryStorageInternals,
    RxStorageMemory,
    RxStorageMemoryInstanceCreationOptions,
    RxStorageMemorySettings
} from './memory-types';
import { RxStorageDefaultStatics } from '../../rx-storage-statics';

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
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    }

    bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        ensureNotRemoved(this);
        const primaryPath = this.primaryPath;

        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };

        const categorized = categorizeBulkWriteRows<RxDocType>(
            this,
            primaryPath as any,
            this.internals.documents,
            documentWrites,
            context
        );
        ret.error = categorized.errors;

        /**
         * Do inserts/updates
         */
        const stateByIndex = Object.values(this.internals.byIndex);

        const bulkInsertDocs = categorized.bulkInsertDocs;
        for (let i = 0; i < bulkInsertDocs.length; ++i) {
            const writeRow = bulkInsertDocs[i];
            const docId = writeRow.document[primaryPath];
            putWriteRowToState(
                docId as any,
                this.internals,
                stateByIndex,
                writeRow,
                undefined
            );
            ret.success[docId as any] = writeRow.document;
        }

        const bulkUpdateDocs = categorized.bulkUpdateDocs;
        for (let i = 0; i < bulkUpdateDocs.length; ++i) {
            const writeRow = bulkUpdateDocs[i];
            const docId = writeRow.document[primaryPath];
            putWriteRowToState(
                docId as any,
                this.internals,
                stateByIndex,
                writeRow,
                this.internals.documents.get(docId as any)
            );
            ret.success[docId as any] = writeRow.document;
        }

        /**
         * Handle attachments
         */
        if (this.schema.attachments) {
            const attachmentsMap = this.internals.attachments;
            categorized.attachmentsAdd.forEach(attachment => {
                attachmentsMap.set(
                    attachmentMapKey(attachment.documentId, attachment.attachmentId),
                    attachment.attachmentData
                );
            });
            if (this.schema.attachments) {
                categorized.attachmentsUpdate.forEach(attachment => {
                    attachmentsMap.set(
                        attachmentMapKey(attachment.documentId, attachment.attachmentId),
                        attachment.attachmentData
                    );
                });
                categorized.attachmentsRemove.forEach(attachment => {
                    attachmentsMap.delete(
                        attachmentMapKey(attachment.documentId, attachment.attachmentId)
                    );
                });
            }
        }

        if (categorized.eventBulk.events.length > 0) {
            const lastState = ensureNotFalsy(categorized.newestRow).document;
            categorized.eventBulk.checkpoint = {
                id: lastState[primaryPath],
                lwt: lastState._meta.lwt
            };
            this.internals.changes$.next(categorized.eventBulk);
        }
        return Promise.resolve(ret);
    }

    findDocumentsById(
        docIds: string[],
        withDeleted: boolean
    ): Promise<RxDocumentDataById<RxDocType>> {
        const ret: RxDocumentDataById<RxDocType> = {};
        for (let i = 0; i < docIds.length; ++i) {
            const docId = docIds[i];
            const docInDb = this.internals.documents.get(docId);
            if (
                docInDb &&
                (
                    !docInDb._deleted ||
                    withDeleted
                )
            ) {
                ret[docId] = docInDb;
            }
        }
        return Promise.resolve(ret);
    }

    query(preparedQuery: MemoryPreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        const queryPlan = preparedQuery.queryPlan;
        const query = preparedQuery.query;
        const skip = query.skip ? query.skip : 0;
        const limit = query.limit ? query.limit : Infinity;
        const skipPlusLimit = skip + limit;

        let queryMatcher: QueryMatcher<RxDocumentData<RxDocType>> | false = false;
        if (!queryPlan.selectorSatisfiedByIndex) {
            queryMatcher = RxStorageDefaultStatics.getQueryMatcher(
                this.schema,
                preparedQuery
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
        let indexOfLower = boundGE(
            docsWithIndex,
            {
                indexString: lowerBoundString
            } as any,
            compareDocsWithIndex
        );
        const indexOfUpper = boundLE(
            docsWithIndex,
            {
                indexString: upperBoundString
            } as any,
            compareDocsWithIndex
        );

        let rows: RxDocumentData<RxDocType>[] = [];
        let done = false;
        while (!done) {
            const currentDoc = docsWithIndex[indexOfLower];


            if (
                !currentDoc ||
                indexOfLower > indexOfUpper
            ) {
                break;
            }

            if (!queryMatcher || queryMatcher(currentDoc.doc)) {
                rows.push(currentDoc.doc);
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
            const sortComparator = RxStorageDefaultStatics.getSortComparator(this.schema, preparedQuery);
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
        const result = await this.query(preparedQuery);
        return {
            count: result.documents.length,
            mode: 'fast'
        };
    }

    getChangedDocumentsSince(
        limit: number,
        checkpoint?: RxStorageDefaultCheckpoint
    ): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: RxStorageDefaultCheckpoint;
    }> {
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

    getAttachmentData(documentId: string, attachmentId: string): Promise<string> {
        ensureNotRemoved(this);
        const data = getFromMapOrThrow(
            this.internals.attachments,
            attachmentMapKey(documentId, attachmentId)
        );
        return Promise.resolve(data.data);
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
        ensureNotRemoved(this);
        return this.internals.changes$.asObservable();
    }

    async remove(): Promise<void> {
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
        if (this.closed) {
            return Promise.reject(new Error('already closed'));
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
