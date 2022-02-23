import { IdleQueue } from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';

import type { LeaderElector } from 'broadcast-channel';
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
    RxStorageKeyObjectInstance,
    RxStorageInstance,
    BulkWriteRow,
    RxChangeEvent,
    RxDatabaseCreator,
    RxChangeEventBulk
} from './types';

import {
    pluginMissing,
    flatClone,
    PROMISE_RESOLVE_FALSE,
    randomCouchString,
    ensureNotFalsy,
    PROMISE_RESOLVE_VOID,
    getDefaultRxDocumentMeta,
    getDefaultRevision,
    createRevision
} from './util';
import {
    newRxError
} from './rx-error';
import {
    createRxSchema,
    getPrimaryFieldOfPrimaryKey
} from './rx-schema';
import { overwritable } from './overwritable';
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
    findLocalDocument,
    getAllDocuments,
    getSingleDocument,
    getWrappedKeyObjectInstance,
    INTERNAL_STORAGE_NAME,
    storageChangeEventToRxChangeEvent,
    writeSingle
} from './rx-storage-helper';
import type { RxBackupState } from './plugins/backup';
import { getPseudoSchemaForVersion } from './rx-schema-helper';
import {
    createRxCollectionStorageInstances,
    getCollectionLocalInstanceName
} from './rx-collection-helper';
import { ObliviousSet } from 'oblivious-set';

/**
 * stores the used database names
 * so we can throw when the same database is created more then once.
 */
const USED_DATABASE_NAMES: Set<string> = new Set();

let DB_COUNT = 0;

// stores information about the collections
export type InternalStoreDocumentData = {
    // primary
    collectionName: string;
    schema: RxJsonSchema<any>;
    schemaHash: string;
    version: number;
};

