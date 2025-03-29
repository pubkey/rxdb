import { IdleQueue } from 'custom-idle-queue';
import type {
    LeaderElector
} from 'broadcast-channel';
import { ObliviousSet } from 'oblivious-set';
import type {
    CollectionsOfDatabase,
    RxDatabase,
    RxCollectionCreator,
    RxJsonSchema,
    RxCollection,
    RxDumpDatabase,
    RxDumpDatabaseAny,
    BackupOptions,
    RxStorage,
    RxStorageInstance,
    BulkWriteRow,
    RxChangeEvent,
    RxDatabaseCreator,
    RxChangeEventBulk,
    RxDocumentData,
    RxCleanupPolicy,
    InternalStoreDocType,
    InternalStoreStorageTokenDocType,
    InternalStoreCollectionDocType,
    RxTypeError,
    RxError,
    HashFunction,
    MaybePromise,
    RxState
} from './types/index.d.ts';

import {
    pluginMissing,
    flatClone,
    PROMISE_RESOLVE_FALSE,
    randomToken,
    ensureNotFalsy,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    defaultHashSha256,
    RXDB_VERSION
} from './plugins/utils/index.ts';
import {
    newRxError
} from './rx-error.ts';
import {
    createRxSchema,
    RxSchema
} from './rx-schema.ts';
import {
    runPluginHooks,
    runAsyncPluginHooks
} from './hooks.ts';
import {
    Subject,
    Subscription,
    Observable
} from 'rxjs';
import {
    mergeMap
} from 'rxjs/operators';
import {
    createRxCollection
} from './rx-collection.ts';
import {
    flatCloneDocWithMeta,
    getSingleDocument,
    getWrappedStorageInstance,
    INTERNAL_STORAGE_NAME,
    WrappedRxStorageInstance
} from './rx-storage-helper.ts';
import type { RxBackupState } from './plugins/backup/index.ts';
import {
    ensureStorageTokenDocumentExists,
    getAllCollectionDocuments,
    getPrimaryKeyOfInternalDocument,
    INTERNAL_CONTEXT_COLLECTION,
    INTERNAL_STORE_SCHEMA,
    _collectionNamePrimary
} from './rx-database-internal-store.ts';
import { removeCollectionStorages } from './rx-collection-helper.ts';
import { overwritable } from './overwritable.ts';
import type { RxMigrationState } from './plugins/migration-schema/index.ts';
import type { RxReactivityFactory } from './types/plugins/reactivity.d.ts';
import { rxChangeEventBulkToRxChangeEvents } from './rx-change-event.ts';

/**
 * stores the used database names+storage names
 * so we can throw when the same database is created more then once.
 */
const USED_DATABASE_NAMES: Set<string> = new Set();
const DATABASE_UNCLOSED_INSTANCE_PROMISE_MAP = new Map<string, Set<Promise<RxDatabase>>>();

let DB_COUNT = 0;

export class RxDatabaseBase<
    Internals,
    InstanceCreationOptions,
    Collections = CollectionsOfDatabase,
    Reactivity = unknown
