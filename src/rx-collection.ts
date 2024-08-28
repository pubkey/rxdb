import {
    filter,
    map,
    mergeMap
} from 'rxjs';

import {
    ucfirst,
    flatClone,
    promiseSeries,
    pluginMissing,
    ensureNotFalsy,
    getFromMapOrThrow,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_VOID
} from './plugins/utils/index.ts';
import {
    fillObjectDataBeforeInsert,
    createRxCollectionStorageInstance,
    removeCollectionStorages,
    ensureRxCollectionIsNotDestroyed
} from './rx-collection-helper.ts';
import {
    createRxQuery,
    _getDefaultQuery
} from './rx-query.ts';
import {
    newRxError,
    newRxTypeError
} from './rx-error.ts';
import type {
    RxMigrationState
} from './plugins/migration-schema/index.ts';
import {
    DocumentCache,
    mapDocumentsDataToCacheDocs
} from './doc-cache.ts';
import {
    QueryCache,
    createQueryCache,
    defaultCacheReplacementPolicy
} from './query-cache.ts';
import {
    ChangeEventBuffer,
    createChangeEventBuffer
} from './change-event-buffer.ts';
import {
    runAsyncPluginHooks,
    runPluginHooks
} from './hooks.ts';

import {
    Subscription,
    Observable
} from 'rxjs';

import type {
    KeyFunctionMap,
    RxCollection,
    RxDatabase,
    RxQuery,
    RxDocument,
    RxDumpCollection,
    RxDumpCollectionAny,
    MangoQuery,
    MangoQueryNoLimit,
    RxCacheReplacementPolicy,
    RxStorageWriteError,
    RxDocumentData,
    RxStorageInstanceCreationParams,
    BulkWriteRow,
    RxChangeEvent,
    RxChangeEventInsert,
    RxChangeEventUpdate,
    RxChangeEventDelete,
    RxStorageInstance,
    CollectionsOfDatabase,
    RxChangeEventBulk,
    RxLocalDocumentData,
    RxDocumentBase,
    RxConflictHandler,
    MaybePromise,
    CRDTEntry,
    MangoQuerySelectorAndIndex,
    MigrationStrategies
} from './types/index.d.ts';

import {
    RxSchema
} from './rx-schema.ts';

import {
    createNewRxDocument,
    getRxDocumentConstructor
} from './rx-document-prototype-merge.ts';
import {
    getWrappedStorageInstance,
    getWrittenDocumentsFromBulkWriteResponse,
    throwIfIsStorageWriteError,
    WrappedRxStorageInstance
} from './rx-storage-helper.ts';
import { defaultConflictHandler } from './replication-protocol/index.ts';
import { IncrementalWriteQueue } from './incremental-write.ts';
import { beforeDocumentUpdateWrite } from './rx-document.ts';
import { overwritable } from './overwritable.ts';
import type { RxPipeline, RxPipelineOptions } from './plugins/pipeline/index.ts';

const HOOKS_WHEN = ['pre', 'post'] as const;
type HookWhenType = typeof HOOKS_WHEN[number];
const HOOKS_KEYS = ['insert', 'save', 'remove', 'create'] as const;
type HookKeyType = typeof HOOKS_KEYS[number];
let hooksApplied = false;

export class RxCollectionBase<
    InstanceCreationOptions,
    RxDocumentType = { [prop: string]: any; },
    OrmMethods = {},
    StaticMethods = { [key: string]: any; },
    Reactivity = any
