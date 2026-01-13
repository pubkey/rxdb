import {
    RxJsonSchema,
    RxStorageInstanceCreationParams,
    RxStorageInstance,
    getPrimaryFieldOfPrimaryKey,
    EventBulk,
    RxStorageChangeEvent,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageQueryResult,
    categorizeBulkWriteRows,
    ensureNotFalsy,
    StringKeys,
    addRxStorageMultiInstanceSupport,
    RxStorageDefaultCheckpoint,
    CategorizeBulkWriteRowsOutput,
    RxStorageCountResult,
    promiseWait,
    getQueryMatcher,
    PreparedQuery,
    hasPremiumFlag
} from '../../index.ts';
import { BehaviorSubject, Observable, Subject, filter, firstValueFrom } from 'rxjs';
import type { RxStorageSQLiteTrial } from './index.ts';
import {
    closeDatabaseConnection,
    ensureParamsCountIsCorrect,
    getDatabaseConnection,
    getSQLiteUpdateSQL,
    RX_STORAGE_NAME_SQLITE,
    sqliteTransaction,
    getDataFromResultRow,
    getSQLiteInsertSQL,
    TX_QUEUE_BY_DATABASE
} from './sqlite-helpers.ts';
import type {
    SQLiteBasics,
    SQLiteInstanceCreationOptions,
    SQLiteInternals,
    SQLiteQueryWithParams,
    SQLiteStorageSettings
} from './sqlite-types.ts';
import { getSortComparator } from '../../rx-query-helper.ts';
import { newRxError } from '../../rx-error.ts';
let shownNonPremiumLog = false;
let instanceId = 0;

export class RxStorageInstanceSQLite<RxDocType> implements RxStorageInstance<
    RxDocType,
    SQLiteInternals,
    SQLiteInstanceCreationOptions,
    RxStorageDefaultCheckpoint
