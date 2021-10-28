import type { SortComparator, QueryMatcher, ChangeEvent } from 'event-reduce-js';
import lokijs from 'lokijs';
import { Subject, Observable } from 'rxjs';
import {
    promiseWait,
    createRevision,
    getHeightOfRevision,
    parseRevision,
    lastOfArray,
    flatClone,
    now
} from '../../util';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import type {
    RxStorageInstance,
    LokiSettings,
    RxStorageChangeEvent,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageBulkWriteError,
    RxStorageQueryResult,
    BlobBuffer,
    ChangeStreamOnceOptions,
    RxJsonSchema,
    MangoQuery,
    MangoQuerySortPart,
    MangoQuerySortDirection,
    LokiStorageInternals,
    RxStorageChangedDocumentMeta,
    ChangeStreamEvent
} from '../../types';
import type {
    CompareFunction
} from 'array-push-at-sort-position';
import { CHANGES_COLLECTION_SUFFIX, getLokiEventKey, OPEN_LOKIJS_STORAGE_INSTANCES } from './lokijs-helper';

export class RxStorageInstanceLoki<RxDocType> implements RxStorageInstance<
    RxDocType,
    LokiStorageInternals,
    LokiSettings
> {

    public readonly primaryPath: keyof RxDocType;
    private changes$: Subject<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = new Subject();
    private lastChangefeedSequence: number = 0;

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
        public readonly internals: Readonly<LokiStorageInternals>,
        public readonly options: Readonly<LokiSettings>
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
    }

    /**
     * Adds an entry to the changes feed
     * that can be queried to check which documents have been
     * changed since sequence X.
     */
    private addChangeDocumentMeta(id: string) {
        if (!this.lastChangefeedSequence) {
            const lastDoc = this.internals.changesCollection
                .chain()
                .simplesort('sequence', true)
                .limit(1)
                .data()[0];
            if (lastDoc) {
                this.lastChangefeedSequence = lastDoc.sequence;
            }
        }

        const nextFeedSequence = this.lastChangefeedSequence + 1;
        this.internals.changesCollection.insert({
            id,
            sequence: nextFeedSequence
        });
        this.lastChangefeedSequence = nextFeedSequence;
    }

    prepareQuery(mutateableQuery: MangoQuery<RxDocType>) {
        mutateableQuery.selector = {
            $and: [
                {
                    _deleted: false
                },
                mutateableQuery.selector
            ]
        };
        return mutateableQuery;
    }
    getSortComparator(query: MangoQuery<RxDocType>): SortComparator<RxDocType> {
        if (!query.sort) {
            throw new Error('sort missing, we should at least sort by primaryKey');
        }

        const sort: MangoQuerySortPart<RxDocType>[] = query.sort;

        const fun: CompareFunction<RxDocType> = (a: RxDocType, b: RxDocType) => {
            let compareResult: number = 0; // 1 | -1
            sort.find(sortPart => {
                const fieldName: string = Object.keys(sortPart)[0];
                const direction: MangoQuerySortDirection = Object.values(sortPart)[0];
                const directionMultiplier = direction === 'asc' ? 1 : -1;
                const valueA: any = (a as any)[fieldName];
                const valueB: any = (b as any)[fieldName];
                if (valueA === valueB) {
                    return false;
                } else {
                    if (valueA > valueB) {
                        compareResult = 1 * directionMultiplier;
                        return true;
                    } else {
                        compareResult = -1 * directionMultiplier;
                        return true;
                    }
                }
            });
            if (!compareResult) {
                throw new Error('no compareResult');
            }
            return compareResult as any;
        }
        return fun;
    }

    /**
     * Returns a function that determines if a document matches a query selector.
     * It is important to have the exact same logix as lokijs uses, to be sure
     * that the event-reduce algorithm works correct.
     * But LokisJS does not export such a function, the query logic is deep inside of
     * the Resultset prototype.
     * Because I am lazy, I do not copy paste and maintain that code.
     * Instead we create a fake Resultset and apply the prototype method Resultset.prototype.find()
     */
    getQueryMatcher(query: MangoQuery<RxDocType>): QueryMatcher<RxDocType> {
        const fun: QueryMatcher<RxDocType> = (doc: RxDocType) => {
            const fakeResultSet: any = {
                collection: {
                    data: [doc],
                    binaryIndices: {}
                }
            };
            Object.setPrototypeOf(fakeResultSet, (lokijs as any).Resultset.prototype);
            fakeResultSet.find(query.selector, true);
            const ret = fakeResultSet.filteredrows.length > 0;
            return ret;
        }
        return fun;
    }
    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        if (documentWrites.length === 0) {
            throw newRxError('P2', {
                args: {
                    documentWrites
                }
            });
        }

        /**
         * lokijs is in memory and non-async, so we emulate async behavior
         * to ensure all RxStorage implementations behave equal.
         */
        await promiseWait(0);

        const collection = this.internals.collection;

        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: new Map(),
            error: new Map()
        };

        const startTime = now();
        documentWrites.forEach(writeRow => {
            const id: string = writeRow.document[this.primaryPath] as any;
            const documentInDb = collection.by(this.primaryPath, id);

            if (!documentInDb) {
                // insert new document
                const newRevision = '1-' + createRevision(writeRow.document, true);
                const writeDoc = Object.assign(
                    {},
                    writeRow.document,
                    {
                        _rev: newRevision,
                        _deleted: false,
                        // TODO attachments are currently not working with lokijs
                        _attachments: {} as any
                    }
                );
                collection.insert(writeDoc);
                this.addChangeDocumentMeta(id);
                this.changes$.next({
                    eventId: getLokiEventKey(false, id, newRevision),
                    documentId: id,
                    change: {
                        doc: writeDoc,
                        id,
                        operation: 'INSERT',
                        previous: null
                    },
                    startTime,
                    endTime: now()
                });
                ret.success.set(id, writeDoc as any);
            } else {
                // update existing document
                const revInDb: string = documentInDb._rev;
                if (
                    !writeRow.previous ||
                    revInDb !== writeRow.previous._rev
                ) {
                    // conflict error
                    const err: RxStorageBulkWriteError<RxDocType> = {
                        isError: true,
                        status: 409,
                        documentId: id,
                        writeRow: writeRow
                    };
                    ret.error.set(id, err);
                } else {
                    const newRevHeight = getHeightOfRevision(revInDb) + 1;
                    const newRevision = newRevHeight + '-' + createRevision(writeRow.document, true);
                    const writeDoc = Object.assign(
                        {},
                        documentInDb,
                        writeRow.document,
                        {
                            _rev: newRevision,
                            // TODO attachments are currently not working with lokijs
                            _attachments: {}
                        }
                    );
                    collection.update(writeDoc);
                    this.addChangeDocumentMeta(id);


                    let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
                    if (writeRow.previous._deleted && !writeDoc._deleted) {
                        change = {
                            id,
                            operation: 'INSERT',
                            previous: null,
                            doc: writeDoc
                        };
                    } else if (!writeRow.previous._deleted && !writeDoc._deleted) {
                        change = {
                            id,
                            operation: 'UPDATE',
                            previous: writeRow.previous,
                            doc: writeDoc
                        };
                    } else if (!writeRow.previous._deleted && writeDoc._deleted) {
                        change = {
                            id,
                            operation: 'DELETE',
                            previous: writeRow.previous,
                            doc: null
                        };
                    }
                    if (!change) {
                        throw newRxError('SNH', { args: { writeRow } });
                    }
                    this.changes$.next({
                        eventId: getLokiEventKey(false, id, newRevision),
                        documentId: id,
                        change,
                        startTime,
                        endTime: now()
                    });
                    ret.success.set(id, writeDoc as any);
                }
            }

        });

        return ret;
    }
    async bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void> {
        if (documents.length === 0) {
            throw newRxError('P3', {
                args: {
                    documents
                }
            });
        }

        /**
         * lokijs is in memory and non-async, so we emulate async behavior
         * to ensure all RxStorage implementations behave equal.
         */
        await promiseWait(0);
        const startTime = now();
        const collection = this.internals.collection;

        documents.forEach(docData => {
            const id: string = docData[this.primaryPath] as any;
            const documentInDb = collection.by(this.primaryPath, id);
            if (!documentInDb) {
                // document not here, so we can directly insert
                collection.insert(docData);
                this.changes$.next({
                    documentId: id,
                    eventId: getLokiEventKey(false, id, docData._rev),
                    change: {
                        doc: docData,
                        id,
                        operation: 'INSERT',
                        previous: null
                    },
                    startTime,
                    endTime: now()
                });
                this.addChangeDocumentMeta(id);
            } else {
                const newWriteRevision = parseRevision(docData._rev);
                const oldRevision = parseRevision(documentInDb._rev);

                let mustUpdate: boolean = false;
                if (newWriteRevision.height !== oldRevision.height) {
                    // height not equal, compare base on height
                    if (newWriteRevision.height > oldRevision.height) {
                        mustUpdate = true;
                    }
                } else if (newWriteRevision.hash > oldRevision.hash) {
                    // equal height but new write has the 'winning' hash
                    mustUpdate = true;
                }
                if (mustUpdate) {
                    const storeAtLoki = flatClone(docData) as any;
                    storeAtLoki.$loki = documentInDb.$loki;
                    collection.update(storeAtLoki);
                    let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
                    if (documentInDb._deleted && !docData._deleted) {
                        change = {
                            id,
                            operation: 'INSERT',
                            previous: null,
                            doc: docData
                        };
                    } else if (!documentInDb._deleted && !docData._deleted) {
                        change = {
                            id,
                            operation: 'UPDATE',
                            previous: documentInDb,
                            doc: docData
                        };
                    } else if (!documentInDb._deleted && docData._deleted) {
                        change = {
                            id,
                            operation: 'DELETE',
                            previous: documentInDb,
                            doc: null
                        };
                    } else if (documentInDb._deleted && docData._deleted) {
                        change = null;
                    }
                    if (change) {
                        this.changes$.next({
                            documentId: id,
                            eventId: getLokiEventKey(false, id, docData._rev),
                            change,
                            startTime,
                            endTime: now()
                        });
                        this.addChangeDocumentMeta(id);
                    }
                }
            }
        });
    }
    async findDocumentsById(ids: string[], deleted: boolean): Promise<Map<string, RxDocumentData<RxDocType>>> {
        await promiseWait(0);
        const collection = this.internals.collection;

        const ret: Map<string, RxDocumentData<RxDocType>> = new Map();
        ids.forEach(id => {
            const documentInDb = collection.by(this.primaryPath, id);
            if (
                documentInDb &&
                (!documentInDb._deleted || deleted)
            ) {
                ret.set(id, documentInDb);
            }
        });
        return ret;
    }
    async query(preparedQuery: MangoQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        let query = this.internals.collection
            .chain()
            .find(preparedQuery.selector);
        if (preparedQuery.limit) {
            query = query.limit(preparedQuery.limit);
        }
        if (preparedQuery.skip) {
            query = query.offset(preparedQuery.skip);
        }

        const foundDocuments = query.data();

        return {
            documents: foundDocuments
        };
    }
    getAttachmentData(documentId: string, attachmentId: string): Promise<BlobBuffer> {
        throw new Error('Method not implemented.');
    }
    async getChangedDocuments(
        options: ChangeStreamOnceOptions
    ): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }> {
        const desc = options.order === 'desc';
        const operator = options.order === 'asc' ? '$gt' : '$lt';
        let query = this.internals.changesCollection
            .chain()
            .find({
                sequence: {
                    [operator]: options.startSequence
                }
            })
            .simplesort(
                'sequence',
                !desc
            );
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const changedDocuments: RxStorageChangedDocumentMeta[] = query
            .data()
            .map(result => ({
                id: result.id,
                sequence: result.sequence
            }));

        const useForLastSequence = desc ? lastOfArray(changedDocuments) : changedDocuments[0];

        const ret: {
            changedDocuments: RxStorageChangedDocumentMeta[];
            lastSequence: number;
        } = {
            changedDocuments,
            lastSequence: useForLastSequence ? useForLastSequence.sequence : options.startSequence
        }

        return ret;
    }
    changeStream(): Observable<RxStorageChangeEvent<RxDocumentData<RxDocType>>> {
        return this.changes$.asObservable();
    }
    async close(): Promise<void> {
        // TODO close loki database if all collections are removed already
    }
    async remove(): Promise<void> {
        this.internals.loki.removeCollection(this.collectionName);
        this.internals.loki.removeCollection(this.collectionName + CHANGES_COLLECTION_SUFFIX);
    }

}
