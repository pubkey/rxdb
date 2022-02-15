import {
    filter,
    startWith,
    mergeMap,
    shareReplay
} from 'rxjs/operators';

import {
    ucfirst,
    flatClone,
    promiseSeries,
    pluginMissing,
    ensureNotFalsy,
    getFromMapOrThrow,
    clone,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_VOID,
    RXJS_SHARE_REPLAY_DEFAULTS
} from './util';
import {
    fillObjectDataBeforeInsert,
    createRxCollectionStorageInstances
} from './rx-collection-helper';
import {
    createRxQuery,
    _getDefaultQuery
} from './rx-query';
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
import {
    runAsyncPluginHooks,
    runPluginHooks
} from './hooks';

import {
    Subscription,
    Observable
} from 'rxjs';

import type {
    KeyFunctionMap,
    RxCouchDBReplicationState,
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
    RxStorageBulkWriteError,
    RxDocumentData,
    RxDocumentWriteData,
    RxStorageInstanceCreationParams,
    RxStorageKeyObjectInstance,
    BulkWriteRow,
    RxChangeEvent,
    RxChangeEventInsert,
    RxChangeEventUpdate,
    RxChangeEventDelete,
    RxStorageInstance,
    CollectionsOfDatabase,
    RxChangeEventBulk,
    RxLocalDocumentData
} from './types';
import type {
    RxGraphQLReplicationState
} from './plugins/replication-graphql';

import {
    RxSchema
} from './rx-schema';
import {
    createWithConstructor as createRxDocumentWithConstructor,
    isRxDocument
} from './rx-document';

import {
    createRxDocument,
    getRxDocumentConstructor
} from './rx-document-prototype-merge';
import {
    getWrappedStorageInstance,
    storageChangeEventToRxChangeEvent,
    throwIfIsStorageWriteError
} from './rx-storage-helper';

const HOOKS_WHEN = ['pre', 'post'];
const HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];
let hooksApplied = false;

