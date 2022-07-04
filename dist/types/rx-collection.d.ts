import type { DataMigrator } from './plugins/migration';
import { DocCache } from './doc-cache';
import { QueryCache } from './query-cache';
import { ChangeEventBuffer } from './change-event-buffer';
import { Subscription, Observable } from 'rxjs';
import type { KeyFunctionMap, RxCouchDBReplicationState, MigrationState, SyncOptions, RxCollection, RxDatabase, RxQuery, RxDocument, SyncOptionsGraphQL, RxDumpCollection, RxDumpCollectionAny, MangoQuery, MangoQueryNoLimit, RxCacheReplacementPolicy, RxStorageBulkWriteError, RxChangeEvent, RxChangeEventInsert, RxChangeEventUpdate, RxChangeEventDelete, RxStorageInstance, CollectionsOfDatabase, RxConflictHandler } from './types';
import type { RxGraphQLReplicationState } from './plugins/replication-graphql';
import { RxSchema } from './rx-schema';
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
    get onDestroy(): Promise<void>;
    destroyed: boolean;
    _atomicUpsertQueues: Map<string, Promise<any>>;
    synced: boolean;
    hooks: any;
    _subs: Subscription[];
    _docCache: DocCache<RxDocument<RxDocumentType, OrmMethods>>;
    _queryCache: QueryCache;
    $: Observable<RxChangeEvent<RxDocumentType>>;
    _changeEventBuffer: ChangeEventBuffer;
    /**
     * returns a promise that is resolved when the collection gets destroyed
     */
    private _onDestroy?;
    private _onDestroyCall?;
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
     * @param _decrypted
     * When true, all encrypted values will be decrypted.
     * When false or omitted and an interface or type is loaded in this collection,
     * all base properties of the type are typed as `any` since data could be encrypted.
     */
    exportJSON(): Promise<RxDumpCollection<RxDocumentType>>;
    exportJSON(): Promise<RxDumpCollectionAny<RxDocumentType>>;
    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
     */
    importJSON(_exportedJSON: RxDumpCollectionAny<RxDocumentType>): Promise<void>;
    /**
     * sync with a CouchDB endpoint
     */
    syncCouchDB(_syncOptions: SyncOptions): RxCouchDBReplicationState;
    /**
     * sync with a GraphQL endpoint
     */
    syncGraphQL(_options: SyncOptionsGraphQL<RxDocumentType>): RxGraphQLReplicationState<RxDocumentType>;
    /**
     * HOOKS
     */
    addHook(when: string, key: string, fun: any, parallel?: boolean): void;
    getHooks(when: string, key: string): any;
    _runHooks(when: string, key: string, data: any, instance?: any): Promise<any>;
    /**
     * does the same as ._runHooks() but with non-async-functions
     */
    _runHooksSync(when: string, key: string, data: any, instance: any): void;
    /**
     * creates a temporaryDocument which can be saved later
     */
    newDocument(docData?: Partial<RxDocumentType>): RxDocument<RxDocumentType, OrmMethods>;
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