> {

    public readonly idleQueue: IdleQueue = new IdleQueue();
    public readonly rxdbVersion = RXDB_VERSION;

    /**
     * Contains all known non-closed storage instances
     * that belong to this database.
     * Used in plugins and unit tests.
     */
    public readonly storageInstances = new Set<WrappedRxStorageInstance<any, Internals, InstanceCreationOptions>>();

    constructor(
        public readonly name: string,
        /**
         * Uniquely identifies the instance
         * of this RxDatabase.
         */
        public readonly token: string,
        public readonly storage: RxStorage<Internals, InstanceCreationOptions>,
        public readonly instanceCreationOptions: InstanceCreationOptions,
        public readonly password: any,
        public readonly multiInstance: boolean,
        public readonly eventReduce: boolean = false,
        public options: any = {},
        /**
         * Stores information documents about the collections of the database
         */
        public readonly internalStore: RxStorageInstance<InternalStoreDocType, Internals, InstanceCreationOptions>,
        public readonly hashFunction: HashFunction,
        public readonly cleanupPolicy?: Partial<RxCleanupPolicy>,
        public readonly allowSlowCount?: boolean,
        public readonly reactivity?: RxReactivityFactory<any>,
        public readonly onClosed?: () => void,
    ) {
        DB_COUNT++;

        /**
         * In the dev-mode, we create a pseudoInstance
         * to get all properties of RxDatabase and ensure they do not
         * conflict with the collection names etc.
         * So only if it is not pseudoInstance,
         * we have all values to prepare a real RxDatabase.
         *
         * TODO this is ugly, we should use a different way in the dev-mode
         * so that all non-dev-mode code can be cleaner.
         */
        if (this.name !== 'pseudoInstance') {
            /**
             * Wrap the internal store
             * to ensure that calls to it also end up in
             * calculation of the idle state and the hooks.
             */
            this.internalStore = getWrappedStorageInstance(
                this.asRxDatabase,
                internalStore,
                INTERNAL_STORE_SCHEMA
            );

            /**
             * Start writing the storage token.
             * Do not await the creation because it would run
             * in a critical path that increases startup time.
             *
             * Writing the token takes about 20 milliseconds
             * even on a fast adapter, so this is worth it.
             */
            this.storageTokenDocument = ensureStorageTokenDocumentExists(this.asRxDatabase)
                .catch(err => this.startupErrors.push(err) as any);
            this.storageToken = this.storageTokenDocument
                .then(doc => doc.data.token)
                .catch(err => this.startupErrors.push(err) as any);
        }
    }

    get $(): Observable<RxChangeEvent<any>> {
        return this.observable$;
    }

    public getReactivityFactory(): RxReactivityFactory<Reactivity> {
        if (!this.reactivity) {
            throw newRxError('DB14', { database: this.name });
        }
        return this.reactivity;
    }

    public _subs: Subscription[] = [];

    /**
     * Because having unhandled exceptions would fail,
     * we have to store the async errors of the constructor here
     * so we can throw them later.
     */
    public startupErrors: (RxError | RxTypeError)[] = [];

    /**
     * When the database is closed,
     * these functions will be called an awaited.
     * Used to automatically clean up stuff that
     * belongs to this collection.
     */
    public onClose: (() => MaybePromise<any>)[] = [];
    public closed: boolean = false;
    public collections: Collections = {} as any;
    public states: { [name: string]: RxState<any, Reactivity>; } = {};

    /**
     * Internally only use eventBulks$
     * Do not use .$ or .observable$ because that has to transform
     * the events which decreases performance.
     */
    public readonly eventBulks$: Subject<RxChangeEventBulk<any>> = new Subject();

    private closePromise: Promise<boolean> | null = null;

    private observable$: Observable<RxChangeEvent<any>> = this.eventBulks$
        .pipe(
            mergeMap(changeEventBulk => rxChangeEventBulkToRxChangeEvents(changeEventBulk))
        );

    /**
     * Unique token that is stored with the data.
     * Used to detect if the dataset has been deleted
     * and if two RxDatabase instances work on the same dataset or not.
     *
     * Because reading and writing the storageToken runs in the hot path
     * of database creation, we do not await the storageWrites but instead
     * work with the promise when we need the value.
     */
    public storageToken: Promise<string> = PROMISE_RESOLVE_FALSE as any;
    /**
     * Stores the whole state of the internal storage token document.
     * We need this in some plugins.
     */
    public storageTokenDocument: Promise<RxDocumentData<InternalStoreStorageTokenDocType>> = PROMISE_RESOLVE_FALSE as any;

    /**
     * Contains the ids of all event bulks that have been emitted
     * by the database.
     * Used to detect duplicates that come in again via BroadcastChannel
     * or other streams.
     * In the past we tried to remove this and to ensure
     * all storages only emit the same event bulks only once
     * but it turns out this is just not possible for all storages.
     * JavaScript processes, workers and browser tabs can be closed and started at any time
     * which can cause cases where it is not possible to know if an event bulk has been emitted already.
     */
    public emittedEventBulkIds: ObliviousSet<string> = new ObliviousSet(60 * 1000);

    /**
     * This is the main handle-point for all change events
     * ChangeEvents created by this instance go:
     * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
     * ChangeEvents created by other instances go:
     * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
     */
    $emit(changeEventBulk: RxChangeEventBulk<any>) {
        if (this.emittedEventBulkIds.has(changeEventBulk.id)) {
            return;
        }
        this.emittedEventBulkIds.add(changeEventBulk.id);
        this.eventBulks$.next(changeEventBulk);
    }

    /**
     * removes the collection-doc from the internalStore
     */
    async removeCollectionDoc(name: string, schema: any): Promise<void> {
        const doc = await getSingleDocument(
            this.internalStore,
            getPrimaryKeyOfInternalDocument(
                _collectionNamePrimary(name, schema),
                INTERNAL_CONTEXT_COLLECTION
            )
        );
        if (!doc) {
            throw newRxError('SNH', { name, schema });
        }
        const writeDoc = flatCloneDocWithMeta(doc);
        writeDoc._deleted = true;

        await this.internalStore.bulkWrite([{
            document: writeDoc,
            previous: doc
        }], 'rx-database-remove-collection');
    }

    /**
     * creates multiple RxCollections at once
     * to be much faster by saving db txs and doing stuff in bulk-operations
     * This function is not called often, but mostly in the critical path at the initial page load
     * So it must be as fast as possible.
     */
    async addCollections<CreatedCollections = Partial<Collections>>(collectionCreators: {
        [key in keyof CreatedCollections]: RxCollectionCreator<any>
    }): Promise<{ [key in keyof CreatedCollections]: RxCollection<any, {}, {}, {}, Reactivity> }> {
        const jsonSchemas: { [key in keyof CreatedCollections]: RxJsonSchema<any> } = {} as any;
        const schemas: { [key in keyof CreatedCollections]: RxSchema<any> } = {} as any;
        const bulkPutDocs: BulkWriteRow<InternalStoreCollectionDocType>[] = [];
        const useArgsByCollectionName: any = {};

        await Promise.all(
            Object.entries(collectionCreators).map(async ([name, args]) => {
                const collectionName: keyof CreatedCollections = name as any;
                const rxJsonSchema = (args as RxCollectionCreator<any>).schema;
                jsonSchemas[collectionName] = rxJsonSchema;
                const schema = createRxSchema(rxJsonSchema, this.hashFunction);
                schemas[collectionName] = schema;

                // collection already exists
                if ((this.collections as any)[name]) {
                    throw newRxError('DB3', {
                        name
                    });
                }

                const collectionNameWithVersion = _collectionNamePrimary(name, rxJsonSchema);
                const collectionDocData: RxDocumentData<InternalStoreCollectionDocType> = {
                    id: getPrimaryKeyOfInternalDocument(
                        collectionNameWithVersion,
                        INTERNAL_CONTEXT_COLLECTION
                    ),
                    key: collectionNameWithVersion,
                    context: INTERNAL_CONTEXT_COLLECTION,
                    data: {
                        name: collectionName as any,
                        schemaHash: await schema.hash,
                        schema: schema.jsonSchema,
                        version: schema.version,
                        connectedStorages: []
                    },
                    _deleted: false,
                    _meta: getDefaultRxDocumentMeta(),
                    _rev: getDefaultRevision(),
                    _attachments: {}
                };
                bulkPutDocs.push({
                    document: collectionDocData
                });

                const useArgs: any = Object.assign(
                    {},
                    args,
                    {
                        name: collectionName,
                        schema,
                        database: this
                    }
                );

                // run hooks
                const hookData: RxCollectionCreator<any> & { name: string; } = flatClone(args) as any;
                (hookData as any).database = this;
                hookData.name = name;
                runPluginHooks('preCreateRxCollection', hookData);
                useArgs.conflictHandler = hookData.conflictHandler;

                useArgsByCollectionName[collectionName] = useArgs;
            })
        );


        const putDocsResult = await this.internalStore.bulkWrite(
            bulkPutDocs,
            'rx-database-add-collection'
        );

        await ensureNoStartupErrors(this);

        await Promise.all(
            putDocsResult.error.map(async (error) => {
                if (error.status !== 409) {
                    throw newRxError('DB12', {
                        database: this.name,
                        writeError: error
                    });
                }
                const docInDb: RxDocumentData<InternalStoreCollectionDocType> = ensureNotFalsy(error.documentInDb);
                const collectionName = docInDb.data.name;
                const schema = (schemas as any)[collectionName];
                // collection already exists but has different schema
                if (docInDb.data.schemaHash !== await schema.hash) {
                    throw newRxError('DB6', {
                        database: this.name,
                        collection: collectionName,
                        previousSchemaHash: docInDb.data.schemaHash,
                        schemaHash: await schema.hash,
                        previousSchema: docInDb.data.schema,
                        schema: ensureNotFalsy((jsonSchemas as any)[collectionName])
                    });
                }
            })
        );

        const ret: { [key in keyof CreatedCollections]: RxCollection<any, {}, {}, {}, Reactivity> } = {} as any;
        await Promise.all(
            Object.keys(collectionCreators).map(async (collectionName) => {
                const useArgs = useArgsByCollectionName[collectionName];
                const collection = await createRxCollection(useArgs);
                (ret as any)[collectionName] = collection;

                // set as getter to the database
                (this.collections as any)[collectionName] = collection;
                if (!(this as any)[collectionName]) {
                    Object.defineProperty(this, collectionName, {
                        get: () => (this.collections as any)[collectionName]
                    });
                }
            })
        );

        return ret;
    }

    /**
     * runs the given function between idleQueue-locking
     */
    lockedRun<T>(fn: (...args: any[]) => T): T extends Promise<any> ? T : Promise<T> {
        return this.idleQueue.wrapCall(fn) as any;
    }

    requestIdlePromise() {
        return this.idleQueue.requestIdlePromise();
    }

    /**
     * Export database to a JSON friendly format.
     */
    exportJSON(_collections?: string[]): Promise<RxDumpDatabase<Collections>>;
    exportJSON(_collections?: string[]): Promise<RxDumpDatabaseAny<Collections>>;
    exportJSON(_collections?: string[]): Promise<any> {
        throw pluginMissing('json-dump');
    }

    addState<T = any>(_name?: string): Promise<RxState<T, Reactivity>> {
        throw pluginMissing('state');
    }

    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
     * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
     * since data could be encrypted.
     */
    importJSON(_exportedJSON: RxDumpDatabaseAny<Collections>): Promise<void> {
        throw pluginMissing('json-dump');
    }

    backup(_options: BackupOptions): RxBackupState {
        throw pluginMissing('backup');
    }

    public leaderElector(): LeaderElector {
        throw pluginMissing('leader-election');
    }

    public isLeader(): boolean {
        throw pluginMissing('leader-election');
    }
    /**
     * returns a promise which resolves when the instance becomes leader
     */
    public waitForLeadership(): Promise<boolean> {
        throw pluginMissing('leader-election');
    }

    public migrationStates(): Observable<RxMigrationState[]> {
        throw pluginMissing('migration-schema');
    }

    /**
     * closes the database-instance and all collections
     */
    public close(): Promise<boolean> {
        if (this.closePromise) {
            return this.closePromise;
        }

        const { promise, resolve } = createPromiseWithResolvers<boolean>();
        const resolveClosePromise = (result: boolean) => {
            if (this.onClosed) {
                this.onClosed();
            }
            this.closed = true;
            resolve(result);
        };
        this.closePromise = promise;

        (async () => {
            await runAsyncPluginHooks('preCloseRxDatabase', this);
            /**
             * Complete the event stream
             * to stop all subscribers who forgot to unsubscribe.
             */
            this.eventBulks$.complete();

            DB_COUNT--;
            this._subs.map(sub => sub.unsubscribe());

            /**
             * closing the pseudo instance will throw
             * because stuff is missing
             * TODO we should not need the pseudo instance on runtime.
             * we should generate the property list on build time.
             */
            if (this.name === 'pseudoInstance') {
                resolveClosePromise(false);
                return;
            }

            /**
             * First wait until the database is idle
             */
            return this.requestIdlePromise()
                .then(() => Promise.all(this.onClose.map(fn => fn())))
                // close all collections
                .then(() => Promise.all(
                    Object.keys(this.collections as any)
                        .map(key => (this.collections as any)[key])
                        .map(col => col.close())
                ))
                // close internal storage instances
                .then(() => this.internalStore.close())
                .then(() => resolveClosePromise(true));
        })();

        return promise;
    }

    /**
     * deletes the database and its stored data.
     * Returns the names of all removed collections.
     */
    remove(): Promise<string[]> {
        return this
            .close()
            .then(() => removeRxDatabase(this.name, this.storage, this.multiInstance, this.password));
    }

    get asRxDatabase(): RxDatabase<
        {},
        Internals,
        InstanceCreationOptions,
        Reactivity
    > {
        return this as any;
    }
}

