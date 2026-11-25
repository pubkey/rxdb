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
    normalizeInlineAttachments,
    createRxCollectionStorageInstance,
    removeCollectionStorages,
    ensureRxCollectionIsNotClosed,
    isWriteAllowed
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
import { fillPrimaryKey } from './rx-schema-helper.ts';

import {
    Subscription,
    Observable,
    ReplaySubject,
    Subject
} from 'rxjs';

import type {
    KeyFunctionMap,
    RxCollection,
    RxDatabase,
    RxQuery,
    RxDocument,
    RxDumpCollection,
    RxDumpCollectionAny,
    RxDumpOptions,
    RxDumpImportConflictMode,
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
    RxConflictHandler,
    MaybePromise,
    CRDTEntry,
    MangoQuerySelectorAndIndex,
    MigrationStrategies,
    WebMCPOptions,
    WebMCPLogEvent,
    WithInlineAttachments
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
    WrappedRxStorageInstance,
    RX_COLLECTION_BULK_INSERT_CONTEXT
} from './rx-storage-helper.ts';
import { IncrementalWriteQueue } from './incremental-write.ts';
import { beforeDocumentUpdateWrite } from './rx-document.ts';
import { overwritable } from './overwritable.ts';
import type { RxPipeline, RxPipelineOptions } from './plugins/pipeline/index.ts';
import { defaultConflictHandler } from './replication-protocol/default-conflict-handler.ts';
import { rxChangeEventBulkToRxChangeEvents } from './rx-change-event.ts';

const HOOKS_WHEN = ['pre', 'post'] as const;
type HookWhenType = typeof HOOKS_WHEN[number];
const HOOKS_KEYS = ['insert', 'save', 'remove', 'create'] as const;
type HookKeyType = typeof HOOKS_KEYS[number];

export interface UpsertOptions {
    /**
     * When true, existing attachments not present in the upsert data
     * will be removed. Defaults to false (preserve existing attachments).
     */
    deleteExistingAttachments?: boolean;
}
let hooksApplied = false;

