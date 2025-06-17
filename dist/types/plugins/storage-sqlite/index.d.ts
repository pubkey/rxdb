import { RxStorage, RxStorageInstanceCreationParams } from '../../index.ts';
import { RxStorageInstanceSQLite } from './sqlite-storage-instance.ts';
import type { SQLiteInternals, SQLiteInstanceCreationOptions, SQLiteStorageSettings } from './sqlite-types.ts';
export * from './sqlite-helpers.ts';
export * from './sqlite-types.ts';
export * from './sqlite-storage-instance.ts';
export * from './sqlite-basics-helpers.ts';
export declare class RxStorageSQLiteTrial implements RxStorage<SQLiteInternals, SQLiteInstanceCreationOptions> {
    settings: SQLiteStorageSettings;
    name: string;
    readonly rxdbVersion = "16.15.0";
    constructor(settings: SQLiteStorageSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, SQLiteInstanceCreationOptions>): Promise<RxStorageInstanceSQLite<RxDocType>>;
}
export declare function getRxStorageSQLiteTrial(settings: SQLiteStorageSettings): RxStorageSQLiteTrial;
