import { Observable, Subject, Subscription } from 'rxjs';
import {
    PROMISE_RESOLVE_TRUE,
    PROMISE_RESOLVE_VOID,
    RXDB_VERSION,
    ensureNotFalsy,
    lastOfArray,
    now,
    toArray
} from '../utils/index.ts';
import type {
    BulkWriteRow,
    ById,
    EventBulk,
    PreparedQuery,
    QueryMatcher,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorage,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageDefaultCheckpoint,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    StringKeys
} from '../../types/index';
import {
    categorizeBulkWriteRows,
    ensureRxStorageInstanceParamsAreCorrect
} from '../../rx-storage-helper.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import { getQueryMatcher, getSortComparator } from '../../rx-query-helper.ts';
import { newRxError } from '../../rx-error.ts';
import type { RxStorageLocalstorage } from './index.ts';
import { getIndexableStringMonad, getStartIndexStringFromLowerBound, getStartIndexStringFromUpperBound } from '../../custom-index.ts';
import { pushAtSortPosition } from 'array-push-at-sort-position';
import { boundEQ, boundGE, boundGT, boundLE, boundLT } from '../storage-memory/binary-search-bounds.ts';

export const RX_STORAGE_NAME_LOCALSTORAGE = 'localstorage';


export type LocalstorageStorageInternals<RxDocType = any> = {
    indexes: ById<IndexMeta<RxDocType>>;
};

export type LocalstorageInstanceCreationOptions = {};

export type LocalstorageStorageSettings = {
    localStorage?: typeof localStorage
};

// index-string to doc-id mapped
export type LocalstorageIndex = string[][];

export type ChangeStreamStoredData<RxDocType> = {
    databaseInstanceToken: string;
    eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>;
}


/**
 * StorageEvents are not send to the same
 * browser tab where they where created.
 * This makes it hard to write unit tests
 * so we redistribute the events here instead.
 */
const storageEventStream$: Subject<{
    fromStorageEvent: boolean;
    key: string;
    newValue: string | null;
    databaseInstanceToken?: string;
}> = new Subject();
let storageEventStreamSubscribed = false;
export function getStorageEventStream() {
    if (!storageEventStreamSubscribed && typeof window !== 'undefined') {
        storageEventStreamSubscribed = true;
        window.addEventListener('storage', (ev: StorageEvent) => {
            if (!ev.key) {
                return;
            }
            storageEventStream$.next({
                fromStorageEvent: true,
                key: ev.key,
                newValue: ev.newValue
            });
        });
    }
    return storageEventStream$.asObservable();
}


export class RxStorageInstanceLocalstorage<RxDocType> implements RxStorageInstance<
    RxDocType,
    LocalstorageStorageInternals,
    LocalstorageInstanceCreationOptions,
    RxStorageDefaultCheckpoint
