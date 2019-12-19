import {
    filter
} from 'rxjs/operators';

import {
    ucfirst,
    nextTick,
    flatClone,
    promiseSeries,
    pluginMissing
} from './util';
import {
    validateCouchDBString
} from './pouch-db';
import {
    _handleToPouch,
    _handleFromPouch,
    fillObjectDataBeforeInsert
} from './rx-collection-helper';
import {
    createRxQuery,
    RxQueryBase
} from './rx-query';
import {
    isInstanceOf as isInstanceOfRxSchema,
    createRxSchema
} from './rx-schema';
import {
    createChangeEvent,
    RxChangeEvent
} from './rx-change-event';
import {
    newRxError,
    newRxTypeError
} from './rx-error';
import {
    mustMigrate,
    createDataMigrator,
    DataMigrator
} from './data-migrator';
import Crypter, {
    Crypter as CrypterClass
} from './crypter';
import {
    DocCache,
    createDocCache
} from './doc-cache';
import {
    QueryCache,
    createQueryCache
} from './query-cache';
import {
    ChangeEventBuffer,
    createChangeEventBuffer
} from './change-event-buffer';
import overwritable from './overwritable';
import {
    runPluginHooks
} from './hooks';

import {
    Subscription,
    Observable
} from 'rxjs';

import {
    PouchSettings,
    KeyFunctionMap,
    RxReplicationState,
    PouchDBInstance,
    MigrationState,
    SyncOptions,
    RxCollection,
    RxDatabase,
    RxQuery,
    RxDocument,
    SyncOptionsGraphQL,
    RxChangeEventUpdate,
    RxChangeEventInsert,
    RxChangeEventRemove,
    RxDumpCollection,
    RxDumpCollectionAny
} from './types';
import {
    RxGraphQLReplicationState
} from './plugins/replication-graphql';

import {
    RxSchema
} from './rx-schema';
import {
    createWithConstructor as createRxDocumentWithConstructor,
    isInstanceOf as isRxDocument,
    properties as rxDocumentProperties
} from './rx-document';

import {
    createRxDocument,
    getRxDocumentConstructor
} from './rx-document-prototype-merge';


const HOOKS_WHEN = ['pre', 'post'];
const HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
let hooksApplied = false;