> {
    public readonly primaryPath: StringKeys<RxDocType>;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> = new Subject();
    public readonly instanceId = instanceId++;
    public closed?: Promise<void>;

    public sqliteBasics: SQLiteBasics<any>;

    public readonly openWriteCount$ = new BehaviorSubject(0);


    private opCount = 0;

    constructor(
        public readonly storage: RxStorageSQLiteTrial,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: SQLiteInternals,
        public readonly options: Readonly<SQLiteInstanceCreationOptions>,
        public readonly settings: SQLiteStorageSettings,
        public readonly tableName: string,
        public readonly devMode: boolean
    ) {
        this.sqliteBasics = storage.settings.sqliteBasics;
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey) as any;
    }


    run(
        db: any,
        queryWithParams: SQLiteQueryWithParams
    ) {
        if (this.devMode) {
            ensureParamsCountIsCorrect(queryWithParams);
        }
        return this.sqliteBasics.run(db, queryWithParams);
    }
    all(
        db: any,
        queryWithParams: SQLiteQueryWithParams
    ) {
        if (this.devMode) {
            ensureParamsCountIsCorrect(queryWithParams);
        }

        this.opCount = this.opCount + 1;
        if (this.opCount > 500) {
            throw newRxError('SQL3');
        }

        return this.sqliteBasics.all(db, queryWithParams);
    }

    /**
     * @link https://medium.com/@JasonWyatt/squeezing-performance-from-sqlite-insertions-971aff98eef2
     */
    async bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        this.openWriteCount$.next(this.openWriteCount$.getValue() + 1);
        const database = await this.internals.databasePromise;
        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            error: []
        };
        const writePromises: Promise<any>[] = [];
        let categorized: CategorizeBulkWriteRowsOutput<RxDocType> = {} as any;

        if (
            !shownNonPremiumLog &&
            !(await hasPremiumFlag())
        ) {
            console.warn(
                [
                    '-------------- RxDB SQLite Trial Storage ---------------------------------',
                    'You are using the free *trial* SQLite-based RxStorage implementation: https://rxdb.info/rx-storage-sqlite.html?console=sqlite-trial',
                    'This storage is intended only for evaluation purposes and comes with strict limitations (no indexes, no attachments, and a ~300-document cap).',
                    'For production use and optimal performance, we strongly recommend upgrading to the premium SQLite storage.',
                    'Premium version: https://rxdb.info/premium/?console=sqlite',
                    'If you already have premium access, you can disable this message by calling setPremiumFlag() from rxdb-premium/plugins/shared.',
                    '----------------------------------------------------------------------------'
                ].join('\n')
            );
            shownNonPremiumLog = true;
        } else {
            shownNonPremiumLog = true;
        }

        await sqliteTransaction(
            database,
            this.sqliteBasics,
            async () => {
                if (this.closed) {
                    this.openWriteCount$.next(this.openWriteCount$.getValue() - 1);
                    throw new Error('SQLite.bulkWrite(' + context + ') already closed ' + this.tableName + ' context: ' + context);
                }
                const result = await this.all(
                    database,
                    {
                        query: `SELECT data FROM "${this.tableName}"`,
                        params: [],
                        context: {
                            method: 'bulkWrite',
                            data: documentWrites
                        }
                    }
                );

                const docsInDb: Map<RxDocumentData<RxDocType>[StringKeys<RxDocType>], RxDocumentData<RxDocType>> = new Map();
                result.forEach(docSQLResult => {
                    const doc = JSON.parse(getDataFromResultRow(docSQLResult));
                    const id = doc[this.primaryPath];
                    docsInDb.set(id, doc);
                });
                categorized = categorizeBulkWriteRows(
                    this,
                    this.primaryPath,
                    docsInDb,
                    documentWrites,
                    context
                );
                ret.error = categorized.errors;

                if ((result.length + categorized.bulkInsertDocs.length) > 300) {
                    throw newRxError('SQL2');
                }

                categorized.bulkInsertDocs.forEach(row => {
                    const insertQuery = getSQLiteInsertSQL(
                        this.tableName,
                        this.primaryPath as any,
                        row.document
                    );
                    writePromises.push(
                        this.all(
                            database,
                            {
                                query: insertQuery.query,
                                params: insertQuery.params,
                                context: {
                                    method: 'bulkWrite',
                                    data: categorized
                                }
                            }
                        )
                    );
                });

                categorized.bulkUpdateDocs.forEach(row => {
                    const updateQuery = getSQLiteUpdateSQL<RxDocType>(
                        this.tableName,
                        this.primaryPath,
                        row
                    );
                    writePromises.push(
                        this.run(
                            database,
                            updateQuery
                        )
                    );
                });

                await Promise.all(writePromises);

                // close transaction
                if (this.closed) {
                    this.openWriteCount$.next(this.openWriteCount$.getValue() - 1);
                    return 'ROLLBACK';
                } else {
                    this.openWriteCount$.next(this.openWriteCount$.getValue() - 1);
                    return 'COMMIT';
                }
            },
            {
                databaseName: this.databaseName,
                collectionName: this.collectionName
            }
        );

        if (categorized && categorized.eventBulk.events.length > 0) {
            const lastState = ensureNotFalsy(categorized.newestRow).document;
            categorized.eventBulk.checkpoint = {
                id: lastState[this.primaryPath],
                lwt: lastState._meta.lwt
            };
            this.changes$.next(categorized.eventBulk);
        }

        return ret;
    }


    async query(
        originalPreparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageQueryResult<RxDocType>> {

        const database = await this.internals.databasePromise;



        let result: RxDocumentData<RxDocType>[] = [];
        const query = originalPreparedQuery.query;
        const skip = query.skip ? query.skip : 0;
        const limit = query.limit ? query.limit : Infinity;
        const skipPlusLimit = skip + limit;
        const queryMatcher = getQueryMatcher(
            this.schema,
            query as any
        );
        const subResult = await this.all(
            database,
            {
                query: 'SELECT data FROM "' + this.tableName + '"',
                params: [],
                context: {
                    method: 'query',
                    data: originalPreparedQuery
                }
            }
        );
        subResult.forEach(row => {
            const docData = JSON.parse(getDataFromResultRow(row));
            if (queryMatcher(docData)) {
                result.push(docData);
            }
        });
        const sortComparator = getSortComparator(this.schema, query as any);
        result = result.sort(sortComparator);
        result = result.slice(skip, skipPlusLimit);
        return {
            documents: result
        };
    }
    async count(
        originalPreparedQuery: PreparedQuery<RxDocType>
    ): Promise<RxStorageCountResult> {
        const results = await this.query(originalPreparedQuery);
        return {
            count: results.documents.length,
            mode: 'fast'
        };
    }


    async findDocumentsById(
        ids: string[],
        withDeleted: boolean
    ): Promise<RxDocumentData<RxDocType>[]> {
        const database = await this.internals.databasePromise;

        if (this.closed) {
            throw new Error('SQLite.findDocumentsById() already closed ' + this.tableName + ' context: ' + context);
        }

        const result = await this.all(
            database,
            {
                query: `SELECT data FROM "${this.tableName}"`,
                params: [],
                context: {
                    method: 'findDocumentsById',
                    data: ids
                }
            }
        );
        const ret: RxDocumentData<RxDocType>[] = [];
        for (let i = 0; i < result.length; ++i) {
            const resultRow = result[i];
            const doc: RxDocumentData<RxDocType> = JSON.parse(getDataFromResultRow(resultRow));
            if (
                ids.includes((doc as any)[this.primaryPath]) &&
                (
                    withDeleted || !doc._deleted
                )
            ) {
                ret.push(doc);
            }
        }
        return ret;
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>> {
        return this.changes$.asObservable();
    }

    async cleanup(minimumDeletedTime: number): Promise<boolean> {
        await promiseWait(0);
        await promiseWait(0);
        const database = await this.internals.databasePromise;

        /**
         * Purge deleted documents
         */
        const minTimestamp = new Date().getTime() - minimumDeletedTime;
        await this.all(
            database,
            {
                query: `
                    DELETE FROM
                        "${this.tableName}"
                    WHERE
                        deleted = 1
                        AND
                        lastWriteTime < ?
                `,
                params: [
                    minTimestamp
                ],
                context: {
                    method: 'cleanup',
                    data: minimumDeletedTime
                }
            }
        );
        return true;
    }

    async getAttachmentData(_documentId: string, _attachmentId: string): Promise<string> {
        throw newRxError('SQL1');
    }

    async remove(): Promise<void> {
        if (this.closed) {
            throw new Error('closed already');
        }
        const database = await this.internals.databasePromise;
        const promises = [
            this.run(
                database,
                {
                    query: `DROP TABLE IF EXISTS "${this.tableName}"`,
                    params: [],
                    context: {
                        method: 'remove',
                        data: this.tableName
                    }
                }
            )
        ];
        await Promise.all(promises);
        return this.close();
    }

    async close(): Promise<void> {
        const queue = TX_QUEUE_BY_DATABASE.get(await this.internals.databasePromise);
        if (queue) {
            await queue;
        }

        if (this.closed) {
            return this.closed;
        }
        this.closed = (async () => {
            await firstValueFrom(this.openWriteCount$.pipe(filter(v => v === 0)));
            const database = await this.internals.databasePromise;

            /**
             * First get a transaction
             * to ensure currently running operations
             * are finished
             */
            await sqliteTransaction(
                database,
                this.sqliteBasics,
                () => {
                    return Promise.resolve('COMMIT');
                }
            ).catch(() => { });
            this.changes$.complete();
            await closeDatabaseConnection(
                this.databaseName,
                this.storage.settings.sqliteBasics
            );
        })();
        return this.closed;

    }
}

export async function createSQLiteTrialStorageInstance<RxDocType>(
    storage: RxStorageSQLiteTrial,
    params: RxStorageInstanceCreationParams<RxDocType, SQLiteInstanceCreationOptions>,
    settings: SQLiteStorageSettings
): Promise<RxStorageInstanceSQLite<RxDocType>> {
    const sqliteBasics = settings.sqliteBasics;
    const tableName = params.collectionName + '-' + params.schema.version;


    if (params.schema.attachments) {
        throw newRxError('SQL1');
    }

    const internals: Partial<SQLiteInternals> = {};
    const useDatabaseName = (settings.databaseNamePrefix ? settings.databaseNamePrefix : '') + '_trial_' + params.databaseName;
    internals.databasePromise = getDatabaseConnection(
        storage.settings.sqliteBasics,
        useDatabaseName
    ).then(async (database) => {
        await sqliteTransaction(
            database,
            sqliteBasics,
            async () => {
                const tableQuery = `
                CREATE TABLE IF NOT EXISTS "${tableName}"(
                    id TEXT NOT NULL PRIMARY KEY UNIQUE,
                    revision TEXT,
                    deleted BOOLEAN NOT NULL CHECK (deleted IN (0, 1)),
                    lastWriteTime INTEGER NOT NULL,
                    data json
                );
                `;
                await sqliteBasics.run(
                    database,
                    {
                        query: tableQuery,
                        params: [],
                        context: {
                            method: 'createSQLiteStorageInstance create tables',
                            data: params.databaseName
                        }
                    }
                );
                return 'COMMIT';
            },
            {
                indexCreation: false,
                databaseName: params.databaseName,
                collectionName: params.collectionName
            }
        );
        return database;
    });

    const instance = new RxStorageInstanceSQLite(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals as any,
        params.options,
        settings,
        tableName,
        params.devMode
    );

    await addRxStorageMultiInstanceSupport(
        RX_STORAGE_NAME_SQLITE,
        params,
        instance
    );

    return instance;
}
