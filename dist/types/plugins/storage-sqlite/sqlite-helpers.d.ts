import { BulkWriteRow, RxDocumentData, MaybePromise } from '../../index.ts';
import type { SQLResultRow, SQLiteBasics, SQLiteDatabaseClass, SQLiteQueryWithParams } from './sqlite-types.ts';
export declare const NON_IMPLEMENTED_OPERATOR_QUERY_BATCH_SIZE = 50;
export declare const RX_STORAGE_NAME_SQLITE = "sqlite";
/**
 * @link https://www.sqlite.org/inmemorydb.html
 */
export declare const SQLITE_IN_MEMORY_DB_NAME = ":memory:";
export declare function getDatabaseConnection(sqliteBasics: SQLiteBasics<any>, databaseName: string): Promise<SQLiteDatabaseClass>;
export declare function closeDatabaseConnection(databaseName: string, sqliteBasics: SQLiteBasics<any>): MaybePromise<void>;
export declare function getDataFromResultRow(row: SQLResultRow): string;
export declare function getSQLiteInsertSQL<RxDocType>(collectionName: string, primaryPath: keyof RxDocType, docData: RxDocumentData<RxDocType>): SQLiteQueryWithParams;
export declare function getSQLiteUpdateSQL<RxDocType>(tableName: string, primaryPath: keyof RxDocType, writeRow: BulkWriteRow<RxDocType>): SQLiteQueryWithParams;
export declare const TX_QUEUE_BY_DATABASE: WeakMap<SQLiteDatabaseClass, Promise<void>>;
export declare function sqliteTransaction(database: SQLiteDatabaseClass, sqliteBasics: SQLiteBasics<any>, handler: () => Promise<'COMMIT' | 'ROLLBACK'>, 
/**
 * Context will be logged
 * if the commit does error.
 */
context?: any): Promise<void>;
/**
 * TODO instead of doing a while loop, we should find a way to listen when the
 * other transaction is committed.
 */
export declare function openSqliteTransaction(database: SQLiteDatabaseClass, sqliteBasics: SQLiteBasics<any>): Promise<void>;
export declare function finishSqliteTransaction(database: SQLiteDatabaseClass, sqliteBasics: SQLiteBasics<any>, mode: 'COMMIT' | 'ROLLBACK', 
/**
 * Context will be logged
 * if the commit does error.
 */
context?: any): Promise<void>;
export declare const PARAM_KEY = "?";
export declare function ensureParamsCountIsCorrect(queryWithParams: SQLiteQueryWithParams): void;
/**
 * SQLite itself does not know about boolean types
 * and uses integers instead.
 * So some libraries need to bind integers and fail on booleans.
 * @link https://stackoverflow.com/a/2452569/3443137
 * This method transforms all boolean params to the
 * correct int representation.
 */
export declare function boolParamsToInt(params: any[]): any[];