/**
 * checks if an instance with same name and storage already exists
 * @throws {RxError} if used
 */
function throwIfDatabaseNameUsed(
    name: string,
    storage: RxStorage<any, any>
) {
    if (USED_DATABASE_NAMES.has(getDatabaseNameKey(name, storage))) {
        throw newRxError('DB8', {
            name,
            storage: storage.name,
            link: 'https://rxdb.info/rx-database.html#ignoreduplicate'
        });
    }
}

/**
 * ponyfill for https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
 */
function createPromiseWithResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
}

function getDatabaseNameKey(
    name: string,
    storage: RxStorage<any, any>
) {
    return storage.name + '|' + name;
}

/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
export async function createRxDatabaseStorageInstance<Internals, InstanceCreationOptions>(
    databaseInstanceToken: string,
    storage: RxStorage<Internals, InstanceCreationOptions>,
    databaseName: string,
    options: InstanceCreationOptions,
    multiInstance: boolean,
    password?: string
): Promise<RxStorageInstance<InternalStoreDocType, Internals, InstanceCreationOptions>> {
    const internalStore = await storage.createStorageInstance<InternalStoreDocType>(
        {
            databaseInstanceToken,
            databaseName,
            collectionName: INTERNAL_STORAGE_NAME,
            schema: INTERNAL_STORE_SCHEMA,
            options,
            multiInstance,
            password,
            devMode: overwritable.isDevMode()
        }
    );
    return internalStore;
}

