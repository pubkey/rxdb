
import {
    Subject,
    Observable
} from 'rxjs';
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
    RxConflictResultionTaskSolution,
    RxStorageDefaultCheckpoint,
    RxStorageCountResult,
    RxStorageInfoResult,
    PreparedQuery,
    RxConflictResultionTask
} from '../../types/index.d.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import { addRxStorageMultiInstanceSupport } from '../../rx-storage-multiinstance.ts';
import type { DenoKVIndexMeta, DenoKVPreparedQuery, DenoKVSettings, DenoKVStorageInternals } from './denokv-types.ts';
import { RxStorageDenoKV } from './index.ts';
import { CLEANUP_INDEX, DENOKV_DOCUMENT_ROOT_PATH, RX_STORAGE_NAME_DENOKV, getDenoKVIndexName } from "./denokv-helper.ts";
import { getIndexableStringMonad, getStartIndexStringFromLowerBound, increaseIndexableStringByOneQuantum } from "../../custom-index.ts";
import { batchArray, lastOfArray, toArray } from "../utils/utils-array.ts";
import { ensureNotFalsy } from "../utils/utils-other.ts";
import { randomCouchString } from "../utils/utils-string.ts";
import { getUniqueDeterministicEventKey } from "../../rx-storage-helper.ts";
import { now } from "../utils/utils-time.ts";
import { newRxError } from "../../rx-error.ts";
import { queryDenoKV } from "./denokv-query.ts";
import { INDEX_MAX } from "../../query-planner.ts";
import { PROMISE_RESOLVE_VOID } from "../utils/utils-promise.ts";
import { flatClone } from "../utils/utils-object.ts";


// const Deno = (globalThis as any).Deno;

export class RxStorageInstanceDenoKV<RxDocType> implements RxStorageInstance<
    RxDocType,
    DenoKVStorageInternals<RxDocType>,
    DenoKVSettings,
    RxStorageDefaultCheckpoint
