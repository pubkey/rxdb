import type { MangoQuery, RxDocumentData, RxJsonSchema } from '../../index.ts';
/**
 * Adding '@types/sqlite3' to the dependencies
 * causes many errors on npm install,
 * even if the users uses another SQLite implementation.
 * Therefore we just use the any type instead the one imported from 'sqlite3';
 */
export type Sqlite3Type = any;
export type SQLiteDatabaseClass = any;
export type SQLResultRow = {
    id: string;
    /**
     * Because we store the document fields as json,
     * just return a string here.
     */
    data: string;
} | [string, string, number, number, string];
export type SQLiteBasics<SQLiteDatabaseType> = {
    debugId?: string;
    /**
     * Opens a new database connection
     */
    open: (name: string) => Promise<SQLiteDatabaseType>;
    /**
     * Returns the query result rows
     */
    all(db: SQLiteDatabaseType, queryWithParams: SQLiteQueryWithParams): Promise<SQLResultRow[]>;
    /**
     * Run a query. Return nothing.
     */
    run(db: SQLiteDatabaseType, queryWithParams: SQLiteQueryWithParams): Promise<void>;
    /**
     * Sets a pragma like the WAL mode or other flags.
     * This cannot be done in run() or all() because
     * it does not return rows on some SQLite libraries
     * which would throw an error.
     * @link https://www.sqlite.org/pragma.html
     */
    setPragma(db: SQLiteDatabaseType, key: string, value: string): Promise<void>;
    close(db: SQLiteDatabaseType): Promise<void>;
    /**
     * [default=WAL2]
     * If empty string is given, the journalMode will be left untouched.
     * For example android has WAL as default, so we do not want to touch that setting.
     */
    journalMode: 'WAL' | 'WAL2' | 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'OFF' | '';
};
export type SQLiteStorageSettings = {
    sqliteBasics: SQLiteBasics<any>;
    storeAttachmentsAsBase64String?: boolean;
    databaseNamePrefix?: string;
    /**
     * Can be used to modify the prepared query before
     * sending it to SQLite when the storageInstance.query()
     * is run.
     * For example you could use it to replace a regex with
     * %LIKE% expressions.
     */
    queryModifier?: RxStorageSQLiteQueryModifier<any>;
    /**
     * If you have problems, you can pass a log function here
     * to debug stuff.
     * It is recommended to use console.log.bind(console)
     */
    log?: typeof console.log;
};
export type RxStorageSQLiteQueryModifier<RxDocType> = (queryWithParams: SQLiteQueryWithParams, preparedQuery: SQLitePreparedQuery<RxDocType>) => SQLiteQueryWithParams;
export type SQLiteInstanceCreationOptions = {};
export type SQLiteInternals = {
    databasePromise: Promise<SQLiteDatabaseClass>;
};
export type SQLitePreparedQuery<RxDocType> = {
    schema: RxJsonSchema<RxDocumentData<RxDocType>>;
    mangoQuery: MangoQuery<RxDocType>;
    /**
     * Contains the sql query,
     * But only from the where clause.
     * This ensures we can reuse the prepared query
     * no mather what the name of the table is.
     * Looks like 'WHERE .... SORT BY ...'.
     */
    sqlQuery: SQLiteQueryWithParams;
    /**
     * The same query but without the ORDER BY part.
     * Used in count-queries for better performance.
     */
    queryWithoutSort: string;
    /**
     * If the query cannot be transformed to SQL,
     * because it contains non-SQLite-native operators
     * like $regex, we have use a normal query matching.
     */
    nonImplementedOperator?: string;
};
export type SQLiteQueryWithParams = {
    query: string;
    /**
     * Some SQLite version allow to use named params like $docId
     * and then putting an object in here.
     * But because not all environments support that,
     * we have to use plain array params that use the '?' placeholder in the query string.
     */
    params: (string | number | boolean)[];
    /**
     * Context must be set, will be used during debugging and error logs
     * to better show what is going wrong.
     */
    context: {
        method: string;
        data: any;
    };
};
export type SQLiteChangesCheckpoint = {
    id: string;
    lwt: number;
};
