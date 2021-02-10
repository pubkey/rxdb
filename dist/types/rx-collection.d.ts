import { RxQueryBase } from './rx-query';
import { RxChangeEvent, RxChangeEventInsert, RxChangeEventUpdate, RxChangeEventDelete } from './rx-change-event';
import type { DataMigrator } from './plugins/migration';
import { Crypter } from './crypter';
import { DocCache } from './doc-cache';
import { QueryCache } from './query-cache';
import { ChangeEventBuffer } from './change-event-buffer';
import type { Subscription, Observable } from 'rxjs';
import type { PouchSettings, KeyFunctionMap, RxReplicationState, PouchDBInstance, MigrationState, SyncOptions, RxCollection, RxDatabase, RxQuery, RxDocument, SyncOptionsGraphQL, RxDumpCollection, RxDumpCollectionAny, MangoQuery, MangoQueryNoLimit, RxCacheReplacementPolicy, PouchWriteError } from './types';
import type { RxGraphQLReplicationState } from './plugins/replication-graphql';
import { RxSchema } from './rx-schema';
export declare class RxCollectionBase<RxDocumentType = {
    [prop: string]: any;
}, OrmMethods = {}, StaticMethods = {
    [key: string]: any;
}> {
    database: RxDatabase;
    name: string;
    schema: RxSchema<RxDocumentType>;
    pouchSettings: PouchSettings;
    migrationStrategies: KeyFunctionMap;
    methods: KeyFunctionMap;
    attachments: KeyFunctionMap;
    options: any;
    cacheReplacementPolicy: RxCacheReplacementPolicy;
    statics: KeyFunctionMap;
    constructor(database: RxDatabase, name: string, schema: RxSchema<RxDocumentType>, pouchSettings?: PouchSettings, migrationStrategies?: KeyFunctionMap, methods?: KeyFunctionMap, attachments?: KeyFunctionMap, options?: any, cacheReplacementPolicy?: RxCacheReplacementPolicy, statics?: KeyFunctionMap);
    /**
     * returns observable
     */
    get $(): Observable<RxChangeEvent>;
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
    _repStates: RxReplicationState[];
    pouch: PouchDBInstance;
    _docCache: DocCache<RxDocument<RxDocumentType, OrmMethods>>;
    _queryCache: QueryCache;
    _crypter: Crypter;
    _observable$?: Observable<any>;
    _changeEventBuffer: ChangeEventBuffer;
    _keyCompressor?: any;
    /**
     * returns a promise that is resolved when the collection gets destroyed
     */
    private _onDestroy?;
    private _onDestroyCall?;
    prepare(
    /**
     * set to true if the collection data already exists on this storage adapter
     */
    wasCreatedBefore: boolean): Promise<[any, any]>;
    migrationNeeded(): Promise<boolean>;
    getDataMigrator(): DataMigrator;
    migrate(batchSize?: number): Observable<MigrationState>;
    migratePromise(batchSize?: number): Promise<any>;
    /**
     * wrappers for Pouch.put/get to handle keycompression etc
     */
    _handleToPouch(docData: any): any;
    _handleFromPouch(docData: any, noDecrypt?: boolean): any;
    /**
     * every write on the pouchdb
     * is tunneld throught this function
     */
    _pouchPut(obj: any, overwrite?: boolean): Promise<any>;
    /**
     * get document from pouchdb by its _id
     */
    _pouchGet(key: string): Promise<any>;
    /**
     * wrapps pouch-find
     */
    _pouchFind(rxQuery: RxQuery | RxQueryBase, limit?: number, noDecrypt?: boolean): Promise<any[]>;
    $emit(changeEvent: RxChangeEvent): void;
    insert(json: RxDocumentType | RxDocument): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    bulkInsert(docsData: RxDocumentType[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: PouchWriteError[];
    }>;
    bulkRemove(ids: string[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: any[];
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
    dump(_decrypted: boolean): Promise<RxDumpCollection<RxDocumentType>>;
    dump(_decrypted?: false): Promise<RxDumpCollectionAny<RxDocumentType>>;
    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<collection>.dump()` method.
     */
    importDump(_exportedJSON: RxDumpCollectionAny<RxDocumentType>): Promise<void>;
    /**
     * waits for external changes to the database
     * and ensures they are emitted to the internal RxChangeEvent-Stream
     * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
     */
    watchForChanges(): void;
    /**
     * sync with another database
     */
    sync(_syncOptions: SyncOptions): RxReplicationState;
    /**
     * sync with a GraphQL endpoint
     */
    syncGraphQL(options: SyncOptionsGraphQL): RxGraphQLReplicationState;
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
export declare function create({ database, name, schema, pouchSettings, migrationStrategies, autoMigrate, statics, methods, attachments, options, cacheReplacementPolicy }: any, wasCreatedBefore: boolean): Promise<RxCollection>;
export declare function isInstanceOf(obj: any): boolean;
declare const _default: {
    create: typeof create;
    isInstanceOf: typeof isInstanceOf;
    RxCollectionBase: typeof RxCollectionBase;
};
export default _default;
