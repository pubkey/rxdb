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
 * Notice the name of the collection is set one level higher
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

export interface RxMigrationStatus {
    status: 'NOT-STARTED' | 'RUNNING' | 'DONE';
    /**
     * Counters so that you can display
     * the migration state to your user in the UI
     * and show a loading bar.
     */
    count: {
        /**
         * Total amount of documents that
         * have to be migrated
         */
        total: number;
        /**
         * Amount of documents that have been migrated already
         */
        handled: number;
        /**
         * Amount handled docs which where
         * successfully migrated
         * (the migration strategy did NOT return null)
         */
        success: number;
        /**
         * Amount of handled docs which got purged.
         * (the migration strategy returned null)
         */
        purged: number;
        /**
         * Total percentage [0-100]
         */
        percent: number;
    };
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
export type RxCollectionHookNoInstanceCallback<
    RxDocumentType,
    OrmMethods
> = (
    data: RxDocumentType,
    instance: RxCollection<RxDocumentType, OrmMethods>
) => Promise<void> | void | any;

export type RxCollection<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = {},
    InstanceCreationOptions = {}
> = StaticMethods &
    RxCollectionBase<InstanceCreationOptions, RxDocumentType, OrmMethods> &
    RxCollectionGenerated<RxDocumentType, OrmMethods>;

export interface RxCollectionGenerated<RxDocumentType = any, OrmMethods = {}> extends RxLocalDocumentMutation<RxCollection<RxDocumentType, OrmMethods>> {

    // HOOKS
    preInsert(fun: RxCollectionHookNoInstanceCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    preSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
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
    passwordHash?: string;
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
