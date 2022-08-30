import { Observable, Subject } from 'rxjs';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import type {
    BulkWriteRow,
    EventBulk,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxDocumentData,
    RxDocumentDataById,
    RxJsonSchema,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageDefaultCheckpoint,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    StringKeys
} from '../../types';
import type {
    FoundationDBConnection,
    FoundationDBDatabase,
    FoundationDBIndexMeta,
    FoundationDBStorageInternals,
    RxStorageFoundationDB,
    RxStorageFoundationDBInstanceCreationOptions,
    RxStorageFoundationDBSettings
} from './foundationdb-types';
import {
    open as foundationDBOpen,
    directory as foundationDBDirectory,
    encoders as foundationDBEncoders
} from 'foundationdb';
import { categorizeBulkWriteRows, getNewestOfDocumentStates } from '../../rx-storage-helper';
import { getDocumentsByKey, getFoundationDBIndexName } from './foundationdb-helpers';
import { newRxError } from '../../rx-error';
import { getIndexableStringMonad } from '../../custom-index';
import { ensureNotFalsy } from '../../util';
import { queryFoundationDB } from './foundationdb-query';

export class RxStorageInstanceFoundationDB<RxDocType> implements RxStorageInstance<
    RxDocType,
    FoundationDBStorageInternals<RxDocType>,
    RxStorageFoundationDBInstanceCreationOptions,
    RxStorageDefaultCheckpoint
