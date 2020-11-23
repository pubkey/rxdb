import { IdleQueue } from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';
import type { LeaderElector } from './plugins/leader-election';
import type { CollectionsOfDatabase, PouchDBInstance, RxDatabase, RxCollectionCreator, RxJsonSchema, RxCollection, PouchSettings, ServerOptions, RxDatabaseCreator, RxDumpDatabase, RxDumpDatabaseAny, RxCollectionCreatorBase } from './types';
import { Subject, Subscription, Observable } from 'rxjs';
import { RxChangeEvent } from './rx-change-event';
import { RxStorage } from './rx-storate.interface';
export declare class RxDatabaseBase<Collections = CollectionsOfDatabase, RxStorageInstance = PouchDBInstance> {
    name: string;
    adapter: any;
    password: any;
    multiInstance: boolean;
    eventReduce: boolean;
    options: any;
    pouchSettings: PouchSettings;
    storage: RxStorage;
    internalStore: RxStorageInstance;
    constructor(name: string, adapter: any, password: any, multiInstance: boolean, eventReduce: boolean, options: any, pouchSettings: PouchSettings);
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
     * spawns a new pouch-instance
     */
    _spawnPouchDB(collectionName: string, schemaVersion: number, pouchSettings?: PouchSettings): PouchDBInstance;
    /**
     * This is the main handle-point for all change events
     * ChangeEvents created by this instance go:
     * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
     * ChangeEvents created by other instances go:
     * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
     */
    $emit(changeEvent: RxChangeEvent): void;
    /**
     * removes the collection-doc from this._collectionsPouch
     */
    removeCollectionDoc(name: string, schema: any): Promise<void>;
    /**
     * creates multiple RxCollections at once
     * to be much faster by saving db txs and doing stuff in bulk-operations
     * This function is not called often, but mostly in the critical path at the initial page load
     * So it must be as fast as possible
     */
    addCollections(collectionCreators: {
        [name: string]: RxCollectionCreatorBase;
    }): Promise<{
        [key: string]: RxCollection;
    }>;
    /**
     * create or fetch a collection
     * @deprecated use addCollections() instead, it is faster and better typed
     */
    collection<RxDocumentType = any, OrmMethods = {}, StaticMethods = {
        [key: string]: any;
    }>(args: RxCollectionCreator): Promise<RxCollection<RxDocumentType, OrmMethods, StaticMethods>>;
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
    dump(_decrypted: boolean, _collections?: string[]): Promise<RxDumpDatabase<Collections>>;
    dump(_decrypted?: false, _collections?: string[]): Promise<RxDumpDatabaseAny<Collections>>;
    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<db>.dump()` method.
     * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
     * since data could be encrypted.
     */
    importDump(_exportedJSON: RxDumpDatabaseAny<Collections>): Promise<void>;
    /**
     * spawn server
     */
    server(_options?: ServerOptions): {
        app: any;
        pouchApp: any;
        server: any;
    };
    leaderElector(): LeaderElector;
    isLeader(): boolean;
    /**
     * returns a promise which resolves when the instance becomes leader
     */
    waitForLeadership(): Promise<boolean>;
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
export declare function _ensureStorageTokenExists(rxDatabase: RxDatabase): Promise<string>;
/**
 * writes the changeEvent to the broadcastChannel
 */
export declare function writeToSocket(rxDatabase: RxDatabase, changeEvent: RxChangeEvent): Promise<boolean>;
/**
 * returns the primary for a given collection-data
 * used in the internal pouchdb-instances
 */
export declare function _collectionNamePrimary(name: string, schema: RxJsonSchema): string;
/**
 * removes all internal docs of a given collection
 * @return resolves all known collection-versions
 */
export declare function _removeAllOfCollection(rxDatabase: RxDatabase, collectionName: string): Promise<number[]>;
export declare function createRxDatabase<Collections = {
    [key: string]: RxCollection;
}>({ name, adapter, password, multiInstance, eventReduce, ignoreDuplicate, options, pouchSettings }: RxDatabaseCreator): Promise<RxDatabase<Collections>>;
/**
 * removes the database and all its known data
 */
export declare function removeRxDatabase(databaseName: string, adapter: any): Promise<any>;
/**
 * check if the given adapter can be used
 */
export declare function checkAdapter(adapter: any): Promise<boolean>;
export declare function isInstanceOf(obj: any): boolean;
export declare function dbCount(): number;
declare const _default: {
    createRxDatabase: typeof createRxDatabase;
    removeRxDatabase: typeof removeRxDatabase;
    checkAdapter: typeof checkAdapter;
    isInstanceOf: typeof isInstanceOf;
    RxDatabaseBase: typeof RxDatabaseBase;
    dbCount: typeof dbCount;
};
export default _default;
