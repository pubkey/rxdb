import type {
    ChangeEvent
} from 'event-reduce-js';
import {
    Subject,
    Observable
} from 'rxjs';
import {
    now,
    randomCouchString,
    PROMISE_RESOLVE_VOID,
    RX_META_LWT_MINIMUM,
    sortDocumentsByLastWriteTime
} from '../../util';
import { newRxError } from '../../rx-error';
import type {
    RxStorageInstance,
    RxStorageChangeEvent,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageBulkWriteError,
    RxStorageQueryResult,
    RxJsonSchema,
    RxStorageInstanceCreationParams,
    EventBulk,
    StringKeys,
    RxDocumentDataById,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxStorageDefaultCheckpoint
} from '../../types';
import {
    DexiePreparedQuery,
    DexieSettings,
    DexieStorageInternals
} from '../../types/plugins/dexie';
import { RxStorageDexie } from './rx-storage-dexie';
import {
    closeDexieDb,
    fromDexieToStorage,
    fromStorageToDexie,
    getDexieDbWithTables,
    getDocsInDb
} from './dexie-helper';
import { dexieQuery } from './dexie-query';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { getNewestOfDocumentStates, getUniqueDeterministicEventKey } from '../../rx-storage-helper';
import { addRxStorageMultiInstanceSupport } from '../../rx-storage-multiinstance';

let instanceId = now();

export class RxStorageInstanceDexie<RxDocType> implements RxStorageInstance<
    RxDocType,
    DexieStorageInternals,
    DexieSettings,
    RxStorageDefaultCheckpoint
