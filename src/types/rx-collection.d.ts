import type {
    RxJsonSchema,
    RxDocument,
    MigrationStrategies,
    RxConflictHandler
} from './';
import type {
    RxCollectionBase
} from '../rx-collection';
import type { QueryCache } from '../query-cache';
import { RxLocalDocumentMutation } from './rx-database';

export interface KeyFunctionMap {
    [key: string]: Function;
}
export interface NumberFunctionMap {
    [key: number]: Function;
}


/**
 * Params to create a new collection.
 * Notice the name of the collection is set onle level higher
 * when calling addCollections()
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

export interface MigrationState {
    done: boolean; // true if finished
    total: number; // will be the doc-count
    handled: number; // amount of handled docs
    success: number; // handled docs which succeeded
    deleted: number; // handled docs which got deleted
    percent: number; // percentage
}


export type RxCacheReplacementPolicy = (collection: RxCollection, queryCache: QueryCache) => void;

export type RxCollectionHookCallback<
    RxDocumentType,
    OrmMethods
> = (
    data: RxDocumentType,
    instance: RxDocument<RxDocumentType, OrmMethods>
) => void | Promise<void> | any;
export type RxCollectionHookNoInstance<RxDocumentType> = (data: RxDocumentType) => void | Promise<void> | any;
export type RxCollectionHookCallbackNonAsync<RxDocumentType, OrmMethods> = (
    data: RxDocumentType,
    instance: RxDocument<RxDocumentType, OrmMethods>
) => void | any;
export type RxPreInsertHookCallback<
    RxDocumentType,
    OrmMethods,
    InsertMiddlewareInput
> = (
    inputData: InsertMiddlewareInput,
    collection: RxCollection<RxDocumentType, OrmMethods>
) => Promise<RxDocumentType> | RxDocumentType;

export type RxPreSaveHookCallback<
    RxDocumentType,
    OrmMethods,
    SaveMiddlewareInput
> = (
    inputData: SaveMiddlewareInput,
    existingDocument: RxDocument<RxDocumentType, OrmMethods>
) => Promise<RxDocumentType> | RxDocumentType;

export type RxCollection<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {},
    InsertMiddlewareInput = RxDocumentType,
    SaveMiddlewareInput = RxDocumentType
> = StaticMethods &
    RxCollectionBase<InstanceCreationOptions, RxDocumentType, OrmMethods> &
    RxCollectionGenerated<RxDocumentType, OrmMethods, InsertMiddlewareInput, SaveMiddlewareInput>;

export interface RxCollectionGenerated<
    RxDocumentType = any,
    OrmMethods = {},
    InsertMiddlewareInput = RxDocumentType,
    SaveMiddlewareInput = RxDocumentType
> extends RxLocalDocumentMutation<RxCollection<RxDocumentType, OrmMethods>> {

    // HOOKS
    preInsert(fun: RxPreInsertHookCallback<RxDocumentType, OrmMethods, InsertMiddlewareInput>, parallel: boolean): void;
    preSave(fun: RxPreSaveHookCallback<RxDocumentType, OrmMethods, SaveMiddlewareInput>, parallel: boolean): void;
    preRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postInsert(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postCreate(fun: RxCollectionHookCallbackNonAsync<RxDocumentType, OrmMethods>): void;

    // only inMemory-collections
    awaitPersistence(): Promise<void>;
}

/**
 * Properties are possibly encrypted so type them as any. TODO this is no longer needed.
 */
export type RxDumpCollectionAsAny<T> = { [P in keyof T]: any };

interface RxDumpCollectionBase {
    name: string;
    passwordHash: string | null;
    schemaHash: string;
}
export interface RxDumpCollection<RxDocumentType> extends RxDumpCollectionBase {
    docs: RxDocumentType[];
}
/**
 * All base properties are typed as any because they can be encrypted.
 */
export interface RxDumpCollectionAny<RxDocumentType> extends RxDumpCollectionBase {
    docs: RxDumpCollectionAsAny<RxDocumentType>[];
}
