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
    > = (data: RxDocumentType, instance: RxDocument<RxDocumentType, OrmMethods>) => void | Promise<void>;
export type RxCollectionHookNoInstance<RxDocumentType, OrmMethods> = (data: RxDocumentType) => void | Promise<void>;
export type RxCollectionHookCallbackNonAsync<RxDocumentType, OrmMethods> = (data: RxDocumentType, instance: RxDocument<RxDocumentType, OrmMethods>) => void;
export type RxCollectionHookNoInstanceCallback<RxDocumentType, OrmMethods> = (data: RxDocumentType) => Promise<void>;

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
