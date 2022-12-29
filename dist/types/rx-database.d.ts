import { IdleQueue } from 'custom-idle-queue';
import type { LeaderElector } from 'broadcast-channel';
import type { CollectionsOfDatabase, RxDatabase, RxCollectionCreator, RxCollection, RxDumpDatabase, RxDumpDatabaseAny, AllMigrationStates, BackupOptions, RxStorage, RxStorageInstance, RxChangeEvent, RxDatabaseCreator, RxChangeEventBulk, RxDocumentData, RxCleanupPolicy, InternalStoreDocType, InternalStoreStorageTokenDocType, RxTypeError, RxError, HashFunction, MaybePromise } from './types';
import { Subject, Subscription, Observable } from 'rxjs';
import type { RxBackupState } from './plugins/backup';
import { ObliviousSet } from 'oblivious-set';
export declare class RxDatabaseBase<Internals, InstanceCreationOptions, Collections = CollectionsOfDatabase> {
    readonly name: string;
    /**
     * Uniquely identifies the instance
     * of this RxDatabase.
     */
    readonly token: string;
    readonly storage: RxStorage<Internals, InstanceCreationOptions>;
    readonly instanceCreationOptions: InstanceCreationOptions;
    readonly password: any;
    readonly multiInstance: boolean;
    readonly eventReduce: boolean;
    options: any;
    /**
     * Stores information documents about the collections of the database
     */
    readonly internalStore: RxStorageInstance<InternalStoreDocType, Internals, InstanceCreationOptions>;
    readonly hashFunction: HashFunction;
    readonly cleanupPolicy?: Partial<RxCleanupPolicy> | undefined;
    readonly allowSlowCount?: boolean | undefined;
    readonly idleQueue: IdleQueue;
    constructor(name: string, 
    /**
     * Uniquely identifies the instance
     * of this RxDatabase.
     */
    token: string, storage: RxStorage<Internals, InstanceCreationOptions>, instanceCreationOptions: InstanceCreationOptions, password: any, multiInstance: boolean, eventReduce: boolean, options: any, 
    /**
     * Stores information documents about the collections of the database
     */
    internalStore: RxStorageInstance<InternalStoreDocType, Internals, InstanceCreationOptions>, hashFunction: HashFunction, cleanupPolicy?: Partial<RxCleanupPolicy> | undefined, allowSlowCount?: boolean | undefined);
    get $(): Observable<RxChangeEvent<any>>;
    _subs: Subscription[];
    /**
     * Beceause having unhandled exceptions would fail,
     * we have to store the async errors of the constructor here
     * so we can throw them later.
     */
    startupErrors: (RxError | RxTypeError)[];
    /**
     * When the database is destroyed,
     * these functions will be called an awaited.
     * Used to automatically clean up stuff that
     * belongs to this collection.
     */
    onDestroy: (() => MaybePromise<any>)[];
    destroyed: boolean;
    collections: Collections;
    readonly eventBulks$: Subject<RxChangeEventBulk<any>>;
    private observable$;
    /**
     * Unique token that is stored with the data.
     * Used to detect if the dataset has been deleted
     * and if two RxDatabase instances work on the same dataset or not.
     *
     * Because reading and writing the storageToken runs in the hot path
     * of database creation, we do not await the storageWrites but instead
     * work with the promise when we need the value.
     */
    storageToken: Promise<string>;
    /**
     * Stores the whole state of the internal storage token document.
     * We need this in some plugins.
     */
    storageTokenDocument: Promise<RxDocumentData<InternalStoreStorageTokenDocType>>;
    /**
     * Contains the ids of all event bulks that have been emitted
     * by the database.
     * Used to detect duplicates that come in again via BroadcastChannel
     * or other streams.
     * TODO instead of having this here, we should add a test to ensure each RxStorage
     * behaves equal and does never emit duplicate eventBulks.
     */
    emittedEventBulkIds: ObliviousSet<string>;
    /**
     * This is the main handle-point for all change events
     * ChangeEvents created by this instance go:
     * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
     * ChangeEvents created by other instances go:
     * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
     */
    $emit(changeEventBulk: RxChangeEventBulk<any>): void;
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
        [key in keyof CreatedCollections]: RxCollectionCreator<any>;
    }): Promise<{
        [key in keyof CreatedCollections]: RxCollection;
    }>;
    /**
     * runs the given function between idleQueue-locking
     */
    lockedRun<T>(fn: (...args: any[]) => T): T extends Promise<any> ? T : Promise<T>;
    requestIdlePromise(): Promise<void>;
    /**
     * Export database to a JSON friendly format.
     */
    exportJSON(_collections?: string[]): Promise<RxDumpDatabase<Collections>>;
    exportJSON(_collections?: string[]): Promise<RxDumpDatabaseAny<Collections>>;
    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
     * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
     * since data could be encrypted.
     */
    importJSON(_exportedJSON: RxDumpDatabaseAny<Collections>): Promise<void>;
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
     * deletes the database and its stored data.
     * Returns the names of all removed collections.
     */
    remove(): Promise<string[]>;
    get asRxDatabase(): RxDatabase<{}, Internals, InstanceCreationOptions>;
}
/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
export declare function createRxDatabaseStorageInstance<Internals, InstanceCreationOptions>(databaseInstanceToken: string, storage: RxStorage<Internals, InstanceCreationOptions>, databaseName: string, options: InstanceCreationOptions, multiInstance: boolean, password?: string): Promise<RxStorageInstance<InternalStoreDocType, Internals, InstanceCreationOptions>>;
export declare function createRxDatabase<Collections = {
    [key: string]: RxCollection;
}, Internals = any, InstanceCreationOptions = any>({ storage, instanceCreationOptions, name, password, multiInstance, eventReduce, ignoreDuplicate, options, cleanupPolicy, allowSlowCount, localDocuments, hashFunction }: RxDatabaseCreator<Internals, InstanceCreationOptions>): Promise<RxDatabase<Collections, Internals, InstanceCreationOptions>>;
/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 *
 * Returns the names of the removed collections.
 */
export declare function removeRxDatabase(databaseName: string, storage: RxStorage<any, any>): Promise<string[]>;
export declare function isRxDatabase(obj: any): boolean;
export declare function dbCount(): number;
/**
 * Returns true if the given RxDatabase was the first
 * instance that was created on the storage with this name.
 *
 * Can be used for some optimizations because on the first instantiation,
 * we can assume that no data was written before.
 */
export declare function isRxDatabaseFirstTimeInstantiated(database: RxDatabase): Promise<boolean>;
/**
 * For better performance some tasks run async
 * and are awaited later.
 * But we still have to ensure that there have been no errors
 * on database creation.
 */
export declare function ensureNoStartupErrors(rxDatabase: RxDatabaseBase<any, any, any>): Promise<void>;
