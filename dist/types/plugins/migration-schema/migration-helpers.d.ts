import { BehaviorSubject } from 'rxjs';
import type { InternalStoreCollectionDocType, RxCollection, RxDatabase, RxDocumentData } from '../../types/index.d.ts';
import { RxMigrationState } from './rx-migration-state.ts';
export declare function getOldCollectionMeta(migrationState: RxMigrationState): Promise<RxDocumentData<InternalStoreCollectionDocType> | undefined>;
/**
 * runs the doc-data through all following migrationStrategies
 * so it will match the newest schema.
 * @throws Error if final doc does not match final schema or migrationStrategy crashes
 * @return final object or null if migrationStrategy deleted it
 */
export declare function migrateDocumentData(collection: RxCollection, docSchemaVersion: number, docData: any): Promise<any | null>;
export declare function runStrategyIfNotNull(collection: RxCollection, version: number, docOrNull: any | null): Promise<any | null>;
/**
 * returns true if a migration is needed
 */
export declare function mustMigrate(migrationState: RxMigrationState): Promise<boolean>;
export declare const MIGRATION_DEFAULT_BATCH_SIZE = 200;
export type MigrationStateWithCollection = {
    collection: RxCollection;
    migrationState: RxMigrationState;
};
export declare const DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE: WeakMap<RxDatabase, BehaviorSubject<RxMigrationState[]>>;
export declare function addMigrationStateToDatabase(migrationState: RxMigrationState): void;
export declare function getMigrationStateByDatabase(database: RxDatabase): BehaviorSubject<RxMigrationState[]>;
/**
 * Complete on database close
 * so people do not have to unsubscribe
 */
export declare function onDatabaseClose(database: RxDatabase): void;