> {
    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;

    public closed = false;
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
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };
        const dbs = await this.internals.dbsPromise;
        await dbs.root.doTransaction(async tx => {
            const ids = documentWrites.map(row => (row.document as any)[this.primaryPath]);

            const mainTx = tx.at(dbs.main.subspace);

            const docsInDB = new Map<string, RxDocumentData<RxDocType>>();
            /**
             * TODO this might be faster if fdb
             * any time adds a bulk-fetch-by-key method.
             */
            await Promise.all(
                ids.map(async (id) => {
                    const doc = await mainTx.get(id);
                    docsInDB.set(id, doc);
                })
            );


            const categorized = categorizeBulkWriteRows<RxDocType>(
                this,
                this.primaryPath as any,
                docsInDB,
                documentWrites,
                context
            );

            categorized.errors.forEach(err => {
                ret.error[err.documentId] = err;
            });

            // INSERTS
            categorized.bulkInsertDocs.forEach(writeRow => {
                const docId: string = writeRow.document[this.primaryPath] as any;
                ret.success[docId as any] = writeRow.document;

                // insert document data
                mainTx.set(docId, writeRow.document);

                // insert secondary indexes
                Object.values(dbs.indexes).forEach(indexMeta => {
                    const indexString = indexMeta.getIndexableString(writeRow.document);
                    const indexTx = tx.at(indexMeta.db.subspace);
                    indexTx.set(indexString, docId);
                });
            });
            // UPDATES
            categorized.bulkUpdateDocs.forEach(writeRow => {
                const docId: string = writeRow.document[this.primaryPath] as any;

                // overwrite document data
                mainTx.set(docId, writeRow.document);

                // update secondary indexes
                Object.values(dbs.indexes).forEach(indexMeta => {
                    const oldIndexString = indexMeta.getIndexableString(ensureNotFalsy(writeRow.previous));
                    const newIndexString = indexMeta.getIndexableString(writeRow.document);
                    if (oldIndexString !== newIndexString) {
                        const indexTx = tx.at(indexMeta.db.subspace);
                        indexTx.delete(oldIndexString);
                        indexTx.set(newIndexString, docId);
                    }
                });
                ret.success[docId as any] = writeRow.document;
            });

            if (categorized.eventBulk.events.length > 0) {
                const lastState = getNewestOfDocumentStates(
                    this.primaryPath as any,
                    Object.values(ret.success)
                );
                categorized.eventBulk.checkpoint = {
                    id: lastState[this.primaryPath],
                    lwt: lastState._meta.lwt
                };
                this.changes$.next(categorized.eventBulk);
            }
        });

        return ret;
    }

    async findDocumentsById(ids: string[], withDeleted: boolean): Promise<RxDocumentDataById<RxDocType>> {
        const dbs = await this.internals.dbsPromise;
        const ret: RxDocumentDataById<RxDocType> = {};
        await dbs.main.doTransaction(async tx => {
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
                        ret[docId] = docInDb;
                    }
                })
            );
        });
        return ret;
    }
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>> {
        console.dir(preparedQuery);
        return queryFoundationDB(this, preparedQuery);
        throw new Error('Method not implemented.');

    }
    getAttachmentData(documentId: string, attachmentId: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    getChangedDocumentsSince(limit: number, checkpoint?: RxStorageDefaultCheckpoint): Promise<{ documents: RxDocumentData<RxDocType>[]; checkpoint: RxStorageDefaultCheckpoint; }> {
        throw new Error('Method not implemented.');
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocType>, RxStorageDefaultCheckpoint>> {
        return this.changes$.asObservable();
    }
    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        throw new Error('Method not implemented.');
    }
    resolveConflictResultionTask(taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> {
        throw new Error('Method not implemented.');
    }


    async remove(): Promise<void> {
        const db = await this.internals.dbPromise;
        // TODO find way to delete all docs
        //    db.clear();
        return this.close();
    }
    cleanup(minimumDeletedTime: number): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    async close() {
        if (this.closed) {
            return Promise.reject(newRxError('SNH', {
                database: this.databaseName,
                collection: this.collectionName
            }));
        }
        this.closed = true;
        this.changes$.complete();

        const dbs = await this.internals.dbsPromise;
        dbs.main.close();

        // TODO shouldnt we close the index databases?
        // Object.values(dbs.indexes).forEach(db => db.close());
    }
}



const FDB_ROOT_BY_CLUSTER_FILE_PATH = new Map<string, FoundationDBConnection>();
export function getFoundationDBConnection(
    clusterFilePath: string = ''
): FoundationDBConnection {
    return foundationDBOpen(clusterFilePath ? clusterFilePath : undefined);
    let dbConnection = FDB_ROOT_BY_CLUSTER_FILE_PATH.get(clusterFilePath);
    if (!dbConnection) {
        dbConnection = foundationDBOpen(clusterFilePath ? clusterFilePath : undefined);
        FDB_ROOT_BY_CLUSTER_FILE_PATH.set(clusterFilePath, dbConnection);
    }
    return dbConnection;
}


export async function createFoundationDBStorageInstance<RxDocType>(
    storage: RxStorageFoundationDB,
    params: RxStorageInstanceCreationParams<RxDocType, RxStorageFoundationDBInstanceCreationOptions>,
    settings: RxStorageFoundationDBSettings
): Promise<RxStorageInstanceFoundationDB<RxDocType>> {
    const primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
    const connection = getFoundationDBConnection(settings.clusterFile);
    const dbName = [
        'rxdb',
        params.databaseName,
        params.collectionName,
        params.schema.version
    ].join('::');
    const dbsPromise = (async () => {
        const directory = await foundationDBDirectory.createOrOpen(connection, dbName);
        const root = connection.at(directory);
        const main: FoundationDBDatabase<RxDocType> = root
            .at('main.')
            .withKeyEncoding(foundationDBEncoders.tuple) // automatically encode & decode keys using tuples
            .withValueEncoding(foundationDBEncoders.json) as any; // and values using JSON

        const indexDBs: { [indexName: string]: FoundationDBIndexMeta<RxDocType> } = {};
        const useIndexes = params.schema.indexes ? params.schema.indexes.slice(0) : [];
        useIndexes.push([primaryPath]);
        useIndexes.forEach(index => {
            const indexAr = Array.isArray(index) ? index.slice(0) : [index];
            indexAr.unshift('_deleted');
            const indexName = getFoundationDBIndexName(indexAr);
            const indexDB = root.at(indexName + '.')
                .withKeyEncoding(foundationDBEncoders.string)
                .withValueEncoding(foundationDBEncoders.string);
            indexDBs[indexName] = {
                db: indexDB,
                getIndexableString: getIndexableStringMonad(params.schema, indexAr),
                index: indexAr
            };
        });

        return {
            root,
            main,
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
