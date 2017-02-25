import {Promise} from "es6-promise";
import {Observable} from "rxjs";


declare class RxSchema {
    jsonID: any;
    getSchemaByObjectPath(path: string): any;
    getEncryptedPaths(): any;
    validate(obj: any, schemaObj: any): any;
    hash(): string;

    static create(jsonSchema: any): any;
}

declare class RxDatabase {
    prefix: string;
    token: string;
    multiInstance: boolean;
    password: string;
    collections: any;

    $: Observable<RxChangeEvent>;
    $pull(): Promise<boolean>;

    collection(name: string, schema?: any | RxSchema, pouchSettings?: any): Promise<RxCollection>;
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
    preInsert(fun: Function, parallel: boolean): void;
    preSave(fun: Function, parallel: boolean): void;
    preRemove(fun: Function, parallel: boolean): void;

    postInsert(fun: Function, parallel: boolean): void;
    postSave(fun: Function, parallel: boolean): void;
    postRemove(fun: Function, parallel: boolean): void;


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
    slice(queryObj: any): RxQuery;
    sort(params: any): RxQuery;
    limit(amount: number): RxQuery;
    skip(amount: number): RxQuery;

    exec(): Promise<RxDocument[]>;
    $: Observable<RxDocument[]>;
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
    destroy(): any;
}

declare class RxChangeEvent {
    data: any;
    toJSON(): any;
}

export function create(
    prefix: string,
    storageEngine: any,
    password?: string,
    multiInstance?: boolean
): Promise<RxDatabase>;

export function plugin(mod: any): any;

export const PouchDB: {
    plugin(plugin: any): any;
};

export {
RxDatabase as RxDatabase,
RxCollection as RxCollection,
RxQuery as RxQuery,
RxSchema as RxSchema,
RxDocument as RxDocument,
RxChangeEvent as RxChangeEvent
};
