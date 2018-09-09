import { Observable } from 'rxjs';

import {
    PouchDB
} from './pouch';

import {
    RxSchema,
    RxJsonSchema
} from './rx-schema';
import {
    RxDatabase
} from './rx-database';
import {
    RxQuery
} from './rx-query';
import {
    PouchSettings
} from './pouch';
import {
    RxChangeEventInsert,
    RxChangeEventUpdate,
    RxChangeEventRemove
} from './rx-change-event';
import {
    RxDocument,
    RxLocalDocument
} from './rx-document';

import {
    SyncOptions,
    RxReplicationState
} from './plugins/replication';

export interface RxCollectionCreator {
    name: string;
    schema: RxJsonSchema;
    pouchSettings?: PouchSettings;
    migrationStrategies?: {
        [key: number]: Function
    };
    autoMigrate?: boolean;
    statics?: {
        [key: string]: Function
    };
    methods?: {
        [key: string]: Function
    };
    attachments?: {
        [key: string]: Function
    };
    options?: any;
}

export type RxCollectionHookCallback<RxDocumentType, OrmMethods> = (data: RxDocumentType, instance: RxDocument<RxDocumentType, OrmMethods>) => void | Promise<void>;
export type RxCollectionHookNoInstance<RxDocumentType, OrmMethods> = (data: RxDocumentType) => void | Promise<void>;
export type RxCollectionHookCallbackNonAsync<RxDocumentType, OrmMethods> = (data: RxDocumentType, instance: RxDocument<RxDocumentType, OrmMethods>) => void;
export type RxCollectionHookNoInstanceCallback<RxDocumentType, OrmMethods> = (data: RxDocumentType) => Promise<void>;

export type RxCollection<RxDocumentType = any, OrmMethods = {}, StaticMethods = { [key: string]: any }> = RxCollectionBase<RxDocumentType, OrmMethods> & StaticMethods;

export declare class RxCollectionBase<RxDocumentType = any, OrmMethods = {}> {
    readonly database: RxDatabase;
    readonly name: string;
    readonly schema: RxSchema<RxDocumentType>;
    options?: any;
    readonly pouch: PouchDB;

    readonly $: Observable<RxChangeEventInsert<RxDocumentType> | RxChangeEventUpdate<RxDocumentType> | RxChangeEventRemove<RxDocumentType>>;
    readonly insert$: Observable<RxChangeEventInsert<RxDocumentType>>;
    readonly update$: Observable<RxChangeEventUpdate<RxDocumentType>>;
    readonly remove$: Observable<RxChangeEventRemove<RxDocumentType>>;

    insert(json: RxDocumentType): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    newDocument(json: Partial<RxDocumentType>): RxDocument<RxDocumentType, OrmMethods>;
    upsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    atomicUpsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    find(queryObj?: any): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods>[]>;
    findOne(queryObj?: any): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods> | null>;

    dump(decrytped: boolean): Promise<any>;
    importDump(exportedJSON: any): Promise<Boolean>;

    // HOOKS
    preInsert(fun: RxCollectionHookNoInstanceCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    preSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    preRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postInsert(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postCreate(fun: RxCollectionHookCallbackNonAsync<RxDocumentType, OrmMethods>): void;

    // migration
    migrationNeeded(): Promise<boolean>;
    migrate(batchSize: number): Observable<{
        done: boolean, // true if finished
        total: number, // will be the doc-count
        handled: number, // amount of handled docs
        success: number, // handled docs which successed
        deleted: number, // handled docs which got deleted
        percent: number // percentage
    }>;
    migratePromise(batchSize: number): Promise<any>;

    sync(syncOptions: SyncOptions): RxReplicationState;
    // if you do custom-sync, use this
    createRxReplicationState(): RxReplicationState;

    /**
     * creates an in-memory replicated version of this collection
     */
    inMemory(): Promise<RxCollection<RxDocumentType, OrmMethods>>;

    insertLocal(id: string, data: any): Promise<RxLocalDocument<RxCollection<RxDocumentType, OrmMethods>>>;
    upsertLocal(id: string, data: any): Promise<RxLocalDocument<RxCollection<RxDocumentType, OrmMethods>>>;
    getLocal(id: string): Promise<RxLocalDocument<RxCollection<RxDocumentType, OrmMethods>>>;

    // only inMemory-collections
    awaitPersistence(): Promise<void>;

    destroy(): Promise<boolean>;
    remove(): Promise<any>;
}
