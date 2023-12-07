
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
    RxConflictResultionTask
} from '../../types/index.d.ts';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import { addRxStorageMultiInstanceSupport } from '../../rx-storage-multiinstance.ts';
import type {
    DenoKVIndexMeta,
    DenoKVPreparedQuery,
    DenoKVSettings,
    DenoKVStorageInternals
} from './denokv-types.ts';
import { RxStorageDenoKV } from './index.ts';
import {
    CLEANUP_INDEX,
    DENOKV_DOCUMENT_ROOT_PATH,
    DENOKV_VERSION_META_FLAG,
    RX_STORAGE_NAME_DENOKV,
    denoKvRowToDocument,
    getDenoGlobal,
    getDenoKVIndexName
} from "./denokv-helper.ts";
import {
    getIndexableStringMonad,
    getStartIndexStringFromLowerBound,
    changeIndexableStringByOneQuantum
} from "../../custom-index.ts";
import { appendToArray, batchArray, lastOfArray, toArray } from "../utils/utils-array.ts";
import { ensureNotFalsy } from "../utils/utils-other.ts";
import { categorizeBulkWriteRows } from "../../rx-storage-helper.ts";
import { now } from "../utils/utils-time.ts";
import { queryDenoKV } from "./denokv-query.ts";
import { INDEX_MAX } from "../../query-planner.ts";
import { PROMISE_RESOLVE_VOID } from "../utils/utils-promise.ts";
import { flatClone } from "../utils/utils-object.ts";


export class RxStorageInstanceDenoKV<RxDocType> implements RxStorageInstance<
    RxDocType,
    DenoKVStorageInternals<RxDocType>,
    DenoKVSettings,
    RxStorageDefaultCheckpoint