> {
    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = new Subject();
    public readonly instanceId = instanceId++;
    public closed = false;

    constructor(
        public readonly storage: RxStorageDexie,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: DexieStorageInternals,
        public readonly options: Readonly<DexieSettings>,
        public readonly settings: DexieSettings
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    }

    async bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
        ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        const state = await this.internals;
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint> = {
            id: randomCouchString(10),
            events: [],
            checkpoint: null,
            context
        };

        const documentKeys: string[] = documentWrites.map(writeRow => writeRow.document[this.primaryPath] as any);
        await state.dexieDb.transaction(
            'rw',
            state.dexieTable,
            state.dexieDeletedTable,
            async () => {
                let docsInDb = await getDocsInDb<RxDocType>(this.internals, documentKeys);
                docsInDb = docsInDb.map(d => d ? fromDexieToStorage(d) : d);

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
                        /**
                         * It is possible to insert already deleted documents,
                         * this can happen on replication.
                         */
                        const insertedIsDeleted = writeRow.document._deleted ? true : false;
                        const writeDoc = Object.assign(
                            {},
                            writeRow.document,
                            {
                                _deleted: insertedIsDeleted,
                                // TODO attachments are currently not working with dexie.js
                                _attachments: {} as any
                            }
                        );
                        changesIds.push(id);
                        if (insertedIsDeleted) {
                            bulkPutDeletedDocs.push(writeDoc);
                        } else {
                            bulkPutDocs.push(writeDoc);
                            eventBulk.events.push({
                                eventId: getUniqueDeterministicEventKey(this, this.primaryPath as any, writeRow),
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

                        if (
                            (
                                !writeRow.previous
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
                                writeRow: writeRow,
                                documentInDb
                            };
                            ret.error[id] = err;
                        } else {
                            const isDeleted = !!writeRow.document._deleted;
                            const writeDoc: any = Object.assign(
                                {},
                                writeRow.document,
                                {
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
                                    doc: writeDoc
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
                                    doc: writeDoc
                                };
                            } else if (writeRow.previous && !writeRow.previous._deleted && writeDoc._deleted) {
                                /**
                                 * Set non-deleted document to deleted.
                                 */
                                bulkPutDeletedDocs.push(writeDoc);
                                bulkRemoveDocs.push(id);

                                change = {
                                    id,
                                    operation: 'DELETE',
                                    previous: writeRow.previous,
                                    doc: null
                                };
                            } else if (
                                writeRow.previous && writeRow.previous._deleted &&
                                writeRow.document._deleted
                            ) {
                                // deleted doc was overwritten with other deleted doc
                                bulkPutDeletedDocs.push(writeDoc);
                            }
                            if (!change) {
                                if (
                                    writeRow.previous && writeRow.previous._deleted &&
                                    writeRow.document._deleted
                                ) {
                                    // deleted doc got overwritten with other deleted doc -> do not send an event
                                } else {
                                    throw newRxError('SNH', { args: { writeRow } });
                                }
                            } else {
                                eventBulk.events.push({
                                    eventId: getUniqueDeterministicEventKey(this, this.primaryPath as any, writeRow),
                                    documentId: id,
                                    change,
                                    startTime,
                                    // will be filled up before the event is pushed into the changestream
                                    endTime: startTime
                                });
                            }
                            ret.success[id] = writeDoc;
                        }
                    }
                });

                await Promise.all([
                    bulkPutDocs.length > 0 ? state.dexieTable.bulkPut(bulkPutDocs.map(d => fromStorageToDexie(d))) : PROMISE_RESOLVE_VOID,
                    bulkRemoveDocs.length > 0 ? state.dexieTable.bulkDelete(bulkRemoveDocs) : PROMISE_RESOLVE_VOID,
                    bulkPutDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkPut(bulkPutDeletedDocs.map(d => fromStorageToDexie(d))) : PROMISE_RESOLVE_VOID,
                    bulkRemoveDeletedDocs.length > 0 ? state.dexieDeletedTable.bulkDelete(bulkRemoveDeletedDocs) : PROMISE_RESOLVE_VOID
                ]);
            });

        if (eventBulk.events.length > 0) {
            const lastState = getNewestOfDocumentStates(
                this.primaryPath as any,
                Object.values(ret.success)
            );
            eventBulk.checkpoint = {
                id: (lastState as any)[this.primaryPath],
                lwt: lastState._meta.lwt
            };

            const endTime = now();
            eventBulk.events.forEach(event => event.endTime = endTime);
            this.changes$.next(eventBulk);
        }

        return ret;
    }

    async findDocumentsById(
        ids: string[],
        deleted: boolean
    ): Promise<RxDocumentDataById<RxDocType>> {
        const state = await this.internals;
        const ret: RxDocumentDataById<RxDocType> = {};

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
                        ret[id] = fromDexieToStorage(documentInDb);
                    }
                });
            });
        return ret;
    }

    query(preparedQuery: DexiePreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        return dexieQuery(
            this,
            preparedQuery
        );
    }

    async getChangedDocumentsSince(
        limit: number,
        checkpoint?: RxStorageDefaultCheckpoint
    ): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: RxStorageDefaultCheckpoint;
    }[]> {
        const sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
        const sinceId = checkpoint ? checkpoint.id : '';
        const state = await this.internals;


        const [changedDocsNormal, changedDocsDeleted] = await Promise.all(
            [
                state.dexieTable,
                state.dexieDeletedTable
            ].map(async (table) => {
                const query = table
                    .where('[_meta.lwt+' + this.primaryPath + ']')
                    .above([sinceLwt, sinceId])
                    .limit(limit);
                const changedDocuments: RxDocumentData<RxDocType>[] = await query.toArray();
                return changedDocuments.map(d => fromDexieToStorage(d));
            })
        );
        let changedDocs = changedDocsNormal.concat(changedDocsDeleted);

        changedDocs = sortDocumentsByLastWriteTime(this.primaryPath as any, changedDocs);
        changedDocs = changedDocs.slice(0, limit);
        return changedDocs.map(docData => ({
            document: docData,
            checkpoint: {
                id: docData[this.primaryPath] as any,
                lwt: docData._meta.lwt
            }
        }));
    }

    async remove(): Promise<void> {
        const state = await this.internals;
        await Promise.all([
            state.dexieDeletedTable.clear(),
            state.dexieTable.clear()
        ]);
        return this.close();
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
        return this.changes$.asObservable();
    }

    async cleanup(minimumDeletedTime: number): Promise<boolean> {
        const state = await this.internals;
        await state.dexieDb.transaction(
            'rw',
            state.dexieDeletedTable,
            async () => {
                const maxDeletionTime = now() - minimumDeletedTime;
                const toRemove = await state.dexieDeletedTable
                    .where('_meta.lwt')
                    .below(maxDeletionTime)
                    .toArray();
                const removeIds: string[] = toRemove.map(doc => doc[this.primaryPath]);
                await state.dexieDeletedTable.bulkDelete(removeIds);
            }
        );

        /**
         * TODO instead of deleting all deleted docs at once,
         * only clean up some of them and return false if there are more documents to clean up.
         * This ensures that when many documents have to be purged,
         * we do not block the more important tasks too long.
         */
        return true;
    }

    getAttachmentData(_documentId: string, _attachmentId: string): Promise<string> {
        throw new Error('Attachments are not implemented in the dexie RxStorage. Make a pull request.');
    }

    async close(): Promise<void> {
        if (this.closed) {
            throw newRxError('SNH', {
                database: this.databaseName,
                collection: this.collectionName
            });
        }
        this.closed = true;
        this.changes$.complete();
        closeDexieDb(this.internals);
    }

    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return new Subject();
    }
    async resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> { }

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

    addRxStorageMultiInstanceSupport(
        params,
        instance
    );

    return instance;
}
