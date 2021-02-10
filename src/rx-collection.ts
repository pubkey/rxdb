import {
    filter, startWith, mergeMap, map, shareReplay
} from 'rxjs/operators';

import {
    ucfirst,
    nextTick,
    flatClone,
    promiseSeries,
    pluginMissing,
    now
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
    RxQueryBase,
    _getDefaultQuery
} from './rx-query';
import {
    isInstanceOf as isInstanceOfRxSchema,
    createRxSchema
} from './rx-schema';
import {
    RxChangeEvent,
    createInsertEvent,
    RxChangeEventInsert,
    RxChangeEventUpdate,
    RxChangeEventDelete,
    createDeleteEvent
} from './rx-change-event';
import {
    newRxError,
    newRxTypeError
} from './rx-error';
import type {
    DataMigrator
} from './plugins/migration';
import {
    Crypter,
    createCrypter
} from './crypter';
import {
    DocCache,
    createDocCache
} from './doc-cache';
import {
    QueryCache,
    createQueryCache,
    defaultCacheReplacementPolicy
} from './query-cache';
import {
    ChangeEventBuffer,
    createChangeEventBuffer
} from './change-event-buffer';
import { overwritable } from './overwritable';
import {
    runPluginHooks
} from './hooks';

import type {
    Subscription,
    Observable
} from 'rxjs';

import type {
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
    RxDumpCollection,
    RxDumpCollectionAny,
    MangoQuery,
    MangoQueryNoLimit,
    RxCacheReplacementPolicy,
    WithPouchMeta,
    PouchWriteError
} from './types';
import type {
    RxGraphQLReplicationState
} from './plugins/replication-graphql';

import {
    RxSchema
} from './rx-schema';
import {
    createWithConstructor as createRxDocumentWithConstructor,
    isInstanceOf as isRxDocument
} from './rx-document';

import {
    createRxDocument,
    getRxDocumentConstructor
} from './rx-document-prototype-merge';

const HOOKS_WHEN = ['pre', 'post'];
const HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
let hooksApplied = false;

