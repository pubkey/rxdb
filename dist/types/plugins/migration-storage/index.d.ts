import { RxDatabase, RxCollection, BulkWriteRow, RxStorageBulkWriteResponse, RxStorage } from '../../index.ts';
export type RxStorageOld<A, B> = RxStorage<A, B> | any;
export type AfterMigrateBatchHandlerInput = {
    databaseName: string;
    collectionName: string;
    oldDatabaseName: string;
    insertToNewWriteRows: BulkWriteRow<any>[];
    writeToNewResult: RxStorageBulkWriteResponse<any>;
};
export type AfterMigrateBatchHandler = (input: AfterMigrateBatchHandlerInput) => any | Promise<any>;
export type MigrateStorageParams = {
    database: RxDatabase;
    /**
     * Using the migration plugin requires you
     * to rename your new old database.
     * The original name of the v11 database must be provided here.
     */
    oldDatabaseName: string;
    oldStorage: RxStorageOld<any, any>;
    batchSize?: number;
    parallel?: boolean;
    afterMigrateBatch?: AfterMigrateBatchHandler;
    logFunction?: (message: string) => void;
};
/**
 * Migrates collections of RxDB version A and puts them
 * into a RxDatabase that is created with version B.
 * This function only works from the previous major version upwards.
 * Do not use it to migrate like rxdb v9 to v14.
 */
export declare function migrateStorage(params: MigrateStorageParams): Promise<void>;
export declare function migrateCollection<RxDocType>(collection: RxCollection<RxDocType>, oldDatabaseName: string, oldStorage: RxStorageOld<any, any>, batchSize: number, afterMigrateBatch?: AfterMigrateBatchHandler, logFunction?: (message: string) => void): Promise<void>;
