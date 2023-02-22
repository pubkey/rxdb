/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */
/**
 * TODO this should be completely rewritten because:
 * - This could have been done in much less code which would be easier to understand
 *
 */
import { Observable } from 'rxjs';
import type { RxCollection, RxDatabase, MigrationState, NumberFunctionMap, OldRxCollection, RxJsonSchema, RxDocumentData, InternalStoreCollectionDocType } from '../../types';
import { RxSchema } from '../../rx-schema';
export declare class DataMigrator {
    newestCollection: RxCollection;
    migrationStrategies: NumberFunctionMap;
    constructor(newestCollection: RxCollection, migrationStrategies: NumberFunctionMap);
    currentSchema: RxSchema;
    database: RxDatabase;
    name: string;
    private _migrated;
    private _migratePromise?;
    private nonMigratedOldCollections;
    private allOldCollections;
    migrate(batchSize?: number): Observable<MigrationState>;
    migratePromise(batchSize: number): Promise<any>;
}
export declare function createOldCollection(version: number, schemaObj: RxJsonSchema<any>, dataMigrator: DataMigrator): Promise<OldRxCollection>;
export declare function getOldCollectionDocs(dataMigrator: DataMigrator): Promise<RxDocumentData<InternalStoreCollectionDocType>[]>;
/**
 * get an array with OldCollection-instances from all existing old storage-instances
 */
export declare function _getOldCollections(dataMigrator: DataMigrator): Promise<OldRxCollection[]>;
/**
 * returns true if a migration is needed
 */
export declare function mustMigrate(dataMigrator: DataMigrator): Promise<boolean>;
export declare function runStrategyIfNotNull(oldCollection: OldRxCollection, version: number, docOrNull: any | null): Promise<any | null>;
export declare function getBatchOfOldCollection(oldCollection: OldRxCollection, batchSize: number): Promise<any[]>;
/**
 * runs the doc-data through all following migrationStrategies
 * so it will match the newest schema.
 * @throws Error if final doc does not match final schema or migrationStrategy crashes
 * @return final object or null if migrationStrategy deleted it
 */
export declare function migrateDocumentData(oldCollection: OldRxCollection, docData: any): Promise<any | null>;
export declare function isDocumentDataWithoutRevisionEqual<T>(doc1: T, doc2: T): boolean;
/**
 * transform documents data and save them to the new collection
 * @return status-action with status and migrated document
 */
export declare function _migrateDocuments(oldCollection: OldRxCollection, documentsData: any[]): Promise<{
    type: string;
    doc: any;
}[]>;
/**
 * deletes this.storageInstance and removes it from the database.collectionsCollection
 */
export declare function deleteOldCollection(oldCollection: OldRxCollection): Promise<void>;
/**
 * runs the migration on all documents and deletes the storage instance afterwards
 */
export declare function migrateOldCollection(oldCollection: OldRxCollection, batchSize?: number): Observable<any>;
export declare function migratePromise(oldCollection: OldRxCollection, batchSize?: number): Promise<any>;
