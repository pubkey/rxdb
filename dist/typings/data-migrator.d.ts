/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */
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
declare class OldCollection {
    version: number;
    schemaObj: any;
    dataMigrator: DataMigrator;
    constructor(version: number, schemaObj: any, dataMigrator: DataMigrator);
    readonly schema: RxSchema<any>;
    readonly keyCompressor: KeyCompressor;
    readonly crypter: Crypter;
    readonly pouchdb: PouchDBInstance;
    newestCollection: RxCollection;
    database: RxDatabase;
    private _schema?;
    private _keyCompressor?;
    private _crypter?;
    private _pouchdb?;
    /**
     * runs the migration on all documents and deletes the pouchdb afterwards
     */
    private _migrate?;
    private _migratePromise?;
    getBatch(batchSize: number): Promise<any[]>;
    /**
     * handles a document from the pouchdb-instance
     */
    _handleFromPouch(docData: any): any;
    /**
     * wrappers for Pouch.put/get to handle keycompression etc
     */
    _handleToPouch(docData: any): any;
    _runStrategyIfNotNull(version: number, docOrNull: any | null): Promise<object | null>;
    /**
     * runs the doc-data through all following migrationStrategies
     * so it will match the newest schema.
     * @throws Error if final doc does not match final schema or migrationStrategy crashes
     * @return final object or null if migrationStrategy deleted it
     */
    migrateDocumentData(docData: any): Promise<any | null>;
    /**
     * transform docdata and save to new collection
     * @return status-action with status and migrated document
     */
    _migrateDocument(doc: any): Promise<{
        type: string;
        doc: {};
    }>;
    /**
     * deletes this.pouchdb and removes it from the database.collectionsCollection
     */
    delete(): Promise<void>;
    migrate(batchSize?: number): Observable<any>;
    migratePromise(batchSize: number): Promise<any>;
}
/**
 * get an array with OldCollection-instances from all existing old pouchdb-instance
 */
export declare function _getOldCollections(dataMigrator: DataMigrator): Promise<OldCollection[]>;
/**
 * returns true if a migration is needed
 */
export declare function mustMigrate(dataMigrator: DataMigrator): Promise<boolean>;
export declare function createDataMigrator(newestCollection: RxCollection, migrationStrategies: NumberFunctionMap): DataMigrator;
export {};
