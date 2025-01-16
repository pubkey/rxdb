import type { RxMigrationState } from './plugins/migration-schema/index.ts';
import { DocumentCache } from './doc-cache.ts';
import { QueryCache } from './query-cache.ts';
import { ChangeEventBuffer } from './change-event-buffer.ts';
import { Subscription, Observable } from 'rxjs';
import type { KeyFunctionMap, RxCollection, RxDatabase, RxQuery, RxDocument, RxDumpCollection, RxDumpCollectionAny, MangoQuery, MangoQueryNoLimit, RxCacheReplacementPolicy, RxStorageWriteError, RxChangeEvent, RxChangeEventInsert, RxChangeEventUpdate, RxChangeEventDelete, RxStorageInstance, CollectionsOfDatabase, RxChangeEventBulk, RxConflictHandler, MaybePromise, CRDTEntry, MangoQuerySelectorAndIndex, MigrationStrategies } from './types/index.d.ts';
import { RxSchema } from './rx-schema.ts';
import { WrappedRxStorageInstance } from './rx-storage-helper.ts';
import { IncrementalWriteQueue } from './incremental-write.ts';
import type { RxPipeline, RxPipelineOptions } from './plugins/pipeline/index.ts';
declare const HOOKS_WHEN: readonly ["pre", "post"];
type HookWhenType = typeof HOOKS_WHEN[number];
declare const HOOKS_KEYS: readonly ["insert", "save", "remove", "create"];
type HookKeyType = typeof HOOKS_KEYS[number];
export declare const OPEN_COLLECTIONS: Set<RxCollectionBase<any, any, any, {
    [key: string]: any;
}, any>>;
export declare class RxCollectionBase<InstanceCreationOptions, RxDocumentType = {
    [prop: string]: any;
}, OrmMethods = {}, StaticMethods = {
    [key: string]: any;
}, Reactivity = any> {
    readonly database: RxDatabase<CollectionsOfDatabase, any, InstanceCreationOptions, Reactivity>;
    name: string;
    schema: RxSchema<RxDocumentType>;
    internalStorageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>;
    instanceCreationOptions: InstanceCreationOptions;
    migrationStrategies: MigrationStrategies;
    methods: KeyFunctionMap;
    attachments: KeyFunctionMap;
    options: any;
    cacheReplacementPolicy: RxCacheReplacementPolicy;
    statics: KeyFunctionMap;
    conflictHandler: RxConflictHandler<RxDocumentType>;
    /**
     * Stores all 'normal' documents
     */
    storageInstance: WrappedRxStorageInstance<RxDocumentType, any, InstanceCreationOptions>;
    readonly timeouts: Set<ReturnType<typeof setTimeout>>;
    incrementalWriteQueue: IncrementalWriteQueue<RxDocumentType>;
    /**
     * Before reads, all these methods are awaited. Used to "block" reads
     * depending on other processes, like when the RxPipeline is running.
     */
    readonly awaitBeforeReads: Set<() => MaybePromise<any>>;
    constructor(database: RxDatabase<CollectionsOfDatabase, any, InstanceCreationOptions, Reactivity>, name: string, schema: RxSchema<RxDocumentType>, internalStorageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>, instanceCreationOptions?: InstanceCreationOptions, migrationStrategies?: MigrationStrategies, methods?: KeyFunctionMap, attachments?: KeyFunctionMap, options?: any, cacheReplacementPolicy?: RxCacheReplacementPolicy, statics?: KeyFunctionMap, conflictHandler?: RxConflictHandler<RxDocumentType>);
    get insert$(): Observable<RxChangeEventInsert<RxDocumentType>>;
    get update$(): Observable<RxChangeEventUpdate<RxDocumentType>>;
    get remove$(): Observable<RxChangeEventDelete<RxDocumentType>>;
    _incrementalUpsertQueues: Map<string, Promise<any>>;
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
    _docCache: DocumentCache<RxDocumentType, OrmMethods>;
    _queryCache: QueryCache;
    $: Observable<RxChangeEvent<RxDocumentType>>;
    checkpoint$: Observable<any>;
    _changeEventBuffer: ChangeEventBuffer<RxDocumentType>;
    /**
     * Internally only use eventBulks$
     * Do not use .$ or .observable$ because that has to transform
     * the events which decreases performance.
     */
    readonly eventBulks$: Observable<RxChangeEventBulk<any>>;
    /**
     * When the collection is closed,
     * these functions will be called an awaited.
     * Used to automatically clean up stuff that
     * belongs to this collection.
    */
    onClose: (() => MaybePromise<any>)[];
    closed: boolean;
    onRemove: (() => MaybePromise<any>)[];
    prepare(): Promise<void>;
    /**
     * Manually call the cleanup function of the storage.
     * @link https://rxdb.info/cleanup.html
     */
    cleanup(_minimumDeletedTime?: number): Promise<boolean>;
    migrationNeeded(): Promise<boolean>;
    getMigrationState(): RxMigrationState;
    startMigration(batchSize?: number): Promise<void>;
    migratePromise(batchSize?: number): Promise<any>;
    insert(json: RxDocumentType | RxDocument): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    insertIfNotExists(json: RxDocumentType | RxDocument): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    bulkInsert(docsData: RxDocumentType[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }>;
    bulkRemove(
    /**
     * You can either remove the documents by their ids
     * or by directly providing the RxDocument instances
     * if you have them already. This improves performance a bit.
     */
    idsOrDocs: string[] | RxDocument<RxDocumentType>[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }>;
    /**
     * same as bulkInsert but overwrites existing document with same primary
     */
    bulkUpsert(docsData: Partial<RxDocumentType>[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }>;
    /**
     * same as insert but overwrites existing document with same primary
     */
    upsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    /**
     * upserts to a RxDocument, uses incrementalModify if document already exists
     */
    incrementalUpsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    find(queryObj?: MangoQuery<RxDocumentType>): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods>[], OrmMethods, Reactivity>;
    findOne(queryObj?: MangoQueryNoLimit<RxDocumentType> | string): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods> | null, OrmMethods, Reactivity>;
    count(queryObj?: MangoQuerySelectorAndIndex<RxDocumentType>): RxQuery<RxDocumentType, number, OrmMethods, Reactivity>;
    /**
     * find a list documents by their primary key
     * has way better performance then running multiple findOne() or a find() with a complex $or-selected
     */
    findByIds(ids: string[]): RxQuery<RxDocumentType, Map<string, RxDocument<RxDocumentType, OrmMethods>>, OrmMethods, Reactivity>;
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
    addPipeline(_options: RxPipelineOptions<RxDocumentType>): Promise<RxPipeline<RxDocumentType>>;
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
     * Ensures that is properly cleans up when the collection is closed
     * so that no running timeouts prevent the exit of the JavaScript process.
     */
    promiseWait(time: number): Promise<void>;
    close(): Promise<boolean>;
    /**
     * remove all data of the collection
     */
    remove(): Promise<any>;
    get asRxCollection(): RxCollection<RxDocumentType, OrmMethods, StaticMethods, any, Reactivity>;
}
/**
 * creates and prepares a new collection
 */
export declare function createRxCollection({ database, name, schema, instanceCreationOptions, migrationStrategies, autoMigrate, statics, methods, attachments, options, localDocuments, cacheReplacementPolicy, conflictHandler }: any): Promise<RxCollection>;
export declare function isRxCollection(obj: any): boolean;
export {};