export class RxCollectionBase<
    RxDocumentType = { [prop: string]: any },
    OrmMethods = {},
    StaticMethods = { [key: string]: any }
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
        public cacheReplacementPolicy: RxCacheReplacementPolicy = defaultCacheReplacementPolicy,
        public statics: KeyFunctionMap = {}
    ) {
        _applyHookFunctions(this.asRxCollection);
    }

    /**
     * returns observable
     */
    get $(): Observable<RxChangeEvent> {
        return this._observable$ as any;
    }
    get insert$(): Observable<RxChangeEventInsert<RxDocumentType>> {
        return this.$.pipe(
            filter(cE => cE.operation === 'INSERT')
        ) as any;
    }
    get update$(): Observable<RxChangeEventUpdate<RxDocumentType>> {
        return this.$.pipe(
            filter(cE => cE.operation === 'UPDATE')
        ) as any;
    }
    get remove$(): Observable<RxChangeEventDelete<RxDocumentType>> {
        return this.$.pipe(
            filter(cE => cE.operation === 'DELETE')
        ) as any;
    }

    get onDestroy() {
        if (!this._onDestroy) {
            this._onDestroy = new Promise(res => this._onDestroyCall = res);
        }
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
    public _crypter: Crypter = {} as Crypter;
    public _observable$?: Observable<any>; // TODO type
    public _changeEventBuffer: ChangeEventBuffer = {} as ChangeEventBuffer;

    // other
    public _keyCompressor?: any;

    /**
     * returns a promise that is resolved when the collection gets destroyed
     */
    private _onDestroy?: Promise<void>;

    private _onDestroyCall?: () => void;
    prepare(
        /**
         * set to true if the collection data already exists on this storage adapter
         */
        wasCreatedBefore: boolean
    ) {
        this.pouch = this.database._spawnPouchDB(
            this.name,
            this.schema.version,
            this.pouchSettings
        );

        if (this.schema.doKeyCompression()) {
            this._keyCompressor = overwritable.createKeyCompressor(this.schema);
        }

        // we trigger the non-blocking things first and await them later so we can do stuff in the mean time

        /**
         * Sometimes pouchdb emits before the instance is useable.
         * To prevent random errors, we wait until the .info() call resolved
         */
        const spawnedPouchPromise = wasCreatedBefore ? Promise.resolve() : this.pouch.info();

        /**
         * if wasCreatedBefore we can assume that the indexes already exist
         * because changing them anyway requires a schema-version change
         */
        const createIndexesPromise: Promise<any> = wasCreatedBefore ? Promise.resolve() : _prepareCreateIndexes(
            this.asRxCollection,
            spawnedPouchPromise
        );

        this._crypter = createCrypter(this.database.password, this.schema);

        this._observable$ = this.database.$.pipe(
            filter(event => (event as any).collectionName === this.name)
        );
        this._changeEventBuffer = createChangeEventBuffer(this.asRxCollection);

        this._subs.push(
            this._observable$
                .pipe(
                    filter((cE: RxChangeEvent<RxDocumentType>) => !cE.isLocal)
                )
                .subscribe(cE => {
                    // when data changes, send it to RxDocument in docCache
                    const doc = this._docCache.get(cE.documentId);
                    if (doc) doc._handleChangeEvent(cE);
                })
        );

        return Promise.all([
            spawnedPouchPromise,
            createIndexesPromise
        ]);
    }


    // overwritte by migration-plugin
    migrationNeeded(): Promise<boolean> {
        if (this.schema.version === 0) {
            return Promise.resolve(false);
        }
        throw pluginMissing('migration');
    }
    getDataMigrator(): DataMigrator {
        throw pluginMissing('migration');
    }
    migrate(batchSize: number = 10): Observable<MigrationState> {
        return this.getDataMigrator().migrate(batchSize);
    }
    migratePromise(batchSize: number = 10): Promise<any> {
        return this.getDataMigrator().migratePromise(batchSize);
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
        ).catch((err: PouchWriteError) => {
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
        if (limit) {
            compressedQueryJSON['limit'] = limit;
        }
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

        let startTime: number;
        let endTime: number;
        return this._runHooks('pre', 'insert', useJson)
            .then(() => {
                this.schema.validate(useJson);
                startTime = now();
                return this._pouchPut(useJson);
            }).then(insertResult => {
                endTime = now();
                useJson[this.schema.primaryPath as string] = insertResult.id;
                useJson._rev = insertResult.rev;

                if (tempDoc) {
                    tempDoc._dataSync$.next(useJson);
                } else newDoc = createRxDocument(this as any, useJson);

                return this._runHooks('post', 'insert', useJson, newDoc);
            }).then(() => {
                // event
                const emitEvent = createInsertEvent(
                    this as any,
                    useJson,
                    startTime,
                    endTime,
                    newDoc as any
                );
                this.$emit(emitEvent);
                return newDoc as any;
            });
    }

    bulkInsert(
        docsData: RxDocumentType[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[],
        error: PouchWriteError[]
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
                docsMap.set((d as any)[this.schema.primaryPath] as any, d);
            });

            return this.database.lockedRun(
                () => {
                    const startTime = now();
                    return this.pouch.bulkDocs(insertDocs)
                        .then(results => {
                            const okResults = results.filter(r => r.ok);

                            // create documents
                            const rxDocuments: any[] = okResults.map(r => {
                                const docData: any = docsMap.get(r.id);
                                docData._rev = r.rev;
                                const doc = createRxDocument(this as any, docData);
                                return doc;
                            });

                            return Promise.all(
                                rxDocuments.map(doc => {
                                    return this._runHooks(
                                        'post',
                                        'insert',
                                        docsMap.get(doc.primary),
                                        doc
                                    );
                                })
                            ).then(() => {
                                const errorResults: PouchWriteError[] = results.filter(r => !r.ok) as any;
                                return {
                                    rxDocuments,
                                    errorResults
                                };
                            });
                        }).then(({ rxDocuments, errorResults }) => {
                            const endTime = now();
                            // emit events
                            rxDocuments.forEach(doc => {
                                const emitEvent = createInsertEvent(
                                    this as any,
                                    doc.toJSON(true),
                                    startTime,
                                    endTime,
                                    doc
                                );
                                this.$emit(emitEvent);
                            });
                            return {
                                success: rxDocuments,
                                error: errorResults
                            };
                        });
                }
            );
        });
    }

    async bulkRemove(
        ids: string[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[],
        error: any[]
    }> {
        const rxDocumentMap = await this.findByIds(ids);
        const docsData: WithPouchMeta<RxDocumentType>[] = [];
        const docsMap: Map<string, WithPouchMeta<RxDocumentType>> = new Map();
        Array.from(rxDocumentMap.values()).forEach(rxDocument => {
            const data = rxDocument.toJSON(true);
            docsData.push(data);
            docsMap.set(rxDocument.primary, data);
        });

        await Promise.all(
            docsData.map(doc => {
                const primary = (doc as any)[this.schema.primaryPath];
                return this._runHooks('pre', 'remove', doc, rxDocumentMap.get(primary));
            })
        );

        docsData.forEach(doc => doc._deleted = true);

        const removeDocs = docsData.map(doc => this._handleToPouch(doc));

        let startTime: number;

        const results = await this.database.lockedRun(
            async () => {
                startTime = now();
                const bulkResults = await this.pouch.bulkDocs(removeDocs);
                return bulkResults;
            }
        );

        const endTime = now();
        const okResults = results.filter(r => r.ok);
        await Promise.all(
            okResults.map(r => {
                return this._runHooks(
                    'post',
                    'remove',
                    docsMap.get(r.id),
                    rxDocumentMap.get(r.id)
                );
            })
        );

        okResults.forEach(r => {
            const rxDocument = rxDocumentMap.get(r.id) as RxDocument<RxDocumentType, OrmMethods>;
            const emitEvent = createDeleteEvent(
                this as any,
                docsMap.get(r.id) as any,
                rxDocument._data,
                startTime,
                endTime,
                rxDocument as any,
            );
            this.$emit(emitEvent);
        });

        const rxDocuments: any[] = okResults.map(r => {
            return rxDocumentMap.get(r.id);
        });

        return {
            success: rxDocuments,
            error: okResults.filter(r => !r.ok)
        };
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
        const primary = (json as any)[this.schema.primaryPath];
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

    find(queryObj?: MangoQuery<RxDocumentType>): RxQuery<
        RxDocumentType,
        RxDocument<RxDocumentType, OrmMethods>[]
    > {
        if (typeof queryObj === 'string') {
            throw newRxError('COL5', {
                queryObj
            });
        }

        if (!queryObj) {
            queryObj = _getDefaultQuery(this as any);
        }

        const query = createRxQuery('find', queryObj, this as any);
        return query as any;
    }

    findOne(queryObj?: MangoQueryNoLimit<RxDocumentType> | string): RxQuery<
        RxDocumentType,
        RxDocument<RxDocumentType, OrmMethods>
        | null
    > {
        let query;

        if (typeof queryObj === 'string') {
            query = createRxQuery('findOne', {
                selector: {
                    _id: queryObj
                }
            }, this as any);
        } else {
            if (!queryObj) {
                queryObj = _getDefaultQuery(this as any);
            }

            // cannot have limit on findOne queries
            if ((queryObj as MangoQuery).limit) {
                throw newRxError('QU6');
            }

            query = createRxQuery('findOne', queryObj, this as any);
        }

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
     * find a list documents by their primary key
     * has way better performance then running multiple findOne() or a find() with a complex $or-selected
     */
    async findByIds(
        ids: string[]
    ): Promise<Map<string, RxDocument<RxDocumentType, OrmMethods>>> {

        const ret = new Map();
        const mustBeQueried: string[] = [];

        // first try to fill from docCache
        ids.forEach(id => {
            const doc = this._docCache.get(id);
            if (doc) {
                ret.set(id, doc);
            } else {
                mustBeQueried.push(id);
            }
        });

        // find everything which was not in docCache
        if (mustBeQueried.length > 0) {
            const result = await this.pouch.allDocs({
                include_docs: true,
                keys: mustBeQueried
            });
            result.rows.forEach(row => {
                if (!row.doc) {
                    // not found
                    return;
                }
                const plainData = this._handleFromPouch(row.doc);
                const doc = createRxDocument(this as any, plainData);
                ret.set(doc.primary, doc);
            });
        }
        return ret;
    }

    /**
     * like this.findByIds but returns an observable
     * that always emitts the current state
     */
    findByIds$(
        ids: string[]
    ): Observable<Map<string, RxDocument<RxDocumentType, OrmMethods>>> {
        let currentValue: Map<string, RxDocument<RxDocumentType, OrmMethods>> | null = null;
        const initialPromise = this.findByIds(ids).then(docsMap => {
            currentValue = docsMap;
        });
        return this.$.pipe(
            startWith(null),
            mergeMap(ev => initialPromise.then(() => ev)),
            map(ev => {
                if (!currentValue) {
                    throw new Error('should not happen');
                }
                if (!ev) {
                    return currentValue;
                }
                if (!ids.includes(ev.documentId)) {
                    return null;
                }
                const op = ev.operation;
                if (op === 'INSERT' || op === 'UPDATE') {
                    currentValue.set(ev.documentId, this._docCache.get(ev.documentId) as any);
                } else {
                    currentValue.delete(ev.documentId);
                }
                return currentValue as any;
            }),
            filter(x => !!x),
            shareReplay(1)
        );
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
        this._repStates.forEach(sync => sync.cancel());
        delete this.database.collections[this.name];
        this.destroyed = true;
        return Promise.resolve(true);
    }

    /**
     * remove all data of the collection
     */
    remove(): Promise<any> {
        return this.database.removeCollection(this.name);
    }

    get asRxCollection(): RxCollection<RxDocumentType, OrmMethods, StaticMethods> {
        return this as any;
    }
}

/**
 * adds the hook-functions to the collections prototype
 * this runs only once
 */
function _applyHookFunctions(
    collection: RxCollection
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
    rxCollection: RxCollection,
    spawnedPouchPromise: Promise<void>
): Promise<any> {

    /**
     * pouchdb does no check on already existing indexes
     * which makes collection re-creation really slow on page reloads
     * So we have to manually check if the index already exists
     */
    return spawnedPouchPromise
        .then(() => rxCollection.pouch.getIndexes())
        .then(indexResult => {
            const existingIndexes: Set<string> = new Set();
            indexResult.indexes.forEach(idx => existingIndexes.add(idx.name));
            return existingIndexes;
        }).then(existingIndexes => {
            return Promise.all(
                rxCollection.schema.indexes
                    .map(indexAr => {
                        const compressedIdx: string[] = indexAr
                            .map(key => {
                                const primPath = rxCollection.schema.primaryPath;
                                const useKey = key === primPath ? '_id' : key;
                                if (!rxCollection.schema.doKeyCompression()) {
                                    return useKey;
                                } else {
                                    const indexKey = rxCollection._keyCompressor.transformKey(useKey);
                                    return indexKey;
                                }
                            });

                        const indexName = 'idx-rxdb-index-' + compressedIdx.join(',');
                        if (existingIndexes.has(indexName)) {
                            // index already exists
                            return;
                        }

                        /**
                         * TODO
                         * we might have even better performance by doing a bulkDocs
                         * on index creation
                         */
                        return spawnedPouchPromise.then(
                            () => rxCollection.pouch.createIndex({
                                name: indexName,
                                ddoc: indexName,
                                index: {
                                    fields: compressedIdx
                                }
                            })
                        );
                    })
            );
        });
}

/**
 * creates and prepares a new collection
 */
export function create(
    {
        database,
        name,
        schema,
        pouchSettings = {},
        migrationStrategies = {},
        autoMigrate = true,
        statics = {},
        methods = {},
        attachments = {},
        options = {},
        cacheReplacementPolicy = defaultCacheReplacementPolicy
    }: any,
    wasCreatedBefore: boolean
): Promise<RxCollection> {
    validateCouchDBString(name);

    // ensure it is a schema-object
    if (!isInstanceOfRxSchema(schema)) {
        schema = createRxSchema(schema);
    }

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
        cacheReplacementPolicy,
        statics
    );

    return collection.prepare(wasCreatedBefore)
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
            if (autoMigrate && collection.schema.version !== 0) {
                ret = collection.migratePromise();
            }
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
    isInstanceOf,
    RxCollectionBase
};
