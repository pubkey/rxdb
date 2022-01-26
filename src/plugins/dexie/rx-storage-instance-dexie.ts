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
    randomCouchString
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
    EventBulk
} from '../../types';
import { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageDexie, RxStorageDexieStatics } from './rx-storage-dexie';
import {
    closeDexieDb,
    DEXIE_CHANGES_TABLE_NAME,
    DEXIE_DOCS_TABLE_NAME,
    getDexieDbWithTables,
    getDexieEventKey,
    stripDexieKey
} from './dexie-helper';

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
        const addDocs = ids.map(id => ({ id }));
        console.log('addChangeDocumentsMeta():');
        console.dir(addDocs);
        return this.internals.dexieChangesTable.bulkPut(addDocs);
    }

    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        console.log('bulkWrite()');
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
            id: randomCouchString(10),
            events: []
        };

        const documentKeys: string[] = documentWrites.map(writeRow => writeRow.document[this.primaryPath] as any);
        await this.internals.dexieDb.transaction(
            'rw',
            this.internals.dexieTable,
            this.internals.dexieChangesTable,
            async () => {
                console.log('bulkWrite() doc keys (' + this.collectionName + '):');
                console.dir(documentKeys);
                const docsInDb = await this.internals.dexieTable.bulkGet(documentKeys);
                const bulkPutData: any[] = [];
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
                        bulkPutData.push(insertData);

                        if (!insertedIsDeleted) {
                            changesIds.push(id);
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
                            bulkPutData.push(writeDoc);
                            changesIds.push(id);

                            let change: ChangeEvent<RxDocumentData<RxDocType>> | null = null;
                            if (writeRow.previous && writeRow.previous._deleted && !writeDoc._deleted) {
                                change = {
                                    id,
                                    operation: 'INSERT',
                                    previous: null,
                                    doc: stripDexieKey(writeDoc)
                                };
                            } else if (writeRow.previous && !writeRow.previous._deleted && !writeDoc._deleted) {
                                change = {
                                    id,
                                    operation: 'UPDATE',
                                    previous: writeRow.previous,
                                    doc: stripDexieKey(writeDoc)
                                };
                            } else if (writeRow.previous && !writeRow.previous._deleted && writeDoc._deleted) {
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
                    this.internals.dexieTable.bulkPut(bulkPutData),
                    this.addChangeDocumentsMeta(changesIds)
                ]);
            });

        const endTime = now();
        eventBulk.events.forEach(event => event.endTime = endTime);
        this.changes$.next(eventBulk);

        return ret;
    }

    async bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void> {
        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
            id: randomCouchString(10),
            events: []
        };
        const documentKeys: string[] = documents.map(writeRow => writeRow[this.primaryPath] as any);
        await this.internals.dexieDb.transaction(
            'rw',
            this.internals.dexieTable,
            this.internals.dexieChangesTable,
            async () => {
                const docsInDb = await this.internals.dexieTable.bulkGet(documentKeys);
                const bulkPutData: any[] = [];
                const changesIds: string[] = [];
                documents.forEach((docData, docIndex) => {
                    const startTime = now();
                    const documentInDb = docsInDb[docIndex];
                    const id: string = docData[this.primaryPath] as any;

                    if (!documentInDb) {
                        // document not here, so we can directly insert
                        const insertData: any = flatClone(docData);
                        insertData.$lastWriteAt = startTime;
                        bulkPutData.push(insertData);
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
                            bulkPutData.push(storeAtDb);
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
                                    previous: stripDexieKey(documentInDb),
                                    doc: docData
                                };
                            } else if (!documentInDb._deleted && docData._deleted) {
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
                    this.internals.dexieTable.bulkPut(bulkPutData),
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
        const ret: { [documentId: string]: RxDocumentData<RxDocType> } = {};
        const docsInDb = await (this.internals.dexieDb as any)[DEXIE_DOCS_TABLE_NAME].bulkGet(ids);
        ids.forEach((id, idx) => {
            const documentInDb = docsInDb[idx];
            if (
                documentInDb &&
                (!documentInDb._deleted || deleted)
            ) {
                ret[id] = stripDexieKey(documentInDb);
            }
        });
        return ret;
    }

    /**
     * TODO atm we run over the whole store to retrieve the matching documents.
     * We should use a query planner like pouchdb has and then only iterate
     * over the best index and between the keys.
     */
    async query(preparedQuery: MangoQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        const queryMatcher = RxStorageDexieStatics.getQueryMatcher(
            this.schema,
            preparedQuery
        );
        const sortComparator = RxStorageDexieStatics.getSortComparator(this.schema, preparedQuery);
        const docsInDb = await this.internals.dexieTable.filter(queryMatcher).toArray();
        const documents = docsInDb
            .map(docData => stripDexieKey(docData))
            .sort(sortComparator);

        console.log('query result:');
        console.dir(documents);
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
        let lastSequence: number = 0;

        let query;
        if (options.direction === 'before') {
            query = this.internals.dexieChangesTable
                .where('sequence')
                .below(options.sinceSequence)
                .reverse();
        } else {
            query = this.internals.dexieChangesTable
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
        await Promise.all([
            this.internals.dexieChangesTable.clear(),
            this.internals.dexieTable.clear()
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
        closeDexieDb(this.internals.dexieDb);
    }
}


export async function createDexieStorageInstance<RxDocType>(
    storage: RxStorageDexie,
    params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>,
    settings: DexieSettings
): Promise<RxStorageInstanceDexie<RxDocType>> {
    const dexieDb = getDexieDbWithTables(
        params.databaseName,
        params.collectionName,
        settings,
        params.schema
    );

    const dexieTable = (dexieDb as any)[DEXIE_DOCS_TABLE_NAME];
    const dexieChangesTable = (dexieDb as any)[DEXIE_CHANGES_TABLE_NAME];

    const internals: DexieStorageInternals = {
        dexieDb,
        dexieTable,
        dexieChangesTable
    };

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
