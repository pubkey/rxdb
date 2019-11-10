import { RxQueryBase } from './rx-query';
import { RxChangeEvent } from './rx-change-event';
import { DataMigrator } from './data-migrator';
import { Crypter as CrypterClass } from './crypter';
import { DocCache } from './doc-cache';
import { QueryCache } from './query-cache';
import { ChangeEventBuffer } from './change-event-buffer';
import { Subscription, Observable } from 'rxjs';
import { PouchSettings, KeyFunctionMap, RxReplicationState, PouchDBInstance, MigrationState, SyncOptions, RxCollection, RxDatabase, RxQuery, RxDocument, SyncOptionsGraphQL, RxChangeEventUpdate, RxChangeEventInsert, RxChangeEventRemove } from './types';
import { RxGraphQLReplicationState } from './plugins/replication-graphql';
import { RxSchema } from './rx-schema';
export declare class RxCollectionBase<RxDocumentType = any, OrmMethods = {}> {
    database: RxDatabase;
    name: string;
    schema: RxSchema<RxDocumentType>;
    pouchSettings: PouchSettings;
    migrationStrategies: KeyFunctionMap;
    methods: KeyFunctionMap;
    attachments: KeyFunctionMap;
    options: any;
    statics: KeyFunctionMap;
    constructor(database: RxDatabase, name: string, schema: RxSchema<RxDocumentType>, pouchSettings?: PouchSettings, migrationStrategies?: KeyFunctionMap, methods?: KeyFunctionMap, attachments?: KeyFunctionMap, options?: any, statics?: KeyFunctionMap);
    /**
     * returns observable
     */
    readonly $: Observable<RxChangeEventInsert<RxDocumentType> | RxChangeEventUpdate<RxDocumentType> | RxChangeEventRemove<RxDocumentType>>;
    readonly insert$: Observable<RxChangeEventInsert<RxDocumentType>>;
    readonly update$: Observable<RxChangeEventUpdate<RxDocumentType>>;
    readonly remove$: Observable<RxChangeEventRemove<RxDocumentType>>;
    readonly docChanges$: any;
    readonly onDestroy: Promise<void>;
    _isInMemory: boolean;
    destroyed: boolean;
    _atomicUpsertQueues: Map<any, any>;
    synced: boolean;
    hooks: any;
    _subs: Subscription[];
    _repStates: RxReplicationState[];
    pouch: PouchDBInstance;
    _docCache: DocCache<RxDocument<RxDocumentType, OrmMethods>>;
    _queryCache: QueryCache;
    _dataMigrator: DataMigrator;
    _crypter: CrypterClass;
    _observable$?: Observable<any>;
    _changeEventBuffer: ChangeEventBuffer;
    _keyCompressor?: any;
    /**
     * only emits the change-events that change something with the documents
     */
    private __docChanges$?;
    /**
     * returns a promise that is resolved when the collection gets destroyed
     */
    private _onDestroy?;
    private _onDestroyCall?;
    prepare(): Promise<[any, void[]]>;
    /**
     * checks if a migration is needed
     */
    migrationNeeded(): Promise<boolean>;
    /**
     * trigger migration manually
     */
    migrate(batchSize?: number): Observable<MigrationState>;
    /**
     * does the same thing as .migrate() but returns promise
     * @return resolves when finished
     */
    migratePromise(batchSize?: number): Promise<any>;
    /**
     * wrappers for Pouch.put/get to handle keycompression etc
     */
    _handleToPouch(docData: any): any;
    _handleFromPouch(docData: any, noDecrypt?: boolean): any;
    /**
     * every write on the pouchdb
     * is tunneld throught this function
     */
    _pouchPut(obj: any, overwrite?: boolean): Promise<any>;
    /**
     * get document from pouchdb by its _id
     */
    _pouchGet(key: string): Promise<any>;
    /**
     * wrapps pouch-find
     */
    _pouchFind(rxQuery: RxQuery | RxQueryBase, limit?: number, noDecrypt?: boolean): Promise<any[]>;
    $emit(changeEvent: RxChangeEvent): void;
    insert(json: RxDocumentType | RxDocument): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    bulkInsert(docsData: RxDocumentType[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: any[];
    }>;
    /**
     * same as insert but overwrites existing document with same primary
     */
    upsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    /**
     * upserts to a RxDocument, uses atomicUpdate if document already exists
     */
    atomicUpsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>>;
    /**
     * takes a mongoDB-query-object and returns the documents
     */
    find(queryObj?: any): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods>[]>;
    findOne(queryObj?: any): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods> | null>;
    /**
     * export to json
     * if true, all encrypted values will be decrypted
     */
    dump(_decrytped?: boolean): Promise<any>;
    /**
     * imports the json-data into the collection
     * @param should be an array of raw-data
     */
    importDump(_exportedJSON: any): Promise<boolean>;
    /**
     * waits for external changes to the database
     * and ensures they are emitted to the internal RxChangeEvent-Stream
     * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
     */
    watchForChanges(): void;
    /**
     * sync with another database
     */
    sync(_syncOptions: SyncOptions): RxReplicationState;
    /**
     * sync with a GraphQL endpoint
     */
    syncGraphQL(options: SyncOptionsGraphQL): RxGraphQLReplicationState;
    /**
     * Create a replicated in-memory-collection
     */
    inMemory(): Promise<RxCollection<RxDocumentType, OrmMethods>>;
    /**
     * HOOKS
     */
    addHook(when: string, key: string, fun: any, parallel?: boolean): void;
    getHooks(when: string, key: string): any;
    _runHooks(when: string, key: string, data: any, instance?: any): Promise<any>;
    /**
     * does the same as ._runHooks() but with non-async-functions
     */
    _runHooksSync(when: string, key: string, data: any, instance: any): void;
    /**
     * creates a temporaryDocument which can be saved later
     */
    newDocument(docData?: Partial<RxDocumentType>): RxDocument<RxDocumentType, OrmMethods>;
    destroy(): Promise<boolean>;
    /**
     * remove all data
     */
    remove(): Promise<any>;
}
export declare function properties(): string[];
/**
 * creates and prepares a new collection
 */
export declare function create({ database, name, schema, pouchSettings, migrationStrategies, autoMigrate, statics, methods, attachments, options }: any): Promise<RxCollection>;
export declare function isInstanceOf(obj: any): boolean;
declare const _default: {
    create: typeof create;
    properties: typeof properties;
    isInstanceOf: typeof isInstanceOf;
    RxCollectionBase: typeof RxCollectionBase;
};
export default _default;