> {


    /**
     * Stores all 'normal' documents
     */
    public storageInstance: WrappedRxStorageInstance<RxDocumentType, any, InstanceCreationOptions> = {} as any;
    public readonly timeouts: Set<ReturnType<typeof setTimeout>> = new Set();
    public incrementalWriteQueue: IncrementalWriteQueue<RxDocumentType> = {} as any;


    /**
     * Before reads, all these methods are awaited. Used to "block" reads
     * depending on other processes, like when the RxPipeline is running.
     */
    public readonly awaitBeforeReads = new Set<() => MaybePromise<any>>();

    constructor(
        public database: RxDatabase<CollectionsOfDatabase, any, InstanceCreationOptions, Reactivity>,
        public name: string,
        public schema: RxSchema<RxDocumentType>,
        public internalStorageInstance: RxStorageInstance<RxDocumentType, any, InstanceCreationOptions>,
        public instanceCreationOptions: InstanceCreationOptions = {} as any,
        public migrationStrategies: MigrationStrategies = {},
        public methods: KeyFunctionMap = {},
        public attachments: KeyFunctionMap = {},
        public options: any = {},
        public cacheReplacementPolicy: RxCacheReplacementPolicy = defaultCacheReplacementPolicy,
        public statics: KeyFunctionMap = {},
        public conflictHandler: RxConflictHandler<RxDocumentType> = defaultConflictHandler
    ) {
        _applyHookFunctions(this.asRxCollection);
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

    public _incrementalUpsertQueues: Map<string, Promise<any>> = new Map();
    // defaults
    public synced: boolean = false;
    public hooks: {
        [key in HookKeyType]: {
            [when in HookWhenType]: {
                series: Function[];
                parallel: Function[];
            };
        }
    } = {} as any;
    public _subs: Subscription[] = [];

    public _docCache: DocumentCache<RxDocumentType, OrmMethods> = {} as any;

    public _queryCache: QueryCache = createQueryCache();
    public $: Observable<RxChangeEvent<RxDocumentType>> = {} as any;
    public checkpoint$: Observable<any> = {} as any;
    public _changeEventBuffer: ChangeEventBuffer<RxDocumentType> = {} as ChangeEventBuffer<RxDocumentType>;



    /**
     * When the collection is destroyed,
     * these functions will be called an awaited.
     * Used to automatically clean up stuff that
     * belongs to this collection.
    */
    public onDestroy: (() => MaybePromise<any>)[] = [];
    public destroyed = false;

    public onRemove: (() => MaybePromise<any>)[] = [];

    public async prepare(): Promise<void> {
        this.storageInstance = getWrappedStorageInstance(
            this.database,
            this.internalStorageInstance,
            this.schema.jsonSchema
        );
        this.incrementalWriteQueue = new IncrementalWriteQueue<RxDocumentType>(
            this.storageInstance,
            this.schema.primaryPath,
            (newData, oldData) => beforeDocumentUpdateWrite(this as any, newData, oldData),
            result => this._runHooks('post', 'save', result)
        );

        const collectionEventBulks$ = this.database.eventBulks$.pipe(
            filter(changeEventBulk => changeEventBulk.collectionName === this.name),
        );
        this.$ = collectionEventBulks$.pipe(
            mergeMap(changeEventBulk => changeEventBulk.events),
        );
        this.checkpoint$ = collectionEventBulks$.pipe(
            map(changeEventBulk => changeEventBulk.checkpoint),
        );

        this._changeEventBuffer = createChangeEventBuffer<RxDocumentType>(this.asRxCollection);
        let documentConstructor: any;
        this._docCache = new DocumentCache(
            this.schema.primaryPath,
            this.database.eventBulks$.pipe(
                filter(changeEventBulk => changeEventBulk.collectionName === this.name && !changeEventBulk.events[0].isLocal),
                map(b => b.events)
            ),
            docData => {
                if (!documentConstructor) {
                    documentConstructor = getRxDocumentConstructor(this.asRxCollection);
                }
                return createNewRxDocument(this.asRxCollection, documentConstructor, docData);
            }
        );


        const listenToRemoveSub = this.database.internalStore.changeStream().pipe(
            filter(bulk => {
                const key = this.name + '-' + this.schema.version;
                const found = bulk.events.find(event => {
                    return (
                        event.documentData.context === 'collection' &&
                        event.documentData.key === key &&
                        event.operation === 'DELETE'
                    );
                });
                return !!found;
            })
        ).subscribe(async () => {
            await this.destroy();
            await Promise.all(this.onRemove.map(fn => fn()));
        });
        this._subs.push(listenToRemoveSub);


        /**
         * TODO Instead of resolving the EventBulk array here and spit it into
         * single events, we should fully work with event bulks internally
         * to save performance.
         */
        const databaseStorageToken = await this.database.storageToken;
        const subDocs = this.storageInstance.changeStream().subscribe(eventBulk => {
            const events = new Array(eventBulk.events.length);
            const rawEvents = eventBulk.events;
            const collectionName = this.name;
            const deepFreezeWhenDevMode = overwritable.deepFreezeWhenDevMode;
            for (let index = 0; index < rawEvents.length; index++) {
                const event = rawEvents[index];
                events[index] = {
                    documentId: event.documentId,
                    collectionName,
                    isLocal: false,
                    operation: event.operation,
                    documentData: deepFreezeWhenDevMode(event.documentData) as any,
                    previousDocumentData: deepFreezeWhenDevMode(event.previousDocumentData) as any
                };
            }
            const changeEventBulk: RxChangeEventBulk<RxDocumentType | RxLocalDocumentData> = {
                id: eventBulk.id,
                internal: false,
                collectionName: this.name,
                storageToken: databaseStorageToken,
                events,
                databaseToken: this.database.token,
                checkpoint: eventBulk.checkpoint,
                context: eventBulk.context,
                endTime: eventBulk.endTime,
                startTime: eventBulk.startTime
            };
            this.database.$emit(changeEventBulk);
        });
        this._subs.push(subDocs);

        /**
         * Resolve the conflict tasks
         * of the RxStorageInstance
         */
        this._subs.push(
            this.storageInstance
                .conflictResultionTasks()
                .subscribe(task => {
                    this
                        .conflictHandler(task.input, task.context)
                        .then(output => {
                            this.storageInstance.resolveConflictResultionTask({
                                id: task.id,
                                output
                            });
                        });
                })
        );

        return PROMISE_RESOLVE_VOID;
    }


    /**
     * Manually call the cleanup function of the storage.
     * @link https://rxdb.info/cleanup.html
     */
    cleanup(_minimumDeletedTime?: number): Promise<boolean> {
        ensureRxCollectionIsNotDestroyed(this);
        throw pluginMissing('cleanup');
    }

    // overwritten by migration-plugin
    migrationNeeded(): Promise<boolean> {
        throw pluginMissing('migration-schema');
    }
    getMigrationState(): RxMigrationState {
        throw pluginMissing('migration-schema');
    }
    startMigration(batchSize: number = 10): Promise<void> {
        ensureRxCollectionIsNotDestroyed(this);
        return this.getMigrationState().startMigration(batchSize);
    }
    migratePromise(batchSize: number = 10): Promise<any> {
        return this.getMigrationState().migratePromise(batchSize);
    }

    async insert(
        json: RxDocumentType | RxDocument
    ): Promise<RxDocument<RxDocumentType, OrmMethods>> {
        ensureRxCollectionIsNotDestroyed(this);
        const writeResult = await this.bulkInsert([json as any]);

        const isError = writeResult.error[0];
        throwIfIsStorageWriteError(this as any, (json as any)[this.schema.primaryPath] as any, json, isError);
        const insertResult = ensureNotFalsy(writeResult.success[0]);
        return insertResult;
    }

    async bulkInsert(
        docsData: RxDocumentType[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }> {
        ensureRxCollectionIsNotDestroyed(this);
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

        const primaryPath = this.schema.primaryPath;


        /**
         * This code is a bit redundant for better performance.
         * Instead of iterating multiple times,
         * we directly transform the input to a write-row array.
         */
        let insertRows: BulkWriteRow<RxDocumentType>[];
        if (this.hasHooks('pre', 'insert')) {
            insertRows = await Promise.all(
                docsData.map(docData => {
                    const useDocData = fillObjectDataBeforeInsert(this.schema, docData);
                    return this._runHooks('pre', 'insert', useDocData)
                        .then(() => {
                            return { document: useDocData };
                        });
                })
            );
        } else {
            insertRows = new Array(docsData.length);
            const schema = this.schema;
            for (let index = 0; index < docsData.length; index++) {
                const docData = docsData[index];
                const useDocData = fillObjectDataBeforeInsert(schema, docData);
                insertRows[index] = { document: useDocData };
            }
        }

        const results = await this.storageInstance.bulkWrite(
            insertRows,
            'rx-collection-bulk-insert'
        );


        /**
         * Often the user does not need to access the RxDocuments of the bulkInsert() call.
         * So we transform the data to RxDocuments only if needed to use less CPU performance.
         */
        let rxDocuments: RxDocument<RxDocumentType, OrmMethods>[];
        const collection = this;
        const ret = {
            get success() {
                if (!rxDocuments) {
                    const success = getWrittenDocumentsFromBulkWriteResponse(
                        collection.schema.primaryPath,
                        insertRows,
                        results
                    );
                    rxDocuments = mapDocumentsDataToCacheDocs<RxDocumentType, OrmMethods>(collection._docCache, success);
                }
                return rxDocuments;
            },
            error: results.error
        };

        if (this.hasHooks('post', 'insert')) {
            const docsMap: Map<string, RxDocumentType> = new Map();
            insertRows.forEach(row => {
                const doc = row.document;
                docsMap.set((doc as any)[primaryPath] as any, doc);
            });
            await Promise.all(
                ret.success.map(doc => {
                    return this._runHooks(
                        'post',
                        'insert',
                        docsMap.get(doc.primary),
                        doc
                    );
                })
            );
        }

        return ret;
    }

    async bulkRemove(
        ids: string[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }> {
        ensureRxCollectionIsNotDestroyed(this);
        const primaryPath = this.schema.primaryPath;
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

        const rxDocumentMap = await this.findByIds(ids).exec();
        const docsData: RxDocumentData<RxDocumentType>[] = [];
        const docsMap: Map<string, RxDocumentData<RxDocumentType>> = new Map();
        Array.from(rxDocumentMap.values()).forEach(rxDocument => {
            const data: RxDocumentData<RxDocumentType> = rxDocument.toMutableJSON(true) as any;
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
        const results = await this.storageInstance.bulkWrite(
            removeDocs,
            'rx-collection-bulk-remove'
        );


        const success = getWrittenDocumentsFromBulkWriteResponse(
            this.schema.primaryPath,
            removeDocs,
            results
        );
        const successIds: string[] = success.map(d => d[primaryPath] as string);

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

        const rxDocuments = successIds.map(id => getFromMapOrThrow(rxDocumentMap, id));

        return {
            success: rxDocuments,
            error: results.error
        };
    }

    /**
     * same as bulkInsert but overwrites existing document with same primary
     */
    async bulkUpsert(docsData: Partial<RxDocumentType>[]): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }> {
        ensureRxCollectionIsNotDestroyed(this);
        const insertData: RxDocumentType[] = [];
        const useJsonByDocId: Map<string, RxDocumentType> = new Map();
        docsData.forEach(docData => {
            const useJson = fillObjectDataBeforeInsert(this.schema, docData);
            const primary: string = useJson[this.schema.primaryPath] as any;
            if (!primary) {
                throw newRxError('COL3', {
                    primaryPath: this.schema.primaryPath as string,
                    data: useJson,
                    schema: this.schema.jsonSchema
                });
            }
            useJsonByDocId.set(primary, useJson);
            insertData.push(useJson);
        });

        const insertResult = await this.bulkInsert(insertData);
        const success = insertResult.success.slice(0);
        const error: RxStorageWriteError<RxDocumentType>[] = [];

        // update the ones that existed already
        await Promise.all(
            insertResult.error.map(async (err) => {
                if (err.status !== 409) {
                    error.push(err);
                } else {
                    const id = err.documentId;
                    const writeData = getFromMapOrThrow(useJsonByDocId, id);
                    const docDataInDb = ensureNotFalsy(err.documentInDb);
                    const doc = this._docCache.getCachedRxDocuments([docDataInDb])[0];
                    const newDoc = await doc.incrementalModify(() => writeData);
                    success.push(newDoc);
                }
            })
        );
        return {
            error,
            success
        };
    }

    /**
     * same as insert but overwrites existing document with same primary
     */
    async upsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>> {
        ensureRxCollectionIsNotDestroyed(this);
        const bulkResult = await this.bulkUpsert([json]);
        throwIfIsStorageWriteError<RxDocumentType>(
            this.asRxCollection,
            (json as any)[this.schema.primaryPath],
            json as any,
            bulkResult.error[0]
        );
        return bulkResult.success[0];
    }

    /**
     * upserts to a RxDocument, uses incrementalModify if document already exists
     */
    incrementalUpsert(json: Partial<RxDocumentType>): Promise<RxDocument<RxDocumentType, OrmMethods>> {
        ensureRxCollectionIsNotDestroyed(this);
        const useJson = fillObjectDataBeforeInsert(this.schema, json);
        const primary: string = useJson[this.schema.primaryPath] as any;
        if (!primary) {
            throw newRxError('COL4', {
                data: json
            });
        }

        // ensure that it won't try 2 parallel runs
        let queue = this._incrementalUpsertQueues.get(primary);
        if (!queue) {
            queue = PROMISE_RESOLVE_VOID;
        }
        queue = queue
            .then(() => _incrementalUpsertEnsureRxDocumentExists(this as any, primary as any, useJson))
            .then((wasInserted) => {
                if (!wasInserted.inserted) {
                    return _incrementalUpsertUpdate(wasInserted.doc, useJson);
                } else {
                    return wasInserted.doc;
                }
            });
        this._incrementalUpsertQueues.set(primary, queue);
        return queue;
    }

    find(queryObj?: MangoQuery<RxDocumentType>): RxQuery<
        RxDocumentType,
        RxDocument<RxDocumentType, OrmMethods>[],
        OrmMethods,
        Reactivity
    > {
        ensureRxCollectionIsNotDestroyed(this);
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

    findOne(
        queryObj?: MangoQueryNoLimit<RxDocumentType> | string
    ): RxQuery<
        RxDocumentType,
        RxDocument<RxDocumentType, OrmMethods> | null,
        OrmMethods,
        Reactivity
    > {
        ensureRxCollectionIsNotDestroyed(this);

        // TODO move this check to dev-mode plugin
        if (
            typeof queryObj === 'number' ||
            Array.isArray(queryObj)
        ) {
            throw newRxTypeError('COL6', {
                queryObj
            });
        }

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


            // cannot have limit on findOne queries because it will be overwritten
            if ((queryObj as MangoQuery).limit) {
                throw newRxError('QU6');
            }

            queryObj = flatClone(queryObj);
            (queryObj as any).limit = 1;
            query = createRxQuery<RxDocumentType>('findOne', queryObj, this as any);
        }


        return query as any;
    }

    count(queryObj?: MangoQuerySelectorAndIndex<RxDocumentType>): RxQuery<
        RxDocumentType,
        number,
        OrmMethods,
        Reactivity
    > {
        ensureRxCollectionIsNotDestroyed(this);
        if (!queryObj) {
            queryObj = _getDefaultQuery();
        }
        const query = createRxQuery('count', queryObj, this as any);
        return query as any;
    }

    /**
     * find a list documents by their primary key
     * has way better performance then running multiple findOne() or a find() with a complex $or-selected
     */
    findByIds(
        ids: string[]
    ): RxQuery<
        RxDocumentType,
        Map<string, RxDocument<RxDocumentType, OrmMethods>>,
        OrmMethods,
        Reactivity
    > {
        ensureRxCollectionIsNotDestroyed(this);
        const mangoQuery: MangoQuery<RxDocumentType> = {
            selector: {
                [this.schema.primaryPath]: {
                    $in: ids.slice(0)
                }
            } as any
        };
        const query = createRxQuery('findByIds', mangoQuery, this as any);
        return query as any;
    }

    /**
     * Export collection to a JSON friendly format.
     */
    exportJSON(): Promise<RxDumpCollection<RxDocumentType>>;
    exportJSON(): Promise<RxDumpCollectionAny<RxDocumentType>>;
    exportJSON(): Promise<any> {
        throw pluginMissing('json-dump');
    }

    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
     */
    importJSON(_exportedJSON: RxDumpCollectionAny<RxDocumentType>): Promise<void> {
        throw pluginMissing('json-dump');
    }

    insertCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): RxDocument<RxDocumentType, OrmMethods> {
        throw pluginMissing('crdt');
    }


    addPipeline(_options: RxPipelineOptions<RxDocumentType>): Promise<RxPipeline<RxDocumentType>> {
        throw pluginMissing('pipeline');
    }

    /**
     * HOOKS
     */
    addHook(when: HookWhenType, key: HookKeyType, fun: any, parallel = false) {
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

    getHooks(when: HookWhenType, key: HookKeyType) {
        if (
            !this.hooks[key] ||
            !this.hooks[key][when]
        ) {
            return {
                series: [],
                parallel: []
            };
        }
        return this.hooks[key][when];
    }

    hasHooks(when: HookWhenType, key: HookKeyType) {
        /**
         * Performance shortcut
         * so that we not have to build the empty object.
         */
        if (
            !this.hooks[key] ||
            !this.hooks[key][when]
        ) {
            return false;
        }

        const hooks = this.getHooks(when, key);
        if (!hooks) {
            return false;
        }
        return hooks.series.length > 0 || hooks.parallel.length > 0;
    }

    _runHooks(when: HookWhenType, key: HookKeyType, data: any, instance?: any): Promise<any> {
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
    _runHooksSync(when: HookWhenType, key: HookKeyType, data: any, instance: any) {
        if (!this.hasHooks(when, key)) {
            return;
        }
        const hooks = this.getHooks(when, key);
        if (!hooks) return;
        hooks.series.forEach((hook: any) => hook(data, instance));
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

    async destroy(): Promise<boolean> {
        if (this.destroyed) {
            return PROMISE_RESOLVE_FALSE;
        }


        await Promise.all(this.onDestroy.map(fn => fn()));

        /**
         * Settings destroyed = true
         * must be the first thing to do,
         * so for example the replication can directly stop
         * instead of sending requests to a closed storage.
         */
        this.destroyed = true;


        Array.from(this.timeouts).forEach(timeout => clearTimeout(timeout));
        if (this._changeEventBuffer) {
            this._changeEventBuffer.destroy();
        }
        /**
         * First wait until the whole database is idle.
         * This ensures that the storage does not get closed
         * while some operation is running.
         * It is important that we do not intercept a running call
         * because it might lead to undefined behavior like when a doc is written
         * but the change is not added to the changes collection.
         */
        return this.database.requestIdlePromise()
            .then(() => this.storageInstance.close())
            .then(() => {
                /**
                 * Unsubscribing must be done AFTER the storageInstance.close()
                 * Because the conflict handling is part of the subscriptions and
                 * otherwise there might be open conflicts to be resolved which
                 * will then stuck and never resolve.
                 */
                this._subs.forEach(sub => sub.unsubscribe());

                delete this.database.collections[this.name];
                return runAsyncPluginHooks('postDestroyRxCollection', this).then(() => true);
            });
    }

    /**
     * remove all data of the collection
     */
    async remove(): Promise<any> {
        await this.destroy();
        await Promise.all(this.onRemove.map(fn => fn()));
        await removeCollectionStorages(
            this.database.storage,
            this.database.internalStore,
            this.database.token,
            this.database.name,
            this.name,
            this.database.password,
            this.database.hashFunction
        );
    }

    get asRxCollection(): RxCollection<RxDocumentType, OrmMethods, StaticMethods, any, Reactivity> {
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

function _incrementalUpsertUpdate<RxDocType>(
    doc: RxDocumentBase<RxDocType>,
    json: RxDocumentData<RxDocType>
): Promise<RxDocumentBase<RxDocType>> {
    return doc.incrementalModify((_innerDoc) => {
        return json;
    });
}

/**
 * ensures that the given document exists
 * @return promise that resolves with new doc and flag if inserted
 */
function _incrementalUpsertEnsureRxDocumentExists<RxDocType>(
    rxCollection: RxCollection<RxDocType>,
    primary: string,
    json: any
): Promise<
    {
        doc: RxDocument<RxDocType>;
        inserted: boolean;
    }
> {
    /**
     * Optimisation shortcut,
     * first try to find the document in the doc-cache
     */
    const docDataFromCache = rxCollection._docCache.getLatestDocumentDataIfExists(primary);
    if (docDataFromCache) {
        return Promise.resolve({
            doc: rxCollection._docCache.getCachedRxDocuments([docDataFromCache])[0],
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
        localDocuments = false,
        cacheReplacementPolicy = defaultCacheReplacementPolicy,
        conflictHandler = defaultConflictHandler
    }: any
): Promise<RxCollection> {
    const storageInstanceCreationParams: RxStorageInstanceCreationParams<any, any> = {
        databaseInstanceToken: database.token,
        databaseName: database.name,
        collectionName: name,
        schema: schema.jsonSchema,
        options: instanceCreationOptions,
        multiInstance: database.multiInstance,
        password: database.password,
        devMode: overwritable.isDevMode()
    };

    runPluginHooks(
        'preCreateRxStorageInstance',
        storageInstanceCreationParams
    );

    return createRxCollectionStorageInstance(
        database,
        storageInstanceCreationParams
    ).then(storageInstance => {
        const collection = new RxCollectionBase(
            database,
            name,
            schema,
            storageInstance,
            instanceCreationOptions,
            migrationStrategies,
            methods,
            attachments,
            options,
            cacheReplacementPolicy,
            statics,
            conflictHandler
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
                runPluginHooks('createRxCollection', {
                    collection,
                    creator: {
                        name,
                        schema,
                        storageInstance,
                        instanceCreationOptions,
                        migrationStrategies,
                        methods,
                        attachments,
                        options,
                        cacheReplacementPolicy,
                        localDocuments,
                        statics
                    }
                });
                return collection as any;
            })
            /**
             * If the collection creation fails,
             * we yet have to close the storage instances.
             */
            .catch(err => {
                return storageInstance.close()
                    .then(() => Promise.reject(err as Error));
            });
    });
}

export function isRxCollection(obj: any): boolean {
    return obj instanceof RxCollectionBase;
}