> {
    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = new Subject();
    public closed?: Promise<void>;
    public readonly kvPromise: Promise<any>;

    constructor(
        public readonly storage: RxStorageDenoKV,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: DenoKVStorageInternals<RxDocType>,
        public readonly options: Readonly<DenoKVSettings>,
        public readonly settings: DenoKVSettings,
        public readonly keySpace = ['rxdb', databaseName, collectionName, schema.version].join('|'),
        public readonly kvOptions = { consistency: settings.consistencyLevel }
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
        this.kvPromise = getDenoGlobal().openKv(settings.openKvPath).then(async (kv: any) => {
            // insert writeBlockKey
            await kv.set([this.keySpace], 1);
            return kv;
        });
    }

    /**
     * DenoKV has no transactions
     * so we have to ensure that there is no write in between our queries
     * which would confuse RxDB and return wrong query results.
     */
    async retryUntilNoWriteInBetween<T>(
        fn: () => Promise<T>
    ): Promise<T> {
        const kv = await this.kvPromise;
        while (true) {
            const writeBlockKeyBefore = await kv.get([this.keySpace], this.kvOptions);
            const writeBlockValueBefore = writeBlockKeyBefore ? writeBlockKeyBefore.value : -1;
            const result = await fn();
            const writeBlockKeyAfter = await kv.get([this.keySpace], this.kvOptions);
            const writeBlockValueAfter = writeBlockKeyAfter ? writeBlockKeyAfter.value : -1;

            if (writeBlockValueBefore === writeBlockValueAfter) {
                return result;
            }
        }
    }

    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        console.log('DNEOKV.bulkWrite()');
        const kv = await this.kvPromise;
        const primaryPath = this.primaryPath;
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: [],
            error: []
        };

        console.log('BULK WRITE:::');
        console.log(JSON.stringify(documentWrites, null, 4));

        // TODO remove this check when everything works
        documentWrites.forEach(r => {
            if (r.previous && !r.previous._meta[DENOKV_VERSION_META_FLAG]) {
                console.error('PREVIOUS DENO META NOT SET:');
                console.log(JSON.stringify(r, null, 4));
                const err = new Error('previous deno meta not set');
                console.log(err.stack);
                throw err;
            }
        });

        const batches = batchArray(documentWrites, ensureNotFalsy(this.settings.batchSize));

        /**
         * DenoKV does not have transactions
         * so we use a special writeBlock row to ensure
         * atomic writes (per document)
         * and so that we can do bulkWrites
         */
        for (const writeBatch of batches) {
            while (true) {
                const writeBlockKey = await kv.get([this.keySpace], this.kvOptions);
                const docsInDB = new Map<string, RxDocumentData<RxDocType>>();

                /**
                 * TODO the max amount for .getMany() is 10 which is defined by deno itself.
                 * How can this be increased?
                 */
                const readManyBatches = batchArray(writeBatch, 10);
                await Promise.all(
                    readManyBatches.map(async (readManyBatch) => {
                        const docsResult = await kv.getMany(
                            readManyBatch.map(writeRow => {
                                const docId: string = writeRow.document[primaryPath] as any;
                                return [this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId];
                            })
                        );
                        docsResult.map((row: any) => {
                            if (!row.value) {
                                return;
                            }
                            const docData = denoKvRowToDocument<RxDocType>(row);
                            const docId: string = docData[primaryPath] as any;
                            docsInDB.set(docId, docData);
                        });
                    })
                );
                const categorized = categorizeBulkWriteRows<RxDocType>(
                    this,
                    this.primaryPath as any,
                    docsInDB,
                    writeBatch,
                    context
                );

                let tx = kv.atomic();
                tx = tx.set([this.keySpace], ensureNotFalsy(writeBlockKey.value) + 1);

                console.log('WRITE BLOCK KEY:');
                console.log(JSON.stringify(writeBlockKey, null, 4));

                tx = tx.check(writeBlockKey);

                // INSERTS
                categorized.bulkInsertDocs.forEach(writeRow => {
                    const docId: string = writeRow.document[this.primaryPath] as any;
                    ret.success.push(writeRow.document);

                    // insert document data
                    tx = tx.set([this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], writeRow.document);

                    // insert secondary indexes
                    Object.values(this.internals.indexes).forEach(indexMeta => {
                        const indexString = indexMeta.getIndexableString(writeRow.document as any);
                        tx = tx.set([this.keySpace, indexMeta.indexId, indexString], docId);
                    });
                });
                // UPDATES
                categorized.bulkUpdateDocs.forEach((writeRow: BulkWriteRow<RxDocType>) => {
                    const docId: string = writeRow.document[this.primaryPath] as any;

                    // insert document data
                    tx = tx.set([this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], writeRow.document);

                    // insert secondary indexes
                    Object.values(this.internals.indexes).forEach(indexMeta => {
                        const oldIndexString = indexMeta.getIndexableString(ensureNotFalsy(writeRow.previous));
                        const newIndexString = indexMeta.getIndexableString(writeRow.document as any);
                        if (oldIndexString !== newIndexString) {
                            tx = tx.delete([this.keySpace, indexMeta.indexId, oldIndexString]);
                            tx = tx.set([this.keySpace, indexMeta.indexId, newIndexString], docId);
                        }
                    });
                    ret.success.push(writeRow.document as any);
                });

                const txResult = await tx.commit();
                console.dir(txResult);
                const newVersionStamp = txResult.versionstamp;

                // if (ret.success.length > 1 && ret.success.length < 10 && txResult.ok) {
                //     console.log('--------------------------');
                //     console.dir(txResult);
                //     ret.success.map(d => d[primaryPath])
                //     const checkAfterIds = documentWrites.slice(0, 10);
                //     const docsResult = await kv.getMany(
                //         checkAfterIds.map(writeRow => {
                //             const docId: string = writeRow.document[primaryPath] as any;
                //             return [this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId];
                //         })
                //     );
                //     console.log(JSON.stringify(docsResult, null, 4));
                // }

                ret.success.map(d => {
                    d = flatClone(d);
                    d._meta = flatClone(d._meta);
                    d._meta[DENOKV_VERSION_META_FLAG] = newVersionStamp;
                })

                if (txResult.ok) {
                    appendToArray(ret.error, categorized.errors);

                    categorized.eventBulk.events.forEach(ev => {
                        ev.documentData._meta[DENOKV_VERSION_META_FLAG] = newVersionStamp;
                        if (ev.previousDocumentData) {
                            // ev.previousDocumentData._meta[DENOKV_VERSION_META_FLAG] = newVersionStamp;
                        }
                    });

                    if (categorized.eventBulk.events.length > 0) {
                        const lastState = ensureNotFalsy(categorized.newestRow).document;
                        categorized.eventBulk.checkpoint = {
                            id: lastState[primaryPath],
                            lwt: lastState._meta.lwt
                        };
                        categorized.eventBulk.endTime = now();
                        this.changes$.next(categorized.eventBulk);
                    }
                    break;
                }
            }
        }

        console.log('DENO.bulkWrite() innerst return:');
        console.log(JSON.stringify(ret, null, 4));

        return ret;
    }
    async findDocumentsById(ids: string[], withDeleted: boolean): Promise<RxDocumentData<RxDocType>[]> {
        const kv = await this.kvPromise;
        const ret: RxDocumentData<RxDocType>[] = [];
        await Promise.all(
            ids.map(async (docId) => {
                const kvKey = [this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId];
                const findSingleResult = await kv.get(kvKey, this.kvOptions);
                if (!findSingleResult.value) {
                    return;
                }
                const docInDb = denoKvRowToDocument<RxDocType>(findSingleResult);
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
        return this.retryUntilNoWriteInBetween(
            () => queryDenoKV(this, preparedQuery)
        );
    }
    async count(preparedQuery: DenoKVPreparedQuery<RxDocType>): Promise<RxStorageCountResult> {
        /**
         * At this point in time (end 2023), DenoKV does not support
         * range counts. So we have to run a normal query and use the result set length.
         * @link https://github.com/denoland/deno/issues/18965
         */
        const result = await this.retryUntilNoWriteInBetween(
            () => this.query(preparedQuery)
        );
        return {
            count: result.documents.length,
            mode: 'fast'
        };
    }
    async info(): Promise<RxStorageInfoResult> {
        return this.retryUntilNoWriteInBetween(
            async () => {
                const kv = await this.kvPromise;
                const range = kv.list({
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
        );
    }
    getAttachmentData(documentId: string, attachmentId: string, digest: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    async getChangedDocumentsSince(limit: number, checkpoint?: RxStorageDefaultCheckpoint | undefined): Promise<{ documents: RxDocumentData<RxDocType>[]; checkpoint: RxStorageDefaultCheckpoint; }> {
        return this.retryUntilNoWriteInBetween(
            async () => {
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
                    lowerBoundString = changeIndexableStringByOneQuantum(lowerBoundString, 1);
                }

                const range = kv.list({
                    start: [this.keySpace, indexMeta.indexId, lowerBoundString],
                    end: [this.keySpace, indexMeta.indexId, INDEX_MAX]
                }, {
                    consistency: this.settings.consistencyLevel,
                    limit,
                    batchSize: this.settings.batchSize
                });
                const docIds: any[] = [];
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
                    docs.forEach((row: any) => {
                        const docData = denoKvRowToDocument<RxDocType>(row);
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
            });
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

        const range = kv.list({
            start: [this.keySpace, indexMeta.indexId, lowerBoundString],
            end: [this.keySpace, indexMeta.indexId, upperBoundString]
        }, {
            consistency: this.settings.consistencyLevel,
            batchSize: this.settings.batchSize,
            limit: this.settings.batchSize
        });

        let rangeCount = 0;
        for await (const row of range) {
            rangeCount = rangeCount + 1;
            const docId = row.value;
            const docDataResult = await kv.get([this.keySpace, DENOKV_DOCUMENT_ROOT_PATH, docId], this.kvOptions);
            if (!docDataResult.value) {
                continue;
            }
            const docData = denoKvRowToDocument<RxDocType>(docDataResult);
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
                    tx = tx.delete([this.keySpace, indexMetaInner.indexId, docId]);
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
        const range = kv.list({
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



export async function createDenoKVStorageInstance<RxDocType>(
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
    useIndexesFinal.forEach((indexAr, indexId) => {
        const indexName = getDenoKVIndexName(indexAr);
        indexDBs[indexName] = {
            indexId: '|' + indexId + '|',
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

    await addRxStorageMultiInstanceSupport(
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
