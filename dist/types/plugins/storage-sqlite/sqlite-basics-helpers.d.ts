import type { Sqlite3Type, SQLiteBasics, SQLiteDatabaseClass, SQLiteQueryWithParams } from './sqlite-types.ts';
export declare function getSQLiteBasicsNode(sqlite3: Sqlite3Type): SQLiteBasics<SQLiteDatabaseClass>;
/**
 * Uses the native sqlite that comes sshipped with node version 22+
 * @link https://nodejs.org/api/sqlite.html
 */
export declare function getSQLiteBasicsNodeNative(constructor: any): SQLiteBasics<any>;
/**
 * For unknown reason we cannot bind boolean values
 * and have to map them to one and zero.
 * TODO create an issue at Node.js
 */
export declare function mapNodeNativeParams(params: SQLiteQueryWithParams['params']): SQLiteQueryWithParams['params'];
/**
 * Promisified version of db.run()
 */
export declare function execSqlSQLiteNode(database: SQLiteDatabaseClass, queryWithParams: SQLiteQueryWithParams, operator: 'run' | 'all'): any;
export declare function closeSQLiteDatabaseNode(database: SQLiteDatabaseClass): Promise<void>;
type SQLiteCapacitorDatabase = any;
type SQLiteConnection = any;
export declare function getSQLiteBasicsCapacitor(sqlite: SQLiteConnection, capacitorCore: any): SQLiteBasics<SQLiteCapacitorDatabase>;
type SQLiteQuickDatabase = any;
export declare const EMPTY_FUNCTION: () => void;
export declare function getSQLiteBasicsQuickSQLite(openDB: any): SQLiteBasics<SQLiteQuickDatabase>;
/**
 * @deprecated Use getSQLiteBasicsExpoSQLiteAsync() instead
 */
export declare function getSQLiteBasicsExpoSQLite(openDB: any, options?: any, directory?: any): SQLiteBasics<any>;
/**
 * @link https://docs.expo.dev/versions/latest/sdk/sqlite/
 */
export declare function getSQLiteBasicsExpoSQLiteAsync(openDB: any, options?: any, directory?: any): SQLiteBasics<any>;
/**
 * Build to be compatible with packages
 * that use the websql npm package like:
 * @link https://www.npmjs.com/package/react-native-sqlite-2
 * @link https://www.npmjs.com/package/websql
 * Use like:
 * import SQLite from 'react-native-sqlite-2';
 * getRxStorageSQLite({
 *   sqliteBasics: getSQLiteBasicsWebSQL(SQLite.openDatabase)
 * });
 *
 */
export declare function getSQLiteBasicsWebSQL(openDB: any): SQLiteBasics<any>;
export declare function webSQLExecuteQuery(db: any, queryWithParams: SQLiteQueryWithParams): Promise<any>;
export type WasmSqliteDb = {
    nr: number;
    name: string;
};
export declare function getSQLiteBasicsWasm(sqlite3: any): SQLiteBasics<WasmSqliteDb>;
export {};
