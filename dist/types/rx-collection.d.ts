import { RxQueryBase } from './rx-query';
import type { DataMigrator } from './plugins/migration';
import { Crypter } from './crypter';
import { DocCache } from './doc-cache';
import { QueryCache } from './query-cache';
import { ChangeEventBuffer } from './change-event-buffer';
import type { Subscription, Observable } from 'rxjs';
import type { KeyFunctionMap, RxCouchDBReplicationState, MigrationState, SyncOptions, RxCollection, RxDatabase, RxQuery, RxDocument, SyncOptionsGraphQL, RxDumpCollection, RxDumpCollectionAny, MangoQuery, MangoQueryNoLimit, RxCacheReplacementPolicy, RxStorageBulkWriteError, RxStorageKeyObjectInstance, RxChangeEvent, RxChangeEventInsert, RxChangeEventUpdate, RxChangeEventDelete, RxStorageInstance, CollectionsOfDatabase } from './types';
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
    /**
     * Stores all 'normal' documents
     */
    storageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>;
    /**
     * Stores the local documents so that they are not deleted
     * when a migration runs.
     */
    localDocumentsStore: RxStorageKeyObjectInstance<any, InstanceCreationOptions>;
    instanceCreationOptions: InstanceCreationOptions;
    migrationStrategies: KeyFunctionMap;
    methods: KeyFunctionMap;
    attachments: KeyFunctionMap;
    options: any;
    cacheReplacementPolicy: RxCacheReplacementPolicy;
    statics: KeyFunctionMap;
    constructor(database: RxDatabase<CollectionsOfDatabase, any, InstanceCreationOptions>, name: string, schema: RxSchema<RxDocumentType>, 
    /**
     * Stores all 'normal' documents
     */
    storageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>, 
    /**
     * Stores the local documents so that they are not deleted
     * when a migration runs.
     */
    localDocumentsStore: RxStorageKeyObjectInstance<any, InstanceCreationOptions>, instanceCreationOptions?: InstanceCreationOptions, migrationStrategies?: KeyFunctionMap, methods?: KeyFunctionMap, attachments?: KeyFunctionMap, options?: any, cacheReplacementPolicy?: RxCacheReplacementPolicy, statics?: KeyFunctionMap);
    /**
     * returns observable
     */
    get $(): Observable<RxChangeEvent<any>>;
    get insert$(): Observable<RxChangeEventInsert<RxDocumentType>>;
    get update$(): Observable<RxChangeEventUpdate<RxDocumentType>>;
    get remove$(): Observable<RxChangeEventDelete<RxDocumentType>>;
    get onDestroy(): Promise<void>;
    _isInMemory: boolean;
    destroyed: boolean;
    _atomicUpsertQueues: Map<any, any>;
    synced: boolean;
    hooks: any;
    _subs: Subscription[];
    _repStates: Set<RxCouchDBReplicationState>;
    _docCache: DocCache<RxDocument<RxDocumentType, OrmMethods>>;
    _queryCache: QueryCache;
    _crypter: Crypter;
    _observable$: Observable<RxChangeEvent<RxDocumentType>>;
    _changeEventBuffer: ChangeEventBuffer;
    /**
     * returns a promise that is resolved when the collection gets destroyed
     */
    private _onDestroy?;
    private _onDestroyCall?;
    prepare(
    /**
     * TODO is this still needed?
     * set to true if the collection data already exists on this storage adapter
     */
    _wasCreatedBefore: boolean): Promise<void>;
    migrationNeeded(): Promise<boolean>;
    getDataMigrator(): DataMigrator;
    migrate(batchSize?: number): Observable<MigrationState>;
    migratePromise(batchSize?: number): Promise<any>;
    /**
     * wrapps the query function of the storage instance.
     */
    _queryStorageInstance(rxQuery: RxQuery | RxQueryBase, limit?: number, noDecrypt?: boolean): Promise<any[]>;
    /**
     * TODO internally call bulkInsert
     * to not have duplicated code.
     */
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
     * that always emitts the current state
     */
    findByIds$(ids: string[]): Observable<Map<string, RxDocument<RxDocumentType, OrmMethods>>>;
    /**
     * Export collection to a JSON friendly format.
     * @param _decrypted
     * When true, all encrypted values will be decrypted.
     * When false or omitted and an interface or type is loaded in this collection,
     * all base properties of the type are typed as `any` since data could be encrypted.
     */
    exportJSON(_decrypted: boolean): Promise<RxDumpCollection<RxDocumentType>>;
    exportJSON(_decrypted?: false): Promise<RxDumpCollectionAny<RxDocumentType>>;
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
     * Create a replicated in-memory-collection
     */
    inMemory(): Promise<RxCollection<RxDocumentType, OrmMethods>>;
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
export declare function createRxCollection({ database, name, schema, instanceCreationOptions, migrationStrategies, autoMigrate, statics, methods, attachments, options, cacheReplacementPolicy }: any, wasCreatedBefore: boolean): Promise<RxCollection>;
export declare function isRxCollection(obj: any): boolean;
