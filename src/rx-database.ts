import { IdleQueue } from 'custom-idle-queue';
import type {
    LeaderElector,
    BroadcastChannel
} from 'broadcast-channel';
import type {
    CollectionsOfDatabase,
    RxDatabase,
    RxCollectionCreator,
    RxJsonSchema,
    RxCollection,
    ServerOptions,
    RxDumpDatabase,
    RxDumpDatabaseAny,
    AllMigrationStates,
    ServerResponse,
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
    InternalStoreCollectionDocType
} from './types';

import {
    pluginMissing,
    flatClone,
    PROMISE_RESOLVE_FALSE,
    randomCouchString,
    ensureNotFalsy,
    PROMISE_RESOLVE_VOID,
    getDefaultRevision,
    createRevision,
    getDefaultRxDocumentMeta
} from './util';
import {
    newRxError
} from './rx-error';
import {
    createRxSchema,
    RxSchema
} from './rx-schema';
import {
    runPluginHooks,
    runAsyncPluginHooks
} from './hooks';
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
} from './rx-collection';
import {
    flatCloneDocWithMeta,
    getSingleDocument,
    getWrappedStorageInstance,
    INTERNAL_STORAGE_NAME
} from './rx-storage-helper';
import type { RxBackupState } from './plugins/backup';
import {
    createRxCollectionStorageInstance
} from './rx-collection-helper';
import { ObliviousSet } from 'oblivious-set';
import {
    ensureStorageTokenDocumentExists,
    getAllCollectionDocuments,
    getPrimaryKeyOfInternalDocument,
    INTERNAL_CONTEXT_COLLECTION,
    INTERNAL_STORE_SCHEMA
} from './rx-database-internal-store';
import { BROADCAST_CHANNEL_BY_TOKEN } from './rx-storage-multiinstance';

/**
 * stores the used database names
 * so we can throw when the same database is created more then once.
 */
const USED_DATABASE_NAMES: Set<string> = new Set();

let DB_COUNT = 0;

