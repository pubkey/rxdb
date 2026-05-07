import type {
    RxJsonSchema,
    RxDocument,
    MigrationStrategies,
    RxConflictHandler
} from './index.d.ts';
import type {
    RxCollectionBase
} from '../rx-collection.d.ts';
import type { QueryCache } from '../query-cache.d.ts';
import type { RxLocalDocumentMutation } from './rx-database.d.ts';

export interface KeyFunctionMap {
    [key: string]: Function;
}
export interface NumberFunctionMap {
    [key: number]: Function;
}


/**
 * Params to create a new collection.
 * Notice the name of the collection is set one level higher
 * when calling addCollections()
 *
 * ## AI Agent Guidance — Before Creating a Collection
 *
 * Work through this checklist before finalizing the collection definition:
 * 1. **Read patterns** — list every query the collection must serve.
 * 2. **Indexes** — add an index entry for every field used in a `selector` or `sort`.
 * 3. **Conflict handling** — choose a `conflictHandler` appropriate for your sync strategy.
 * 4. **Migration** — provide a `migrationStrategies` entry for every future version bump.
 * 5. **Serializability** — the document type must be fully JSON-serializable
 *    (no `Date` objects, no `undefined` values, no functions).
 * 6. **Replication safety** — all fields must survive a round-trip through JSON
 *    (no circular refs, no class instances).
 * 7. **Nesting depth** — keep document nesting to 3 levels or fewer.
 *
 * Prefer flat, denormalized documents over deeply nested or relational shapes.
 */
export type RxCollectionCreator<RxDocType = any> = {
    schema: RxJsonSchema<RxDocType>;
    instanceCreationOptions?: any;
    migrationStrategies?: MigrationStrategies;
    autoMigrate?: boolean;
    statics?: KeyFunctionMap;
    methods?: KeyFunctionMap;
    attachments?: KeyFunctionMap;
    options?: any;
    /**
     * When set to a positive number (in milliseconds), live query updates triggered by
     * write events are grouped using auditTime before _ensureEqual() runs.
     * Overrides liveQueryUpdateThrottleTime set at the database level for this collection.
     * When not set, the database-level value is used.
     */
    liveQueryUpdateThrottleTime?: number;
    /**
     * Set this to true if you want to store local documents
     * in the RxCollection instance.
     */
    localDocuments?: boolean;
    cacheReplacementPolicy?: RxCacheReplacementPolicy;

    /**
     * Depending on which plugins or storage is used,
     * the RxCollection might need a way to resolve conflicts
     * which is done by this conflict handler.
     * If no conflict handler is provided, a master-always-wins handler
     * will be used as default
     */
    conflictHandler?: RxConflictHandler<RxDocType>;
};

export type RxCacheReplacementPolicy = (collection: RxCollection, queryCache: QueryCache) => void;

export type RxCollectionHookCallback<
    RxDocumentType,
    OrmMethods,
    Reactivity
> = (
    data: RxDocumentType,
    instance: RxDocument<RxDocumentType, OrmMethods, Reactivity>
) => void | Promise<void> | any;
export type RxCollectionHookNoInstance<RxDocumentType> = (data: RxDocumentType) => void | Promise<void> | any;
export type RxCollectionHookCallbackNonAsync<RxDocumentType, OrmMethods, Reactivity> = (
    data: RxDocumentType,
    instance: RxDocument<RxDocumentType, OrmMethods, Reactivity>
) => void | any;
export type RxCollectionHookNoInstanceCallback<
    RxDocumentType,
    OrmMethods,
    Reactivity
> = (
    data: RxDocumentType,
    instance: RxCollection<RxDocumentType, OrmMethods, Reactivity>
) => Promise<void> | void | any;

export type RxCollection<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {},
    Reactivity = unknown
> = StaticMethods &
    RxCollectionBase<InstanceCreationOptions, RxDocumentType, OrmMethods, StaticMethods, Reactivity> &
    RxCollectionGenerated<RxDocumentType, OrmMethods, Reactivity>;

export interface RxCollectionGenerated<RxDocumentType = any, OrmMethods = {}, Reactivity = unknown> extends RxLocalDocumentMutation<RxCollection<RxDocumentType, OrmMethods, any, any, Reactivity>> {

    // HOOKS
    preInsert(fun: RxCollectionHookNoInstanceCallback<RxDocumentType, OrmMethods, Reactivity>, parallel: boolean): void;
    preSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods, Reactivity>, parallel: boolean): void;
    preRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods, Reactivity>, parallel: boolean): void;
    postInsert(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods, Reactivity>, parallel: boolean): void;
    postSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods, Reactivity>, parallel: boolean): void;
    postRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods, Reactivity>, parallel: boolean): void;
    postCreate(fun: RxCollectionHookCallbackNonAsync<RxDocumentType, OrmMethods, Reactivity>): void;

    // only inMemory-collections
    awaitPersistence(): Promise<void>;
}

/**
 * Previously all properties were typed as any because they could be encrypted.
 * This is no longer needed so the type now preserves the original property types.
 */
export type RxDumpCollectionAsAny<T> = T;

interface RxDumpCollectionBase {
    name: string;
    passwordHash?: string;
    schemaHash: string;
}
export interface RxDumpCollection<RxDocumentType> extends RxDumpCollectionBase {
    docs: RxDocumentType[];
}
export interface RxDumpCollectionAny<RxDocumentType> extends RxDumpCollectionBase {
    docs: RxDumpCollectionAsAny<RxDocumentType>[];
}