> {
    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = new Subject();
    public closed?: Promise<void>;

    constructor(
        public readonly storage: RxStorageDenoKV,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: DenoKVStorageInternals<RxDocType>,
        public readonly options: Readonly<DenoKVSettings>,
        public readonly settings: DenoKVSettings,
        public readonly kvPromise = Deno.openKv(settings.openKvPath),
        public readonly keySpace = ['rxdb', databaseName, collectionName, schema.version].join('|'),
        public readonly kvOptions = { consistency: settings.consistencyLevel }
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    }
    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        const kv = await this.kvPromise;
        const startTime = now();
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: [],
            error: []
        };
        const eventBulkId = randomCouchString(10);
        const eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any> = {
            id: eventBulkId,
            events: [],
            checkpoint: null,
            context
        };


        /**
         * TODO is it possible to use batch operations
         * so that we do not have to create one tx per row?
         */
        await Promise.all(
            documentWrites.map(async (writeRow, rowId) => {
                const previous = writeRow.previous;
                const document = writeRow.document;
                const docId: string = writeRow.document[this.primaryPath] as any;
                const kvKey = [this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId];
                const previousDoc = await kv.get<RxDocumentData<RxDocType>>(kvKey, this.kvOptions);

                if (
                    (previousDoc.value && !writeRow.previous) ||
                    previousDoc.value && previousDoc.value._rev !== ensureNotFalsy(writeRow.previous)._rev
                ) {
                    ret.error.push({
                        documentId: docId,
                        isError: true,
                        status: 409,
                        documentInDb: previousDoc.value,
                        writeRow
                    });
                    return;
                }

                if (!previousDoc.value) {
                    // INSERT
                    const insertedIsDeleted = writeRow.document._deleted ? true : false;
                    let tx = kv.atomic();
                    tx = tx.check({ key: kvKey, versionstamp: null });

                    // insert document data
                    tx = tx.set(kvKey, writeRow.document);

                    // insert secondary indexes
                    Object.values(this.internals.indexes).forEach(indexMeta => {
                        const indexString = indexMeta.getIndexableString(writeRow.document as any);
                        tx = tx.set([this.keySpace, indexMeta.indexName, indexString], docId);
                    });

                    const commitRes = await tx.commit();

                    if (commitRes.ok) {
                        if (!insertedIsDeleted) {
                            const event = {
                                eventId: getUniqueDeterministicEventKey(
                                    eventBulkId,
                                    rowId,
                                    docId,
                                    writeRow.document
                                ),
                                documentId: docId,
                                operation: 'INSERT' as const,
                                documentData: writeRow.document,
                                previousDocumentData: undefined,
                                startTime,
                                endTime: now()
                            };
                            eventBulk.events.push(event);
                        }
                        ret.success.push(writeRow.document);
                    } else {
                        const inDbDoc = await kv.get<RxDocumentData<RxDocType>>(kvKey, this.kvOptions);
                        ret.error.push({
                            documentId: docId,
                            isError: true,
                            status: 409,
                            documentInDb: inDbDoc.value as any,
                            writeRow
                        });
                    }
                } else {
                    // UPDATE
                    let tx = kv.atomic();
                    tx = tx.check(previousDoc);

                    // insert document data
                    tx = tx.set(kvKey, writeRow.document);

                    // insert secondary indexes
                    Object.values(this.internals.indexes).forEach(indexMeta => {
                        const oldIndexString = indexMeta.getIndexableString(ensureNotFalsy(writeRow.previous));
                        const newIndexString = indexMeta.getIndexableString(writeRow.document as any);
                        if (oldIndexString !== newIndexString) {
                            tx = tx.delete([this.keySpace, indexMeta.indexName, oldIndexString]);
                            tx = tx.set([this.keySpace, indexMeta.indexName, newIndexString], docId);
                        }
                    });

                    const commitRes = await tx.commit();
                    if (commitRes.ok) {
                        let eventDocumentData: RxDocumentData<RxDocType> | undefined = null as any;
                        let previousEventDocumentData: RxDocumentData<RxDocType> | undefined = null as any;
                        let operation: 'INSERT' | 'UPDATE' | 'DELETE' = null as any;

                        if (previous && previous._deleted && !document._deleted) {
                            operation = 'INSERT';
                            eventDocumentData = document as any;
                        } else if (previous && !previous._deleted && !document._deleted) {
                            operation = 'UPDATE';
                            eventDocumentData = document as any;
                            previousEventDocumentData = previous;
                        } else if (document._deleted) {
                            operation = 'DELETE';
                            eventDocumentData = ensureNotFalsy(document) as any;
                            previousEventDocumentData = previous;
                        } else {
                            throw newRxError('SNH', { args: { writeRow } });
                        }

                        const event = {
                            eventId: getUniqueDeterministicEventKey(
                                eventBulkId,
                                rowId,
                                docId,
                                document
                            ),
                            documentId: docId,
                            documentData: eventDocumentData as RxDocumentData<RxDocType>,
                            previousDocumentData: previousEventDocumentData,
                            operation: operation,
                            startTime,
                            endTime: now()
                        };
                        eventBulk.events.push(event);
                        ret.success.push(writeRow.document);
                    } else {
                        ret.error.push({
                            documentId: docId,
                            isError: true,
                            status: 409,
                            documentInDb: previousDoc.value,
                            writeRow
                        });
                    }
                }

            })
        );

        if (eventBulk.events.length > 0) {
            const lastEvent = ensureNotFalsy(lastOfArray(eventBulk.events));
            eventBulk.checkpoint = {
                id: lastEvent.documentData[this.primaryPath],
                lwt: lastEvent.documentData._meta.lwt
            };
            this.changes$.next(eventBulk);
        }

        return ret;
    }
    async findDocumentsById(ids: string[], withDeleted: boolean): Promise<RxDocumentData<RxDocType>[]> {
        const kv = await this.kvPromise;
        const ret: RxDocumentData<RxDocType>[] = [];
        await Promise.all(
            ids.map(async (docId) => {
                const kvKey = [this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId];
                const findSingleResult = await kv.get<RxDocumentData<RxDocType>>(kvKey, this.kvOptions);
                const docInDb = findSingleResult.value;
                if (
                    docInDb &&
                    (
                        !docInDb._deleted ||
                        withDeleted
                    )
                ) {
                    ret.push(docInDb);
                }
            })
        );
        return ret;
    }
    query(preparedQuery: DenoKVPreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        return queryDenoKV(this, preparedQuery);
    }
    async count(preparedQuery: DenoKVPreparedQuery<RxDocType>): Promise<RxStorageCountResult> {
        /**
         * At this point in time (end 2023), DenoKV does not support
         * range counts. So we have to run a normal query and use the result set length.
         * @link https://github.com/denoland/deno/issues/18965
         */
        const result = await this.query(preparedQuery);
        return {
            count: result.documents.length,
            mode: 'fast'
        };
    }
    async info(): Promise<RxStorageInfoResult> {
        const kv = await this.kvPromise;
        const range = kv.list<string>({
            start: [this.keySpace, DENOKV_DOCUMENT_ROOT_PATH],
            end: [this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, INDEX_MAX]
        }, this.kvOptions);
        let totalCount = 0;
        for await (const res of range) {
            totalCount++;
        }
        return {
            totalCount
        };
    }
    getAttachmentData(documentId: string, attachmentId: string, digest: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    async getChangedDocumentsSince(limit: number, checkpoint?: RxStorageDefaultCheckpoint | undefined): Promise<{ documents: RxDocumentData<RxDocType>[]; checkpoint: RxStorageDefaultCheckpoint; }> {
        const kv = await this.kvPromise;
        const index = [
            '_meta.lwt',
            this.primaryPath as any
        ];
        const indexName = getDenoKVIndexName(index);
        const indexMeta = this.internals.indexes[indexName];
        let lowerBoundString = '';
        if (checkpoint) {
            const checkpointPartialDoc: any = {
                [this.primaryPath]: checkpoint.id,
                _meta: {
                    lwt: checkpoint.lwt
                }
            };
            lowerBoundString = indexMeta.getIndexableString(checkpointPartialDoc);
            lowerBoundString = increaseIndexableStringByOneQuantum(lowerBoundString);
        }

        const range = kv.list<string>({
            start: [this.keySpace, indexMeta.indexName, lowerBoundString],
            end: [this.keySpace, indexMeta.indexName, INDEX_MAX]
        }, {
            consistency: this.settings.consistencyLevel,
            limit,
            batchSize: this.settings.batchSize
        });
        const docIds: Deno.KvKey[] = [];
        for await (const row of range) {
            const docId = row.value;
            docIds.push([this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId]);
        }

        /**
         * We have to run in batches because without it says
         * "TypeError: too many ranges (max 10)"
         */
        const batches = batchArray(docIds, 10);
        const result: RxDocumentData<RxDocType>[] = [];

        for (const batch of batches) {
            const docs = await kv.getMany(batch);
            docs.forEach(row => {
                const docData = row.value;
                result.push(docData as any);
            });
        }

        const lastDoc = lastOfArray(result);
        return {
            documents: result,
            checkpoint: lastDoc ? {
                id: lastDoc[this.primaryPath] as any,
                lwt: lastDoc._meta.lwt
            } : checkpoint ? checkpoint : {
                id: '',
                lwt: 0
            }
        };
    }
    changeStream() {
        return this.changes$.asObservable();
    }
    async cleanup(minimumDeletedTime: number): Promise<boolean> {
        const maxDeletionTime = now() - minimumDeletedTime;
        const kv = await this.kvPromise;
        const index = CLEANUP_INDEX;
        const indexName = getDenoKVIndexName(index);
        const indexMeta = this.internals.indexes[indexName];
        const lowerBoundString = getStartIndexStringFromLowerBound(
            this.schema,
            index,
            [
                true,
                /**
                 * Do not use 0 here,
                 * because 1 is the minimum value for _meta.lwt
                 */
                1
            ],
            false
        );
        const upperBoundString = getStartIndexStringFromLowerBound(
            this.schema,
            index,
            [
                true,
                maxDeletionTime
            ],
            true
        );
        let noMoreUndeleted: boolean = true;

        const range = kv.list<string>({
            start: [this.keySpace, indexMeta.indexName, lowerBoundString],
            end: [this.keySpace, indexMeta.indexName, upperBoundString]
        }, {
            consistency: this.settings.consistencyLevel,
            batchSize: this.settings.batchSize,
            limit: this.settings.batchSize
        });

        let rangeCount = 0;
        for await (const row of range) {
            rangeCount = rangeCount + 1;
            const docId = row.value;
            const docDataResult = await kv.get<RxDocumentData<RxDocType>>([this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], this.kvOptions);
            const docData = ensureNotFalsy(docDataResult.value);
            if (
                !docData._deleted ||
                docData._meta.lwt > maxDeletionTime
            ) {
                continue;
            }


            let tx = kv.atomic();
            tx = tx.check(docDataResult);
            tx = tx.delete([this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId]);
            Object
                .values(this.internals.indexes)
                .forEach(indexMetaInner => {
                    tx = tx.delete([this.keySpace, indexMetaInner.indexName, docId]);
                });
            await tx.commit();
        }
        return noMoreUndeleted;
    }
    async close(): Promise<void> {
        if (this.closed) {
            return this.closed;
        }
        this.closed = (async () => {
            this.changes$.complete();
            const kv = await this.kvPromise;
            await kv.close();
        })();
        return this.closed;
    }
    async remove(): Promise<void> {
        ensureNotClosed(this);
        const kv = await this.kvPromise;
        const range = kv.list<any>({
            start: [this.keySpace],
            end: [this.keySpace, INDEX_MAX]
        }, {
            consistency: this.settings.consistencyLevel,
            batchSize: this.settings.batchSize
        });
        let promises: Promise<any>[] = [];
        for await (const row of range) {
            promises.push(kv.delete(row.key));
        }

        await Promise.all(promises);
        return this.close();
    }
    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return new Subject<any>().asObservable();
    }
    resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> {
        return PROMISE_RESOLVE_VOID;
    }
}



