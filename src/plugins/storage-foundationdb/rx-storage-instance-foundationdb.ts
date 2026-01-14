import { Observable, Subject } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper.ts';
import type {
    BulkWriteRow,
    CategorizeBulkWriteRowsOutput,
    EventBulk,
    PreparedQuery,
    RxAttachmentWriteData,
    RxDocumentData,
    RxJsonSchema,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageDefaultCheckpoint,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    StringKeys
} from '../../types/index.d.ts';
import type {
    FoundationDBDatabase,
    FoundationDBIndexMeta,
    FoundationDBStorageInternals,
    RxStorageFoundationDB,
    RxStorageFoundationDBInstanceCreationOptions,
    RxStorageFoundationDBSettings
} from './foundationdb-types.ts';
// import {
//     open as foundationDBOpen,
//     directory as foundationDBDirectory,
//     encoders as foundationDBEncoders,
//     keySelector as foundationDBKeySelector,
//     StreamingMode as foundationDBStreamingMode
// } from 'foundationdb';
import {
    categorizeBulkWriteRows
} from '../../rx-storage-helper.ts';
import {

    CLEANUP_INDEX,
    FOUNDATION_DB_WRITE_BATCH_SIZE,
    getFoundationDBIndexName
} from './foundationdb-helpers.ts';
import {
    getIndexableStringMonad,
    getStartIndexStringFromLowerBound,
    getStartIndexStringFromUpperBound
} from '../../custom-index.ts';
import {
    appendToArray,
    batchArray,
    ensureNotFalsy,
    lastOfArray,
    now,
    PROMISE_RESOLVE_VOID,
    toArray
} from '../../plugins/utils/index.ts';
import { queryFoundationDB } from './foundationdb-query.ts';
import { INDEX_MAX } from '../../query-planner.ts';
import { attachmentMapKey } from '../storage-memory/index.ts';

export class RxStorageInstanceFoundationDB<RxDocType> implements RxStorageInstance<
    RxDocType,
    FoundationDBStorageInternals<RxDocType>,
    RxStorageFoundationDBInstanceCreationOptions,
    RxStorageDefaultCheckpoint
