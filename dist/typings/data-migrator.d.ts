import { Observable } from 'rxjs';
import { RxCollection, RxDatabase, MigrationState, PouchDBInstance, NumberFunctionMap } from './types';
import { RxSchema } from './rx-schema';
import { KeyCompressor } from './plugins/key-compression';
import { Crypter } from './crypter';
export declare class DataMigrator {
    newestCollection: RxCollection;
    migrationStrategies: NumberFunctionMap;
    constructor(newestCollection: RxCollection, migrationStrategies: NumberFunctionMap);
    currentSchema: RxSchema;
    database: RxDatabase;
    name: string;
    private _migrated;
    private _migratePromise?;
    migrate(batchSize?: number): Observable<MigrationState>;
    migratePromise(batchSize: number): Promise<any>;
}
export interface OldCollection {
    version: number;
    schema: RxSchema;
    pouchdb: PouchDBInstance;
    dataMigrator: DataMigrator;
    _crypter: Crypter;
    _keyCompressor?: KeyCompressor;
    newestCollection: RxCollection;
    database: RxDatabase;
    _migrate?: boolean;
    _migratePromise?: Promise<any>;
}
export declare function createOldCollection(version: number, schemaObj: any, dataMigrator: DataMigrator): OldCollection;
/**
 * get an array with OldCollection-instances from all existing old pouchdb-instance
 */
export declare function _getOldCollections(dataMigrator: DataMigrator): Promise<OldCollection[]>;
/**
 * returns true if a migration is needed
 */
export declare function mustMigrate(dataMigrator: DataMigrator): Promise<boolean>;
export declare function createDataMigrator(newestCollection: RxCollection, migrationStrategies: NumberFunctionMap): DataMigrator;
export declare function _runStrategyIfNotNull(oldCollection: OldCollection, version: number, docOrNull: any | null): Promise<object | null>;
export declare function getBatchOfOldCollection(oldCollection: OldCollection, batchSize: number): Promise<any[]>;
/**
 * runs the doc-data through all following migrationStrategies
 * so it will match the newest schema.
 * @throws Error if final doc does not match final schema or migrationStrategy crashes
 * @return final object or null if migrationStrategy deleted it
 */
export declare function migrateDocumentData(oldCollection: OldCollection, docData: any): Promise<any | null>;
/**
 * transform docdata and save to new collection
 * @return status-action with status and migrated document
 */
export declare function _migrateDocument(oldCollection: OldCollection, doc: any): Promise<{
    type: string;
    doc: {};
}>;
/**
 * deletes this.pouchdb and removes it from the database.collectionsCollection
 */
export declare function deleteOldCollection(oldCollection: OldCollection): Promise<void>;
/**
 * runs the migration on all documents and deletes the pouchdb afterwards
 */
export declare function migrateOldCollection(oldCollection: OldCollection, batchSize?: number): Observable<any>;
export declare function migratePromise(oldCollection: OldCollection, batchSize: number): Promise<any>;
