import randomToken from 'random-token';
import { IdleQueue } from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';

import type { LeaderElector } from './plugins/leader-election';
import type {
    CollectionsOfDatabase,
    RxDatabase,
    RxCollectionCreator,
    RxJsonSchema,
    RxCollection,
    ServerOptions,
    RxDatabaseCreator,
    RxDumpDatabase,
    RxDumpDatabaseAny,
    AllMigrationStates,
    ServerResponse,
    BackupOptions,
    RxStorage,
    RxStorageKeyObjectInstance,
    RxStorageInstance,
    BulkWriteRow,
    RxChangeEvent
} from './types';

import {
    pluginMissing,
    flatClone
} from './util';
import {
    newRxError
} from './rx-error';
import {
    createRxSchema,
    getPseudoSchemaForVersion
} from './rx-schema';
import {
    isRxChangeEventIntern,
    RxChangeEventBroadcastChannelData
} from './rx-change-event';
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
    createRxCollection
} from './rx-collection';
import {
    findLocalDocument,
    getAllDocuments,
    getSingleDocument,
    INTERNAL_STORAGE_NAME,
    storageChangeEventToRxChangeEvent,
    writeSingle
} from './rx-storage-helper';
import type { RxBackupState } from './plugins/backup';

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
     * Stores information documents about the collections of the database
     */
    public internalStore: RxStorageInstance<InternalStoreDocumentData, Internals, InstanceCreationOptions> = {} as any;
    /**
     * Stores the local documents which are attached to this database.
     */
    public localDocumentsStore: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions> = {} as any;

    constructor(
        public name: string,
        public storage: RxStorage<Internals, InstanceCreationOptions>,
        public instanceCreationOptions: InstanceCreationOptions,
        public password: any,
        public multiInstance: boolean,
        public eventReduce: boolean = false,
        public options: any = {},
    ) {
        this.collections = {} as any;
        DB_COUNT++;
    }

    get $(): Observable<RxChangeEvent<any>> {
        return this.observable$;
    }

    public idleQueue: IdleQueue = new IdleQueue();
    public readonly token: string = randomToken(10);
    public _subs: Subscription[] = [];
    public destroyed: boolean = false;
    public collections: Collections;
    private subject: Subject<RxChangeEvent> = new Subject();
    private observable$: Observable<RxChangeEvent> = this.subject.asObservable();
    public broadcastChannel?: BroadcastChannel;
    public storageToken?: string;
    public broadcastChannel$?: Subject<RxChangeEvent>;

    /**
     * removes all internal collection-info
     * only use this if you have to upgrade from a major rxdb-version
     * do NEVER use this to change the schema of a collection
     */
    async dangerousRemoveCollectionInfo(): Promise<void> {
        const allDocs = await getAllDocuments(this.internalStore);
        const writeData: BulkWriteRow<InternalStoreDocumentData>[] = allDocs.map(doc => {
            const deletedDoc = flatClone(doc);
            deletedDoc._deleted = true;
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
    $emit(changeEvent: RxChangeEvent) {

        // emit into own stream
        this.subject.next(changeEvent);

        // write to socket if event was created by this instance
        if (changeEvent.databaseToken === this.token) {
            writeToSocket(this as any, changeEvent);
        }
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
            throw newRxError('SNH');
        }
        const writeDoc = flatClone(doc);
        writeDoc._deleted = true;
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
        const collectionDocs = await this.internalStore.findDocumentsById(
            Object.keys(collectionCreators)
                .map(name => {
                    const schema: RxJsonSchema<any> = (collectionCreators as any)[name].schema;
                    return _collectionNamePrimary(name, schema);
                })
        );

        const internalDocByCollectionName: any = {};
        Array.from(collectionDocs.entries()).forEach(([key, doc]) => {
            internalDocByCollectionName[key] = doc;
        });

        const schemaHashByName: { [key in keyof CreatedCollections]: string } = {} as any;
        const collections = await Promise.all(
            Object.entries(collectionCreators).map(([name, args]) => {
                const useName: keyof CreatedCollections = name as any;
                const internalDoc = internalDocByCollectionName[_collectionNamePrimary(name, collectionCreators[useName].schema)];
                const useArgs: RxCollectionCreator & { name: keyof CreatedCollections; } = flatClone(args) as any;
                useArgs.name = useName;
                const schema = createRxSchema((args as RxCollectionCreator).schema);
                schemaHashByName[useName] = schema.hash;
                (useArgs as any).schema = schema;
                (useArgs as any).database = this;

                // TODO check if already exists and schema hash has changed

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
                        schemaHash: schemaHashByName[useName]
                    });
                }

                // run hooks
                const hookData: RxCollectionCreator & { name: string; } = flatClone(args) as any;
                (hookData as any).database = this;
                hookData.name = name;
                runPluginHooks('preCreateRxCollection', hookData);

                return createRxCollection(useArgs, !!internalDoc);
            })
        );

        const bulkPutDocs: BulkWriteRow<InternalStoreDocumentData>[] = [];
        const ret: { [key in keyof CreatedCollections]: RxCollection } = {} as any;
        collections.forEach(collection => {
            const name: keyof CreatedCollections = collection.name as any;
            ret[name] = collection;
            if (
                collection.schema.crypt &&
                !this.password
            ) {
                throw newRxError('DB7', {
                    name: name as string
                });
            }

            // add to bulk-docs list
            if (!internalDocByCollectionName[name]) {
                bulkPutDocs.push({
                    document: {
                        collectionName: _collectionNamePrimary(name as any, collectionCreators[name].schema),
                        schemaHash: schemaHashByName[name],
                        schema: collection.schema.normalized,
                        version: collection.schema.version,
                        _attachments: {}
                    }
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

        // make a single call to the pouchdb instance
        if (bulkPutDocs.length > 0) {
            await this.internalStore.bulkWrite(bulkPutDocs);
        }

        return ret;
    }

    /**
     * delete all data of the collection and its previous versions
     */
    removeCollection(collectionName: string): Promise<void> {
        if ((this.collections as any)[collectionName]) {
            (this.collections as any)[collectionName].destroy();
        }

        // remove schemas from internal db
        return _removeAllOfCollection(this as any, collectionName)
            // get all relevant pouchdb-instances
            .then(knownVersions => {
                return Promise.all(
                    knownVersions
                        .map(v => {
                            return this.storage.createStorageInstance(
                                {
                                    databaseName: this.name,
                                    collectionName,
                                    schema: getPseudoSchemaForVersion<InternalStoreDocumentData>(v, 'collectionName'),
                                    options: this.instanceCreationOptions
                                }
                            );
                        })
                );
            })
            // remove documents
            .then(storageInstance => {
                return Promise.all(
                    storageInstance.map(
                        instance => this.lockedRun(
                            () => instance.remove()
                        )
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
        if (this.destroyed) return Promise.resolve(false);
        runPluginHooks('preDestroyRxDatabase', this);
        DB_COUNT--;
        this.destroyed = true;

        this._subs.map(sub => sub.unsubscribe());

        // first wait until db is idle
        return this.requestIdlePromise()
            // destroy all collections
            .then(() => Promise.all(
                Object.keys(this.collections)
                    .map(key => (this.collections as any)[key])
                    .map(col => col.destroy())
            ))
            // destroy internal storage instances
            .then(() => this.internalStore.close ? this.internalStore.close() : null)
            // close broadcastChannel if exists
            .then(() => this.broadcastChannel ? this.broadcastChannel.close() : Promise.resolve())
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
    const storageTokenDoc = await findLocalDocument<{ value: string }>(rxDatabase.localDocumentsStore, storageTokenDocumentId);
    if (!storageTokenDoc) {
        const storageToken = randomToken(10);
        await rxDatabase.localDocumentsStore.bulkWrite([{
            document: {
                _id: storageTokenDocumentId,
                value: storageToken,
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
    changeEvent: RxChangeEvent
): Promise<boolean> {
    if (rxDatabase.destroyed) {
        return Promise.resolve(false);
    }

    if (
        rxDatabase.multiInstance &&
        !isRxChangeEventIntern(changeEvent) &&
        rxDatabase.broadcastChannel
    ) {
        const sendOverChannel: RxChangeEventBroadcastChannelData = {
            cE: changeEvent,
            storageToken: rxDatabase.storageToken as string
        };
        return rxDatabase.broadcastChannel
            .postMessage(sendOverChannel)
            .then(() => true);
    } else
        return Promise.resolve(false);
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
        () => getAllDocuments(rxDatabase.internalStore)
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
    // broadcastChannel
    rxDatabase.broadcastChannel = new BroadcastChannel(
        'RxDB:' +
        rxDatabase.name + ':' +
        'socket'
    );
    rxDatabase.broadcastChannel$ = new Subject();
    rxDatabase.broadcastChannel.onmessage = (msg: RxChangeEventBroadcastChannelData) => {
        if (msg.storageToken !== rxDatabase.storageToken) return; // not same storage-state
        if (msg.cE.databaseToken === rxDatabase.token) return; // same db
        const changeEvent = msg.cE;

        (rxDatabase.broadcastChannel$ as any).next(changeEvent);
    };

    rxDatabase._subs.push(
        rxDatabase.broadcastChannel$.subscribe((cE: RxChangeEvent) => {
            rxDatabase.$emit(cE);
        })
    );
}


/**
 * Creates the storage instances that are used internally in the database
 * to store schemas and other configuration stuff.
 */
async function createRxDatabaseStorageInstances<Internals, InstanceCreationOptions>(
    storage: RxStorage<Internals, InstanceCreationOptions>,
    databaseName: string,
    options: InstanceCreationOptions
): Promise<{
    internalStore: RxStorageInstance<InternalStoreDocumentData, Internals, InstanceCreationOptions>,
    localDocumentsStore: RxStorageKeyObjectInstance<Internals, InstanceCreationOptions>
}> {
    const internalStore = await storage.createStorageInstance<InternalStoreDocumentData>(
        {
            databaseName,
            collectionName: INTERNAL_STORAGE_NAME,
            schema: getPseudoSchemaForVersion(0, 'collectionName'),
            options
        }
    );

    const localDocumentsStore = await storage.createKeyObjectStorageInstance(
        databaseName,
        // TODO having to set an empty string here is ugly.
        // we should change the rx-storage interface to account for non-collection storage instances.
        '',
        options
    );

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
    const storageInstances = await createRxDatabaseStorageInstances<
        Internals,
        InstanceCreationOptions
    >(
        rxDatabase.storage,
        rxDatabase.name,
        rxDatabase.instanceCreationOptions
    );

    rxDatabase.internalStore = storageInstances.internalStore as any;
    rxDatabase.localDocumentsStore = storageInstances.localDocumentsStore as any;

    const localDocsSub = rxDatabase.localDocumentsStore.changeStream().subscribe(
        rxStorageChangeEvent => {
            rxDatabase.$emit(
                storageChangeEventToRxChangeEvent(
                    true,
                    rxStorageChangeEvent,
                    rxDatabase as any
                )
            );
        }
    );
    rxDatabase._subs.push(localDocsSub);

    rxDatabase.storageToken = await _ensureStorageTokenExists<Collections>(rxDatabase as any);
    if (rxDatabase.multiInstance) {
        _prepareBroadcastChannel<Collections>(rxDatabase as any);
    }
}

export function createRxDatabase<
    Collections = { [key: string]: RxCollection },
    Internals = any,
    InstanceCreationOptions = any,
    >({
        storage,
        instanceCreationOptions,
        name,
        password,
        multiInstance = true,
        eventReduce = false,
        ignoreDuplicate = false,
        options = {}
    }: RxDatabaseCreator<Internals, InstanceCreationOptions>): Promise<RxDatabase<Collections, Internals, InstanceCreationOptions>> {

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

    const rxDatabase: RxDatabase<Collections> = new RxDatabaseBase(
        name,
        storage,
        instanceCreationOptions,
        password,
        multiInstance,
        eventReduce,
        options,
    ) as any;

    return prepare(rxDatabase)
        .then(() => runAsyncPluginHooks('createRxDatabase', rxDatabase))
        .then(() => rxDatabase);
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
        {}
    );

    const docs = await getAllDocuments(storageInstance.internalStore);
    await Promise.all(
        docs
            .map(colDoc => colDoc.collectionName)
            .map(async (id: string) => {
                const split = id.split('-');
                const name = split[0];
                const version = parseInt(split[1], 10);
                const instance = await storage.createStorageInstance<InternalStoreDocumentData>(
                    {
                        databaseName,
                        collectionName: name,
                        schema: getPseudoSchemaForVersion(version, 'collectionName'),
                        options: {}
                    }
                );
                return instance.remove();
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