> {
    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;

    public closed?: Promise<void>;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = new Subject();

    constructor(
        public readonly storage: RxStorageFoundationDB,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: FoundationDBStorageInternals<RxDocType>,
        public readonly options: Readonly<RxStorageFoundationDBInstanceCreationOptions>,
        public readonly settings: RxStorageFoundationDBSettings
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    }

    async bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        const dbs = await this.internals.dbsPromise;
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            error: []
        };

        /**
         * Doing too many write in a single transaction
         * will throw with a 'Transaction exceeds byte limit'
         * so we have to batch up the writes.
         */
        const writeBatches = batchArray(documentWrites, FOUNDATION_DB_WRITE_BATCH_SIZE);
        await Promise.all(
            writeBatches.map(async (writeBatch) => {
                let categorized: CategorizeBulkWriteRowsOutput<RxDocType> | undefined = null as any;
                await dbs.root.doTransaction(async (tx: any) => {
                    const ids = writeBatch.map(row => (row.document as any)[this.primaryPath]);
                    const mainTx = tx.at(dbs.main.subspace);
                    const attachmentTx = tx.at(dbs.attachments.subspace);
                    const docsInDB = new Map<string, RxDocumentData<RxDocType>>();
                    /**
                     * This might be faster if fdb
                     * any time adds a bulk-fetch-by-key method.
                     */
                    await Promise.all(
                        ids.map(async (id) => {
                            const doc = await mainTx.get(id);
                            docsInDB.set(id, doc);
                        })
                    );
                    categorized = categorizeBulkWriteRows<RxDocType>(
                        this,
                        this.primaryPath as any,
                        docsInDB,
                        writeBatch,
                        context
                    );
                    appendToArray(ret.error, categorized.errors);

                    // INSERTS
                    categorized.bulkInsertDocs.forEach(writeRow => {
                        const docId: string = writeRow.document[this.primaryPath] as any;

                        // insert document data
                        mainTx.set(docId, writeRow.document);

                        // insert secondary indexes
                        Object.values(dbs.indexes).forEach(indexMeta => {
                            const indexString = indexMeta.getIndexableString(writeRow.document as any);
                            const indexTx = tx.at(indexMeta.db.subspace);
                            indexTx.set(indexString, docId);
                        });
                    });
                    // UPDATES
                    categorized.bulkUpdateDocs.forEach((writeRow: BulkWriteRow<RxDocType>) => {
                        const docId: string = writeRow.document[this.primaryPath] as any;

                        // overwrite document data
                        mainTx.set(docId, writeRow.document);

                        // update secondary indexes
                        Object.values(dbs.indexes).forEach(indexMeta => {
                            const oldIndexString = indexMeta.getIndexableString(ensureNotFalsy(writeRow.previous));
                            const newIndexString = indexMeta.getIndexableString(writeRow.document as any);
                            if (oldIndexString !== newIndexString) {
                                const indexTx = tx.at(indexMeta.db.subspace);
                                indexTx.delete(oldIndexString);
                                indexTx.set(newIndexString, docId);
                            }
                        });
                    });

                    // attachments
                    categorized.attachmentsAdd.forEach(attachment => {
                        attachmentTx.set(
                            attachmentMapKey(attachment.documentId, attachment.attachmentId),
                            attachment.attachmentData
                        );
                    });
                    categorized.attachmentsUpdate.forEach(attachment => {
                        attachmentTx.set(
                            attachmentMapKey(attachment.documentId, attachment.attachmentId),
                            attachment.attachmentData
                        );
                    });
                    categorized.attachmentsRemove.forEach(attachment => {
                        attachmentTx.delete(
                            attachmentMapKey(attachment.documentId, attachment.attachmentId)
                        );
                    });
                });
                categorized = ensureNotFalsy(categorized);
                /**
                 * The events must be emitted AFTER the transaction
                 * has finished.
                 * Otherwise an observable changestream might cause a read
                 * to a document that does not already exist outside of the transaction.
                 */
                if (categorized.eventBulk.events.length > 0) {
                    const lastState = ensureNotFalsy(categorized.newestRow).document;
                    categorized.eventBulk.checkpoint = {
                        id: lastState[this.primaryPath],
                        lwt: lastState._meta.lwt
                    };
                    this.changes$.next(categorized.eventBulk);
                }
            })
        );


        return ret;
    }

    async findDocumentsById(ids: string[], withDeleted: boolean): Promise<RxDocumentData<RxDocType>[]> {
        const dbs = await this.internals.dbsPromise;
        return dbs.main.doTransaction(async (tx: any) => {
            const ret: RxDocumentData<RxDocType>[] = [];
            await Promise.all(
                ids.map(async (docId) => {
                    const docInDb = await tx.get(docId);
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
        });
    }
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>> {
        return queryFoundationDB(this, preparedQuery);
    }
    async count(
        preparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        /**
         * At this point in time (end 2022), FoundationDB does not support
         * range counts. So we have to run a normal query and use the result set length.
         * @link https://github.com/apple/foundationdb/issues/5981
         */
        const result = await this.query(preparedQuery);
        return {
            count: result.documents.length,
            mode: 'fast'
        };
    }

    async getAttachmentData(documentId: string, attachmentId: string, _digest: string): Promise<string> {
        const dbs = await this.internals.dbsPromise;
        const attachment = await dbs.attachments.get(attachmentMapKey(documentId, attachmentId));
        return attachment.data;
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocType>, RxStorageDefaultCheckpoint>> {
        return this.changes$.asObservable();
    }

    async remove(): Promise<void> {
        const dbs = await this.internals.dbsPromise;
        await dbs.root.doTransaction((tx: any) => {
            tx.clearRange('', INDEX_MAX);
            return PROMISE_RESOLVE_VOID;
        });
        return this.close();
    }
    async cleanup(minimumDeletedTime: number): Promise<boolean> {
        const {
            keySelector,
            StreamingMode
        } = require('foundationdb');
        const maxDeletionTime = now() - minimumDeletedTime;
        const dbs = await this.internals.dbsPromise;
        const index = CLEANUP_INDEX;
        const indexName = getFoundationDBIndexName(index);
        const indexMeta = dbs.indexes[indexName];
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
            ]
        );
        const upperBoundString = getStartIndexStringFromUpperBound(
            this.schema,
            index,
            [
                true,
                maxDeletionTime
            ]
        );
        let noMoreUndeleted: boolean = true;
        await dbs.root.doTransaction(async (tx: any) => {
            const batchSize = ensureNotFalsy(this.settings.batchSize);
            const indexTx = tx.at(indexMeta.db.subspace);
            const mainTx = tx.at(dbs.main.subspace);
            const range = await indexTx.getRangeAll(
                keySelector.firstGreaterThan(lowerBoundString),
                upperBoundString,
                {
                    limit: batchSize + 1, // get one more extra to detect what to return from cleanup()
                    streamingMode: StreamingMode.Exact
                }
            );
            if (range.length > batchSize) {
                noMoreUndeleted = false;
                range.pop();
            }
            const docIds = range.map((row: string[]) => row[1]);
            const docsData: RxDocumentData<RxDocType>[] = await Promise.all(docIds.map((docId: string) => mainTx.get(docId)));

            Object
                .values(dbs.indexes)
                .forEach(indexMetaInner => {
                    const subIndexDB = tx.at(indexMetaInner.db.subspace);
                    docsData.forEach(docData => {
                        const indexString = indexMetaInner.getIndexableString(docData);
                        subIndexDB.delete(indexString);
                    });
                });
            docIds.forEach((id: string) => mainTx.delete(id));
        });

        return noMoreUndeleted;
    }
    async close() {
        if (this.closed) {
            return this.closed;
        }
        this.closed = (async () => {
            this.changes$.complete();
            const dbs = await this.internals.dbsPromise;
            await dbs.root.close();

            // TODO shouldn't we close the index databases?
            // Object.values(dbs.indexes).forEach(db => db.close());
        })();
        return this.closed;
    }
}


export function createFoundationDBStorageInstance<RxDocType>(
    storage: RxStorageFoundationDB,
    params: RxStorageInstanceCreationParams<RxDocType, RxStorageFoundationDBInstanceCreationOptions>,
    settings: RxStorageFoundationDBSettings
): Promise<RxStorageInstanceFoundationDB<RxDocType>> {
    const primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);

    const {
        open,
        directory,
        encoders
    } = require('foundationdb');

    const connection = open(settings.clusterFile);
    const dbsPromise = (async () => {
        const dir = await directory.createOrOpen(connection, 'rxdb');

        const root = connection
            .at(dir)
            .at(params.databaseName + '.')
            .at(params.collectionName + '.')
            .at(params.schema.version + '.');
        const main: FoundationDBDatabase<RxDocType> = root
            .at('main.')
            .withKeyEncoding(encoders.string) // automatically encode & decode keys using tuples
            .withValueEncoding(encoders.json) as any; // and values using JSON


        const events: FoundationDBDatabase<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = root
            .at('events.')
            .withKeyEncoding(encoders.string)
            .withValueEncoding(encoders.json) as any;

        const attachments: FoundationDBDatabase<RxAttachmentWriteData> = root
            .at('attachments.')
            .withKeyEncoding(encoders.string)
            .withValueEncoding(encoders.json) as any;


        const indexDBs: { [indexName: string]: FoundationDBIndexMeta<RxDocType>; } = {};
        const useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
        useIndexes.push([primaryPath]);
        const useIndexesFinal = useIndexes.map(index => {
            const indexAr = toArray(index);
            return indexAr;
        });
        // used for `getChangedDocumentsSince()`
        useIndexesFinal.push([
            '_meta.lwt',
            primaryPath
        ]);
        useIndexesFinal.push(CLEANUP_INDEX);
        useIndexesFinal.forEach(indexAr => {
            const indexName = getFoundationDBIndexName(indexAr);
            const indexDB = root.at(indexName + '.')
                .withKeyEncoding(encoders.string)
                .withValueEncoding(encoders.string);
            indexDBs[indexName] = {
                indexName,
                db: indexDB,
                getIndexableString: getIndexableStringMonad(params.schema, indexAr),
                index: indexAr
            };
        });

        return {
            root,
            main,
            events,
            attachments,
            indexes: indexDBs
        };
    })();


    const internals: FoundationDBStorageInternals<RxDocType> = {
        connection,
        dbsPromise: dbsPromise
    };

    const instance = new RxStorageInstanceFoundationDB(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        settings
    );
    return Promise.resolve(instance);
}
