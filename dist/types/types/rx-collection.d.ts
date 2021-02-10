import type {
    RxJsonSchema,
    PouchSettings,
    RxDocument,
    RxLocalDocument
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

export interface RxCollectionCreator extends RxCollectionCreatorBase {
    name: string;
}

/**
 * TODO remove RxCollectionCreator
 * and rename this one in the next release
 */
export type RxCollectionCreatorBase = {
    schema: RxJsonSchema;
    pouchSettings?: PouchSettings;
    migrationStrategies?: KeyFunctionMap;
    autoMigrate?: boolean;
    statics?: KeyFunctionMap;
    methods?: KeyFunctionMap;
    attachments?: KeyFunctionMap;
    options?: any;
    cacheReplacementPolicy?: RxCacheReplacementPolicy;
}

export interface MigrationState {
    done: boolean; // true if finished
    total: number; // will be the doc-count
    handled: number; // amount of handled docs
    success: number; // handled docs which successed
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
export type RxCollectionHookNoInstance<RxDocumentType, OrmMethods> = (data: RxDocumentType) => void | Promise<void> | any;
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
    StaticMethods = { [key: string]: any }
    > = RxCollectionBase<RxDocumentType, OrmMethods> &
    RxCollectionGenerated<RxDocumentType, OrmMethods> &
    StaticMethods;

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
 * Properties are possibly encrypted so type them as any.
 */
export type RxDumpCollectionAsAny<T> = { [P in keyof T]: any };

interface RxDumpCollectionBase {
    encrypted: boolean;
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
