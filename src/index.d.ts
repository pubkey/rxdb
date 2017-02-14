import {Promise} from "es6-promise";
import {Observable} from "rxjs";


declare class RxSchema {
    jsonID: SchemaJSON;
    getSchemaByObjectPath(path: string): any;
    getEncryptedPaths(): any;
    validate(obj: any, schemaObj: any);
    hash(): string;

    static create(jsonSchema: SchemaJSON);
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
    schema?: SchemaJSON | RxSchema;
    pouchSettings?: Object;
    migrationStrategies?: Function[];
    autoMigrate?: boolean;
    statics?: {
        [key: number]: Function
    };
    methods?: {
        [key: number]: Function
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

    collection(CollectionCreator): Promise<RxCollection>;
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
    find(queryObj?: any): RxQuery;
    findOne(queryObj?: any): RxQuery;
    query(queryObj?: any): RxQuery;

    dump(decrytped: boolean): Promise<any>;
    importDump(exportedJSON: any): Promise<Boolean>;

    // HOOKS
    preInsert(fun: Function, parallel: boolean);
    preSave(fun: Function, parallel: boolean);
    preRemove(fun: Function, parallel: boolean);

    postInsert(fun: Function, parallel: boolean);
    postSave(fun: Function, parallel: boolean);
    postRemove(fun: Function, parallel: boolean);

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
    equals(queryObj): RxQuery;
    eq(queryObj): RxQuery;
    or(queryObj): RxQuery;
    nor(queryObj): RxQuery;
    and(queryObj): RxQuery;
    gt(queryObj): RxQuery;
    gte(queryObj): RxQuery;
    lt(queryObj): RxQuery;
    lte(queryObj): RxQuery;
    ne(queryObj): RxQuery;
    in(queryObj): RxQuery;
    nin(queryObj): RxQuery;
    all(queryObj): RxQuery;
    regex(queryObj): RxQuery;
    exists(queryObj): RxQuery;
    elemMatch(queryObj): RxQuery;
    slice(queryObj): RxQuery;
    sort(params: any): RxQuery;
    limit(amount: number): RxQuery;
    skip(amount: number): RxQuery;

    exec(): Promise<RxDocument[]>;
    $: Observable<RxDocument[]>;
    remove(): Promise<RxDocument>;
}

declare class RxDocument {
    collection: RxCollection;
    deleted: boolean;

    $: Observable<any>;
    getPrimary(): string;
    get$(path: string): Observable<any>;
    get(objPath: string): any;
    set(objPath: string, value: any): RxDocument;
    save(): Promise<boolean>;
    remove(): Promise<boolean>;
    toJSON(): Object;
    destroy();
}

declare class RxChangeEvent {
    data: any;
    toJSON(): any;
}


interface DatabaseCreator {
    name: string;
    storageEngine: any;
    password?: string;
    multiInstance?: boolean;
}

export function create(DatabaseCreator): Promise<RxDatabase>;

export function plugin(mod: any);

export const PouchDB: {
    plugin(plugin: any)
};

export {
RxDatabase as RxDatabase,
RxCollection as RxCollection,
RxQuery as RxQuery,
RxSchema as RxSchema,
RxDocument as RxDocument,
RxChangeEvent as RxChangeEvent
};