export class RxDatabaseBase<
    Internals,
    InstanceCreationOptions,
    Collections = CollectionsOfDatabase,
    > {

    public readonly idleQueue: IdleQueue = new IdleQueue();

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
        public readonly cleanupPolicy?: Partial<RxCleanupPolicy>
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
             */
            this.storageTokenDocument = ensureStorageTokenDocumentExists(this.asRxDatabase);
            this.storageToken = this.storageTokenDocument.then(doc => doc.data.token);
        }
    }

    get $(): Observable<RxChangeEvent<any>> {
        return this.observable$;
    }

    public _subs: Subscription[] = [];
    public destroyed: boolean = false;
    public collections: Collections = {} as any;
    public readonly eventBulks$: Subject<RxChangeEventBulk<any>> = new Subject();
    private observable$: Observable<RxChangeEvent<any>> = this.eventBulks$
        .pipe(
            mergeMap(changeEventBulk => changeEventBulk.events)
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
     * TODO instead of having this here, we should add a test to ensure each RxStorage
     * behaves equal and does never emit duplicate eventBulks.
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

        // emit into own stream
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
        writeDoc._rev = createRevision(writeDoc, doc);

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
    }): Promise<{ [key in keyof CreatedCollections]: RxCollection }> {
        const jsonSchemas: { [key in keyof CreatedCollections]: RxJsonSchema<any> } = {} as any;
        const schemas: { [key in keyof CreatedCollections]: RxSchema<any> } = {} as any;
        const bulkPutDocs: BulkWriteRow<InternalStoreCollectionDocType>[] = [];
        const useArgsByCollectionName: any = {};

        Object.entries(collectionCreators).forEach(([name, args]) => {
            const collectionName: keyof CreatedCollections = name as any;
            const rxJsonSchema = (args as RxCollectionCreator<any>).schema;
            jsonSchemas[collectionName] = rxJsonSchema;
            const schema = createRxSchema(rxJsonSchema);
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
                    schemaHash: schema.hash,
                    schema: schema.jsonSchema,
                    version: schema.version
                },
                _deleted: false,
                _meta: getDefaultRxDocumentMeta(),
                _rev: getDefaultRevision(),
                _attachments: {}
            };
            collectionDocData._rev = createRevision(collectionDocData);
            bulkPutDocs.push({
                document: collectionDocData
            });

            const useArgs = Object.assign(
                {},
                args,
                {
                    name: collectionName,
                    schema,
                    database: this,

                }
            );

            // run hooks
            const hookData: RxCollectionCreator<any> & { name: string; } = flatClone(args) as any;
            (hookData as any).database = this;
            hookData.name = name;
            runPluginHooks('preCreateRxCollection', hookData);

            useArgsByCollectionName[collectionName] = useArgs;
        });

        const putDocsResult = await this.internalStore.bulkWrite(
            bulkPutDocs,
            'rx-database-add-collection'
        );

        Object.entries(putDocsResult.error).forEach(([_id, error]) => {
            const docInDb: RxDocumentData<InternalStoreCollectionDocType> = ensureNotFalsy(error.documentInDb);
            const collectionName = docInDb.data.name;
            const schema = (schemas as any)[collectionName];
            // collection already exists but has different schema
            if (docInDb.data.schemaHash !== schema.hash) {
                throw newRxError('DB6', {
                    database: this.name,
                    collection: collectionName,
                    previousSchemaHash: docInDb.data.schemaHash,
                    schemaHash: schema.hash,
                    previousSchema: docInDb.data.schema,
                    schema: ensureNotFalsy((jsonSchemas as any)[collectionName])
                });
            }
        });

        const ret: { [key in keyof CreatedCollections]: RxCollection } = {} as any;
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
     * delete all data of the collection and its previous versions
     */
    removeCollection(collectionName: string): Promise<void> {
        let destroyPromise = PROMISE_RESOLVE_VOID;
        if ((this.collections as any)[collectionName]) {
            destroyPromise = (this.collections as any)[collectionName].destroy();
        }
        // remove schemas from internal db
        return destroyPromise
            .then(() => _removeAllOfCollection(this as any, collectionName))
            // get all relevant pouchdb-instances
            .then(knownVersions => {
                return Promise.all(
                    knownVersions
                        .map(knownVersionDoc => {
                            return createRxCollectionStorageInstance(
                                this.asRxDatabase,
                                {
                                    databaseInstanceToken: this.token,
                                    databaseName: this.name,
                                    collectionName,
                                    schema: knownVersionDoc.data.schema,
                                    options: this.instanceCreationOptions,
                                    multiInstance: this.multiInstance
                                }
                            );
                        })
                );
            })
            // remove the storage instance
            .then(storageInstances => {
                return Promise.all(
                    storageInstances.map(
                        instance => instance.remove()
                    )
                );
            })
            .then(() => runAsyncPluginHooks('postRemoveRxCollection', {
                storage: this.storage,
                databaseName: this.name,
                collectionName
            }))
            .then(() => { });
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

    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<db>.exportJSON()` method.
     * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
     * since data could be encrypted.
     */
    importJSON(_exportedJSON: RxDumpDatabaseAny<Collections>): Promise<void> {
        throw pluginMissing('json-dump');
    }

    /**
     * spawn server
     */
    server(_options?: ServerOptions): Promise<ServerResponse> {
        throw pluginMissing('server');
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

    public migrationStates(): Observable<AllMigrationStates> {
        throw pluginMissing('migration');
    }

    /**
     * destroys the database-instance and all collections
     */
    public async destroy(): Promise<boolean> {
        if (this.destroyed) {
            return PROMISE_RESOLVE_FALSE;
        }

        // settings destroyed = true must be the first thing to do.
        this.destroyed = true;

        await runAsyncPluginHooks('preDestroyRxDatabase', this);
        /**
         * Complete the event stream
         * to stop all subscribers who forgot to unsubscribe.
         */
        this.eventBulks$.complete();

        DB_COUNT--;
        this._subs.map(sub => sub.unsubscribe());

        /**
         * Destroying the pseudo instance will throw
         * because stulff is missing
         * TODO we should not need the pseudo instance on runtime.
         * we should generate the property list on build time.
         */
        if (this.name === 'pseudoInstance') {
            return PROMISE_RESOLVE_FALSE;
        }

        /**
         * First wait until the database is idle
         */
        return this.requestIdlePromise()
            // destroy all collections
            .then(() => Promise.all(
                Object.keys(this.collections)
                    .map(key => (this.collections as any)[key])
                    .map(col => col.destroy())
            ))
            // destroy internal storage instances
            .then(() => this.internalStore.close())
            // close broadcastChannel if exists
            .then(() => this.broadcastChannel ? this.broadcastChannel.close() : null)
            // remove combination from USED_COMBINATIONS-map
            .then(() => USED_DATABASE_NAMES.delete(this.name))
            .then(() => true);
    }

    /**
     * deletes the database and its stored data.
     * Returns the names of all removed collections.
     */
    remove(): Promise<string[]> {
        return this
            .destroy()
            .then(() => removeRxDatabase(this.name, this.storage));
    }

    get asRxDatabase(): RxDatabase<
        {},
        Internals,
        InstanceCreationOptions
    > {
        return this as any;
    }
}

/**
 * checks if an instance with same name and adapter already exists
 * @throws {RxError} if used
 */
function throwIfDatabaseNameUsed(
    name: string
) {
    if (!USED_DATABASE_NAMES.has(name)) {
        return;
    } else {
        throw newRxError('DB8', {
            name,
            link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
        });
    }
}

/**
 * returns the primary for a given collection-data
 * used in the internal pouchdb-instances
 */
export function _collectionNamePrimary(name: string, schema: RxJsonSchema<any>) {
    return name + '-' + schema.version;
}

/**
 * removes all internal docs of a given collection
 * @return resolves all known collection-versions
 */
export async function _removeAllOfCollection(
    rxDatabase: RxDatabaseBase<any, any, any>,
    collectionName: string
): Promise<RxDocumentData<InternalStoreCollectionDocType>[]> {
    const docs = await getAllCollectionDocuments(
        rxDatabase.storage,
        rxDatabase.internalStore
    );
    const relevantDocs = docs
        .filter((colDoc) => colDoc.data.name === collectionName);
    const writeRows = relevantDocs.map(doc => {
        const writeDoc = flatCloneDocWithMeta(doc);
        writeDoc._deleted = true;
        writeDoc._rev = createRevision(writeDoc, doc);
        return {
            previous: doc,
            document: writeDoc
        };
    });
    return rxDatabase.internalStore
        .bulkWrite(
            writeRows,
            'rx-database-remove-collection-all'
        )
        .then(() => relevantDocs);
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
            password
        }
    );
    return internalStore;
}

export function createRxDatabase<
    Collections = { [key: string]: RxCollection },
    Internals = any,
    InstanceCreationOptions = any
>(
    {
        storage,
        instanceCreationOptions,
        name,
        password,
        multiInstance = true,
        eventReduce = false,
        ignoreDuplicate = false,
        options = {},
        cleanupPolicy,
        localDocuments = false
    }: RxDatabaseCreator<Internals, InstanceCreationOptions>
): Promise<
    RxDatabase<Collections, Internals, InstanceCreationOptions>
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
    // check if combination already used
    if (!ignoreDuplicate) {
        throwIfDatabaseNameUsed(name);
    }
    USED_DATABASE_NAMES.add(name);

    const databaseInstanceToken = randomCouchString(10);

    return createRxDatabaseStorageInstance<
        Internals,
        InstanceCreationOptions
    >(
        databaseInstanceToken,
        storage,
        name,
        instanceCreationOptions as any,
        multiInstance,
        password
    )
        /**
         * Creating the internal store might fail
         * if some RxStorage wrapper is used that does some checks
         * and then throw.
         * In that case we have to properly clean up the database.
         */
        .catch(err => {
            USED_DATABASE_NAMES.delete(name);
            throw err;
        })
        .then(storageInstance => {
            const rxDatabase: RxDatabase<Collections> = new RxDatabaseBase(
                name,
                databaseInstanceToken,
                storage,
                instanceCreationOptions,
                password,
                multiInstance,
                eventReduce,
                options,
                storageInstance,
                cleanupPolicy
            ) as any;
            return runAsyncPluginHooks('createRxDatabase', {
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
            }).then(() => rxDatabase);
        });
}

/**
 * Removes the database and all its known data
 * with all known collections and all internal meta data.
 * 
 * Returns the names of the removed collections.
 */
export async function removeRxDatabase(
    databaseName: string,
    storage: RxStorage<any, any>
): Promise<string[]> {
    const databaseInstanceToken = randomCouchString(10);
    const dbInternalsStorageInstance = await createRxDatabaseStorageInstance(
        databaseInstanceToken,
        storage,
        databaseName,
        {},
        false
    );

    const collectionDocs = await getAllCollectionDocuments(
        storage,
        dbInternalsStorageInstance
    );

    const removedCollectionNames: string[] = [];
    await Promise.all(
        collectionDocs
            .map(async (colDoc) => {
                const schema = colDoc.data.schema;
                const collectionName = colDoc.data.name;
                removedCollectionNames.push(collectionName);
                const storageInstance = await storage.createStorageInstance<any>(
                    {
                        databaseInstanceToken,
                        databaseName,
                        collectionName,
                        schema,
                        options: {},
                        multiInstance: false
                    }
                );
                await storageInstance.remove();
            })
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
