import type { DataMigrator } from './plugins/migration';
import { DocCache } from './doc-cache';
import { QueryCache } from './query-cache';
import { ChangeEventBuffer } from './change-event-buffer';
import { Subscription, Observable } from 'rxjs';
import type { KeyFunctionMap, RxCouchDBReplicationState, MigrationState, SyncOptions, RxCollection, RxDatabase, RxQuery, RxDocument, SyncOptionsGraphQL, RxDumpCollection, RxDumpCollectionAny, MangoQuery, MangoQueryNoLimit, RxCacheReplacementPolicy, RxStorageBulkWriteError, RxChangeEvent, RxChangeEventInsert, RxChangeEventUpdate, RxChangeEventDelete, RxStorageInstance, CollectionsOfDatabase, RxConflictHandler, MaybePromise, CRDTEntry, MangoQuerySelectorAndIndex } from './types';
import type { RxGraphQLReplicationState } from './plugins/replication-graphql';
import type { RxCouchDBNewReplicationState, SyncOptionsCouchDBNew } from './plugins/replication-couchdb-new';
import type { SyncOptionsP2P, RxP2PReplicationPool } from './plugins/replication-p2p';
import type { RxFirestoreReplicationState, SyncOptionsFirestore } from './plugins/replication-firestore';
import { RxSchema } from './rx-schema';
declare const HOOKS_WHEN: readonly ["pre", "post"];
declare type HookWhenType = typeof HOOKS_WHEN[number];
declare const HOOKS_KEYS: readonly ["insert", "save", "remove", "create"];
declare type HookKeyType = typeof HOOKS_KEYS[number];
export declare class RxCollectionBase<InstanceCreationOptions, RxDocumentType = {
    [prop: string]: any;
}, OrmMethods = {}, StaticMethods = {
    [key: string]: any;
}> {
    database: RxDatabase<CollectionsOfDatabase, any, InstanceCreationOptions>;
    name: string;
    schema: RxSchema<RxDocumentType>;
    internalStorageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>;
    instanceCreationOptions: InstanceCreationOptions;
    migrationStrategies: KeyFunctionMap;
    methods: KeyFunctionMap;
    attachments: KeyFunctionMap;
    options: any;
    cacheReplacementPolicy: RxCacheReplacementPolicy;
    statics: KeyFunctionMap;
    conflictHandler: RxConflictHandler<RxDocumentType>;
    /**
     * Stores all 'normal' documents
     */
    storageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>;
    readonly timeouts: Set<ReturnType<typeof setTimeout>>;
    constructor(database: RxDatabase<CollectionsOfDatabase, any, InstanceCreationOptions>, name: string, schema: RxSchema<RxDocumentType>, internalStorageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>, instanceCreationOptions?: InstanceCreationOptions, migrationStrategies?: KeyFunctionMap, methods?: KeyFunctionMap, attachments?: KeyFunctionMap, options?: any, cacheReplacementPolicy?: RxCacheReplacementPolicy, statics?: KeyFunctionMap, conflictHandler?: RxConflictHandler<RxDocumentType>);
    get insert$(): Observable<RxChangeEventInsert<RxDocumentType>>;
    get update$(): Observable<RxChangeEventUpdate<RxDocumentType>>;
    get remove$(): Observable<RxChangeEventDelete<RxDocumentType>>;
    _atomicUpsertQueues: Map<string, Promise<any>>;
    synced: boolean;
    hooks: {
        [key in HookKeyType]: {
            [when in HookWhenType]: {
                series: Function[];
                parallel: Function[];
            };
        };
    };
    _subs: Subscription[];
    _docCache: DocCache<RxDocument<RxDocumentType, OrmMethods>>;
    _queryCache: QueryCache;
    $: Observable<RxChangeEvent<RxDocumentType>>;
    _changeEventBuffer: ChangeEventBuffer;
    /**
     * When the collection is destroyed,
     * these functions will be called an awaited.
     * Used to automatically clean up stuff that
     * belongs to this collection.
     */
    onDestroy: (() => MaybePromise<any>)[];
    destroyed: boolean;
    prepare(): Promise<void>;
    migrationNeeded(): Promise<boolean>;
    getDataMigrator(): DataMigrator;
    migrate(batchSize?: number): Observable<MigrationState>;
    migratePromise(batchSize?: number): Promise<any>;
    insert(json: RxDocumentType | RxDocument): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    bulkInsert(docsData: RxDocumentType[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: RxStorageBulkWriteError<RxDocumentType>[];
    }>;
    bulkRemove(ids: string[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: RxStorageBulkWriteError<RxDocumentType>[];
    }>;
    /**
     * same as bulkInsert but overwrites existing document with same primary
     */
    bulkUpsert(docsData: Partial<RxDocumentType>[]): Promise<RxDocument<RxDocumentType, OrmMethods>[]>;
    /**
     * same as insert but overwrites existing document with same primary
     */
    upsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    /**
     * upserts to a RxDocument, uses atomicUpdate if document already exists
     */
    atomicUpsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    find(queryObj?: MangoQuery<RxDocumentType>): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods>[]>;
    findOne(queryObj?: MangoQueryNoLimit<RxDocumentType> | string): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods> | null>;
    count(queryObj?: MangoQuerySelectorAndIndex<RxDocumentType>): RxQuery<RxDocumentType, number>;
    /**
     * find a list documents by their primary key
     * has way better performance then running multiple findOne() or a find() with a complex $or-selected
     */
    findByIds(ids: string[]): Promise<Map<string, RxDocument<RxDocumentType, OrmMethods>>>;
    /**
     * like this.findByIds but returns an observable
     * that always emits the current state
     */
    findByIds$(ids: string[]): Observable<Map<string, RxDocument<RxDocumentType, OrmMethods>>>;
    /**
     * Export collection to a JSON friendly format.
     */
    exportJSON(): Promise<RxDumpCollection<RxDocumentType>>;
    exportJSON(): Promise<RxDumpCollectionAny<RxDocumentType>>;
    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
     */
    importJSON(_exportedJSON: RxDumpCollectionAny<RxDocumentType>): Promise<void>;
    insertCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): RxDocument<RxDocumentType, OrmMethods>;
    /**
     * sync with a CouchDB endpoint
     */
    syncCouchDB(_syncOptions: SyncOptions): RxCouchDBReplicationState;
    /**
     * sync with a GraphQL endpoint
     */
    syncGraphQL<CheckpointType = any>(_options: SyncOptionsGraphQL<RxDocumentType, CheckpointType>): RxGraphQLReplicationState<RxDocumentType, CheckpointType>;
    syncCouchDBNew(_syncOptions: SyncOptionsCouchDBNew<RxDocumentType>): RxCouchDBNewReplicationState<RxDocumentType>;
    syncP2P(_syncOptions: SyncOptionsP2P<RxDocumentType>): RxP2PReplicationPool<RxDocumentType>;
    syncFirestore(_syncOptions: SyncOptionsFirestore<RxDocumentType>): RxFirestoreReplicationState<RxDocumentType>;
    /**
     * HOOKS
     */
    addHook(when: HookWhenType, key: HookKeyType, fun: any, parallel?: boolean): void;
    getHooks(when: HookWhenType, key: HookKeyType): {
        series: Function[];
        parallel: Function[];
    };
    hasHooks(when: HookWhenType, key: HookKeyType): boolean;
    _runHooks(when: HookWhenType, key: HookKeyType, data: any, instance?: any): Promise<any>;
    /**
     * does the same as ._runHooks() but with non-async-functions
     */
    _runHooksSync(when: HookWhenType, key: HookKeyType, data: any, instance: any): void;
    /**
     * Returns a promise that resolves after the given time.
     * Ensures that is properly cleans up when the collection is destroyed
     * so that no running timeouts prevent the exit of the JavaScript process.
     */
    promiseWait(time: number): Promise<void>;
    destroy(): Promise<boolean>;
    /**
     * remove all data of the collection
     */
    remove(): Promise<any>;
    get asRxCollection(): RxCollection<RxDocumentType, OrmMethods, StaticMethods>;
}
/**
 * creates and prepares a new collection
 */
export declare function createRxCollection({ database, name, schema, instanceCreationOptions, migrationStrategies, autoMigrate, statics, methods, attachments, options, localDocuments, cacheReplacementPolicy, conflictHandler }: any): Promise<RxCollection>;
export declare function isRxCollection(obj: any): boolean;
export {};
