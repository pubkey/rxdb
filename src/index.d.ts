import { Observable } from 'rxjs';

export declare class RxSchema {
    jsonID: SchemaJSON;
    getSchemaByObjectPath(path: string): any;
    encryptedPaths: any;
    validate(obj: any, schemaObj: any): void;
    hash: string;

    static create(jsonSchema: SchemaJSON): RxSchema;
}

/**
 * @link https://github.com/types/lib-json-schema/blob/master/v4/index.d.ts
 */
export type JsonSchemaTypes = 'array' | 'boolean' | 'integer' | 'number' | 'null' | 'object' | 'string';
export interface JsonSchema {
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    additionalItems?: boolean | JsonSchema;
    type?: JsonSchemaTypes | JsonSchemaTypes[];
    default?: any;
    description?: string;
    dependencies?: {
        [key: string]: JsonSchema | string[];
    };
    exclusiveMinimum?: boolean;
    exclusiveMaximum?: boolean;
    items?: JsonSchema | JsonSchema[];
    multipleOf?: number;
    maxProperties?: number;
    maximum?: number;
    minimum?: number;
    maxLength?: number;
    minLength?: number;
    maxItems?: number;
    minItems?: number;
    minProperties?: number;
    pattern?: string;
    patternProperties?: {
        [key: string]: JsonSchema;
    };
    properties?: {
        [key: string]: JsonSchema;
    };
    required?: string[] | boolean;
    uniqueItems?: boolean;
    enum?: any[];
    not?: JsonSchema;
    definitions?: {
        [key: string]: JsonSchema;
    };
    format?: 'date-time' | 'email' | 'hostname' | 'ipv4' | 'ipv6' | 'uri' | string;
    ref?: string;
    primary?: boolean;
    index?: boolean;
    final?: boolean;
}

export interface SchemaJSON {
    title?: string;
    description?: string;
    version: number;
    type: 'object';
    properties: { [key: string]: JsonSchema };
    required?: Array<string>;
    compoundIndexes?: Array<string | Array<string>>;
    disableKeyCompression?: boolean;
    attachments?: {
            encrypted?: boolean
    };
}

/**
 * possible pouch-settings
 * @link https://pouchdb.com/api.html#create_database
 */
export interface PouchSettings {
    auto_compaction?: boolean,
    revs_limit?: number,
    ajax?: any,
    auth?: any,
    skip_setup?: boolean,
    storage?: any,
    size?: number
}

export interface RxCollectionCreator {
    name: string;
    schema: SchemaJSON | RxSchema;
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

export declare class RxDatabase {
    name: string;
    token: string;
    multiInstance: boolean;
    password: string;
    collections: any;

    $: Observable<RxChangeEvent>;

    collection(args: RxCollectionCreator): Promise<RxCollection<any>>;
    destroy(): Promise<boolean>;
    dump(): Promise<any>;
    importDump(json: any): Promise<any>;
    remove(): Promise<any>;

    isLeader: boolean;

    /**
     * returns a promise which resolves when the instance becomes leader
     * @return {Promise<boolean>}
     */
    waitForLeadership(): Promise<boolean>;
}

declare class RxReplicationState {
    change$: Observable<any>;
    docs$: Observable<any>;
    active$: Observable<any>;
    complete$: Observable<any>;
    error$: Observable<any>;
    cancel(): Promise<any>;

    // if you do a custom sync, put the thing you get back from pouch here
    setPouchEventEmitter(pouchSyncState: any): void;
}

export interface PouchReplicationOptions {
    live?: boolean,
    retry?: boolean,
    filter?: Function,
    doc_ids?: string[],
    query_params?: any,
    view?: any,
    since?: number,
    heartbeat?: number,
    timeout?: number,
    batch_size?: number,
    batches_limit?: number,
    back_off_function?: Function,
    checkpoint?: false | 'source' | 'target'
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

export declare class RxAttachment<RxDocumentType> {
    doc: RxDocument<RxDocumentType>;
    id: string;
    type: string;
    length: number;
    digest: string;
    rev: string;

    remove(): Promise<void>;
    getData(): Promise<Blob>;
    getStringData(): Promise<string>;
}

export type RxCollectionHookCallback<RxDocumentType> = (doc: RxDocument<RxDocumentType>) => void;

export declare class RxCollection<RxDocumentType> {
    database: RxDatabase;
    name: string;
    schema: RxSchema;

    $: Observable<RxChangeEvent>;
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

export interface RxQueryOptions<T> {
    $eq?: T;
    $gt?: T;
    $gte?: T;
    $lt?: T;
    $lte?: T;
    $ne?: T;
    $in?: T[];
    $nin?: T[];
    $regex?: RegExp;
    $exists?: boolean;
    $type?: 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object';
    $mod?: number;
    $not?: T;
    $all?: T[];
    $size?: number;
    $elemMatch?: RxQueryOptions<T>;
}

export type RxQueryObject<T> = keyof T & { [P in keyof T]?: T[P] | RxQueryOptions<T[P]>; } & {
    $or: RxQueryObject<T>[];
    $nor: RxQueryObject<T>[];
    $and: RxQueryObject<T>[];
};

export declare class RxQuery<RxDocumentType> {
    collection: RxCollection<RxDocumentType>;

