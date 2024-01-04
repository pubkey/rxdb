import {
    Subject,
    Observable
} from 'rxjs';
import {
    now,
    PROMISE_RESOLVE_VOID,
    RX_META_LWT_MINIMUM,
    sortDocumentsByLastWriteTime,
    lastOfArray,
    ensureNotFalsy
} from '../utils/index.ts';
import type {
    RxStorageInstance,
    RxStorageChangeEvent,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageQueryResult,
    RxJsonSchema,
    RxStorageInstanceCreationParams,
    EventBulk,
    StringKeys,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxStorageDefaultCheckpoint,
    CategorizeBulkWriteRowsOutput,
    RxStorageCountResult,
    PreparedQuery
} from '../../types/index.d.ts';
import type {
    DexieSettings,
    DexieStorageInternals
} from '../../types/plugins/dexie.d.ts';
import { RxStorageDexie } from './rx-storage-dexie.ts';
import {
    attachmentObjectId,
    closeDexieDb,
    fromDexieToStorage,
    fromStorageToDexie,
    getDexieDbWithTables,
    getDocsInDb,
    RX_STORAGE_NAME_DEXIE
} from './dexie-helper.ts';
import { dexieCount, dexieQuery } from './dexie-query.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import { categorizeBulkWriteRows } from '../../rx-storage-helper.ts';
import { addRxStorageMultiInstanceSupport } from '../../rx-storage-multiinstance.ts';
import { newRxError } from '../../rx-error.ts';

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
    public closed?: Promise<void>;

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
        ensureNotClosed(this);


        /**
         * Check some assumptions to ensure RxDB
         * does not call the storage with an invalid write.
         */
        documentWrites.forEach(row => {
            // ensure revision is set
            if (
                !row.document._rev ||
                (
                    row.previous &&
                    !row.previous._rev
                )
            ) {
                throw newRxError('SNH', { args: { row } });
            }
        });



        const state = await this.internals;
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: [],
            error: []
        };

        const documentKeys: string[] = documentWrites.map(writeRow => writeRow.document[this.primaryPath] as any);
        let categorized: CategorizeBulkWriteRowsOutput<RxDocType> | undefined;
        await state.dexieDb.transaction(
            'rw',
            state.dexieTable,
            state.dexieAttachmentsTable,
            async () => {
                const docsInDbMap = new Map<string, RxDocumentData<RxDocType>>();
                const docsInDbWithInternals = await getDocsInDb<RxDocType>(this.internals, documentKeys);
                docsInDbWithInternals.forEach(docWithDexieInternals => {
                    const doc = docWithDexieInternals;
                    if (doc) {
                        docsInDbMap.set((doc as any)[this.primaryPath], doc as any);
                    }
                    return doc;
                });

                categorized = categorizeBulkWriteRows<RxDocType>(
                    this,
                    this.primaryPath as any,
                    docsInDbMap,
                    documentWrites,
                    context
                );
                ret.error = categorized.errors;

                /**
                 * Batch up the database operations
                 * so we can later run them in bulk.
                 */
                let bulkPutDocs: any[] = [];
                categorized.bulkInsertDocs.forEach(row => {
                    ret.success.push(row.document);
                    bulkPutDocs.push(row.document);
                });
                categorized.bulkUpdateDocs.forEach(row => {
                    ret.success.push(row.document);
                    bulkPutDocs.push(row.document);
                });
                bulkPutDocs = bulkPutDocs.map(d => fromStorageToDexie(state.booleanIndexes, d));
                if (bulkPutDocs.length > 0) {
                    await state.dexieTable.bulkPut(bulkPutDocs);
                }



                // handle attachments
                const putAttachments: { id: string, data: string }[] = [];
                categorized.attachmentsAdd.forEach(attachment => {
                    putAttachments.push({
                        id: attachmentObjectId(attachment.documentId, attachment.attachmentId),
                        data: attachment.attachmentData.data
                    });
                });
                categorized.attachmentsUpdate.forEach(attachment => {
                    putAttachments.push({
                        id: attachmentObjectId(attachment.documentId, attachment.attachmentId),
                        data: attachment.attachmentData.data
                    });
                });
                await state.dexieAttachmentsTable.bulkPut(putAttachments);
                await state.dexieAttachmentsTable.bulkDelete(
                    categorized.attachmentsRemove.map(attachment => attachmentObjectId(attachment.documentId, attachment.attachmentId))
                );

            });

        categorized = ensureNotFalsy(categorized);
        if (categorized.eventBulk.events.length > 0) {
            const lastState = ensureNotFalsy(categorized.newestRow).document;
            categorized.eventBulk.checkpoint = {
                id: lastState[this.primaryPath],
                lwt: lastState._meta.lwt
            };
            categorized.eventBulk.endTime = now();
            this.changes$.next(categorized.eventBulk);
        }

        return ret;
    }

    async findDocumentsById(
        ids: string[],
        deleted: boolean
    ): Promise<RxDocumentData<RxDocType>[]> {
        ensureNotClosed(this);
        const state = await this.internals;
        const ret: RxDocumentData<RxDocType>[] = [];

        await state.dexieDb.transaction(
            'r',
            state.dexieTable,
            async () => {
                const docsInDb = await getDocsInDb<RxDocType>(this.internals, ids);
                docsInDb.forEach(documentInDb => {
                    if (
                        documentInDb &&
                        (!documentInDb._deleted || deleted)
                    ) {
                        ret.push(documentInDb);
                    }
                });
            });
        return ret;
    }

    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        ensureNotClosed(this);
        return dexieQuery(
            this,
            preparedQuery
        );
    }
    async count(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        if (preparedQuery.queryPlan.selectorSatisfiedByIndex) {
            const result = await dexieCount(this, preparedQuery);
            return {
                count: result,
                mode: 'fast'
            };
        } else {
            const result = await dexieQuery(this, preparedQuery);
            return {
                count: result.documents.length,
                mode: 'slow'
            };
        }
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
        ensureNotClosed(this);
        return this.changes$.asObservable();
    }

    async cleanup(minimumDeletedTime: number): Promise<boolean> {
        ensureNotClosed(this);
        const state = await this.internals;
        await state.dexieDb.transaction(
            'rw',
            state.dexieTable,
            async () => {
                const maxDeletionTime = now() - minimumDeletedTime;
                /**
                 * TODO only fetch _deleted=true
                 */
                const toRemove = await state.dexieTable
                    .where('_meta.lwt')
                    .below(maxDeletionTime)
                    .toArray();
                const removeIds: string[] = [];
                toRemove.forEach(doc => {
                    if (doc._deleted === '1') {
                        removeIds.push(doc[this.primaryPath]);
                    }
                });
                await state.dexieTable.bulkDelete(removeIds);
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

    async getAttachmentData(documentId: string, attachmentId: string, _digest: string): Promise<string> {
        ensureNotClosed(this);
        const state = await this.internals;
        const id = attachmentObjectId(documentId, attachmentId);
        return await state.dexieDb.transaction(
            'r',
            state.dexieAttachmentsTable,
            async () => {

                const attachment = await state.dexieAttachmentsTable.get(id);
                if (attachment) {
                    return attachment.data;
                } else {
                    throw new Error('attachment missing documentId: ' + documentId + ' attachmentId: ' + attachmentId);
                }
            });
    }

    async remove(): Promise<void> {
        ensureNotClosed(this);
        const state = await this.internals;
        await state.dexieTable.clear()
        return this.close();
    }


    close(): Promise<void> {
        if (this.closed) {
            return this.closed;
        }
        this.closed = (async () => {
            this.changes$.complete();
            await closeDexieDb(this.internals);
        })();
        return this.closed;
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

    await addRxStorageMultiInstanceSupport(
        RX_STORAGE_NAME_DEXIE,
        params,
        instance
    );

    return Promise.resolve(instance);
}



function ensureNotClosed(
    instance: RxStorageInstanceDexie<any>
) {
    if (instance.closed) {
        throw new Error('RxStorageInstanceDexie is closed ' + instance.databaseName + '-' + instance.collectionName);
    }
}
