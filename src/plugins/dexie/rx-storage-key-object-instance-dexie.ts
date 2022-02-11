import type { ChangeEvent } from 'event-reduce-js';
import { Observable, Subject } from 'rxjs';
import type {
    BulkWriteLocalRow,
    DexieSettings,
    DexieStorageInternals,
    EventBulk,
    RxKeyObjectStorageInstanceCreationParams,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorageBulkWriteLocalError,
    RxStorageChangeEvent,
    RxStorageKeyObjectInstance
} from '../../types';
import {
    createRevision,
    flatClone,
    now,
    parseRevision,
    randomCouchString
} from '../../util';
import {
    closeDexieDb,
    getDexieDbWithTables,
    getDexieEventKey,
    stripDexieKey
} from './dexie-helper';
import { RxStorageDexie } from './rx-storage-dexie';

let instanceId = 1;
export class RxStorageKeyObjectInstanceDexie implements RxStorageKeyObjectInstance<DexieStorageInternals, DexieSettings> {
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxLocalDocumentData>>> = new Subject();

    public instanceId = instanceId++;
    public closed = false;

    constructor(
        public readonly storage: RxStorageDexie,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: DexieStorageInternals,
        public readonly options: Readonly<DexieSettings>,
        public readonly settings: DexieSettings
    ) {

    }

    async bulkWrite<RxDocType>(
        documentWrites: BulkWriteLocalRow<RxDocType>[]
    ): Promise<RxLocalStorageBulkWriteResponse<RxDocType>> {
        const state = await this.internals;
        const ret: RxLocalStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        const eventBulk: EventBulk<RxStorageChangeEvent<RxLocalDocumentData>> = {
            id: randomCouchString(10),
            events: []
        };
        const documentKeys: string[] = documentWrites.map(writeRow => writeRow.document._id);
        const bulkPutData: any[] = [];
        await state.dexieDb.transaction(
            'rw',
            state.dexieTable,
            async () => {
                const startTime = now();
                const docsInDb = await state.dexieTable.bulkGet(documentKeys);

                const successDocs: {
                    writeRow: BulkWriteLocalRow<RxDocType>;
                    previous: any;
                    newRevision: string;
                }[] = [];
                documentWrites.forEach((writeRow, writeRowIdx) => {
                    const writeDoc = flatClone(writeRow.document);
                    const id = writeDoc._id;
                    const docInDb = docsInDb[writeRowIdx];
                    const previous = writeRow.previous ? writeRow.previous : docInDb;
                    const newRevHeight = previous ? parseRevision(previous._rev).height + 1 : 1;
                    const newRevision = newRevHeight + '-' + createRevision(writeRow.document);
                    writeDoc._rev = newRevision;

                    if (docInDb) {
                        if (
                            !writeRow.previous ||
                            docInDb._rev !== writeRow.previous._rev
                        ) {
                            // conflict error
                            const err: RxStorageBulkWriteLocalError<RxDocType> = {
                                isError: true,
                                status: 409,
                                documentId: id,
                                writeRow: writeRow
                            };
                            ret.error[id] = err;
                            return;
                        } else {
                            const saveMe: any = flatClone(writeDoc);
                            saveMe.$lastWriteAt = startTime;
                            bulkPutData.push(saveMe);
                        }
                    } else {
                        const insertData: any = flatClone(writeDoc);
                        insertData.$lastWriteAt = startTime;
                        bulkPutData.push(insertData);
                    }

                    ret.success[id] = stripDexieKey(writeDoc);
                    successDocs.push({
                        writeRow,
                        previous,
                        newRevision
                    });
                });

                await state.dexieTable.bulkPut(bulkPutData);
                const endTime = now();

                successDocs.forEach(sucessRow => {
                    const writeRow = sucessRow.writeRow;
                    const writeDoc = writeRow.document;
                    const id = writeDoc._id;

                    let event: ChangeEvent<RxLocalDocumentData<RxDocType>>;
                    if (!writeRow.previous) {
                        // was insert
                        event = {
                            operation: 'INSERT',
                            doc: writeDoc,
                            id: id,
                            previous: null
                        };
                    } else if (writeRow.document._deleted) {
                        // was delete

                        // we need to add the new revision to the previous doc
                        // so that the eventkey is calculated correctly.
                        // Is this a hack? idk.
                        const previousDoc = flatClone(writeRow.previous);
                        previousDoc._rev = sucessRow.newRevision;

                        event = {
                            operation: 'DELETE',
                            doc: null,
                            id,
                            previous: previousDoc
                        };
                    } else {
                        // was update
                        event = {
                            operation: 'UPDATE',
                            doc: writeDoc,
                            id: id,
                            previous: writeRow.previous
                        };
                    }

                    if (
                        writeRow.document._deleted &&
                        (
                            !writeRow.previous ||
                            writeRow.previous._deleted
                        )
                    ) {
                        /**
                         * An already deleted document was added to the storage engine,
                         * do not emit an event because it does not affect anything.
                         */
                    } else {
                        const doc: RxLocalDocumentData<RxDocType> = event.operation === 'DELETE' ? event.previous as any : event.doc as any;
                        const eventId = getDexieEventKey(true, doc._id, doc._rev ? doc._rev : '');
                        const storageChangeEvent: RxStorageChangeEvent<RxLocalDocumentData<RxDocType>> = {
                            eventId,
                            documentId: id,
                            change: event,
                            startTime,
                            endTime
                        };
                        eventBulk.events.push(storageChangeEvent);
                    }
                });
            }
        );
        this.changes$.next(eventBulk);
        return ret;
    }

    async findLocalDocumentsById<RxDocType = any>(
        ids: string[],
        withDeleted: boolean
    ): Promise<{ [documentId: string]: RxLocalDocumentData<RxDocType> }> {
        const state = await this.internals;
        const ret: { [documentId: string]: RxLocalDocumentData<RxDocType> } = {};
        const docsInDb = await state.dexieTable.bulkGet(ids);
        ids.forEach((id, idx) => {
            const documentInDb = docsInDb[idx];
            if (
                documentInDb &&
                (
                    withDeleted ||
                    !documentInDb._deleted
                )
            ) {
                ret[id] = stripDexieKey(documentInDb);
            }
        });
        return ret;
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxLocalDocumentData<{ [key: string]: any; }>>>> {
        return this.changes$.asObservable();
    }

    async close(): Promise<void> {
        this.closed = true;
        this.changes$.complete();
        closeDexieDb(this.internals);
    }

    async remove(): Promise<void> {
        const state = await this.internals;
        await Promise.all([
            state.dexieChangesTable.clear(),
            state.dexieTable.clear()
        ]);
        return this.close();
    }
}


export async function createDexieKeyObjectStorageInstance(
    storage: RxStorageDexie,
    params: RxKeyObjectStorageInstanceCreationParams<DexieSettings>,
    settings: DexieSettings
): Promise<RxStorageKeyObjectInstanceDexie> {
    const internals = getDexieDbWithTables(
        params.databaseName,
        params.collectionName,
        settings,
        {
            version: 0,
            primaryKey: '_id',
            type: 'object',
            properties: {}
        }
    );

    const instance = new RxStorageKeyObjectInstanceDexie(
        storage,
        params.databaseName,
        params.collectionName,
        internals,
        params.options,
        settings
    );

    return instance;
}