export function createDenoKVStorageInstance<RxDocType>(
    storage: RxStorageDenoKV,
    params: RxStorageInstanceCreationParams<RxDocType, DenoKVSettings>,
    settings: DenoKVSettings
): Promise<RxStorageInstanceDenoKV<RxDocType>> {
    settings = flatClone(settings);
    if (!settings.batchSize) {
        settings.batchSize = 100;
    }

    const primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);

    const indexDBs: { [indexName: string]: DenoKVIndexMeta<RxDocType>; } = {};
    const useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
    useIndexes.push([primaryPath]);
    const useIndexesFinal = useIndexes.map(index => {
        const indexAr = toArray(index);
        indexAr.unshift('_deleted');
        return indexAr;
    });
    // used for `getChangedDocumentsSince()`
    useIndexesFinal.push([
        '_meta.lwt',
        primaryPath
    ]);
    useIndexesFinal.push(CLEANUP_INDEX);
    useIndexesFinal.forEach(indexAr => {
        const indexName = getDenoKVIndexName(indexAr);
        indexDBs[indexName] = {
            indexName,
            getIndexableString: getIndexableStringMonad(params.schema, indexAr),
            index: indexAr
        };
    });

    const internals = {
        indexes: indexDBs
    };
    const instance = new RxStorageInstanceDenoKV(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        settings
    );

    addRxStorageMultiInstanceSupport(
        RX_STORAGE_NAME_DENOKV,
        params,
        instance
    );

    return Promise.resolve(instance);
}



function ensureNotClosed(
    instance: RxStorageInstanceDenoKV<any>
) {
    if (instance.closed) {
        throw new Error('RxStorageInstanceDenoKV is closed ' + instance.databaseName + '-' + instance.collectionName);
    }
}