export function createRxDatabase<
    Collections = { [key: string]: RxCollection; },
    Internals = any,
    InstanceCreationOptions = any,
    Reactivity = unknown
>(
    {
        storage,
        instanceCreationOptions,
        name,
        password,
        multiInstance = true,
        eventReduce = true,
        ignoreDuplicate = false,
        options = {},
        cleanupPolicy,
        closeDuplicates = false,
        allowSlowCount = false,
        localDocuments = false,
        hashFunction = defaultHashSha256,
        reactivity
    }: RxDatabaseCreator<Internals, InstanceCreationOptions, Reactivity>
): Promise<
    RxDatabase<Collections, Internals, InstanceCreationOptions, Reactivity>
> {
    runPluginHooks('preCreateRxDatabase', {
        storage,
        instanceCreationOptions,
        name,
        password,
        multiInstance,
        eventReduce,
        ignoreDuplicate,
        options,
        localDocuments
    });

    const databaseNameKey = getDatabaseNameKey(name, storage);
    const databaseNameKeyUnclosedInstancesSet = DATABASE_UNCLOSED_INSTANCE_PROMISE_MAP.get(databaseNameKey) || new Set();
    const instancePromiseWithResolvers = createPromiseWithResolvers<RxDatabase<Collections, Internals, InstanceCreationOptions, Reactivity>>();
    const closeDuplicatesPromises = Array.from(databaseNameKeyUnclosedInstancesSet);
    const onInstanceClosed = () => {
        databaseNameKeyUnclosedInstancesSet.delete(instancePromiseWithResolvers.promise as any as Promise<RxDatabase>);
        USED_DATABASE_NAMES.delete(databaseNameKey);
    };

    databaseNameKeyUnclosedInstancesSet.add(instancePromiseWithResolvers.promise as any as Promise<RxDatabase>);
    DATABASE_UNCLOSED_INSTANCE_PROMISE_MAP.set(databaseNameKey, databaseNameKeyUnclosedInstancesSet);

    (async () => {
        if (closeDuplicates) {
            await Promise.all(
                closeDuplicatesPromises.map((unclosedInstancePromise) =>
                    unclosedInstancePromise
                        .catch(() => null)
                        .then((instance) => instance && instance.close())
                )
            );
        }

        if (ignoreDuplicate) {
            if (!overwritable.isDevMode()) {
                throw newRxError('DB9', {
                    database: name
                });
            }
        } else {
            // check if combination already used
            throwIfDatabaseNameUsed(name, storage);
        }

        USED_DATABASE_NAMES.add(databaseNameKey);

        const databaseInstanceToken = randomToken(10);
        const storageInstance = await createRxDatabaseStorageInstance<
            Internals,
            InstanceCreationOptions
        >(
            databaseInstanceToken,
            storage,
            name,
            instanceCreationOptions as any,
            multiInstance,
            password
        );
        const rxDatabase = new RxDatabaseBase(
            name,
            databaseInstanceToken,
            storage,
            instanceCreationOptions,
            password,
            multiInstance,
            eventReduce,
            options,
            storageInstance,
            hashFunction,
            cleanupPolicy,
            allowSlowCount,
            reactivity,
            onInstanceClosed
        ) as RxDatabase<Collections>;

        await runAsyncPluginHooks('createRxDatabase', {
            database: rxDatabase,
            creator: {
                storage,
                instanceCreationOptions,
                name,
                password,
                multiInstance,
                eventReduce,
                ignoreDuplicate,
                options,
                localDocuments
            }
        });

        return rxDatabase;
    })()
        .then((rxDatabase) => {
            instancePromiseWithResolvers.resolve(rxDatabase);
        })
        .catch((err) => {
            instancePromiseWithResolvers.reject(err);
            onInstanceClosed();
        });

    return instancePromiseWithResolvers.promise;
}