export const OPEN_COLLECTIONS = new Set<RxCollectionBase<any, any, any>>();

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
        public readonly database: RxDatabase<CollectionsOfDatabase, any, InstanceCreationOptions, Reactivity>,
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
        public conflictHandler: RxConflictHandler<RxDocumentType> = defaultConflictHandler,
        public liveQueryUpdateThrottleTime: number | undefined = undefined
    ) {
        _applyHookFunctions(this.asRxCollection);


        if (database) { // might be falsy on pseudoInstance
            this.eventBulks$ = database.eventBulks$.pipe(
                filter((changeEventBulk: RxChangeEventBulk<any>) => changeEventBulk.collectionName === this.name)
            );
        } else { }
    }

    get insert$(): Observable<RxChangeEventInsert<RxDocumentType>> {
        return this.$.pipe(
            filter((cE: RxChangeEvent<RxDocumentType>) => cE.operation === 'INSERT')
        ) as any;
    }
    get update$(): Observable<RxChangeEventUpdate<RxDocumentType>> {
        return this.$.pipe(
            filter((cE: RxChangeEvent<RxDocumentType>) => cE.operation === 'UPDATE')
        ) as any;
    }
    get remove$(): Observable<RxChangeEventDelete<RxDocumentType>> {
        return this.$.pipe(
            filter((cE: RxChangeEvent<RxDocumentType>) => cE.operation === 'DELETE')
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
     * Internally only use eventBulks$
     * Do not use .$ or .observable$ because that has to transform
     * the events which decreases performance.
     */
    public readonly eventBulks$: Observable<RxChangeEventBulk<any>> = {} as any;


    /**
     * When the collection is closed,
     * these functions will be called an awaited.
     * Used to automatically clean up stuff that
     * belongs to this collection.
    */
    public onClose: (() => MaybePromise<any>)[] = [];
    public closed = false;

    /**
     * Emits once and completes when the collection gets closed.
     * Replays that emit to late subscribers so that observables
     * which are subscribed after the close can complete directly.
     */
    public readonly closed$ = new ReplaySubject<void>(1);

    /**
     * Set to true while a schema migration is running for this collection.
     * Writes are blocked while this is true to ensure the migration
     * replication can fill the new storage without external interference.
     */
    public migrationInProgress = false;

    public onRemove: (() => MaybePromise<any>)[] = [];

    public async prepare(): Promise<void> {

        // CLA-DB: Removed the artificial NON_PREMIUM_COLLECTION_LIMIT (COL23) check.
        // OPEN_COLLECTIONS tracking and utils-premium exports are preserved for
        // database shutdown cleanup and public API compatibility.

        /**
         * Must be after the check because the hooks might throw on dev-mode
         * checks and we do not want to have broken collections here.
         * RxCollection instances created for testings do not have a database
         * so we do not add these to the list.
         */
        if (this.database) {
            OPEN_COLLECTIONS.add(this);
        }


        this.storageInstance = getWrappedStorageInstance(
            this.database,
            this.internalStorageInstance,
            this.schema.jsonSchema
        );
        this.incrementalWriteQueue = new IncrementalWriteQueue<RxDocumentType>(
            this.storageInstance,
            this.schema.primaryPath,
            (newData, oldData) => beforeDocumentUpdateWrite(this as any, newData, oldData),
            result => this._runHooks('post', 'save', result, this._docCache.getCachedRxDocument(result))
        );

        this.$ = this.eventBulks$.pipe(
            mergeMap((changeEventBulk: RxChangeEventBulk<any>) => rxChangeEventBulkToRxChangeEvents(changeEventBulk)),
        );
        this.checkpoint$ = this.eventBulks$.pipe(
            map((changeEventBulk: RxChangeEventBulk<any>) => changeEventBulk.checkpoint),
        );

        this._changeEventBuffer = createChangeEventBuffer<RxDocumentType>(this.asRxCollection);
        let documentConstructor: any;
        this._docCache = new DocumentCache(
            this.schema.primaryPath,
            this.eventBulks$.pipe(
                filter((bulk: RxChangeEventBulk<any>) => !bulk.isLocal),
                map((bulk: RxChangeEventBulk<any>) => bulk.events)
            ),
            docData => {
                if (!documentConstructor) {
                    documentConstructor = getRxDocumentConstructor(this.asRxCollection);
                }
                return createNewRxDocument(this.asRxCollection, documentConstructor, docData);
            }
        );
        this._subs.push(this._docCache.changesSub);


        const listenToRemoveSub = this.database.internalStore.changeStream().pipe(
            filter((bulk: any) => {
                const key = this.name + '-' + this.schema.version;
                const found = bulk.events.find((event: any) => {
                    return (
                        event.documentData.context === 'collection' &&
                        event.documentData.key === key &&
                        event.operation === 'DELETE'
                    );
                });
                return !!found;
            })
        ).subscribe(async () => {
            await this.close();
            await Promise.all(this.onRemove.map(fn => fn()));
        });
        this._subs.push(listenToRemoveSub);


        const databaseStorageToken = await this.database.storageToken;
        const subDocs = this.storageInstance.changeStream().subscribe((eventBulk: any) => {
            const changeEventBulk: RxChangeEventBulk<RxDocumentType | RxLocalDocumentData> = {
                id: eventBulk.id,
                isLocal: false,
                internal: false,
                collectionName: this.name,
                storageToken: databaseStorageToken,
                events: eventBulk.events,
                databaseToken: this.database.token,
                checkpoint: eventBulk.checkpoint,
                context: eventBulk.context
            };
            this.database.$emit(changeEventBulk);
        });
        this._subs.push(subDocs);

        return PROMISE_RESOLVE_VOID;
    }


    /**
     * Manually call the cleanup function of the storage.
     * @link https://rxdb.info/cleanup.html
     */
    cleanup(_minimumDeletedTime?: number): Promise<boolean> {
        ensureRxCollectionIsNotClosed(this);
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
        ensureRxCollectionIsNotClosed(this);
        return this.getMigrationState().startMigration(batchSize);
    }
    migratePromise(batchSize: number = 10): Promise<any> {
        return this.getMigrationState().migratePromise(batchSize);
    }

    async insert(
        json: WithInlineAttachments<RxDocumentType> | RxDocument<RxDocumentType>
    ): Promise<RxDocument<RxDocumentType, OrmMethods, Reactivity>> {
        isWriteAllowed(this);
        const writeResult = await this.bulkInsert([json as any]);

        const isError = writeResult.error[0];
        throwIfIsStorageWriteError(this as any, (json as any)[this.schema.primaryPath] as any, json, isError as any);
        const insertResult = ensureNotFalsy(writeResult.success[0]);
        return insertResult;
    }

    async insertIfNotExists(
        json: RxDocumentType | RxDocument<RxDocumentType>
    ): Promise<RxDocument<RxDocumentType, OrmMethods, Reactivity>> {
        const writeResult = await this.bulkInsert([json as any]);
        if (writeResult.error.length > 0) {
            const error = writeResult.error[0];
            if (error.status === 409) {
                const conflictDocData = error.documentInDb;
                return mapDocumentsDataToCacheDocs(this._docCache, [conflictDocData])[0] as any;

            } else {
                throw error;
            }
        }
        return writeResult.success[0];
    }

    async bulkInsert(
        docsData: (WithInlineAttachments<RxDocumentType> | RxDocument<RxDocumentType>)[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods, Reactivity>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }> {
        isWriteAllowed(this);
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

        const ids = new Set<string>();

        /**
         * This code is a bit redundant for better performance.
         * Instead of iterating multiple times,
         * we directly transform the input to a write-row array.
         */
        let insertRows: BulkWriteRow<RxDocumentType>[];
        if (this.hasHooks('pre', 'insert')) {
            insertRows = await Promise.all(
                docsData.map(docData => {
                    const useDocData = fillObjectDataBeforeInsert(this.schema, docData, true);
                    return this._runHooks('pre', 'insert', useDocData)
                        .then(() => {
                            if (typeof this.schema.jsonSchema.primaryKey !== 'string') {
                                fillPrimaryKey(
                                    this.schema.primaryPath as any,
                                    this.schema.jsonSchema as any,
                                    useDocData as any
                                );
                            }
                            ids.add((useDocData as any)[primaryPath]);
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
                ids.add((useDocData as any)[primaryPath]);
                insertRows[index] = { document: useDocData };
            }
        }


        if (ids.size !== docsData.length) {
            const duplicateIdSet = new Set<string>();
            const seenIds = new Set<string>();
            for (const row of insertRows) {
                const id = (row.document as any)[primaryPath];
                if (seenIds.has(id)) {
                    duplicateIdSet.add(id);
                } else {
                    seenIds.add(id);
                }
            }
            throw newRxError('COL22', {
                collection: this.name,
                duplicateIds: Array.from(duplicateIdSet),
                args: {
                    documents: docsData
                }
            });
        }

        // Normalize any inline attachment inputs (compute digest/length from Blob)
        // Also converts array format to internal map format.
        // Only create promises for rows that actually need normalization to avoid
        // expensive await overhead on the hot path.
        if (this.schema.jsonSchema.attachments) {
            const normalizePromises: Promise<void>[] = [];
            for (const row of insertRows) {
                const doc: any = row.document;
                const atts = doc._attachments;
                if (atts == null || Object.keys(atts).length === 0) {
                    doc._attachments = {};
                } else {
                    normalizePromises.push(
                        normalizeInlineAttachments(this.database.hashFunction, atts)
                            .then(normalized => {
                                doc._attachments = normalized;
                            })
                    );
                }
            }
            if (normalizePromises.length > 0) {
                await Promise.all(normalizePromises);
            }
        }

        const results = await this.storageInstance.bulkWrite(
            insertRows,
            RX_COLLECTION_BULK_INSERT_CONTEXT
        );
        if (overwritable.isDevMode()) {
            overwritable.deepFreezeWhenDevMode(
                getWrittenDocumentsFromBulkWriteResponse(primaryPath, insertRows, results)
            );
        }


        /**
         * Often the user does not need to access the RxDocuments of the bulkInsert() call.
         * So we transform the data to RxDocuments only if needed to use less CPU performance.
         */
        let rxDocuments: RxDocument<RxDocumentType, OrmMethods, Reactivity>[];
        const collection = this;
        const ret = {
            get success() {
                if (!rxDocuments) {
                    const success = getWrittenDocumentsFromBulkWriteResponse(
                        collection.schema.primaryPath,
                        insertRows,
                        results
                    );
                    rxDocuments = mapDocumentsDataToCacheDocs<RxDocumentType, OrmMethods>(collection._docCache, success) as any;
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
        /**
         * You can either remove the documents by their ids
         * or by directly providing the RxDocument instances
         * if you have them already. This improves performance a bit.
         */
        idsOrDocs: string[] | RxDocument<RxDocumentType>[]
    ): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods, Reactivity>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }> {
        isWriteAllowed(this);
        const primaryPath = this.schema.primaryPath;
        /**
         * Optimization shortcut,
         * do nothing when called with an empty array
         */
        if (idsOrDocs.length === 0) {
            return {
                success: [],
                error: []
            };
        }

        let rxDocumentMap: Map<string, RxDocument<RxDocumentType, OrmMethods, Reactivity>>;
        if (typeof idsOrDocs[0] === 'string') {
            rxDocumentMap = await this.findByIds(idsOrDocs as string[]).exec();
        } else {
            rxDocumentMap = new Map();
            (idsOrDocs as RxDocument<RxDocumentType, OrmMethods, Reactivity>[]).forEach(d => rxDocumentMap.set(d.primary, d));
        }

        const docsData: RxDocumentData<RxDocumentType>[] = [];
        const docsMap: Map<string, RxDocumentData<RxDocumentType>> = new Map();
        const rxDocuments = Array.from(rxDocumentMap.values());
        rxDocuments.forEach(rxDocument => {
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
        /**
         * The preRemove hooks are allowed to mutate the plain data,
         * so the previous state must be the stored state of the RxDocument.
         * Storages derive the old index strings from it.
         */
        const removeDocs: BulkWriteRow<RxDocumentType>[] = docsData.map((doc, idx) => {
            const writeDoc = flatClone(doc);
            writeDoc._deleted = true;
            return {
                previous: rxDocuments[idx]._data,
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

        const deletedRxDocuments: RxDocument<RxDocumentType, OrmMethods, Reactivity>[] = [];
        const successIds: string[] = success.map(d => {
            const id = d[primaryPath] as string;
            const doc = this._docCache.getCachedRxDocument(d);
            deletedRxDocuments.push(doc as any);
            return id;
        });

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


        return {
            success: deletedRxDocuments,
            error: results.error
        };
    }

    /**
     * same as bulkInsert but overwrites existing document with same primary
     */
    async bulkUpsert(docsData: (WithInlineAttachments<Partial<RxDocumentType>> | RxDocument<RxDocumentType>)[], options?: UpsertOptions): Promise<{
        success: RxDocument<RxDocumentType, OrmMethods, Reactivity>[];
        error: RxStorageWriteError<RxDocumentType>[];
    }> {
        isWriteAllowed(this);
        const insertData: RxDocumentType[] = [];
        const useJsonByDocId: Map<string, RxDocumentType> = new Map();
        const primaryPath = this.schema.primaryPath;
        const deleteExisting = options?.deleteExistingAttachments === true;
        let attachmentsNormalized: Promise<any> | undefined;

        const success: RxDocument<RxDocumentType, OrmMethods, Reactivity>[] = [];
        const error: RxStorageWriteError<RxDocumentType>[] = [];

        /**
         * Updates a document that exists already.
         * This uses the incremental write queue so that the update
         * runs in call order with the other incremental writes of that document.
         */
        const updates: Promise<any>[] = [];
        const updateExisting = (docData: RxDocumentData<RxDocumentType>) => {
            const update = this.incrementalWriteQueue.addWrite(
                docData,
                (docWriteData: any): any => {
                    const getWriteData = () => {
                        const writeData: any = getFromMapOrThrow(useJsonByDocId, docData[primaryPath] as any);
                        return _upsertWriteData(writeData, docWriteData, writeData._attachments, deleteExisting);
                    };
                    return attachmentsNormalized ? attachmentsNormalized.then(getWriteData) : getWriteData();
                }
            ).then(
                writeResult => success.push(this._docCache.getCachedRxDocument(writeResult) as any),
                err => {
                    // a write error of the storage is returned like the write errors of the insert
                    if (!err.parameters || !err.parameters.writeError) {
                        throw err;
                    }
                    error.push(err.parameters.writeError);
                }
            );
            // the rejection is handled when all updates are awaited
            update.catch(() => { });
            updates.push(update);
        };

        // First pass: synchronous work — schema filling and primary key validation
        const preparedDocs: RxDocumentType[] = [];
        const ids = new Set<string>();
        for (const docData of docsData) {
            const useJson = fillObjectDataBeforeInsert(this.schema, docData);
            const primary: string = useJson[this.schema.primaryPath] as any;
            if (!primary) {
                throw newRxError('COL3', {
                    primaryPath: this.schema.primaryPath as string,
                    data: useJson,
                    schema: this.schema.jsonSchema
                });
            }
            ids.add(primary);
            preparedDocs.push(useJson);
        }

        // Second pass: normalize inline attachments concurrently across all documents.
        // Only create promises for docs that actually need normalization to avoid
        // expensive await overhead on the hot path.
        if (this.schema.jsonSchema.attachments) {
            const normalizePromises: Promise<void>[] = [];
            for (const useJson of preparedDocs) {
                const atts = (useJson as any)._attachments;
                if (atts == null || Object.keys(atts).length === 0) {
                    (useJson as any)._attachments = {};
                } else {
                    normalizePromises.push(
                        normalizeInlineAttachments(this.database.hashFunction, atts)
                            .then(normalized => {
                                (useJson as any)._attachments = normalized;
                            })
                    );
                }
            }
            if (normalizePromises.length > 0) {
                attachmentsNormalized = Promise.all(normalizePromises);
            }
        }

        /**
         * A document that is known to exist is updated directly, without trying to insert it first.
         * Not possible when the insert must run to call the preInsert hooks
         * or to throw on duplicate primary keys.
         */
        const updateKnown = !this.hasHooks('pre', 'insert') && ids.size === preparedDocs.length;
        for (const useJson of preparedDocs) {
            const primary: string = (useJson as any)[primaryPath];
            useJsonByDocId.set(primary, useJson);
            const docDataFromCache = updateKnown && this._docCache.getLatestDocumentDataIfExists(primary);
            if (docDataFromCache && !docDataFromCache._deleted) {
                updateExisting(docDataFromCache);
            } else {
                insertData.push(useJson);
            }
        }

        if (attachmentsNormalized) {
            await attachmentsNormalized;
        }
        const insertResult = await this.bulkInsert(insertData);
        insertResult.error.forEach(err => {
            if (err.status !== 409) {
                error.push(err);
            } else {
                updateExisting(ensureNotFalsy(err.documentInDb));
            }
        });
        await Promise.all(updates);
        return {
            error,
            success: insertResult.success.concat(success)
        };
    }

    /**
     * same as insert but overwrites existing document with same primary
     */
    async upsert(json: WithInlineAttachments<Partial<RxDocumentType>> | RxDocument<RxDocumentType>, options?: UpsertOptions): Promise<RxDocument<RxDocumentType, OrmMethods, Reactivity>> {
        isWriteAllowed(this);
        const bulkResult = await this.bulkUpsert([json], options);
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
    incrementalUpsert(json: WithInlineAttachments<Partial<RxDocumentType>> | RxDocument<RxDocumentType>, options?: UpsertOptions): Promise<RxDocument<RxDocumentType, OrmMethods, Reactivity>> {
        isWriteAllowed(this);
        const useJson = fillObjectDataBeforeInsert(this.schema, json);
        const primary: string = useJson[this.schema.primaryPath] as any;
        if (!primary) {
            throw newRxError('COL4', {
                data: json
            });
        }

        const hasAttachments = !!this.schema.jsonSchema.attachments;
        const deleteExisting = options?.deleteExistingAttachments === true;

        // Normalize array-format attachments to map format
        const attachmentsPromise = PROMISE_RESOLVE_VOID.then(() => {
            if (hasAttachments) {
                const atts = (useJson as any)._attachments;
                if (atts == null || Object.keys(atts).length === 0) {
                    return {};
                } else {
                    return normalizeInlineAttachments(this.database.hashFunction, atts);
                }
            }
            return (useJson as any)._attachments;
        });
        // the rejection is handled by the write that uses the promise, which can be at a later time
        attachmentsPromise.catch(() => { });

        /**
         * The write is added to the incremental write queue at call time,
         * so that it runs in call order with the incremental writes
         * of the RxDocument, which use the same queue.
         * When the document is not in the cache, the write waits in the queue until
         * the document was found or another write to the document provides its state.
         */
        const writeQueue = this.incrementalWriteQueue;
        const modifier = (docWriteData: any): any => attachmentsPromise.then(
            newAttachments => _upsertWriteData(useJson, docWriteData, newAttachments, deleteExisting)
        );
        let write: Promise<RxDocumentData<RxDocumentType>> | undefined;
        const addWrite = (docData?: RxDocumentData<RxDocumentType>) => {
            write = writeQueue.addWrite(docData, modifier, true, primary);
            // the rejection is handled when the calls before this one have settled
            write.catch(() => { });
            return write;
        };
        // a write that still waits is not needed when this call inserts the document or fails
        const removeWrite = () => {
            if (writeQueue.removeWrite(primary, modifier)) {
                write = undefined;
            }
        };
        addWrite(this._docCache.getLatestDocumentDataIfExists(primary));

        // ensure that it won't try 2 parallel runs
        const result = (this._incrementalUpsertQueues.get(primary) || PROMISE_RESOLVE_VOID)
            .then(() => attachmentsPromise)
            .then((normalizedAttachments) => {
                (useJson as any)._attachments = normalizedAttachments;
                return _incrementalUpsertEnsureRxDocumentExists(this as any, primary as any, useJson, removeWrite);
            })
            .then((wasInserted) => {
                const docData: RxDocumentData<RxDocumentType> = wasInserted.doc._data as any;
                writeQueue.setDocumentState(docData);
                return wasInserted.inserted ?
                    wasInserted.doc :
                    (write || addWrite(docData)).then(writeResult => this._docCache.getCachedRxDocument(writeResult) as any);
            });

        /**
         * The stored queue never rejects, so that a failed call
         * does not make the later calls for the same primary fail.
         * The entry is removed when no newer call has been queued behind it.
         */
        const settled = () => {
            removeWrite();
            if (this._incrementalUpsertQueues.get(primary) === queue) {
                this._incrementalUpsertQueues.delete(primary);
            }
        };
        const queue: Promise<void> = result.then(settled, settled);
        this._incrementalUpsertQueues.set(primary, queue);
        return result;
    }

    find(queryObj?: MangoQuery<RxDocumentType>): RxQuery<
        RxDocumentType,
        RxDocument<RxDocumentType, OrmMethods, Reactivity>[],
        OrmMethods,
        Reactivity
    > {
        ensureRxCollectionIsNotClosed(this);

        runPluginHooks('prePrepareRxQuery', {
            op: 'find',
            queryObj,
            collection: this
        });

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
        RxDocument<RxDocumentType, OrmMethods, Reactivity> | null,
        OrmMethods,
        Reactivity
    > {
        ensureRxCollectionIsNotClosed(this);

        runPluginHooks('prePrepareRxQuery', {
            op: 'findOne',
            queryObj,
            collection: this
        });

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
        ensureRxCollectionIsNotClosed(this);
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
        Map<string, RxDocument<RxDocumentType, OrmMethods, Reactivity>>,
        OrmMethods,
        Reactivity
    > {
        ensureRxCollectionIsNotClosed(this);
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
    exportJSON(_options?: RxDumpOptions): Promise<RxDumpCollection<RxDocumentType>>;
    exportJSON(_options?: RxDumpOptions): Promise<RxDumpCollectionAny<RxDocumentType>>;
    exportJSON(_options?: RxDumpOptions): Promise<any> {
        throw pluginMissing('json-dump');
    }

    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<collection>.exportJSON()` method.
     * @param _conflictMode What to do with documents of the dump that already exist in the collection. [default='skip']
     */
    importJSON(
        _exportedJSON: RxDumpCollectionAny<RxDocumentType>,
        _conflictMode?: RxDumpImportConflictMode
    ): Promise<void>;
    importJSON(_exportedJSON: RxDumpCollectionAny<RxDocumentType>): Promise<void> {
        throw pluginMissing('json-dump');
    }

    registerWebMCP(_options?: WebMCPOptions): { error$: Subject<Error>; log$: Subject<WebMCPLogEvent>; } {
        throw pluginMissing('webmcp');
    }

    insertCRDT(_updateObj: CRDTEntry<any> | CRDTEntry<any>[]): Promise<RxDocument<RxDocumentType, OrmMethods, Reactivity>> {
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

        if (!this.hooks[key]) {
            this.hooks[key] = {} as any;
        }
        if (!this.hooks[key][when]) {
            this.hooks[key][when] = {
                series: [],
                parallel: []
            };
        }
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
     * Ensures that is properly cleans up when the collection is closed
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

    /**
     * Contains the promise of the currently running close() call
     * so that concurrent calls share one run
     * instead of closing the collection multiple times.
     */
    private closePromise: Promise<boolean> | null = null;

    close(): Promise<boolean> {
        if (this.closed) {
            return PROMISE_RESOLVE_FALSE;
        }
        if (!this.closePromise) {
            this.closePromise = this._close().catch(err => {
                /**
                 * When closing failed, a later call
                 * must be able to run the close logic again.
                 */
                this.closePromise = null;
                throw err;
            });
        }
        return this.closePromise;
    }

    private async _close(): Promise<boolean> {
        OPEN_COLLECTIONS.delete(this);


        await Promise.all(this.onClose.map(fn => fn()));

        /**
         * Settings closed = true
         * must be the first thing to do,
         * so for example the replication can directly stop
         * instead of sending requests to a closed storage.
         */
        this.closed = true;
        this.closed$.next();
        this.closed$.complete();


        Array.from(this.timeouts).forEach(timeout => clearTimeout(timeout));
        if (this._changeEventBuffer) {
            this._changeEventBuffer.close();
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
                this.database.collectionsSubject$.next({
                    collection: this.asRxCollection,
                    type: 'CLOSED'
                });
                return runAsyncPluginHooks('postCloseRxCollection', this).then(() => true);
            });
    }

    /**
     * remove all data of the collection
     */
    async remove(): Promise<any> {
        await this.close();
        await Promise.all(this.onRemove.map(fn => fn()));
        /**
         * TODO here we should pass the already existing
         * storage instances instead of creating new ones.
         */
        await removeCollectionStorages(
            this.database.storage,
            this.database.internalStore,
            this.database.token,
            this.database.name,
            this.name,
            this.database.multiInstance,
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

/**
 * Returns the data that an upsert writes to a document that exists already.
 */
function _upsertWriteData(
    writeData: any,
    docWriteData: any,
    newAttachments: any,
    deleteExisting: boolean
) {
    return Object.assign({}, writeData, {
        _attachments: deleteExisting
            ? newAttachments
            : {
                ...docWriteData._attachments,
                ...newAttachments
            }
    });
}

/**
 * ensures that the given document exists
 * @return promise that resolves with new doc and flag if inserted
 */
function _incrementalUpsertEnsureRxDocumentExists<RxDocType>(
    rxCollection: RxCollection<RxDocType>,
    primary: string,
    json: any,
    beforeInsert: () => void
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
                beforeInsert();
                return rxCollection.insert(json)
                    .then(newDoc => ({
                        doc: newDoc,
                        inserted: true
                    }))
                    .catch((err) => {
                        /**
                         * If the insert fails with a conflict error,
                         * it means another concurrent operation already
                         * inserted a document with the same primary key
                         * between our findOne() and insert() calls.
                         * Re-run the whole function which will now find the
                         * existing document via cache or query.
                         */
                        if ((err as any).code === 'CONFLICT') {
                            return _incrementalUpsertEnsureRxDocumentExists(rxCollection, primary, json, beforeInsert);
                        }
                        throw err;
                    });
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
export async function createRxCollection(
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
        conflictHandler = defaultConflictHandler,
        storageInstance,
        liveQueryUpdateThrottleTime = undefined
    }: any
): Promise<RxCollection> {
    if (!storageInstance) {
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

        storageInstance = await createRxCollectionStorageInstance(
            database,
            storageInstanceCreationParams
        );
    }

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
        conflictHandler,
        liveQueryUpdateThrottleTime
    );

    try {
        await collection.prepare();

        // ORM add statics
        Object
            .entries(statics)
            .forEach(([funName, fun]) => {
                Object.defineProperty(collection, funName, {
                    get: () => (fun as any).bind(collection)
                });
            });

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

        /**
         * Migration must run after the hooks so that the
         * dev-mode can check up front if the
         * migration strategies are correctly set.
         */
        if (autoMigrate && collection.schema.version !== 0) {
            await collection.migratePromise();
        }

    } catch (err) {
        /**
         * If the collection creation fails,
         * the collection must be closed so that its storage instance,
         * its timeouts and everything that was started by the plugin hooks is stopped.
         * A closed collection also does not call close() again when its meta document
         * gets deleted, which would remove a later collection with the same name
         * from database.collections.
         * When close() fails because prepare() has failed before the storage instance
         * was wrapped, the given storage instance is closed directly.
         */
        await collection.close().catch(() => {
            collection.closed = true;
            return storageInstance.close();
        });
        throw err;
    }

    return collection as any;
}

export function isRxCollection(obj: any): boolean {
    return obj instanceof RxCollectionBase;
}