export class RxCollectionBase<
RxDocumentType = { [prop: string]: any }, OrmMethods = {}
> {

    constructor(
        public database: RxDatabase,
        public name: string,
        public schema: RxSchema<RxDocumentType>,
        public pouchSettings: PouchSettings = {},
        public migrationStrategies: KeyFunctionMap = {},
        public methods: KeyFunctionMap = {},
        public attachments: KeyFunctionMap = {},
        public options: any = {},
        public statics: KeyFunctionMap = {}
    ) {
        _applyHookFunctions(this as any);
    }

    /**
     * returns observable
     */
    get $(): Observable<
        RxChangeEventInsert<RxDocumentType> |
        RxChangeEventUpdate<RxDocumentType> |
        RxChangeEventRemove<RxDocumentType>
    > {
        return this._observable$ as any;
    }
    get insert$(): Observable<RxChangeEventInsert<RxDocumentType>> {
        return this.$.pipe(
            filter(cE => cE.data.op === 'INSERT')
        ) as any;
    }
    get update$(): Observable<RxChangeEventUpdate<RxDocumentType>> {
        return this.$.pipe(
            filter(cE => cE.data.op === 'UPDATE')
        ) as any;
    }
    get remove$(): Observable<RxChangeEventRemove<RxDocumentType>> {
        return this.$.pipe(
            filter(cE => cE.data.op === 'REMOVE')
        ) as any;
    }
    get docChanges$() {
        if (!this.__docChanges$) {
            this.__docChanges$ = this.$.pipe(
                filter(cEvent => ['INSERT', 'UPDATE', 'REMOVE'].includes(cEvent.data.op))
            );
        }
        return this.__docChanges$;
    }
    get onDestroy() {
        if (!this._onDestroy)
            this._onDestroy = new Promise(res => this._onDestroyCall = res);
        return this._onDestroy;
    }

    public _isInMemory = false;
    public destroyed = false;
    public _atomicUpsertQueues = new Map(); // TODO type
    // defaults
    public synced: boolean = false;
    public hooks: any = {};
    public _subs: Subscription[] = [];
    public _repStates: RxReplicationState[] = [];
    public pouch: PouchDBInstance = {} as PouchDBInstance; // this is needed to preserve this name

    public _docCache: DocCache<
        RxDocument<RxDocumentType, OrmMethods>
    > = createDocCache();
    public _queryCache: QueryCache = createQueryCache();
    public _dataMigrator: DataMigrator = {} as DataMigrator;
    public _crypter: CrypterClass = {} as CrypterClass;
    public _observable$?: Observable<any>; // TODO type
    public _changeEventBuffer: ChangeEventBuffer = {} as ChangeEventBuffer;

    // other
    public _keyCompressor?: any;

    /**
     * only emits the change-events that change something with the documents
     */
    private __docChanges$?: any;

    /**
     * returns a promise that is resolved when the collection gets destroyed
     */
    private _onDestroy?: Promise<void>;

    private _onDestroyCall?: () => void;
    prepare() {
        this.pouch = this.database._spawnPouchDB(
            this.name,
            this.schema.version,
            this.pouchSettings
        );

        if (this.schema.doKeyCompression()) {
            this._keyCompressor = overwritable.createKeyCompressor(this.schema);
        }

        // we trigger the non-blocking things first and await them later so we can do stuff in the mean time
        const spawnedPouchPromise = this.pouch.info(); // resolved when the pouchdb is useable
        const createIndexesPromise = _prepareCreateIndexes((this as any), spawnedPouchPromise);


        this._dataMigrator = createDataMigrator((this as any), this.migrationStrategies);
        this._crypter = Crypter.create(this.database.password, this.schema);

        this._observable$ = this.database.$.pipe(
            filter(event => (event as RxChangeEvent).data.col === this.name)
        );
        this._changeEventBuffer = createChangeEventBuffer(this as any);

        this._subs.push(
            this._observable$
                .pipe(
                    filter(cE => !cE.data.isLocal)
                )
                .subscribe(cE => {
                    // when data changes, send it to RxDocument in docCache
                    const doc = this._docCache.get(cE.data.doc);
                    if (doc) doc._handleChangeEvent(cE);
                })
        );

        return Promise.all([
            spawnedPouchPromise,
            createIndexesPromise
        ]);
    }

    /**
     * checks if a migration is needed
     */
    migrationNeeded(): Promise<boolean> {
        return mustMigrate(this._dataMigrator as any);
    }

    /**
     * trigger migration manually
     */
    migrate(batchSize: number = 10): Observable<MigrationState> {
        return (this._dataMigrator as any).migrate(batchSize);
    }

    /**
     * does the same thing as .migrate() but returns promise
     * @return resolves when finished
     */
    migratePromise(batchSize: number = 10): Promise<any> {
        return (this._dataMigrator as any).migratePromise(batchSize);
    }

    /**
     * wrappers for Pouch.put/get to handle keycompression etc
     */
    _handleToPouch(docData: any): any {
        return _handleToPouch(
            this,
            docData
        );
    }
    _handleFromPouch(docData: any, noDecrypt = false) {
        return _handleFromPouch(
            this,
            docData,
            noDecrypt
        );
    }

    /**
     * every write on the pouchdb
     * is tunneld throught this function
     */
    _pouchPut(obj: any, overwrite: boolean = false): Promise<any> {
        obj = this._handleToPouch(obj);
        return this.database.lockedRun(
            () => this.pouch.put(obj)
        ).catch((err: any) => {
            if (overwrite && err.status === 409) {

                return this.database.lockedRun(
                    () => this.pouch.get(obj._id)
                ).then((exist: any) => {
                    obj._rev = exist._rev;
                    return this.database.lockedRun(
                        () => this.pouch.put(obj)
                    );
                });
            } else if (err.status === 409) {
                throw newRxError('COL19', {
                    id: obj._id,
                    pouchDbError: err,
                    data: obj
                });
            } else throw err;
        });
    }

    /**
     * get document from pouchdb by its _id
     */
    _pouchGet(key: string): Promise<any> {
        return this
            .pouch
            .get(key)
            .then(doc => this._handleFromPouch(doc));
    }

    /**
     * wrapps pouch-find
     */
    _pouchFind(
        rxQuery: RxQuery | RxQueryBase,
        limit?: number,
        noDecrypt: boolean = false
    ): Promise<any[]> {
        const compressedQueryJSON: any = rxQuery.keyCompress();
        if (limit) compressedQueryJSON['limit'] = limit;

        return this.database.lockedRun(
            () => this.pouch.find(compressedQueryJSON)
        ).then((docsCompressed: any) => {
            const docs = docsCompressed.docs
                .map((doc: any) => this._handleFromPouch(doc, noDecrypt));

            return docs;
        });
    }

    $emit(changeEvent: RxChangeEvent) {
        return this.database.$emit(changeEvent);
    }

    insert(
        json: RxDocumentType | RxDocument
    ): Promise<RxDocument<RxDocumentType, OrmMethods>> {
        // inserting a temporary-document
        let tempDoc: RxDocument | null = null;
        if (isRxDocument(json)) {
            tempDoc = json as RxDocument;
            if (!tempDoc._isTemporary) {
                throw newRxError('COL1', {
                    data: json
                });
            }
            json = tempDoc.toJSON() as any;
        }


        const useJson = fillObjectDataBeforeInsert(this, json);

        let newDoc = tempDoc;
        return this._runHooks('pre', 'insert', useJson)
            .then(() => {
                this.schema.validate(useJson);
                return this._pouchPut(useJson);
            }).then(insertResult => {
                useJson[this.schema.primaryPath as string] = insertResult.id;
                useJson._rev = insertResult.rev;

                if (tempDoc) {
                    tempDoc._dataSync$.next(useJson);
                } else newDoc = createRxDocument(this as any, useJson);

                return this._runHooks('post', 'insert', useJson, newDoc);
            }).then(() => {
                // event
                const emitEvent = createChangeEvent(
                    'INSERT',
                    this.database,
                    this as any,
                    newDoc,
                    useJson
                );
                this.$emit(emitEvent);

                return newDoc as any;
            });
    }

    bulkInsert(
        docsData: RxDocumentType[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[],
        error: any[]
    }> {
        const useDocs: RxDocumentType[] = docsData.map(docData => {
            const useDocData = fillObjectDataBeforeInsert(this, docData);
            return useDocData;
        });

        return Promise.all(
            useDocs.map(doc => {
                return this._runHooks('pre', 'insert', doc).then(() => {
                    this.schema.validate(doc);
                    return doc;
                });
            })
        ).then(docs => {
            const insertDocs: RxDocumentType[] = docs.map(d => this._handleToPouch(d));
            const docsMap: Map<string, RxDocumentType> = new Map();
            docs.forEach(d => {
                docsMap.set(d[this.schema.primaryPath] as any, d);
            });
            return this.database.lockedRun(
                () => this.pouch.bulkDocs(insertDocs)
                    .then(results => {
                        const okResults = results.filter(r => r.ok);

                        // create documents
                        const rxDocuments: any[] = okResults.map(r => {
                            const docData: any = docsMap.get(r.id);
                            docData._rev = r.rev;
                            const doc = createRxDocument(this as any, docData);
                            return doc;
                        });

                        // emit events
                        rxDocuments.forEach(doc => {
                            const emitEvent = createChangeEvent(
                                'INSERT',
                                this.database,
                                this as any,
                                doc,
                                docsMap.get(doc.primary)
                            );
                            this.$emit(emitEvent);
                        });

                        return {
                            success: rxDocuments,
                            error: results.filter(r => !r.ok)
                        };
                    })
            );
        });

    }

    /**
     * same as insert but overwrites existing document with same primary
     */
    upsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>> {
        const useJson: any = flatClone(json);
        const primary = useJson[this.schema.primaryPath];
        if (!primary) {
            throw newRxError('COL3', {
                primaryPath: this.schema.primaryPath as string,
                data: useJson
            });
        }

        return this.findOne(primary).exec()
            .then((existing: any) => {
                if (existing) {
                    useJson._rev = existing['_rev'];

                    return existing.atomicUpdate(() => useJson as any)
                        .then(() => existing);
                } else {
                    return this.insert(json as any);
                }
            });
    }

    /**
     * upserts to a RxDocument, uses atomicUpdate if document already exists
     */
    atomicUpsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>> {
        const primary = json[this.schema.primaryPath];
        if (!primary) {
            throw newRxError('COL4', {
                data: json
            });
        }

        // ensure that it wont try 2 parallel runs
        let queue;
        if (!this._atomicUpsertQueues.has(primary)) {
            queue = Promise.resolve();
        } else {
            queue = this._atomicUpsertQueues.get(primary);
        }
        queue = queue
            .then(() => _atomicUpsertEnsureRxDocumentExists(this as any, primary as any, json))
            .then((wasInserted: any) => {
                if (!wasInserted.inserted) {
                    return _atomicUpsertUpdate(wasInserted.doc, json)
                        .then(() => nextTick()) // tick here so the event can propagate
                        .then(() => wasInserted.doc);
                } else
                    return wasInserted.doc;
            });
        this._atomicUpsertQueues.set(primary, queue);
        return queue;
    }

    /**
     * takes a mongoDB-query-object and returns the documents
     */
    find(queryObj?: any): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods>[]> {
        if (typeof queryObj === 'string') {
            throw newRxError('COL5', {
                queryObj
            });
        }

        const query = createRxQuery('find', queryObj, this as any);
        return query as any;
    }

    findOne(queryObj?: any): RxQuery<RxDocumentType, RxDocument<RxDocumentType, OrmMethods> | null> {
        let query;

        if (typeof queryObj === 'string') {
            query = createRxQuery('findOne', {
                _id: queryObj
            }, this as any);
        } else query = createRxQuery('findOne', queryObj, this as any);

        if (
            typeof queryObj === 'number' ||
            Array.isArray(queryObj)
        ) {
            throw newRxTypeError('COL6', {
                queryObj
            });
        }

        return query as any;
    }

    /**
     * Export collection to a JSON friendly format.
     * @param _decrypted
     * When true, all encrypted values will be decrypted.
     * When false or omitted and an interface or type is loaded in this collection,
     * all base properties of the type are typed as `any` since data could be encrypted.
     */
    dump(_decrypted: boolean): Promise<RxDumpCollection<RxDocumentType>>;
    dump(_decrypted?: false): Promise<RxDumpCollectionAny<RxDocumentType>>;
    dump(_decrypted: boolean = false): Promise<any> {
        throw pluginMissing('json-dump');
    }

    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<collection>.dump()` method.
     */
    importDump(_exportedJSON: RxDumpCollectionAny<RxDocumentType>): Promise<void> {
        throw pluginMissing('json-dump');
    }

    /**
     * waits for external changes to the database
     * and ensures they are emitted to the internal RxChangeEvent-Stream
     * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
     */
    watchForChanges() {
        throw pluginMissing('watch-for-changes');
    }

    /**
     * sync with another database
     */
    sync(_syncOptions: SyncOptions): RxReplicationState {
        throw pluginMissing('replication');
    }

    /**
     * sync with a GraphQL endpoint
     */
    syncGraphQL(options: SyncOptionsGraphQL): RxGraphQLReplicationState {
        throw pluginMissing('replication-graphql');
    }

    /**
     * Create a replicated in-memory-collection
     */
    inMemory(): Promise<RxCollection<RxDocumentType, OrmMethods>> {
        throw pluginMissing('in-memory');
    }


    /**
     * HOOKS
     */
    addHook(when: string, key: string, fun: any, parallel = false) {
        if (typeof fun !== 'function') {
            throw newRxTypeError('COL7', {
                key,
                when
            });
        }

        if (!HOOKS_WHEN.includes(when)) {
            throw newRxTypeError('COL8', {
                key,
                when
            });
        }

        if (!HOOKS_KEYS.includes(key)) {
            throw newRxError('COL9', {
                key
            });
        }

        if (when === 'post' && key === 'create' && parallel === true) {
            throw newRxError('COL10', {
                when,
                key,
                parallel
            });
        }

        // bind this-scope to hook-function
        const boundFun = fun.bind(this);

        const runName = parallel ? 'parallel' : 'series';

        this.hooks[key] = this.hooks[key] || {};
        this.hooks[key][when] = this.hooks[key][when] || {
            series: [],
            parallel: []
        };
        this.hooks[key][when][runName].push(boundFun);
    }
    getHooks(when: string, key: string) {
        try {
            return this.hooks[key][when];
        } catch (e) {
            return {
                series: [],
                parallel: []
            };
        }
    }

    _runHooks(when: string, key: string, data: any, instance?: any): Promise<any> {
        const hooks = this.getHooks(when, key);
        if (!hooks) return Promise.resolve();

        // run parallel: false
        const tasks = hooks.series.map((hook: any) => () => hook(data, instance));
        return promiseSeries(tasks)
            // run parallel: true
            .then(() => Promise.all(
                hooks.parallel
                    .map((hook: any) => hook(data, instance))
            ));
    }

    /**
     * does the same as ._runHooks() but with non-async-functions
     */
    _runHooksSync(when: string, key: string, data: any, instance: any) {
        const hooks = this.getHooks(when, key);
        if (!hooks) return;
        hooks.series.forEach((hook: any) => hook(data, instance));
    }

    /**
     * creates a temporaryDocument which can be saved later
     */
    newDocument(docData: Partial<RxDocumentType> = {}): RxDocument<RxDocumentType, OrmMethods> {
        docData = this.schema.fillObjectWithDefaults(docData);
        const doc: any = createRxDocumentWithConstructor(
            getRxDocumentConstructor(this as any),
            this as any,
            docData
        );
        doc._isTemporary = true;

        this._runHooksSync('post', 'create', docData, doc);
        return doc as any;
    }
    destroy(): Promise<boolean> {
        if (this.destroyed) return Promise.resolve(false);

        if (this._onDestroyCall) { this._onDestroyCall(); }
        this._subs.forEach(sub => sub.unsubscribe());
        if (this._changeEventBuffer) { this._changeEventBuffer.destroy(); }
        this._queryCache.destroy();
        this._repStates.forEach(sync => sync.cancel());
        delete this.database.collections[this.name];
        this.destroyed = true;
        return Promise.resolve(true);
    }

    /**
     * remove all data
     */
    remove(): Promise<any> {
        return this.database.removeCollection(this.name);
    }
}

/**
 * adds the hook-functions to the collections prototype
 * this runs only once
 */
function _applyHookFunctions(
    collection: RxCollectionBase
) {
    if (hooksApplied) return; // already run
    hooksApplied = true;
    const colProto = Object.getPrototypeOf(collection);
    HOOKS_KEYS.forEach(key => {
        HOOKS_WHEN.map(when => {
            const fnName = when + ucfirst(key);
            colProto[fnName] = function (fun: string, parallel: boolean) {
                return this.addHook(when, key, fun, parallel);
            };
        });
    });
}


/**
 * returns all possible properties of a RxCollection-instance
 */
let _properties: string[] | null = null;
export function properties(): string[] {
    if (!_properties) {
        const pseudoInstance = new (RxCollectionBase as any)();
        const ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        const prototypeProperties = Object.getOwnPropertyNames(
            Object.getPrototypeOf(pseudoInstance)
        );
        _properties = [...ownProperties, ...prototypeProperties];
    }
    return _properties;
}

function _atomicUpsertUpdate(doc: any, json: any): Promise<any> {
    return doc.atomicUpdate((innerDoc: any) => {
        json._rev = innerDoc._rev;
        innerDoc._data = json;
        return innerDoc._data;
    }).then(() => doc);
}

/**
 * ensures that the given document exists
 * @return promise that resolves with new doc and flag if inserted
 */
function _atomicUpsertEnsureRxDocumentExists(
    rxCollection: RxCollection,
    primary: string,
    json: any
): Promise<{ doc: RxDocument, inserted: boolean }> {
    return rxCollection.findOne(primary).exec()
        .then(doc => {
            if (!doc) {
                return rxCollection.insert(json).then(newDoc => ({
                    doc: newDoc,
                    inserted: true
                }));
            } else {
                return {
                    doc,
                    inserted: false
                };
            }
        });
}

/**
 * creates the indexes in the pouchdb
 */
function _prepareCreateIndexes(
    rxCollection: RxCollectionBase,
    spawnedPouchPromise: Promise<any>
) {
    return Promise.all(
        rxCollection.schema.indexes
            .map(indexAr => {
                const compressedIdx = indexAr
                    .map(key => {
                        if (!rxCollection.schema.doKeyCompression())
                            return key;
                        else
                            return rxCollection._keyCompressor.transformKey('', '', key.split('.'));
                    });

                return spawnedPouchPromise.then(
                    () => rxCollection.pouch.createIndex({
                        index: {
                            fields: compressedIdx
                        }
                    })
                );
            })
    );
}

/**
 * creates and prepares a new collection
 */
export function create({
    database,
    name,
    schema,
    pouchSettings = {},
    migrationStrategies = {},
    autoMigrate = true,
    statics = {},
    methods = {},
    attachments = {},
    options = {}
}: any
): Promise<RxCollection> {
    validateCouchDBString(name);

    // ensure it is a schema-object
    if (!isInstanceOfRxSchema(schema))
        schema = createRxSchema(schema);

    Object.keys(methods)
        .filter(funName => schema.topLevelFields.includes(funName))
        .forEach(funName => {
            throw newRxError('COL18', {
                funName
            });
        });

    const collection = new RxCollectionBase(
        database,
        name,
        schema,
        pouchSettings,
        migrationStrategies,
        methods,
        attachments,
        options,
        statics
    );

    return collection.prepare()
        .then(() => {

            // ORM add statics
            Object
                .entries(statics)
                .forEach(([funName, fun]) => {
                    Object.defineProperty(collection, funName, {
                        get: () => (fun as any).bind(collection)
                    });
                });

            let ret = Promise.resolve();
            if (autoMigrate) ret = collection.migratePromise();
            return ret;
        })
        .then(() => {
            runPluginHooks('createRxCollection', collection);
            return collection as any;
        });
}

export function isInstanceOf(obj: any): boolean {
    return obj instanceof RxCollectionBase;
}

export default {
    create,
    properties,
    isInstanceOf,
    RxCollectionBase
};