/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 *
 * Returns the names of the removed collections.
 */
export async function removeRxDatabase(
    databaseName: string,
    storage: RxStorage<any, any>,
    multiInstance: boolean = true,
    password?: string
): Promise<string[]> {
    const databaseInstanceToken = randomToken(10);
    const dbInternalsStorageInstance = await createRxDatabaseStorageInstance(
        databaseInstanceToken,
        storage,
        databaseName,
        {},
        multiInstance,
        password
    );
    const collectionDocs = await getAllCollectionDocuments(dbInternalsStorageInstance);
    const collectionNames = new Set<string>();
    collectionDocs.forEach(doc => collectionNames.add(doc.data.name));
    const removedCollectionNames: string[] = Array.from(collectionNames);

    await Promise.all(
        removedCollectionNames.map(collectionName => removeCollectionStorages(
            storage,
            dbInternalsStorageInstance,
            databaseInstanceToken,
            databaseName,
            collectionName,
            multiInstance,
            password
        ))
    );

    await runAsyncPluginHooks('postRemoveRxDatabase', {
        databaseName,
        storage
    });

    await dbInternalsStorageInstance.remove();
    return removedCollectionNames;
}

export function isRxDatabase(obj: any) {
    return obj instanceof RxDatabaseBase;
}

export function dbCount(): number {
    return DB_COUNT;
}


/**
 * Returns true if the given RxDatabase was the first
 * instance that was created on the storage with this name.
 *
 * Can be used for some optimizations because on the first instantiation,
 * we can assume that no data was written before.
 */
export async function isRxDatabaseFirstTimeInstantiated(
    database: RxDatabase
): Promise<boolean> {
    const tokenDoc = await database.storageTokenDocument;
    return tokenDoc.data.instanceToken === database.token;
}


/**
 * For better performance some tasks run async
 * and are awaited later.
 * But we still have to ensure that there have been no errors
 * on database creation.
 */
export async function ensureNoStartupErrors(
    rxDatabase: RxDatabaseBase<any, any, any, any>
) {
    await rxDatabase.storageToken;
    if (rxDatabase.startupErrors[0]) {
        throw rxDatabase.startupErrors[0];
    }
}
