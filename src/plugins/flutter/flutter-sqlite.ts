import type {
    SQLiteBasics,
    SQLiteQueryWithParams
} from '../storage-sqlite/sqlite-types.ts';
import { boolParamsToInt } from '../storage-sqlite/sqlite-helpers.ts';
import { getRxStorageSQLiteTrial } from '../storage-sqlite/index.ts';
import type { RxStorage } from '../../types/index.d.ts';
import { callDart } from './flutter-bridge.ts';

/**
 * References the opened sqlite3 database on the Dart side.
 * Must be an object because the SQLite storage uses
 * the database as key in a WeakMap.
 */
export type FlutterSQLiteDatabaseHandle = {
    handle: number;
    name: string;
};
const HANDLE_OBJECTS = new Map<number, FlutterSQLiteDatabaseHandle>();

/**
 * SQLiteBasics that run the SQL queries in Dart
 * with the sqlite3 package.
 * Works with the SQLite trial storage and the premium SQLite storage.
 */
export function getSQLiteBasicsFlutter(): SQLiteBasics<FlutterSQLiteDatabaseHandle> {
    return {
        open: async (name: string) => {
            const handle: number = await callDart('sqlite.open', { name });
            let ret = HANDLE_OBJECTS.get(handle);
            if (!ret) {
                ret = { handle, name };
                HANDLE_OBJECTS.set(handle, ret);
            }
            return ret;
        },
        all: (db: FlutterSQLiteDatabaseHandle, queryWithParams: SQLiteQueryWithParams) => callDart('sqlite.all', {
            db: db.handle,
            sql: queryWithParams.query,
            params: boolParamsToInt(queryWithParams.params)
        }),
        run: async (db: FlutterSQLiteDatabaseHandle, queryWithParams: SQLiteQueryWithParams) => {
            await callDart('sqlite.run', {
                db: db.handle,
                sql: queryWithParams.query,
                params: boolParamsToInt(queryWithParams.params)
            });
        },
        setPragma: async (db: FlutterSQLiteDatabaseHandle, key: string, value: string) => {
            await callDart('sqlite.run', {
                db: db.handle,
                sql: 'PRAGMA ' + key + ' = ' + value,
                params: []
            });
        },
        close: async (db: FlutterSQLiteDatabaseHandle) => {
            const fullyClosed: boolean = await callDart('sqlite.close', { db: db.handle });
            if (fullyClosed) {
                HANDLE_OBJECTS.delete(db.handle);
            }
        },
        journalMode: 'WAL'
    };
}

let defaultStorage: RxStorage<any, any> | undefined;
export function getRxStorageFlutterDefault(): RxStorage<any, any> {
    if (!defaultStorage) {
        defaultStorage = getRxStorageSQLiteTrial({
            sqliteBasics: getSQLiteBasicsFlutter()
        });
    }
    return defaultStorage;
}

/**
 * QuickJS has no crypto.subtle so the hashing runs in Dart.
 */
export function flutterHashSha256(input: string): Promise<string> {
    return callDart('hash.sha256', { input });
}