> {
    public readonly primaryPath: StringKeys<RxDocType>;

    /**
     * Under this key the whole state
     * will be stored as stringified json
     * inside of the localstorage.
     */
    public readonly docsKey: string;
    public readonly changestreamStorageKey: string;
    public readonly indexesKey: string;
    private changeStreamSub: Subscription;

    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = new Subject();
    public closed?: Promise<void>;
    public readonly localStorage: typeof localStorage;
    public removed: boolean = false;

    constructor(
        public readonly storage: RxStorageLocalstorage,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: LocalstorageStorageInternals,
        public readonly options: Readonly<LocalstorageInstanceCreationOptions>,
        public readonly settings: LocalstorageStorageSettings,
        public readonly multiInstance: boolean,
        public readonly databaseInstanceToken: string
    ) {
        this.localStorage = settings.localStorage ? settings.localStorage : window.localStorage;
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey) as any;
        this.docsKey = 'RxDB-ls-doc-' + this.databaseName + '--' + this.collectionName + '--' + this.schema.version;
        this.changestreamStorageKey = 'RxDB-ls-changes-' + this.databaseName + '--' + this.collectionName + '--' + this.schema.version;
        this.indexesKey = 'RxDB-ls-idx-' + this.databaseName + '--' + this.collectionName + '--' + this.schema.version;

        this.changeStreamSub = getStorageEventStream().subscribe((ev: any) => {
            if (
                ev.key !== this.changestreamStorageKey ||
                !ev.newValue ||
                (
                    ev.fromStorageEvent &&
                    ev.databaseInstanceToken === this.databaseInstanceToken
                )
            ) {
                return;
            }
            const latestChanges: ChangeStreamStoredData<RxDocType> = JSON.parse(ev.newValue);
            if (
                ev.fromStorageEvent &&
                latestChanges.databaseInstanceToken === this.databaseInstanceToken
            ) {
                return;
            }

            this.changes$.next(latestChanges.eventBulk);
        });
    }

    getDoc(docId: string | RxDocumentWriteData<RxDocType>[StringKeys<RxDocType>]): RxDocumentData<RxDocType> | undefined {
        const docString = this.localStorage.getItem(this.docsKey + '-' + docId as string);
        if (docString) {
            return JSON.parse(docString);
        }
    }
    setDoc(doc: RxDocumentData<RxDocType>) {
        const docId = doc[this.primaryPath];
        this.localStorage.setItem(this.docsKey + '-' + docId, JSON.stringify(doc));
    }
    getIndex(index: string[]): LocalstorageIndex {
        const indexString = this.localStorage.getItem(this.indexesKey + getIndexName(index));
        if (!indexString) {
            return [];
        } else {
            return JSON.parse(indexString);
        }
    }
    setIndex(index: string[], value: LocalstorageIndex) {
        this.localStorage.setItem(this.indexesKey + getIndexName(index), JSON.stringify(value));
    }


    bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            error: []
        };

        const docsInDb = new Map<RxDocumentData<RxDocType>[StringKeys<RxDocType>] | string, RxDocumentData<RxDocType>>();
        documentWrites.forEach(row => {
            const docId = row.document[this.primaryPath];
            const doc = this.getDoc(docId);
            if (doc) {
                docsInDb.set(docId, doc);
            }
        });

        const categorized = categorizeBulkWriteRows<RxDocType>(
            this,
            this.primaryPath,
            docsInDb,
            documentWrites,
            context
        );
        ret.error = categorized.errors;


        const indexValues = Object.values(this.internals.indexes).map(idx => {
            return this.getIndex(idx.index);
        });

        [
            categorized.bulkInsertDocs,
            categorized.bulkUpdateDocs
        ].forEach(rows => {
            rows.forEach(row => {
                // write new document data
                this.setDoc(row.document);

                // update the indexes
                const docId = row.document[this.primaryPath] as string;
                Object.values(this.internals.indexes).forEach((idx, i) => {
                    const indexValue = indexValues[i];
                    const newIndexString = idx.getIndexableString(row.document);
                    const insertPosition = pushAtSortPosition<string[]>(
                        indexValue,
                        [
                            newIndexString,
                            docId,
                        ],
                        sortByIndexStringComparator,
                        0
                    );
                    if (row.previous) {
                        const previousIndexString = idx.getIndexableString(row.previous);
                        if (previousIndexString === newIndexString) {
                            /**
                             * Performance shortcut.
                             * If index was not changed -> The old doc must be before or after the new one.
                             */
                            const prev = indexValue[insertPosition - 1];
                            if (prev && prev[1] === docId) {
                                indexValue.splice(insertPosition - 1, 1);
                            } else {
                                const next = indexValue[insertPosition + 1];
                                if (next[1] === docId) {
                                    indexValue.splice(insertPosition + 1, 1);
                                } else {
                                    throw newRxError('SNH', {
                                        document: row.document,
                                        args: {
                                            insertPosition,
                                            indexValue,
                                            row,
                                            idx
                                        }
                                    });
                                }
                            }
                        } else {
                            /**
                             * Index changed, we must search for the old one and remove it.
                             */
                            const indexBefore = boundEQ(
                                indexValue,
                                [
                                    previousIndexString
                                ] as any,
                                compareDocsWithIndex
                            );
                            indexValue.splice(indexBefore, 1);
                        }
                    }
                });

            });
        });

        indexValues.forEach((indexValue, i) => {
            const index = Object.values(this.internals.indexes);
            this.setIndex(index[i].index, indexValue);
        });

        if (categorized.eventBulk.events.length > 0) {
            const storageItemData: ChangeStreamStoredData<RxDocType> = {
                databaseInstanceToken: this.databaseInstanceToken,
                eventBulk: categorized.eventBulk
            };
            const itemString = JSON.stringify(storageItemData);
            this.localStorage.setItem(
                this.changestreamStorageKey,
                itemString
            );
            storageEventStream$.next({
                fromStorageEvent: false,
                key: this.changestreamStorageKey,
                newValue: itemString,
                databaseInstanceToken: this.databaseInstanceToken
            });
        }
        return Promise.resolve(ret);
    }

    async findDocumentsById(
        docIds: string[],
        withDeleted: boolean
    ): Promise<RxDocumentData<RxDocType>[]> {
        const ret: RxDocumentData<RxDocType>[] = [];
        docIds.forEach(docId => {
            const doc = this.getDoc(docId);
            if (doc) {
                if (withDeleted || !doc._deleted) {
                    ret.push(doc);
                }
            }
        });
        return ret;
    }

    async query(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {
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

        let upperBound: any[] = queryPlan.endKeys;
        upperBound = upperBound;
        const upperBoundString = getStartIndexStringFromUpperBound(
            this.schema,
            index,
            upperBound
        );
        const docsWithIndex = this.getIndex(index);
        let indexOfLower = (queryPlan.inclusiveStart ? boundGE : boundGT)(
            docsWithIndex,
            [
                lowerBoundString
            ] as any,
            compareDocsWithIndex
        );

        const indexOfUpper = (queryPlan.inclusiveEnd ? boundLE : boundLT)(
            docsWithIndex,
            [
                upperBoundString
            ] as any,
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
            const docId = currentRow[1];
            const currentDoc = ensureNotFalsy(this.getDoc(docId));

            if (!queryMatcher || queryMatcher(currentDoc)) {
                rows.push(currentDoc);
            }

            if (
                (rows.length >= skipPlusLimit && !mustManuallyResort)
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
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        const result = await this.query(preparedQuery);
        return {
            count: result.documents.length,
            mode: 'fast'
        };
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
        return this.changes$.asObservable();
    }
    cleanup(minimumDeletedTime: number): Promise<boolean> {
        const maxDeletionTime = now() - minimumDeletedTime;
        const indexValue = this.getIndex(CLEANUP_INDEX);
        const lowerBoundString = getStartIndexStringFromLowerBound(
            this.schema,
            CLEANUP_INDEX,
            [
                true,
                0,
                ''
            ]
        );
        let indexOfLower = boundGT(
            indexValue,
            [
                lowerBoundString
            ] as any,
            compareDocsWithIndex
        );

        const indexValues = Object.values(this.internals.indexes).map(idx => {
            return this.getIndex(idx.index);
        });

        let done = false;
        while (!done) {
            const currentIndexRow = indexValue[indexOfLower];
            if (!currentIndexRow) {
                break;
            }
            const currentDocId = currentIndexRow[1];
            const currentDoc = ensureNotFalsy(this.getDoc(currentDocId));
            if (currentDoc._meta.lwt > maxDeletionTime) {
                done = true;
            } else {
                this.localStorage.removeItem(this.docsKey + '-' + currentDocId);
                Object.values(this.internals.indexes).forEach((idx, i) => {
                    const indexValue = indexValues[i];
                    const indexString = idx.getIndexableString(currentDoc);
                    const indexBefore = boundEQ(
                        indexValue,
                        [
                            indexString
                        ] as any,
                        compareDocsWithIndex
                    );
                    indexValue.splice(indexBefore, 1);
                });
                indexOfLower++;
            }
        }

        indexValues.forEach((indexValue, i) => {
            const index = Object.values(this.internals.indexes);
            this.setIndex(index[i].index, indexValue);
        });

        return PROMISE_RESOLVE_TRUE;
    }

    getAttachmentData(_documentId: string, _attachmentId: string): Promise<string> {
        throw newRxError('SNH');
    }

    remove(): Promise<void> {
        ensureNotRemoved(this);
        this.removed = true;

        // delete changes
        this.localStorage.removeItem(this.changestreamStorageKey);

        // delete documents
        const firstIndex = Object.values(this.internals.indexes)[0];
        const indexedDocs = this.getIndex(firstIndex.index);
        indexedDocs.forEach(row => {
            const docId = row[1];
            this.localStorage.removeItem(this.docsKey + '-' + docId);
        });

        // delete indexes
        Object.values(this.internals.indexes).forEach(idx => {
            this.localStorage.removeItem(this.indexesKey + idx.indexName);
        });

        return PROMISE_RESOLVE_VOID;
    }

    close(): Promise<void> {
        this.removed = true;

        if (this.closed) {
            return this.closed;
        }
        this.closed = (async () => {
            this.changes$.complete();
            this.changeStreamSub.unsubscribe();
            this.localStorage.removeItem(this.changestreamStorageKey);
        })();
        return this.closed;
    }
}

export async function createLocalstorageStorageInstance<RxDocType>(
    storage: RxStorageLocalstorage,
    params: RxStorageInstanceCreationParams<RxDocType, LocalstorageInstanceCreationOptions>,
    settings: LocalstorageStorageSettings
): Promise<RxStorageInstanceLocalstorage<RxDocType>> {
    const primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);

    const useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
    useIndexes.push([primaryPath]);
    const useIndexesFinal = useIndexes.map(index => {
        const indexAr = toArray(index);
        return indexAr;
    });
    useIndexesFinal.push(CLEANUP_INDEX);
    const indexes: ById<IndexMeta<RxDocType>> = {};
    useIndexesFinal.forEach((indexAr, indexId) => {
        const indexName = getIndexName(indexAr);
        indexes[indexName] = {
            indexId: '|' + indexId + '|',
            indexName,
            getIndexableString: getIndexableStringMonad(params.schema, indexAr),
            index: indexAr
        };
    });

    const internals: LocalstorageStorageInternals<RxDocType> = {
        indexes
    };

    const instance = new RxStorageInstanceLocalstorage(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        settings,
        params.multiInstance,
        params.databaseInstanceToken
    );
    return instance;
}


export function getIndexName(index: string[]): string {
    return index.join('|');
}
export const CLEANUP_INDEX: string[] = ['_deleted', '_meta.lwt'];
export type IndexMeta<RxDocType> = {
    indexId: string;
    indexName: string;
    index: string[];
    getIndexableString: (doc: RxDocumentData<RxDocType>) => string;
};

function sortByIndexStringComparator(a: [string, string], b: [string, string]) {
    if (a[0] < b[0]) {
        return -1;
    } else {
        return 1;
    }
}

function compareDocsWithIndex<RxDocType>(
    a: [string, string],
    b: [string, string]
): 1 | 0 | -1 {
    const indexStringA = a[0];
    const indexStringB = b[0];
    if (indexStringA < indexStringB) {
        return -1;
    } else if (indexStringA === indexStringB) {
        return 0;
    } else {
        return 1;
    }
}

function ensureNotRemoved(
    instance: RxStorageInstanceLocalstorage<any>
) {
    if (instance.removed) {
        throw new Error('removed');
    }
}
