/**
 * The storage is defined in a separate file
 * so that it can be swapped out in the CI to test
 * different storages.
 */
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { getRxStorageSQLiteTrial, getSQLiteBasicsExpoSQLiteAsync } from 'rxdb/plugins/storage-sqlite';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import * as SQLite from 'expo-sqlite';

export const STORAGE_SQLITE = wrappedValidateAjvStorage({
    storage: getRxStorageSQLiteTrial({
        sqliteBasics: getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync, undefined, './')
    })
});

// used in tests
export const STORAGE_MEMORY = wrappedValidateAjvStorage({
    storage: getRxStorageMemory()
});
