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
    PouchSettings,
    PouchReplicationOptions
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

export interface RxCollectionCreator {
    name: string;
    schema: RxSchema | RxJsonSchema;
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

export declare class RxReplicationState {
    change$: Observable<any>;
    docs$: Observable<any>;
    active$: Observable<any>;
    complete$: Observable<any>;
    error$: Observable<any>;
    cancel(): Promise<any>;

    // if you do a custom sync, put the thing you get back from pouch here
    setPouchEventEmitter(pouchSyncState: any): void;
}

export interface SyncOptions {
    remote: string | any,
    waitForLeadership?: boolean,
    direction?: {
        push?: boolean,
        pull?: boolean
    },
    // for options see https://pouchdb.com/api.html#replication
    options?: PouchReplicationOptions,
    query?: RxQuery<any, any>
}

export declare class RxCollection<RxDocumentType, OrmMethods = {}> {
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
    preInsert(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    preSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    preRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;

    postInsert(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postSave(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postRemove(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>, parallel: boolean): void;
    postCreate(fun: RxCollectionHookCallback<RxDocumentType, OrmMethods>): void;


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

    destroy(): Promise<boolean>;
    remove(): Promise<any>;
}

export type RxCollectionHookCallback<RxDocumentType, OrmMethods> = (doc: RxDocument<RxDocumentType, OrmMethods>) => void;
