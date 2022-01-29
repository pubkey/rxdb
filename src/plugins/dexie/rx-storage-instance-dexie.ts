import type {
    ChangeEvent
} from 'event-reduce-js';
import {
    Subject,
    Observable
} from 'rxjs';
import {
    createRevision,
    getHeightOfRevision,
    parseRevision,
    lastOfArray,
    flatClone,
    now,
    randomCouchString,
    PROMISE_RESOLVE_VOID,
    promiseWait
} from '../../util';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import type {
    RxStorageInstance,
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
    RxStorageChangedDocumentMeta,
    RxStorageInstanceCreationParams,
    EventBulk,
    PreparedQuery
} from '../../types';
import { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageDexie, RxStorageDexieStatics } from './rx-storage-dexie';
import {
    closeDexieDb,
    DEXIE_DOCS_TABLE_NAME,
    getDexieDbWithTables,
    getDexieEventKey,
    getDocsInDb,
    stripDexieKey
} from './dexie-helper';
import { getDexieKeyRange } from './query/dexie-query';
import { pouchSwapIdToPrimaryString } from '../pouchdb';

let instanceId = now();

export class RxStorageInstanceDexie<RxDocType> implements RxStorageInstance<
    RxDocType,
    DexieStorageInternals,
    DexieSettings
