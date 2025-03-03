import {
    ensureRxStorageInstanceParamsAreCorrect,
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../index.ts';
import { RX_STORAGE_NAME_SQLITE } from './sqlite-helpers.ts';
import {
    createSQLiteTrialStorageInstance,
    RxStorageInstanceSQLite
} from './sqlite-storage-instance.ts';
import type {
    SQLiteInternals,
    SQLiteInstanceCreationOptions,
    SQLiteStorageSettings
} from './sqlite-types.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';


export * from './sqlite-helpers.ts';
export * from './sqlite-types.ts';
export * from './sqlite-storage-instance.ts';
export * from './sqlite-basics-helpers.ts';

export class RxStorageSQLiteTrial implements RxStorage<SQLiteInternals, SQLiteInstanceCreationOptions> {
    public name = RX_STORAGE_NAME_SQLITE;
    readonly rxdbVersion = RXDB_VERSION;
    constructor(
        public settings: SQLiteStorageSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, SQLiteInstanceCreationOptions>
    ): Promise<RxStorageInstanceSQLite<RxDocType>> {
        ensureRxStorageInstanceParamsAreCorrect(params);
        return createSQLiteTrialStorageInstance(this, params, this.settings);
    }
}


let warningShown = false;


export function getRxStorageSQLiteTrial(
    settings: SQLiteStorageSettings
): RxStorageSQLiteTrial {
    if (!warningShown) {
        warningShown = true;
        console.warn(
            [
                '-------------- RxDB SQLite Trial Version in Use -------------------------------',
                'You are using the trial version of the SQLite RxStorage from RxDB https://rxdb.info/rx-storage-sqlite.html?console=sqlite ',
                'While this is a great option to try out RxDB itself, notice that you should never use the trial version in production. It is way slower compared to the "real" SQLite storage',
                'and it has several limitations like not using indexes and being limited to store a maximum of 300 documents.',
                'For production environments, use the premium SQLite RxStorage:',
                ' https://rxdb.info/premium/?console=sqlite ',
                'If you already purchased premium access, ensure that you have imported the correct sqlite storage from the premium plugins.',
                '-------------------------------------------------------------------------------'
            ].join('\n')
        );
    }

    const storage = new RxStorageSQLiteTrial(settings);
    return storage;
}
