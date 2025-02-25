/**
 * The storage is defined in a separate file
 * so that it can be swapped out in the CI to test
 * different storages.
 */
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { getRxStorageSQLiteTrial, getSQLiteBasicsQuickSQLite } from 'rxdb/plugins/storage-sqlite';
import { open } from 'react-native-quick-sqlite';
export const STORAGE = wrappedValidateAjvStorage({
    storage: getRxStorageSQLiteTrial({
        sqliteBasics: getSQLiteBasicsQuickSQLite(open)
    })
});