export class RxDatabaseBase<
    Internals, InstanceCreationOptions,
    Collections = CollectionsOfDatabase,
    > {

    /**
     * Stores the local documents which are attached to this database.
     */
    public localDocumentsStore: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions> = {} as any;

    constructor(
        public readonly name: string,
        public readonly storage: RxStorage<Internals, InstanceCreationOptions>,
        public readonly instanceCreationOptions: InstanceCreationOptions,
        public readonly password: any,
        public readonly multiInstance: boolean,
        public readonly eventReduce: boolean = false,
        public options: any = {},
        public readonly idleQueue: IdleQueue,
        /**
         * Stores information documents about the collections of the database
         */
        public readonly internalStore: RxStorageInstance<InternalStoreDocumentData, Internals, InstanceCreationOptions>,
        public readonly internalLocalDocumentsStore: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>,
        /**
         * Set if multiInstance: true
         * This broadcast channel is used to send events to other instances like
         * other browser tabs or nodejs processes.
         * We transfer everything in EventBulks because sending many small events has been shown
         * to be performance expensive.
         */
        public readonly broadcastChannel?: BroadcastChannel<RxChangeEventBulk<any>>,
    ) {
        this.collections = {} as any;
        DB_COUNT++;
    }

    get $(): Observable<RxChangeEvent<any>> {
        return this.observable$;
    }

    public readonly token: string = randomCouchString(10);
    public _subs: Subscription[] = [];
    public destroyed: boolean = false;
    public collections: Collections;
    public readonly eventBulks$: Subject<RxChangeEventBulk<any>> = new Subject();
    private observable$: Observable<RxChangeEvent<any>> = this.eventBulks$
        .pipe(
            mergeMap(changeEventBulk => changeEventBulk.events)
        );

    /**
     * Unique token that is stored with the data.
     * Used to detect if the dataset has been deleted
     * and if two RxDatabase instances work on the same dataset or not.
     */
    public storageToken?: string;

    /**
     * Contains the ids of all event bulks that have been emitted
     * by the database.
     * Used to detect duplicates that come in again via BroadcastChannel
     * or other streams.
     */
    public emittedEventBulkIds: ObliviousSet<string> = new ObliviousSet(60 * 1000);

    /**
     * removes all internal collection-info
     * only use this if you have to upgrade from a major rxdb-version
     * do NEVER use this to change the schema of a collection
     */
    async dangerousRemoveCollectionInfo(): Promise<void> {
        const allDocs = await getAllDocuments('collectionName', this.storage, this.internalStore);
        const writeData: BulkWriteRow<InternalStoreDocumentData>[] = allDocs.map(doc => {
            const deletedDoc = flatClone(doc);
            deletedDoc._deleted = true;
            deletedDoc._rev = createRevision(deletedDoc, doc);
            return {
                previous: doc,
                document: deletedDoc
            };
        });
        await this.internalStore.bulkWrite(writeData);
    }

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

        // write to socket to inform other instances about the change
        writeToSocket(this as any, changeEventBulk);
    }

    /**
     * removes the collection-doc from the internalStore
     */
    async removeCollectionDoc(name: string, schema: any): Promise<void> {
        const docId = _collectionNamePrimary(name, schema);
        const doc = await getSingleDocument(
            this.internalStore,
            docId
        );
        if (!doc) {
            throw newRxError('SNH', { name, schema });
        }
        const writeDoc = flatClone(doc);
        writeDoc._deleted = true
        writeDoc._rev = createRevision(writeDoc, doc);
        await this.lockedRun(
            () => this.internalStore.bulkWrite([{
                document: writeDoc,
                previous: doc
            }])
        );
    }

    /**
     * creates multiple RxCollections at once
     * to be much faster by saving db txs and doing stuff in bulk-operations
     * This function is not called often, but mostly in the critical path at the initial page load
     * So it must be as fast as possible.
     */
    async addCollections<CreatedCollections = Partial<Collections>>(collectionCreators: {
        [key in keyof CreatedCollections]: RxCollectionCreator
    }): Promise<{ [key in keyof CreatedCollections]: RxCollection }> {
        // get local management docs in bulk request
        const collectionDocs = await this.lockedRun(
            () => this.internalStore.findDocumentsById(
                Object
                    .keys(collectionCreators)
                    .map(name => {
                        const schema: RxJsonSchema<any> = (collectionCreators as any)[name].schema;
                        return _collectionNamePrimary(name, schema);
                    }),
                false
            )
        );

        const internalDocByCollectionName: any = {};
        Object.entries(collectionDocs).forEach(([key, doc]) => {
            internalDocByCollectionName[key] = doc;
        });

        const schemaHashByName: { [key in keyof CreatedCollections]: string } = {} as any;
        const collections = await Promise.all(
            Object.entries(collectionCreators)
                .map(([name, args]) => {
                    const useName: keyof CreatedCollections = name as any;
                    const internalDoc = internalDocByCollectionName[_collectionNamePrimary(name, collectionCreators[useName].schema)];
                    const useArgs: RxCollectionCreator & { name: keyof CreatedCollections; } = flatClone(args) as any;
                    useArgs.name = useName;
                    const schema = createRxSchema((args as RxCollectionCreator).schema);
                    schemaHashByName[useName] = schema.hash;
                    (useArgs as any).schema = schema;
                    (useArgs as any).database = this;

                    // TODO check if already exists and schema hash has changed

                    // crypt=true but no password given
                    if (
                        schema.crypt &&
                        !this.password
                    ) {
                        throw newRxError('DB7', {
                            name: name as string
                        });
                    }

                    // collection already exists
                    if ((this.collections as any)[name]) {
                        throw newRxError('DB3', {
                            name
                        });
                    }

                    // collection already exists but has different schema
                    if (internalDoc && internalDoc.schemaHash !== schemaHashByName[useName]) {
                        throw newRxError('DB6', {
                            name: name,
                            previousSchemaHash: internalDoc.schemaHash,
                            schemaHash: schemaHashByName[useName],
                            previousSchema: internalDoc.schema,
                            schema: (args as RxCollectionCreator).schema
                        });
                    }

                    // run hooks
                    const hookData: RxCollectionCreator & { name: string; } = flatClone(args) as any;
                    (hookData as any).database = this;
                    hookData.name = name;
                    runPluginHooks('preCreateRxCollection', hookData);

                    return createRxCollection(useArgs);
                })
        );

        const bulkPutDocs: BulkWriteRow<InternalStoreDocumentData>[] = [];
        const ret: { [key in keyof CreatedCollections]: RxCollection } = {} as any;
        collections.forEach(collection => {
            const name: keyof CreatedCollections = collection.name as any;
            ret[name] = collection;

            // add to bulk-docs list
            const collectionName = _collectionNamePrimary(name as any, collectionCreators[name].schema);
            if (!internalDocByCollectionName[collectionName]) {
                const docData = {
                    collectionName,
                    schemaHash: schemaHashByName[name],
                    schema: collection.schema.normalized,
                    version: collection.schema.version,
                    _rev: getDefaultRevision(),
                    _deleted: false,
                    _meta: getDefaultRxDocumentMeta(),
                    _attachments: {}
                };
                docData._rev = createRevision(docData);
                bulkPutDocs.push({
                    document: docData
                });
            }

            // set as getter to the database
            (this.collections as any)[name] = collection;
            if (!(this as any)[name]) {
                Object.defineProperty(this, name, {
                    get: () => (this.collections as any)[name]
                });
            }
        });

        // make a single write call to the storage instance
        if (bulkPutDocs.length > 0) {
            await this.lockedRun(
                () => this.internalStore.bulkWrite(bulkPutDocs)
            );
        }

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
                        .map(v => {
                            return createRxCollectionStorageInstances<any, any, any>(
                                collectionName,
                                this as any,
                                {
                                    databaseName: this.name,
                                    collectionName,
                                    schema: getPseudoSchemaForVersion<InternalStoreDocumentData>(v, 'collectionName'),
                                    options: this.instanceCreationOptions,
                                    multiInstance: this.multiInstance
                                },
                                {}
                            );
                        })
                );
            })
            // remove normal and local documents
            .then(storageInstances => {
                return Promise.all(
                    storageInstances.map(
                        instance => Promise.all([
                            instance.storageInstance.remove(),
                            instance.localDocumentsStore.remove()
                        ])
                    )
                );
            })
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
     * @param _decrypted
     * When true, all encrypted values will be decrypted.
     */
    exportJSON(_decrypted: boolean, _collections?: string[]): Promise<RxDumpDatabase<Collections>>;
    exportJSON(_decrypted?: false, _collections?: string[]): Promise<RxDumpDatabaseAny<Collections>>;
    exportJSON(_decrypted: boolean = false, _collections?: string[]): Promise<any> {
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
    public destroy(): Promise<boolean> {
        if (this.destroyed) {
            return PROMISE_RESOLVE_FALSE;
        }
        // settings destroyed = true must be the first thing to do.
        this.destroyed = true;

        runPluginHooks('preDestroyRxDatabase', this);
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

        // first wait until db is idle
        return this.requestIdlePromise()
            // destroy all collections
            .then(() => Promise.all(
                Object.keys(this.collections)
                    .map(key => (this.collections as any)[key])
                    .map(col => col.destroy())
            ))
            // destroy internal storage instances
            .then(() => this.internalStore.close())
            .then(() => this.localDocumentsStore.close())
            // close broadcastChannel if exists
            .then(() => this.broadcastChannel ? this.broadcastChannel.close() : null)
            // remove combination from USED_COMBINATIONS-map
            .then(() => USED_DATABASE_NAMES.delete(this.name))
            .then(() => true);
    }

    /**
     * deletes the database and its stored data
     */
    remove(): Promise<void> {
        return this
            .destroy()
            .then(() => removeRxDatabase(this.name, this.storage));
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
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
export async function _ensureStorageTokenExists<Collections = any>(rxDatabase: RxDatabase<Collections>): Promise<string> {
    const storageTokenDocumentId = 'storageToken';
    const storageTokenDoc = await findLocalDocument<{ value: string }>(rxDatabase.localDocumentsStore, storageTokenDocumentId, false);
    if (!storageTokenDoc) {
        const storageToken = randomCouchString(10);
        await rxDatabase.localDocumentsStore.bulkWrite([{
            document: {
                _id: storageTokenDocumentId,
                value: storageToken,
                _deleted: false,
                _meta: getDefaultRxDocumentMeta(),
                _rev: getDefaultRevision(),
                _attachments: {}

            }
        }]);
        return storageToken;
    } else {
        return storageTokenDoc.value;
    }
}

/**
 * writes the changeEvent to the broadcastChannel
 */
export function writeToSocket(
    rxDatabase: RxDatabase,
    changeEventBulk: RxChangeEventBulk<any>
): Promise<boolean> {
    if (rxDatabase.destroyed) {
        return PROMISE_RESOLVE_FALSE;
    }

    if (
        !rxDatabase.storage.statics.doesBroadcastChangestream() &&
        rxDatabase.multiInstance &&
        rxDatabase.broadcastChannel &&
        !changeEventBulk.internal &&
        rxDatabase.token === changeEventBulk.databaseToken &&
        rxDatabase.storageToken === changeEventBulk.storageToken

    ) {
        return rxDatabase.broadcastChannel
            .postMessage(changeEventBulk)
            .then(() => true);
    } else {
        return PROMISE_RESOLVE_FALSE;
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
): Promise<number[]> {
    const docs = await rxDatabase.lockedRun(
        () => getAllDocuments('collectionName', rxDatabase.storage, rxDatabase.internalStore)
    );
    const relevantDocs = docs
        .filter((doc) => {
            const name = doc.collectionName.split('-')[0];
            return name === collectionName;
        });
    return Promise.all(
        relevantDocs
            .map(
                doc => {
                    const writeDoc = flatClone(doc);
                    writeDoc._deleted = true;
                    writeDoc._rev = createRevision(writeDoc, doc);
                    return rxDatabase.lockedRun(
                        () => writeSingle(
                            rxDatabase.internalStore,
                            {
                                previous: doc,
                                document: writeDoc
                            }
                        )
                    );
                }
            )
    ).then(() => relevantDocs.map((doc: any) => doc.version));
}

function _prepareBroadcastChannel<Collections>(rxDatabase: RxDatabase<Collections>): void {
    // listen to changes from other instances that come over the BroadcastChannel
    ensureNotFalsy(rxDatabase.broadcastChannel)
        .addEventListener('message', (changeEventBulk: RxChangeEventBulk<any>) => {
            if (
                // not same storage-state
                changeEventBulk.storageToken !== rxDatabase.storageToken ||
                // this db instance was sender
                changeEventBulk.databaseToken === rxDatabase.token
            ) {
                return;
            }
            rxDatabase.$emit(changeEventBulk);
        });
}


/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
async function createRxDatabaseStorageInstances<Internals, InstanceCreationOptions>(
    storage: RxStorage<Internals, InstanceCreationOptions>,
    databaseName: string,
    options: InstanceCreationOptions,
    multiInstance: boolean
): Promise<{
    internalStore: RxStorageInstance<InternalStoreDocumentData, Internals, InstanceCreationOptions>,
    localDocumentsStore: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>
}> {
    const internalStore = await storage.createStorageInstance<InternalStoreDocumentData>(
        {
            databaseName,
            collectionName: INTERNAL_STORAGE_NAME,
            schema: getPseudoSchemaForVersion(0, 'collectionName'),
            options,
            multiInstance
        }
    );

    const localDocumentsStore = await storage.createKeyObjectStorageInstance({
        databaseName,
        collectionName: '',
        options,
        multiInstance
    });

    return {
        internalStore,
        localDocumentsStore
    };
}

/**
 * do the async things for this database
 */
async function prepare<Internals, InstanceCreationOptions, Collections>(
    rxDatabase: RxDatabaseBase<Internals, InstanceCreationOptions, Collections>
): Promise<void> {
    rxDatabase.localDocumentsStore = getWrappedKeyObjectInstance(rxDatabase as any, rxDatabase.internalLocalDocumentsStore);
    rxDatabase.storageToken = await _ensureStorageTokenExists<Collections>(rxDatabase as any);
    const localDocsSub = rxDatabase.localDocumentsStore.changeStream()
        .subscribe(eventBulk => {
            const changeEventBulk: RxChangeEventBulk<any> = {
                id: eventBulk.id,
                internal: false,
                storageToken: ensureNotFalsy(rxDatabase.storageToken),
                events: eventBulk.events.map(ev => storageChangeEventToRxChangeEvent(
                    true,
                    ev
                )),
                databaseToken: rxDatabase.token
            };
            rxDatabase.$emit(changeEventBulk);
        });
    rxDatabase._subs.push(localDocsSub);
    if (rxDatabase.multiInstance) {
        _prepareBroadcastChannel<Collections>(rxDatabase as any);
    }
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
        options = {}
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
        options
    });

    if (password) {
        overwritable.validatePassword(password);
    }

    // check if combination already used
    if (!ignoreDuplicate) {
        throwIfDatabaseNameUsed(name);
    }
    USED_DATABASE_NAMES.add(name);

    let broadcastChannel: BroadcastChannel | undefined;
    if (multiInstance) {
        broadcastChannel = new BroadcastChannel(
            'RxDB:' +
            name + ':' +
            'socket'
        );
    }

    const idleQueue = new IdleQueue();

    return createRxDatabaseStorageInstances<
        Internals,
        InstanceCreationOptions
    >(
        storage,
        name,
        instanceCreationOptions as any,
        multiInstance
    ).then(storageInstances => {
        const rxDatabase: RxDatabase<Collections> = new RxDatabaseBase(
            name,
            storage,
            instanceCreationOptions,
            password,
            multiInstance,
            eventReduce,
            options,
            idleQueue,
            storageInstances.internalStore,
            storageInstances.localDocumentsStore,
            broadcastChannel
        ) as any;
        return prepare(rxDatabase)
            .then(() => runAsyncPluginHooks('createRxDatabase', rxDatabase))
            .then(() => rxDatabase);
    });
}

/**
 * removes the database and all its known data
 */
export async function removeRxDatabase(
    databaseName: string,
    storage: RxStorage<any, any>
): Promise<any> {
    const storageInstance = await createRxDatabaseStorageInstances(
        storage,
        databaseName,
        {},
        false
    );

    const docs = await getAllDocuments('collectionName', storage, storageInstance.internalStore);
    await Promise.all(
        docs
            .map(async (colDoc) => {
                const id = colDoc.collectionName;
                const schema = colDoc.schema;
                const split = id.split('-');
                const collectionName = split[0];
                const version = parseInt(split[1], 10);
                const primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
                const [instance, localInstance] = await Promise.all([
                    storage.createStorageInstance<InternalStoreDocumentData>(
                        {
                            databaseName,
                            collectionName,
                            schema: getPseudoSchemaForVersion(version, primaryPath as any),
                            options: {},
                            multiInstance: false
                        }
                    ),
                    storage.createKeyObjectStorageInstance({
                        databaseName,
                        collectionName: getCollectionLocalInstanceName(collectionName),
                        options: {},
                        multiInstance: false
                    })
                ]);
                await Promise.all([instance.remove(), localInstance.remove()]);
            })
    );

    return Promise.all([
        storageInstance.internalStore.remove(),
        storageInstance.localDocumentsStore.remove()
    ]);
}

export function isRxDatabase(obj: any) {
    return obj instanceof RxDatabaseBase;
}

export function dbCount(): number {
    return DB_COUNT;
}
