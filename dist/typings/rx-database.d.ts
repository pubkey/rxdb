import IdleQueue from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';
import { Subject, Subscription, Observable } from 'rxjs';
import { RxChangeEvent } from './rx-change-event';
import { CollectionsOfDatabase, RxChangeEventInsert, RxChangeEventUpdate, RxChangeEventRemove, PouchDBInstance, RxChangeEventCollection, RxDatabase, RxCollectionCreator, RxJsonSchema, RxCollection, PouchSettings, ServerOptions, RxDatabaseCreator, RxDumpDatabase, RxDumpDatabaseAny } from './types';
export declare class RxDatabaseBase<Collections = CollectionsOfDatabase> {
    name: string;
    adapter: any;
    password: any;
    multiInstance: boolean;
    queryChangeDetection: boolean;
    options: any;
    pouchSettings: PouchSettings;
    constructor(name: string, adapter: any, password: any, multiInstance: boolean, queryChangeDetection: boolean, options: any, pouchSettings: PouchSettings);
    get leaderElector(): any;
    get isLeader(): boolean;
    get $(): Observable<RxChangeEventInsert<any> | RxChangeEventUpdate<any> | RxChangeEventRemove<any> | RxChangeEventCollection>;
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
    _adminPouch: PouchDBInstance;
    _collectionsPouch: PouchDBInstance;
    private _leaderElector?;
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
     * returns a promise which resolves when the instance becomes leader
     */
    waitForLeadership(): Promise<boolean>;
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
     * create or fetch a collection
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
        server: any;
    };
    /**
     * destroys the database-instance and all collections
     */
    destroy(): Promise<boolean>;
    /**
     * deletes the database and its stored data
     */
    remove(): Promise<void>;
}
export declare function properties(): string[];
/**
 * validates and inserts the password-hash
 * to ensure there is/was no other instance with a different password
 */
export declare function _preparePasswordHash(rxDatabase: RxDatabase): Promise<boolean>;
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
export declare function create<Collections = {
    [key: string]: RxCollection;
}>({ name, adapter, password, multiInstance, queryChangeDetection, ignoreDuplicate, options, pouchSettings }: RxDatabaseCreator): Promise<RxDatabase<Collections>>;
export declare function getPouchLocation(dbName: string, collectionName: string, schemaVersion: number): string;
/**
 * removes the database and all its known data
 */
export declare function removeDatabase(databaseName: string, adapter: any): Promise<any>;
/**
 * check is the given adapter can be used
 */
export declare function checkAdapter(adapter: any): Promise<boolean>;
export declare function isInstanceOf(obj: any): boolean;
export declare function dbCount(): number;
declare const _default: {
    create: typeof create;
    removeDatabase: typeof removeDatabase;
    checkAdapter: typeof checkAdapter;
    isInstanceOf: typeof isInstanceOf;
    RxDatabaseBase: typeof RxDatabaseBase;
    dbCount: typeof dbCount;
};
export default _default;
