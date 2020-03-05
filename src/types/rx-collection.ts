import {
    RxJsonSchema,
    PouchSettings,
    RxDocument,
    RxLocalDocument
} from './';
import {
    RxCollectionBase
} from '../rx-collection';

export interface KeyFunctionMap {
    [key: string]: Function;
}
export interface NumberFunctionMap {
    [key: number]: Function;
}

export interface RxCollectionCreator {
    name: string;
    schema: RxJsonSchema;
    pouchSettings?: PouchSettings;
    migrationStrategies?: KeyFunctionMap;
    autoMigrate?: boolean;
    statics?: KeyFunctionMap;
    methods?: KeyFunctionMap;
    attachments?: KeyFunctionMap;
    options?: any;
}

export interface MigrationState {
    done: boolean; // true if finished
    total: number; // will be the doc-count
    handled: number; // amount of handled docs
    success: number; // handled docs which successed
    deleted: number; // handled docs which got deleted
    percent: number; // percentage
}

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
        instance: RxCollection
    ) => Promise<void> | void | any;

export type RxCollection<
    RxDocumentType = any,
    OrmMethods = {},
    StaticMethods = { [key: string]: any }
    > = RxCollectionBase<RxDocumentType, OrmMethods> &
    RxCollectionGenerated<RxDocumentType, OrmMethods> &
    StaticMethods;

export interface RxCollectionGenerated<RxDocumentType = any, OrmMethods = {}> {

    // HOOKS
    preInsert(fun: RxCollectionHookNoInstanceCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    preSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    preRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postInsert(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postCreate(fun: RxCollectionHookCallbackNonAsync<RxDocumentType, OrmMethods>): void;

    insertLocal(id: string, data: any): Promise<RxLocalDocument<RxCollection<RxDocumentType, OrmMethods>>>;
    upsertLocal(id: string, data: any): Promise<RxLocalDocument<RxCollection<RxDocumentType, OrmMethods>>>;
    getLocal(id: string): Promise<RxLocalDocument<RxCollection<RxDocumentType, OrmMethods>>>;

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
