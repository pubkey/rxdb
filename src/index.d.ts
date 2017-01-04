import {Promise} from "es6-promise";
import {Observable} from "rxjs";


declare class RxSchema {
    jsonID: any;
    getSchemaByObjectPath(path: string): any;
    getEncryptedPaths(): any;
    validate(obj: any, schemaObj: any);
    hash(): string;

    static create(jsonSchema: any);
}

declare class RxDatabase {
    prefix: string;
    token: string;
    multiInstance: boolean;
    password: string;

    $: Observable<RxChangeEvent>;
    $pull(): Promise<boolean>;

    collection(name: string, schema?: any | RxSchema): Promise<RxCollection>;
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
    preSave(fun: function, parallel=true);
    preInsert(fun: function, parallel=true);
    preUpdate(fun: function, parallel=true);
    preRemove(fun: function, parallel=true);
    postSave(fun: function, parallel=true);
    postInsert(fun: function, parallel=true);
    postUpdate(fun: function, parallel=true);
    postRemove(fun: function, parallel=true);


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
    select(fields: any): RxQuery;
    slice(queryObj): RxQuery;
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
    get$(path: string): Observable<any>;
    get(objPath: string): any;
    set(objPath: string, value: any): RxDocument;
    save(): Promise<boolean>;
    remove(): Promise<boolean>;
    destroy();
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

export function plugin(mod: any)

export const PouchDB: {
    plugin(plugin: any)
};

export {
RxDatabase as RxDatabase,
RxCollection as RxCollection,
RxSchema as RxSchema,
RxDocument as RxDocument,
RxChangeEvent as RxChangeEvent
};
