import type {
    ChangeEvent
} from 'event-reduce-js';
import {
    Subject,
    Observable
} from 'rxjs';
import {
    promiseWait,
    createRevision,
    getHeightOfRevision,
    parseRevision,
    lastOfArray,
    flatClone,
    now,
    ensureNotFalsy,
    randomCouchString,
    isMaybeReadonlyArray
} from '../../util';
import { newRxError } from '../../rx-error';
import {
    Dexie,
    Table as DexieTable
} from 'dexie';
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
import { RxStorageDexie } from './rx-storage-dexie';
import { getDexieDbByName, getDexieEventKey, getDexieStoreSchema, stripDexieKey } from './dexie-helper';

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
     * Adds an entry to the changes feed
     * that can be queried to check which documents have been
     * changed since sequence X.
     */
    private async addChangeDocumentMeta(id: string) {
        // TODO
    }

    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>> = {
            id: randomCouchString(10),
            events: []
        };

        const documentKeys: string[] = documentWrites.map(writeRow => writeRow.document[this.primaryPath] as any);
        await this.internals.dexieDb.transaction('rw', this.internals.dexieTable, async () => {
            const docsInDb = await this.internals.dexieTable.bulkGet(documentKeys);
            const bulkPutData: any[] = [];
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
                        this.addChangeDocumentMeta(id);
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
                        this.addChangeDocumentMeta(id);

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
            await this.internals.dexieTable.bulkPut(bulkPutData);
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
        await this.internals.dexieDb.transaction('rw', this.internals.dexieTable, async () => {
            const docsInDb = await this.internals.dexieTable.bulkGet(documentKeys);
            const bulkPutData: any[] = [];
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
                            this.addChangeDocumentMeta(id);
                        }
                    }
                }
            });
            await this.internals.dexieTable.bulkPut(bulkPutData);
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

        const docsInDb = await this.internals.dexieTable.bulkGet(ids);
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

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> {
        return this.changes$.asObservable();
    }

    getAttachmentData(_documentId: string, _attachmentId: string): Promise<BlobBuffer> {
        throw new Error('Attachments are not implemented in the dexie RxStorage. Make a pull request.');
    }

    async close(): Promise<void> {
        this.closed = true;
        this.changes$.complete();
        // TODO close dexie db if no more pointers to the database
    }
}


export async function createDexieStorageInstance<RxDocType>(
    storage: RxStorageDexie,
    params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>,
    settings: DexieSettings
): Promise<RxStorageInstanceDexie<RxDocType>> {

    const dexieDb = getDexieDbByName(params.databaseName, settings);

    dexieDb.version(1).stores({
        [params.collectionName]: getDexieStoreSchema(params.schema)
    });
    const dexieTable = (dexieDb as any)[params.collectionName];

    const internals: DexieStorageInternals = {
        dexieDb,
        dexieTable
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