export class RxCollectionBase<
    InstanceCreationOptions,
    RxDocumentType = { [prop: string]: any },
    OrmMethods = {},
    StaticMethods = { [key: string]: any }
    > {


    public storageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions> = {} as any;
    public readonly timeouts: Set<ReturnType<typeof setTimeout>> = new Set();

    constructor(
        public database: RxDatabase<CollectionsOfDatabase, any, InstanceCreationOptions>,
        public name: string,
        public schema: RxSchema<RxDocumentType>,
        /**
         * Stores all 'normal' documents
         */
        public internalStorageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>,
        /**
         * Stores the local documents so that they are not deleted
         * when a migration runs.
         */
        public localDocumentsStore: RxStorageKeyObjectInstance<any, InstanceCreationOptions>,
        public instanceCreationOptions: InstanceCreationOptions = {} as any,
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
    get $(): Observable<RxChangeEvent<any>> {
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

    public destroyed = false;
    public _atomicUpsertQueues: Map<string, Promise<any>> = new Map();
    // defaults
    public synced: boolean = false;
    public hooks: any = {};
    public _subs: Subscription[] = [];

    public _docCache: DocCache<
        RxDocument<RxDocumentType, OrmMethods>
    > = createDocCache();

    public _queryCache: QueryCache = createQueryCache();
    public _crypter: Crypter = {} as Crypter;
    public _observable$: Observable<RxChangeEvent<RxDocumentType>> = {} as any;
    public _changeEventBuffer: ChangeEventBuffer = {} as ChangeEventBuffer;

    /**
     * returns a promise that is resolved when the collection gets destroyed
     */
    private _onDestroy?: Promise<void>;

    private _onDestroyCall?: () => void;
    public async prepare(): Promise<void> {
        this.storageInstance = getWrappedStorageInstance(this as any, this.internalStorageInstance);

        // we trigger the non-blocking things first and await them later so we can do stuff in the mean time
        this._crypter = createCrypter(this.database.password, this.schema);

        this._observable$ = this.database.eventBulks$.pipe(
            filter(changeEventBulk => changeEventBulk.collectionName === this.name),
            mergeMap(changeEventBulk => changeEventBulk.events),
        );
        this._changeEventBuffer = createChangeEventBuffer(this.asRxCollection);


        /**
         * Instead of resolving the EventBulk array here and spit it into
         * single events, we should fully work with event bulks internally
         * to save performance.
         */
        const subDocs = this.storageInstance.changeStream().subscribe(eventBulk => {
            const changeEventBulk: RxChangeEventBulk<RxDocumentType | RxLocalDocumentData> = {
                id: eventBulk.id,
                internal: false,
                collectionName: this.name,
                storageToken: ensureNotFalsy(this.database.storageToken),
                events: eventBulk.events.map(ev => storageChangeEventToRxChangeEvent(
                    false,
                    ev,
                    this as any
                )),
                databaseToken: this.database.token
            };
            this.database.$emit(changeEventBulk);
        });

        this._subs.push(subDocs);
        const subLocalDocs = this.localDocumentsStore.changeStream().subscribe(eventBulk => {
            const changeEventBulk: RxChangeEventBulk<RxDocumentType | RxLocalDocumentData> = {
                id: eventBulk.id,
                internal: false,
                collectionName: this.name,
                storageToken: ensureNotFalsy(this.database.storageToken),
                events: eventBulk.events.map(ev => storageChangeEventToRxChangeEvent(
                    true,
                    ev,
                    this as any
                )),
                databaseToken: this.database.token
            };
            this.database.$emit(changeEventBulk);
        });
        this._subs.push(subLocalDocs);


        /**
         * When a write happens to the collection
         * we find the changed document in the docCache
         * and tell it that it has to change its data.
         */
        this._subs.push(
            this._observable$
                .pipe(
                    filter((cE: RxChangeEvent<RxDocumentType>) => !cE.isLocal)
                )
                .subscribe(cE => {
                    // when data changes, send it to RxDocument in docCache
                    const doc = this._docCache.get(cE.documentId);
                    if (doc) {
                        doc._handleChangeEvent(cE);
                    }
                })
        );
    }


    // overwritte by migration-plugin
    migrationNeeded(): Promise<boolean> {
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

    async insert(
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

        const useJson: RxDocumentWriteData<RxDocumentType> = fillObjectDataBeforeInsert(this as any, json);
        const writeResult = await this.bulkInsert([useJson]);

        const isError = writeResult.error[0];
        throwIfIsStorageWriteError(this as any, useJson[this.schema.primaryPath] as any, json, isError);
        const insertResult = ensureNotFalsy(writeResult.success[0]);

        if (tempDoc) {
            tempDoc._dataSync$.next(insertResult._data);
            return tempDoc as any;
        } else {
            return insertResult;
        }
    }

    async bulkInsert(
        docsData: RxDocumentType[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[],
        error: RxStorageBulkWriteError<RxDocumentType>[]
    }> {
        /**
         * Optimization shortcut,
         * do nothing when called with an empty array
         */
        if (docsData.length === 0) {
            return {
                success: [],
                error: []
            };
        }

        const useDocs: RxDocumentType[] = docsData.map(docData => {
            const useDocData = fillObjectDataBeforeInsert(this as any, docData);
            return useDocData;
        });

        const docs = await Promise.all(
            useDocs.map(doc => {
                return this._runHooks('pre', 'insert', doc).then(() => {
                    this.schema.validate(doc);
                    return doc;
                });
            })
        );

        const docsMap: Map<string, RxDocumentType> = new Map();
        const insertRows: BulkWriteRow<RxDocumentType>[] = docs.map(doc => {
            docsMap.set((doc as any)[this.schema.primaryPath] as any, doc);
            const row: BulkWriteRow<RxDocumentType> = {
                document: Object.assign(doc, {
                    _attachments: {},
                    _deleted: false
                })
            };
            return row;
        });
        const results = await this.storageInstance.bulkWrite(insertRows);

        // create documents
        const successEntries: [string, RxDocumentData<RxDocumentType>][] = Object.entries(results.success);
        const rxDocuments: any[] = successEntries
            .map(([key, writtenDocData]) => {
                const docData: RxDocumentData<RxDocumentType> = getFromMapOrThrow(docsMap, key) as any;
                docData._rev = writtenDocData._rev;
                const doc = createRxDocument(this as any, docData);
                return doc;
            });


        await Promise.all(
            rxDocuments.map(doc => {
                return this._runHooks(
                    'post', 'insert',
                    docsMap.get(doc.primary),
                    doc
                );
            })
        );

        return {
            success: rxDocuments,
            error: Object.values(results.error)
        };
    }

    async bulkRemove(
        ids: string[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[],
        error: RxStorageBulkWriteError<RxDocumentType>[]
    }> {
        /**
         * Optimization shortcut,
         * do nothing when called with an empty array
         */
        if (ids.length === 0) {
            return {
                success: [],
                error: []
            };
        }

        const rxDocumentMap = await this.findByIds(ids);
        const docsData: RxDocumentData<RxDocumentType>[] = [];
        const docsMap: Map<string, RxDocumentData<RxDocumentType>> = new Map();
        Array.from(rxDocumentMap.values()).forEach(rxDocument => {
            const data: RxDocumentData<RxDocumentType> = clone(rxDocument.toJSON(true)) as any;
            docsData.push(data);
            docsMap.set(rxDocument.primary, data);
        });

        await Promise.all(
            docsData.map(doc => {
                const primary = (doc as any)[this.schema.primaryPath];
                return this._runHooks('pre', 'remove', doc, rxDocumentMap.get(primary));
            })
        );


        const removeDocs: BulkWriteRow<RxDocumentType>[] = docsData.map(doc => {
            const writeDoc = flatClone(doc);
            writeDoc._deleted = true;
            return {
                previous: doc,
                document: writeDoc
            };
        });
        const results = await this.storageInstance.bulkWrite(removeDocs);

        const successIds: string[] = Object.keys(results.success);

        // run hooks
        await Promise.all(
            successIds.map(id => {
                return this._runHooks(
                    'post',
                    'remove',
                    docsMap.get(id),
                    rxDocumentMap.get(id)
                );
            })
        );

        const rxDocuments: any[] = successIds.map(id => {
            return rxDocumentMap.get(id);
        });

        return {
            success: rxDocuments,
            error: Object.values(results.error)
        };
    }

    /**
     * same as insert but overwrites existing document with same primary
     */
    upsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>> {
        const useJson = fillObjectDataBeforeInsert(this as any, json);
        const primary = useJson[this.schema.primaryPath];
        if (!primary) {
            throw newRxError('COL3', {
                primaryPath: this.schema.primaryPath as string,
                data: useJson,
                schema: this.schema.jsonSchema
            });
        }

        return this.findOne(primary).exec()
            .then((existing: RxDocument<RxDocumentType, OrmMethods> | null) => {
                if (existing && !existing.deleted) {
                    useJson._rev = (existing as any)['_rev'];
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
        const useJson = fillObjectDataBeforeInsert(this as any, json);
        const primary = useJson[this.schema.primaryPath];
        if (!primary) {
            throw newRxError('COL4', {
                data: json
            });
        }

        // ensure that it wont try 2 parallel runs
        let queue = this._atomicUpsertQueues.get(primary);
        if (!queue) {
            queue = PROMISE_RESOLVE_VOID;
        }
        queue = queue
            .then(() => _atomicUpsertEnsureRxDocumentExists(this as any, primary as any, useJson))
            .then((wasInserted: any) => {
                if (!wasInserted.inserted) {
                    return _atomicUpsertUpdate(wasInserted.doc, useJson)
                        .then(() => wasInserted.doc);
                } else {
                    return wasInserted.doc;
                }
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
            queryObj = _getDefaultQuery();
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
                    [this.schema.primaryPath]: queryObj
                },
                limit: 1
            }, this as any);
        } else {
            if (!queryObj) {
                queryObj = _getDefaultQuery();
            }

            // cannot have limit on findOne queries because it will be overwritte
            if ((queryObj as MangoQuery).limit) {
                throw newRxError('QU6');
            }

            (queryObj as any).limit = 1;
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
            const docs = await this.storageInstance.findDocumentsById(mustBeQueried, false);
            Object.values(docs).forEach(docData => {
                const doc = createRxDocument<RxDocumentType, OrmMethods>(this as any, docData);
                ret.set(doc.primary, doc);
            });
        }
        return ret;
    }

    /**
     * like this.findByIds but returns an observable
     * that always emits the current state
     */
    findByIds$(
        ids: string[]
    ): Observable<Map<string, RxDocument<RxDocumentType, OrmMethods>>> {
        let currentValue: Map<string, RxDocument<RxDocumentType, OrmMethods>> | null = null;
        let lastChangeEvent: number = -1;

        /**
         * Ensure we do not process events in parallel
         */
        let queue: Promise<any> = PROMISE_RESOLVE_VOID;

        const initialPromise = this.findByIds(ids).then(docsMap => {
            lastChangeEvent = this._changeEventBuffer.counter;
            currentValue = docsMap;
        });
        let firstEmitDone = false;

        return this.$.pipe(
            startWith(null),
            /**
             * Optimization shortcut.
             * Do not proceed if the emited RxChangeEvent
             * is not relevant for the query.
             */
            filter(changeEvent => {
                if (
                    // first emit has no event
                    changeEvent &&
                    (
                        // local documents are not relevant for the query
                        changeEvent.isLocal ||
                        // document of the change is not in the ids list.
                        !ids.includes(changeEvent.documentId)
                    )
                ) {
                    return false;
                } else {
                    return true;
                }
            }),
            mergeMap(() => initialPromise),
            /**
             * Because shareReplay with refCount: true
             * will often subscribe/unsusbscribe
             * we always ensure that we handled all missed events
             * since the last subscription.
             */
            mergeMap(() => {
                queue = queue.then(async () => {
                    const resultMap = ensureNotFalsy(currentValue);
                    const missedChangeEvents = this._changeEventBuffer.getFrom(lastChangeEvent + 1);
                    lastChangeEvent = this._changeEventBuffer.counter;
                    if (missedChangeEvents === null) {
                        /**
                         * changeEventBuffer is of bounds -> we must re-execute over the database
                         * because we cannot calculate the new results just from the events.
                         */
                        const newResult = await this.findByIds(ids);
                        lastChangeEvent = this._changeEventBuffer.counter;
                        Array.from(newResult.entries()).forEach(([k, v]) => resultMap.set(k, v));
                    } else {
                        let resultHasChanged = false;
                        missedChangeEvents
                            .forEach(rxChangeEvent => {
                                const docId = rxChangeEvent.documentId;
                                if (!ids.includes(docId)) {
                                    // document is not relevant for the result set
                                    return;
                                }
                                const op = rxChangeEvent.operation;
                                if (op === 'INSERT' || op === 'UPDATE') {
                                    resultHasChanged = true;
                                    const rxDocument = createRxDocument(
                                        this.asRxCollection,
                                        rxChangeEvent.documentData
                                    );
                                    resultMap.set(docId, rxDocument);
                                } else {
                                    if (resultMap.has(docId)) {
                                        resultHasChanged = true;
                                        resultMap.delete(docId);
                                    }
                                }
                            });

                        // nothing happened that affects the result -> do not emit
                        if (!resultHasChanged && firstEmitDone) {
                            return false as any;
                        }
                    }
                    firstEmitDone = true;
                    return resultMap;
                });
                return queue;
            }),
            filter(x => !!x),
            shareReplay(RXJS_SHARE_REPLAY_DEFAULTS)
        );
    }

    /**
     * Export collection to a JSON friendly format.
     * @param _decrypted
     * When true, all encrypted values will be decrypted.
     * When false or omitted and an interface or type is loaded in this collection,
     * all base properties of the type are typed as `any` since data could be encrypted.
     */
    exportJSON(_decrypted: boolean): Promise<RxDumpCollection<RxDocumentType>>;
    exportJSON(_decrypted?: false): Promise<RxDumpCollectionAny<RxDocumentType>>;
    exportJSON(_decrypted: boolean = false): Promise<any> {
        throw pluginMissing('json-dump');
    }

    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
     */
    importJSON(_exportedJSON: RxDumpCollectionAny<RxDocumentType>): Promise<void> {
        throw pluginMissing('json-dump');
    }

    /**
     * sync with a CouchDB endpoint
     */
    syncCouchDB(_syncOptions: SyncOptions): RxCouchDBReplicationState {
        throw pluginMissing('replication');
    }

    /**
     * sync with a GraphQL endpoint
     */
    syncGraphQL(_options: SyncOptionsGraphQL<RxDocumentType>): RxGraphQLReplicationState<RxDocumentType> {
        throw pluginMissing('replication-graphql');
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
        if (!hooks) {
            return PROMISE_RESOLVE_VOID;
        }

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

    /**
     * Returns a promise that resolves after the given time.
     * Ensures that is properly cleans up when the collection is destroyed
     * so that no running timeouts prevent the exit of the JavaScript process.
     */
    promiseWait(time: number): Promise<void> {
        const ret = new Promise<void>(res => {
            const timeout = setTimeout(() => {
                this.timeouts.delete(timeout);
                res();
            }, time);
            this.timeouts.add(timeout);
        });
        return ret;
    }

    destroy(): Promise<boolean> {
        if (this.destroyed) {
            return PROMISE_RESOLVE_FALSE;
        }

        /**
         * Settings destroyed = true
         * must be the first thing to do,
         * so for example the replication can directly stop
         * instead of sending requests to a closed storage.
         */
        this.destroyed = true;

        if (this._onDestroyCall) {
            this._onDestroyCall();
        }
        Array.from(this.timeouts).forEach(timeout => clearTimeout(timeout));
        this._subs.forEach(sub => sub.unsubscribe());
        if (this._changeEventBuffer) {
            this._changeEventBuffer.destroy();
        }
        return Promise
            .all([
                this.storageInstance.close(),
                this.localDocumentsStore.close()
            ])
            .then(() => {
                delete this.database.collections[this.name];
                return runAsyncPluginHooks('postDestroyRxCollection', this).then(() => true);
            });
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
    collection: RxCollection<any, any>
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
): Promise<
    {
        doc: RxDocument,
        inserted: boolean
    }
> {
    /**
     * Optimisation shortcut,
     * first try to find the document in the doc-cache
     */
    const docFromCache = rxCollection._docCache.get(primary);
    if (docFromCache) {
        return Promise.resolve({
            doc: docFromCache,
            inserted: false
        });
    }
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
 * creates and prepares a new collection
 */
export function createRxCollection(
    {
        database,
        name,
        schema,
        instanceCreationOptions = {},
        migrationStrategies = {},
        autoMigrate = true,
        statics = {},
        methods = {},
        attachments = {},
        options = {},
        cacheReplacementPolicy = defaultCacheReplacementPolicy
    }: any
): Promise<RxCollection> {
    const storageInstanceCreationParams: RxStorageInstanceCreationParams<any, any> = {
        databaseName: database.name,
        collectionName: name,
        schema: schema.normalized,
        options: instanceCreationOptions,
        multiInstance: database.multiInstance
    };

    runPluginHooks(
        'preCreateRxStorageInstance',
        storageInstanceCreationParams
    );

    return createRxCollectionStorageInstances(
        name,
        database,
        storageInstanceCreationParams,
        instanceCreationOptions
    ).then(storageInstances => {
        const collection = new RxCollectionBase(
            database,
            name,
            schema,
            storageInstances.storageInstance,
            storageInstances.localDocumentsStore,
            instanceCreationOptions,
            migrationStrategies,
            methods,
            attachments,
            options,
            cacheReplacementPolicy,
            statics
        );

        return collection
            .prepare()
            .then(() => {
                // ORM add statics
                Object
                    .entries(statics)
                    .forEach(([funName, fun]) => {
                        Object.defineProperty(collection, funName, {
                            get: () => (fun as any).bind(collection)
                        });
                    });

                let ret = PROMISE_RESOLVE_VOID;
                if (autoMigrate && collection.schema.version !== 0) {
                    ret = collection.migratePromise();
                }
                return ret;
            })
            .then(() => {
                runPluginHooks('createRxCollection', collection);
                return collection as any;
            })
            /**
             * If the collection creation fails,
             * we yet have to close the storage instances.
             */
            .catch(err => {
                return Promise
                    .all([
                        storageInstances.storageInstance.close(),
                        storageInstances.localDocumentsStore.close()
                    ])
                    .then(() => Promise.reject(err));
            });
    });
}

export function isRxCollection(obj: any): boolean {
    return obj instanceof RxCollectionBase;
}
