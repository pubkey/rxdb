import {Promise} from "es6-promise";
import {Observable} from "rxjs";

declare class RxSchema {
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
type JsonSchemaTypes = "array" | "boolean" | "integer" | "number" | "null" | "object" | "string";
interface JsonSchema {
    type?: JsonSchemaTypes | JsonSchemaTypes[];
    description?: string;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: boolean;
    minimum?: number;
    exclusiveMinimum?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    additionalItems?: boolean | JsonSchema;
    items?: JsonSchema | JsonSchema[];
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    properties?: {
        [key: string]: JsonSchema;
    };
    patternProperties?: {
        [key: string]: JsonSchema;
    };
    dependencies?: {
        [key: string]: JsonSchema | string[];
    };
    enum?: any[];
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    not?: JsonSchema;
    definitions?: {
        [key: string]: JsonSchema;
    };
    format?: "date-time" | "email" | "hostname" | "ipv4" | "ipv6" | "uri" | string;
}

interface SchemaJSON {
    title?: string;
    description?: string;
    version: number;
    type: string;
    properties: JsonSchema;
    required?: Array<string>;
    compoundIndexes?: Array<string | Array<string>>;
    disableKeyCompression?: boolean;
}

interface CollectionCreator {
    name: string;
    schema: SchemaJSON | RxSchema;
    pouchSettings?: any;
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
}

declare class RxDatabase {
    name: string;
    token: string;
    multiInstance: boolean;
    password: string;
    collections: any;

    $: Observable<RxChangeEvent>;
    $pull(): Promise<boolean>;

    collection(args: CollectionCreator): Promise<RxCollection>;
    destroy(): Promise<boolean>;
    dump(): Promise<any>;
    importDump(json: any): Promise<any>;

    isLeader: boolean;

    /**
     * returns a promise which resolves when the instance becomes leader
     * @return {Promise<boolean>}
     */
    waitForLeadership(): Promise<boolean>;
}

declare class RxCollection {
    database: RxDatabase;
    name: string;
    schema: RxSchema;

    $: Observable<RxChangeEvent>;
    insert(json: any): Promise<RxDocument>;
    upsert(json: any): Promise<RxDocument>;
    find(queryObj?: any): RxQuery;
    findOne(queryObj?: any): RxQuery;

    dump(decrytped: boolean): Promise<any>;
    importDump(exportedJSON: any): Promise<Boolean>;

    // HOOKS
    preInsert(fun: Function, parallel: boolean): void;
    preSave(fun: Function, parallel: boolean): void;
    preRemove(fun: Function, parallel: boolean): void;

    postInsert(fun: Function, parallel: boolean): void;
    postSave(fun: Function, parallel: boolean): void;
    postRemove(fun: Function, parallel: boolean): void;

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


    sync(serverURL: string, alsoIfNotLeader?: boolean): Promise<any>;
    destroy(): Promise<boolean>;
}

declare class RxQuery {
    collection: RxCollection;

    where(queryObj: any): RxQuery;
    equals(queryObj: any): RxQuery;
    eq(queryObj: any): RxQuery;
    or(queryObj: any): RxQuery;
    nor(queryObj: any): RxQuery;
    and(queryObj: any): RxQuery;
    gt(queryObj: any): RxQuery;
    gte(queryObj: any): RxQuery;
    lt(queryObj: any): RxQuery;
    lte(queryObj: any): RxQuery;
    ne(queryObj: any): RxQuery;
    in(queryObj: any): RxQuery;
    nin(queryObj: any): RxQuery;
    all(queryObj: any): RxQuery;
    regex(queryObj: any): RxQuery;
    exists(queryObj: any): RxQuery;
    elemMatch(queryObj: any): RxQuery;
    sort(params: any): RxQuery;
    limit(amount: number): RxQuery;
    skip(amount: number): RxQuery;

    // TODO fix attribute-types of this function
    mod(p1: any, p2: any, p3: any): RxQuery;

    exec(): Promise<RxDocument[]>;
    $: Observable<RxDocument[]>;
    remove(): Promise<RxDocument | RxDocument[]>;
}

declare class RxDocument {
    collection: RxCollection;
    deleted: boolean;

    $: Observable<any>;
    deleted$: Observable<boolean>;
    synced$: Observable<boolean>;
    resync(): void;

    getPrimary(): string;
    get$(path: string): Observable<any>;
    get(objPath: string): any;
    set(objPath: string, value: any): RxDocument;
    save(): Promise<boolean>;
    remove(): Promise<boolean>;
    populate(objPath: string): Promise<RxDocument |null>;
    toJSON(): Object;
    destroy(): void;
}

declare class PouchDB {
    constructor(name: string, options:{ adapter:string });
    info();
}


interface RxChangeEventData {
    type: "INSERT" | "UPDATE" | "REMOVE";
}

declare class RxChangeEvent {
    data: RxChangeEventData;
    toJSON(): any;
}


export interface DatabaseCreator {
    name: string;
    adapter: any;
    password?: string;
    multiInstance?: boolean;
}

export function create(creator: DatabaseCreator): Promise<RxDatabase>;

export function plugin(mod: any): void;

export {
RxDatabase as RxDatabase,
RxCollection as RxCollection,
RxQuery as RxQuery,
RxSchema as RxSchema,
RxDocument as RxDocument,
RxChangeEvent as RxChangeEvent,
PouchDB as PouchDB
};
