import { IdleQueue } from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';
import type { LeaderElector } from './plugins/leader-election';
import type { CollectionsOfDatabase, RxDatabase, RxCollectionCreator, RxJsonSchema, RxCollection, ServerOptions, RxDumpDatabase, RxDumpDatabaseAny, AllMigrationStates, ServerResponse, BackupOptions, RxStorage, RxStorageKeyObjectInstance, RxStorageInstance, RxChangeEvent, RxDatabaseCreator } from './types';
import { Subject, Subscription, Observable } from 'rxjs';
import type { RxBackupState } from './plugins/backup';
export declare type InternalStoreDocumentData = {
    collectionName: string;
    schema: RxJsonSchema<any>;
    schemaHash: string;
    version: number;
};
export declare class RxDatabaseBase<Internals, InstanceCreationOptions, Collections = CollectionsOfDatabase> {
    name: string;
    storage: RxStorage<Internals, InstanceCreationOptions>;
    instanceCreationOptions: InstanceCreationOptions;
    password: any;
    multiInstance: boolean;
    eventReduce: boolean;
    options: any;
    /**
     * Stores information documents about the collections of the database
     */
    internalStore: RxStorageInstance<InternalStoreDocumentData, Internals, InstanceCreationOptions>;
    /**
     * Stores the local documents which are attached to this database.
     */
    localDocumentsStore: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>;
    constructor(name: string, storage: RxStorage<Internals, InstanceCreationOptions>, instanceCreationOptions: InstanceCreationOptions, password: any, multiInstance: boolean, eventReduce?: boolean, options?: any);
    get $(): Observable<RxChangeEvent<any>>;
    idleQueue: IdleQueue;
    readonly token: string;
    _subs: Subscription[];
    destroyed: boolean;
    collections: Collections;
    private subject;
    private observable$;
    broadcastChannel?: BroadcastChannel;
    storageToken?: string;
    broadcastChannel$?: Subject<RxChangeEvent>;
    /**
     * removes all internal collection-info
     * only use this if you have to upgrade from a major rxdb-version
     * do NEVER use this to change the schema of a collection
     */
    dangerousRemoveCollectionInfo(): Promise<void>;
    /**
     * This is the main handle-point for all change events
     * ChangeEvents created by this instance go:
     * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
     * ChangeEvents created by other instances go:
     * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
     */
    $emit(changeEvent: RxChangeEvent): void;
    /**
     * removes the collection-doc from the internalStore
     */
    removeCollectionDoc(name: string, schema: any): Promise<void>;
    /**
     * creates multiple RxCollections at once
     * to be much faster by saving db txs and doing stuff in bulk-operations
     * This function is not called often, but mostly in the critical path at the initial page load
     * So it must be as fast as possible.
     */
    addCollections<CreatedCollections = Partial<Collections>>(collectionCreators: {
        [key in keyof CreatedCollections]: RxCollectionCreator;
    }): Promise<{
        [key in keyof CreatedCollections]: RxCollection;
    }>;
    /**
     * delete all data of the collection and its previous versions
     */
    removeCollection(collectionName: string): Promise<void>;
    /**
     * runs the given function between idleQueue-locking
     */
    lockedRun<T>(fn: (...args: any[]) => T): T extends Promise<any> ? T : Promise<T>;
    requestIdlePromise(): Promise<void>;
    /**
     * Export database to a JSON friendly format.
     * @param _decrypted
     * When true, all encrypted values will be decrypted.
     */
    exportJSON(_decrypted: boolean, _collections?: string[]): Promise<RxDumpDatabase<Collections>>;
    exportJSON(_decrypted?: false, _collections?: string[]): Promise<RxDumpDatabaseAny<Collections>>;
    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
     * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
     * since data could be encrypted.
     */
    importJSON(_exportedJSON: RxDumpDatabaseAny<Collections>): Promise<void>;
    /**
     * spawn server
     */
    server(_options?: ServerOptions): Promise<ServerResponse>;
    backup(_options: BackupOptions): RxBackupState;
    leaderElector(): LeaderElector;
    isLeader(): boolean;
    /**
     * returns a promise which resolves when the instance becomes leader
     */
    waitForLeadership(): Promise<boolean>;
    migrationStates(): Observable<AllMigrationStates>;
    /**
     * destroys the database-instance and all collections
     */
    destroy(): Promise<boolean>;
    /**
     * deletes the database and its stored data
     */
    remove(): Promise<void>;
}
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
export declare function _ensureStorageTokenExists<Collections = any>(rxDatabase: RxDatabase<Collections>): Promise<string>;
/**
 * writes the changeEvent to the broadcastChannel
 */
export declare function writeToSocket(rxDatabase: RxDatabase, changeEvent: RxChangeEvent): Promise<boolean>;
/**
 * returns the primary for a given collection-data
 * used in the internal pouchdb-instances
 */
export declare function _collectionNamePrimary(name: string, schema: RxJsonSchema<any>): string;
/**
 * removes all internal docs of a given collection
 * @return resolves all known collection-versions
 */
export declare function _removeAllOfCollection(rxDatabase: RxDatabaseBase<any, any, any>, collectionName: string): Promise<number[]>;
export declare function createRxDatabase<Collections = {
    [key: string]: RxCollection;
}, Internals = any, InstanceCreationOptions = any>({ storage, instanceCreationOptions, name, password, multiInstance, eventReduce, ignoreDuplicate, options }: RxDatabaseCreator<Internals, InstanceCreationOptions>): Promise<RxDatabase<Collections, Internals, InstanceCreationOptions>>;
/**
 * removes the database and all its known data
 */
export declare function removeRxDatabase(databaseName: string, storage: RxStorage<any, any>): Promise<any>;
export declare function isRxDatabase(obj: any): boolean;
export declare function dbCount(): number;