> {
    public readonly primaryPath: keyof RxDocType;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> = new Subject();
    public readonly instanceId = instanceId++;
    public closed = false;

    constructor(
        public readonly storage: RxStorageDexie,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
        public readonly internals: DexieStorageInternals,
        public readonly options: Readonly<DexieSettings>,
        public readonly settings: DexieSettings
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    }

    /**
     * Adds entries to the changes feed
     * that can be queried to check which documents have been
     * changed since sequence X.
     */
    private async addChangeDocumentsMeta(ids: string[]) {
        const state = await this.internals;
        const addDocs = ids.map(id => ({ id }));
        return state.dexieChangesTable.bulkPut(addDocs);
    }

    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        const state = await this.internals;
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
            id: randomCouchString(10),
            events: []
        };

        const documentKeys: string[] = documentWrites.map(writeRow => writeRow.document[this.primaryPath] as any);
        await state.dexieDb.transaction(
            'rw',
            state.dexieTable,
            state.dexieDeletedTable,
            state.dexieChangesTable,
            async () => {
                const docsInDb = await getDocsInDb<RxDocType>(this.internals, documentKeys);

                /**
                 * Batch up the database operations
                 * so we can later run them in bulk.
                 */
                const bulkPutDocs: any[] = [];
                const bulkRemoveDocs: string[] = [];
                const bulkPutDeletedDocs: any[] = [];
                const bulkRemoveDeletedDocs: string[] = [];
                const changesIds: string[] = [];

                documentWrites.forEach((writeRow, docIndex) => {
                    const id: string = writeRow.document[this.primaryPath] as any;
                    const startTime = now();
                    const documentInDb = docsInDb[docIndex];
                    if (!documentInDb) {
                        // insert new document
                        const newRevision = '1-' + createRevision(writeRow.document);
                        /**
                         * It is possible to insert already deleted documents,
                         * this can happen on replication.
                         */
                        const insertedIsDeleted = writeRow.document._deleted ? true : false;
                        const writeDoc = Object.assign(
                            {},
                            writeRow.document,
                            {
                                _rev: newRevision,
                                _deleted: insertedIsDeleted,
                                // TODO attachments are currently not working with lokijs
                                _attachments: {} as any
                            }
                        );
                        const insertData: any = flatClone(writeDoc);
                        insertData.$lastWriteAt = startTime;
                        changesIds.push(id);
                        if (insertedIsDeleted) {
                            bulkPutDeletedDocs.push(insertData);
                        } else {
                            bulkPutDocs.push(insertData);
                            eventBulk.events.push({
                                eventId: getDexieEventKey(false, id, newRevision),
                                documentId: id,
                                change: {
                                    doc: writeDoc,
                                    id,
                                    operation: 'INSERT',
                                    previous: null
                                },
                                startTime,
                                // will be filled up before the event is pushed into the changestream
                                endTime: startTime
                            });
                        }
                        ret.success[id] = writeDoc;
                    } else {
                        // update existing document
                        const revInDb: string = documentInDb._rev;

                        // inserting a deleted document is possible
                        // without sending the previous data.
                        if (!writeRow.previous && documentInDb._deleted) {
                            writeRow.previous = documentInDb;
                        }

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
                            // conflict error
                            const err: RxStorageBulkWriteError<RxDocType> = {
                                isError: true,
                                status: 409,
                                documentId: id,
                                writeRow: writeRow
                            };
                            ret.error[id] = err;
                        } else {
                            const newRevHeight = getHeightOfRevision(revInDb) + 1;
                            const newRevision = newRevHeight + '-' + createRevision(writeRow.document);
                            const isDeleted = !!writeRow.document._deleted;
                            const writeDoc: any = Object.assign(
                                {},
                                writeRow.document,
                                {
                                    $lastWriteAt: startTime,
                                    _rev: newRevision,
                                    _deleted: isDeleted,
                                    // TODO attachments are currently not working with lokijs
                                    _attachments: {}
                                }
                            );
                            changesIds.push(id);
                            let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
                            if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
                                /**
                                 * Insert document that was deleted before.
                                 */
                                bulkPutDocs.push(writeDoc);
                                bulkRemoveDeletedDocs.push(id);
                                change = {
                                    id,
                                    operation: 'INSERT',
                                    previous: null,
                                    doc: stripDexieKey(writeDoc)
                                };
                            } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
                                /**
                                 * Update existing non-deleted document
                                 */
                                bulkPutDocs.push(writeDoc);
                                change = {
                                    id,
                                    operation: 'UPDATE',
                                    previous: writeRow.previous,
                                    doc: stripDexieKey(writeDoc)
                                };
                            } else if (writeRow.previous && !writeRow.previous._deleted && writeDoc._deleted) {
                                /**
                                 * Set non-deleted document to deleted.
                                 */
                                bulkPutDeletedDocs.push(writeDoc);
                                bulkRemoveDocs.push(id);

                                /**
                                 * On delete, we send the 'new' rev in the previous property,
                                 * to have the equal behavior as pouchdb.
                                 */
                                const previous = flatClone(writeRow.previous);
                                previous._rev = newRevision;
                                change = {
                                    id,
                                    operation: 'DELETE',
                                    previous,
                                    doc: null
                                };
                            }
                            if (!change) {
                                throw newRxError('SNH', { args: { writeRow } });
                            }
                            eventBulk.events.push({
                                eventId: getDexieEventKey(false, id, newRevision),
                                documentId: id,
                                change,
                                startTime,
                                // will be filled up before the event is pushed into the changestream
                                endTime: startTime
                            });
                            ret.success[id] = stripDexieKey(writeDoc);
                        }
                    }
                });

                await Promise.all([
                    bulkPutDocs.length > 0 ? state.dexieTable.bulkPut(bulkPutDocs) : PROMISE_RESOLVE_VOID,
                    bulkRemoveDocs.length > 0 ? state.dexieTable.bulkDelete(bulkRemoveDocs) : PROMISE_RESOLVE_VOID,
                    bulkPutDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkPut(bulkPutDeletedDocs) : PROMISE_RESOLVE_VOID,
                    bulkRemoveDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkDelete(bulkRemoveDeletedDocs) : PROMISE_RESOLVE_VOID,
                    changesIds.length > 0 ? this.addChangeDocumentsMeta(changesIds) : PROMISE_RESOLVE_VOID
                ]);
            });

        const endTime = now();
        eventBulk.events.forEach(event => event.endTime = endTime);
        this.changes$.next(eventBulk);

        return ret;
    }

    async bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void> {
        const state = await this.internals;
        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
            id: randomCouchString(10),
            events: []
        };
        const documentKeys: string[] = documents.map(writeRow => writeRow[this.primaryPath] as any);
        await state.dexieDb.transaction(
            'rw',
            state.dexieTable,
            state.dexieDeletedTable,
            state.dexieChangesTable,
            async () => {
                const docsInDb = await getDocsInDb<RxDocType>(this.internals, documentKeys);

                /**
                 * Batch up the database operations
                 * so we can later run them in bulk.
                 */
                const bulkPutDocs: any[] = [];
                const bulkRemoveDocs: string[] = [];
                const bulkPutDeletedDocs: any[] = [];
                const bulkRemoveDeletedDocs: string[] = [];
                const changesIds: string[] = [];

                documents.forEach((docData, docIndex) => {
                    const startTime = now();
                    const documentInDb = docsInDb[docIndex];
                    const id: string = docData[this.primaryPath] as any;

                    if (!documentInDb) {
                        // document not here, so we can directly insert
                        const insertData: any = flatClone(docData);
                        insertData.$lastWriteAt = startTime;

                        if (insertData._deleted) {
                            bulkPutDeletedDocs.push(insertData);
                        } else {
                            bulkPutDocs.push(insertData);
                        }

                        eventBulk.events.push({
                            documentId: id,
                            eventId: getDexieEventKey(false, id, docData._rev),
                            change: {
                                doc: docData,
                                id,
                                operation: 'INSERT',
                                previous: null
                            },
                            startTime,
                            // will be filled up before the event is pushed into the changestream
                            endTime: startTime
                        });
                        changesIds.push(id);
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
                            const storeAtDb = flatClone(docData) as any;
                            storeAtDb.$lastWriteAt = startTime;
                            let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
                            if (documentInDb._deleted && !docData._deleted) {
                                bulkRemoveDeletedDocs.push(id);
                                bulkPutDocs.push(docData);
                                change = {
                                    id,
                                    operation: 'INSERT',
                                    previous: null,
                                    doc: docData
                                };
                            } else if (!documentInDb._deleted && !docData._deleted) {
                                bulkPutDocs.push(docData);
                                change = {
                                    id,
                                    operation: 'UPDATE',
                                    previous: stripDexieKey(documentInDb),
                                    doc: docData
                                };
                            } else if (!documentInDb._deleted && docData._deleted) {
                                bulkPutDeletedDocs.push(docData);
                                bulkRemoveDocs.push(id);
                                change = {
                                    id,
                                    operation: 'DELETE',
                                    previous: stripDexieKey(documentInDb),
                                    doc: null
                                };
                            } else if (documentInDb._deleted && docData._deleted) {
                                change = null;
                            }
                            if (change) {
                                eventBulk.events.push({
                                    documentId: id,
                                    eventId: getDexieEventKey(false, id, docData._rev),
                                    change,
                                    startTime,
                                    // will be filled up before the event is pushed into the changestream
                                    endTime: startTime
                                });
                                changesIds.push(id);
                            }
                        }
                    }
                });
                await Promise.all([
                    bulkPutDocs.length > 0 ? state.dexieTable.bulkPut(bulkPutDocs) : PROMISE_RESOLVE_VOID,
                    bulkRemoveDocs.length > 0 ? state.dexieTable.bulkDelete(bulkRemoveDocs) : PROMISE_RESOLVE_VOID,
                    bulkPutDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkPut(bulkPutDeletedDocs) : PROMISE_RESOLVE_VOID,
                    bulkRemoveDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkDelete(bulkRemoveDeletedDocs) : PROMISE_RESOLVE_VOID,
                    this.addChangeDocumentsMeta(changesIds)
                ]);
            });

        const endTime = now();
        eventBulk.events.forEach(event => event.endTime = endTime);
        this.changes$.next(eventBulk);
    }

    async findDocumentsById(
        ids: string[],
        deleted: boolean
    ): Promise<{ [documentId: string]: RxDocumentData<RxDocType> }> {
        const state = await this.internals;
        const ret: { [documentId: string]: RxDocumentData<RxDocType> } = {};

        await state.dexieDb.transaction(
            'r',
            state.dexieTable,
            state.dexieDeletedTable,
            async () => {
                let docsInDb: RxDocumentData<RxDocType>[];
                if (deleted) {
                    docsInDb = await getDocsInDb<RxDocType>(this.internals, ids);
                } else {
                    docsInDb = await state.dexieTable.bulkGet(ids)
                }
                ids.forEach((id, idx) => {
                    const documentInDb = docsInDb[idx];
                    if (
                        documentInDb &&
                        (!documentInDb._deleted || deleted)
                    ) {
                        ret[id] = stripDexieKey(documentInDb);
                    }
                });
            });
        return ret;
    }

    /**
     * TODO atm we run over the whole store to retrieve the matching documents.
     * We should use a query planner like pouchdb has and then only iterate
     * over the best index and between the keys.
     */
    async query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        const state = await this.internals;
        const queryMatcher = RxStorageDexieStatics.getQueryMatcher(
            this.schema,
            preparedQuery
        );
        const sortComparator = RxStorageDexieStatics.getSortComparator(this.schema, preparedQuery);

        const queryPlan = (preparedQuery as any).pouchQueryPlan;
        const keyRange = getDexieKeyRange(
            queryPlan,
            Number.NEGATIVE_INFINITY,
            (state.dexieDb as any)._maxKey,
            (state.dexieDb as any)._options.IDBKeyRange
        );



            await promiseWait(100);

        console.log('query plan:');
        console.log(JSON.stringify(queryPlan, null, 4));

        console.log('keyRange:');
        console.dir(keyRange);

        console.log('testKeyRange:');
        const testKeyRange = (state.dexieDb as any)._options.IDBKeyRange.lowerBound('', true);
        console.dir(testKeyRange);


        const nativeIndexedDB = state.dexieDb.backendDB();
        const trans = nativeIndexedDB.transaction([DEXIE_DOCS_TABLE_NAME], 'readonly');
        const store = trans.objectStore(DEXIE_DOCS_TABLE_NAME);
        console.dir(store);
        const queryPlanFields: string[] = queryPlan.index.def.fields
            .map((fieldObj: any) => Object.keys(fieldObj)[0])
            .map((field: any) => pouchSwapIdToPrimaryString(this.primaryPath, field));
        let index: any;
        if (
            queryPlanFields.length === 1 &&
            queryPlanFields[0] === this.primaryPath
        ) {
            index = store;
            console.log('------> use default store as index');
        } else {
            let indexName: string;
            if (queryPlanFields.length === 1) {
                indexName = queryPlanFields[0];
            } else {
                indexName = '[' + queryPlanFields.join('+') + ']';
            }
            console.log('------> use index: ' + indexName);
            index = store.index(indexName);
        }


        const cursorReq = index.openCursor(keyRange);
        const rows: any[] = [];
        await new Promise<void>(res => {
            cursorReq.onsuccess = function (e: any) {
                const cursor = e.target.result;
                if (cursor) {
                    // We have a record in cursor.value
                    rows.push(cursor.value);
                    cursor.continue();
                } else {
                    // Iteration complete
                    res();
                }
            };
        });

        console.log('cursor rows:');
        console.dir(rows);


        const docsInDb = await state.dexieTable.filter(queryMatcher).toArray();
        let documents = docsInDb
            .map(docData => stripDexieKey(docData))
            .sort(sortComparator);

        if (preparedQuery.skip) {
            documents = documents.slice(preparedQuery.skip);
        }
        if (preparedQuery.limit && documents.length > preparedQuery.limit) {
            documents = documents.slice(0, preparedQuery.limit);
        }

        console.log('return rows:');
        console.dir(documents);

        if (documents.length > rows.length) {
            throw new Error('documents.length > rows.length');
        }

        return {
            documents
        };
    }

    async getChangedDocuments(
        options: ChangeStreamOnceOptions
    ): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }> {
        const state = await this.internals;
        let lastSequence: number = 0;

        let query;
        if (options.direction === 'before') {
            query = state.dexieChangesTable
                .where('sequence')
                .below(options.sinceSequence)
                .reverse();
        } else {
            query = state.dexieChangesTable
                .where('sequence')
                .above(options.sinceSequence);
        }

        if (options.limit) {
            query = (query as any).limit(options.limit);
        }

        const changedDocuments: RxStorageChangedDocumentMeta[] = await query.toArray();

        if (changedDocuments.length === 0) {
            lastSequence = options.sinceSequence;
        } else {
            const useForLastSequence = options.direction === 'after' ? lastOfArray(changedDocuments) : changedDocuments[0];
            lastSequence = useForLastSequence.sequence;
        }

        return {
            lastSequence,
            changedDocuments
        }
    }

    async remove(): Promise<void> {
        const state = await this.internals;
        await Promise.all([
            state.dexieChangesTable.clear(),
            state.dexieTable.clear()
        ]);
        return this.close();
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> {
        return this.changes$.asObservable();
    }

    getAttachmentData(_documentId: string, _attachmentId: string): Promise<BlobBuffer> {
        throw new Error('Attachments are not implemented in the dexie RxStorage. Make a pull request.');
    }

    async close(): Promise<void> {
        this.closed = true;
        this.changes$.complete();
        closeDexieDb(this.internals);
    }
}


export async function createDexieStorageInstance<RxDocType>(
    storage: RxStorageDexie,
    params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>,
    settings: DexieSettings
): Promise<RxStorageInstanceDexie<RxDocType>> {
    const internals = getDexieDbWithTables(
        params.databaseName,
        params.collectionName,
        settings,
        params.schema
    );

    const instance = new RxStorageInstanceDexie(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        settings
    );

    return instance;
}