    where(queryObj: RxQueryObject<RxDocumentType>): RxQuery<RxDocumentType>;
    equals(queryObj: any): RxQuery<RxDocumentType>;
    eq(queryObj: any): RxQuery<RxDocumentType>;
    or(queryObj: keyof RxDocumentType): RxQuery<RxDocumentType>;
    nor(queryObj: keyof RxDocumentType): RxQuery<RxDocumentType>;
    and(queryObj: keyof RxDocumentType): RxQuery<RxDocumentType>;
    gt(queryObj: any): RxQuery<RxDocumentType>;
    gte(queryObj: any): RxQuery<RxDocumentType>;
    lt(queryObj: any): RxQuery<RxDocumentType>;
    lte(queryObj: any): RxQuery<RxDocumentType>;
    ne(queryObj: any): RxQuery<RxDocumentType>;
    in(queryObj: any[]): RxQuery<RxDocumentType>;
    nin(queryObj: any[]): RxQuery<RxDocumentType>;
    all(queryObj: any): RxQuery<RxDocumentType>;
    regex(queryObj: RegExp): RxQuery<RxDocumentType>;
    exists(queryObj: any): RxQuery<RxDocumentType>;
    elemMatch(queryObj: any): RxQuery<RxDocumentType>;
    sort(params: any): RxQuery<RxDocumentType>;
    limit(amount: number): RxQuery<RxDocumentType>;
    skip(amount: number): RxQuery<RxDocumentType>;

    // TODO fix attribute-types of this function
    mod(p1: any, p2: any, p3: any): RxQuery<RxDocumentType>;

    exec(): Promise<RxDocumentType>;
    $: Observable<RxDocumentType>;
    remove(): Promise<RxDocumentType>;
    update(updateObj: any): Promise<RxDocumentType>;
}

export type RxDocument<RxDocumentType> = RxDocumentBase<RxDocumentType> & RxDocumentType;

export declare class RxDocumentBase<RxDocumentType> {
    collection: RxCollection<RxDocumentType>;
    deleted: boolean;

    $: Observable<any>;
    deleted$: Observable<boolean>;
    synced$: Observable<boolean>;
    resync(): void;

    primary: string;
    get$(path: string): Observable<any>;
    get(objPath: string): any;
    set(objPath: string, value: any): RxDocument<RxDocumentType>;
    save(): Promise<boolean>;
    remove(): Promise<boolean>;
    populate(objPath: string): Promise<RxDocument<RxDocumentType> | any>;
    update(updateObj: any): Promise<any>;
    atomicUpdate(fun: Function): Promise<RxDocument<RxDocumentType>>;

    putAttachment(id: string, data: string, type?: string): Promise<RxAttachment<RxDocumentType>>;
    getAttachment(id: string): Promise<RxAttachment<RxDocumentType>>;
    allAttachments(): Promise<RxAttachment<RxDocumentType>[]>;
    allAttachments$: Observable<RxAttachment<RxDocumentType>[]>;

    toJSON(): RxDocumentType;
    destroy(): void;
}

export declare class PouchDB {
    constructor(name: string, options: { adapter: string });
    info(): any;
}

export declare class RxChangeEvent {
    data: {
        type: 'INSERT' | 'UPDATE' | 'REMOVE';
    };
    toJSON(): any;
}

export declare class RxError extends Error {
    rxdb: boolean; // always true, use this to detect if its an rxdb-error
    parameters: any; // an object with parameters to use the programatically
}

export interface DatabaseCreator {
    name: string;
    adapter: any;
    password?: string;
    multiInstance?: boolean;
    ignoreDuplicate?: boolean;
}

export function create(creator: DatabaseCreator): Promise<RxDatabase>;
export function removeDatabase(databaseName: string, adapter: any): Promise<any>;
export function checkAdapter(adapter: any | string): Promise<boolean>;


export const QueryChangeDetector: {
    enable(): void;
    enableDebugging(set?: boolean): void;
};

export function plugin(mod: any): void;

export function isRxDatabase(obj: any): boolean;
export function isRxCollection(obj: any): boolean;
export function isRxDocument(obj: any): boolean;
export function isRxQuery(obj: any): boolean;
export function isRxSchema(obj: any): boolean;

export default {
    create,
    removeDatabase,
    plugin,
    isRxDatabase,
    isRxCollection,
    isRxDocument,
    isRxQuery,
    isRxSchema,
    RxSchema,
    PouchDB,
    QueryChangeDetector,
    RxDatabase,
    RxError
};
