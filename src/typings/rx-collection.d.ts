import { Observable } from 'rxjs';

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
    RxChangeEvent
} from './rx-change-event';
import {
    RxDocument
} from './rx-document';

export interface RxCollectionCreator {
    name: string;
    schema: RxJsonSchema | RxSchema;
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
    query?: RxQuery<any>
}

export declare class RxCollection<RxDocumentType> {
    readonly database: RxDatabase;
    readonly name: string;
    readonly schema: RxSchema<RxDocumentType>;

    readonly $: Observable<RxChangeEvent>;
    insert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType>>;
    newDocument(json: Partial<RxDocumentType>): RxDocument<RxDocumentType>;
    upsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType>>;
    atomicUpsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType>>;
    find(queryObj?: any): RxQuery<RxDocument<RxDocumentType>[]>;
    findOne(queryObj?: any): RxQuery<RxDocument<RxDocumentType>>;

    dump(decrytped: boolean): Promise<any>;
    importDump(exportedJSON: any): Promise<Boolean>;

    // HOOKS
    preInsert(fun: RxCollectionHookCallback<RxDocumentType>, parallel: boolean): void;
    preSave(fun: RxCollectionHookCallback<RxDocumentType>, parallel: boolean): void;
    preRemove(fun: RxCollectionHookCallback<RxDocumentType>, parallel: boolean): void;

    postInsert(fun: RxCollectionHookCallback<RxDocumentType>, parallel: boolean): void;
    postSave(fun: RxCollectionHookCallback<RxDocumentType>, parallel: boolean): void;
    postRemove(fun: RxCollectionHookCallback<RxDocumentType>, parallel: boolean): void;
    postCreate(fun: RxCollectionHookCallback<RxDocumentType>): void;


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
    inMemory(): Promise<RxCollection<RxDocumentType>>;

    destroy(): Promise<boolean>;
    remove(): Promise<any>;
}

export type RxCollectionHookCallback<RxDocumentType> = (doc: RxDocument<RxDocumentType>) => void;
