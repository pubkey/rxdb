import randomToken from 'random-token';
import { IdleQueue } from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';

import type { LeaderElector } from './plugins/leader-election';
import type {
    CollectionsOfDatabase,
    PouchDBInstance,
    RxDatabase,
    RxCollectionCreator,
    RxJsonSchema,
    RxCollection,
    PouchSettings,
    ServerOptions,
    RxDatabaseCreator,
    RxDumpDatabase,
    RxDumpDatabaseAny,
    RxCollectionCreatorBase
} from './types';

import {
    promiseWait,
    pluginMissing,
    LOCAL_PREFIX,
    flatClone
} from './util';
import {
    newRxError
} from './rx-error';
import {
    createRxSchema
} from './rx-schema';
import {
    isInstanceOf as isInstanceOfRxChangeEvent,
    RxChangeEventBroadcastChannelData
} from './rx-change-event';
import { overwritable } from './overwritable';
import {
    runPluginHooks, runAsyncPluginHooks
} from './hooks';
import {
    Subject,
    Subscription,
    Observable
} from 'rxjs';
import {
    filter
} from 'rxjs/operators';

import {
    PouchDB,
    isLevelDown
} from './pouch-db';

import {
    create as createRxCollection
} from './rx-collection';
import {
    RxChangeEvent
} from './rx-change-event';
import { RxStorage } from './rx-storate.interface';
import { getRxStoragePouchDb } from './rx-storage-pouchdb';
import { getAllDocuments, deleteStorageInstance } from './rx-database-internal-store';

/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 */
const USED_COMBINATIONS: { [k: string]: any[] } = {};

let DB_COUNT = 0;

export class RxDatabaseBase<
    Collections = CollectionsOfDatabase,
    RxStorageInstance = PouchDBInstance
    > {

    public storage: RxStorage;
    public internalStore: RxStorageInstance = {} as RxStorageInstance;

    constructor(
        public name: string,
        public adapter: any,
        public password: any,
        public multiInstance: boolean,
        public eventReduce: boolean = false,
        public options: any = {},
        public pouchSettings: PouchSettings,
    ) {
        this.storage = getRxStoragePouchDb(adapter, pouchSettings);
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
    private observable$: Observable<RxChangeEvent> = this.subject.asObservable()
        .pipe(
            filter(cEvent => isInstanceOfRxChangeEvent(cEvent))
        );
    public broadcastChannel?: BroadcastChannel;
    public storageToken?: string;
    public broadcastChannel$?: Subject<RxChangeEvent>;

    /**
     * removes all internal collection-info
     * only use this if you have to upgrade from a major rxdb-version
     * do NEVER use this to change the schema of a collection
     */
    dangerousRemoveCollectionInfo(): Promise<void> {
        return getAllDocuments(this.internalStore as any)
            .then((docsRes: any) => {
                return Promise.all(
                    docsRes
                        .map((row: any) => ({
                            _id: row.key,
                            _rev: row.value.rev
                        }))
                        .map((doc: any) => (this.internalStore as any).remove(doc._id, doc._rev))
                );
            }) as any;
    }

    /**
     * spawns a new pouch-instance
     */
    _spawnPouchDB(
        collectionName: string,
        schemaVersion: number,
        pouchSettings: PouchSettings = {}
    ): PouchDBInstance {
        return this.storage.createStorageInstance(
            this.name,
            collectionName,
            schemaVersion,
            {
                pouchSettings
            }
        );
    }

    /**
     * This is the main handle-point for all change events
     * ChangeEvents created by this instance go:
     * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
     * ChangeEvents created by other instances go:
     * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
     */
    $emit(changeEvent: RxChangeEvent) {
        if (!changeEvent) return;

        // emit into own stream
        this.subject.next(changeEvent);

        // write to socket if event was created by this instance
        if (changeEvent.databaseToken === this.token) {
            writeToSocket(this as any, changeEvent);
        }
    }

    /**
     * removes the collection-doc from this._collectionsPouch
     */
    removeCollectionDoc(name: string, schema: any): Promise<void> {
        const docId = _collectionNamePrimary(name, schema);
        return (this.internalStore as any)
            .get(docId)
            .then((doc: any) => this.lockedRun(
                () => (this.internalStore as any).remove(doc)
            ));
    }

    /**
     * creates multiple RxCollections at once
     * to be much faster by saving db txs and doing stuff in bulk-operations
     * This function is not called often, but mostly in the critical path at the initial page load
     * So it must be as fast as possible
     */
    async addCollections(collectionCreators: {
        // TODO instead of [name: string] only allow keyof Collections
        [name: string]: RxCollectionCreatorBase
    }): Promise<{ [key: string]: RxCollection }> {
        const pouch: PouchDBInstance = this.internalStore as any;

        // get local management docs in bulk request
        const result = await pouch.allDocs({
            include_docs: true,
            keys: Object.keys(collectionCreators).map(name => _collectionNamePrimary(name, collectionCreators[name].schema))
        });
        const internalDocByCollectionName: any = {};
        result.rows.forEach(row => {
            if (!row.error) {
                internalDocByCollectionName[row.key] = row.doc;
            }
        });

        const schemaHashByName: { [k: string]: string } = {};
        const collections = await Promise.all(
            Object.entries(collectionCreators).map(([name, args]) => {
                const internalDoc = internalDocByCollectionName[_collectionNamePrimary(name, collectionCreators[name].schema)];
                const useArgs: RxCollectionCreator = flatClone(args) as any;
                useArgs.name = name;
                const schema = createRxSchema(args.schema);
                schemaHashByName[name] = schema.hash;
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
                if (internalDoc && internalDoc.schemaHash !== schemaHashByName[name]) {
                    throw newRxError('DB6', {
                        name: name,
                        previousSchemaHash: internalDoc.schemaHash,
                        schemaHash: schemaHashByName[name]
                    });
                }

                // run hooks
                const hookData: RxCollectionCreator = flatClone(args) as any;
                (hookData as any).database = this;
                hookData.name = name;
                runPluginHooks('preCreateRxCollection', hookData);

                return createRxCollection(useArgs, !!internalDoc);
            })
        );

        const bulkPutDocs: any[] = [];
        const ret: { [key: string]: RxCollection } = {};
        collections.forEach(collection => {
            const name = collection.name;
            ret[name] = collection;
            if (
                collection.schema.crypt &&
                !this.password
            ) {
                throw newRxError('DB7', {
                    name
                });
            }

            // add to bulk-docs list
            if (!internalDocByCollectionName[name]) {
                bulkPutDocs.push({
                    _id: _collectionNamePrimary(name, collectionCreators[name].schema),
                    schemaHash: schemaHashByName[name],
                    schema: collection.schema.normalized,
                    version: collection.schema.version
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
            await pouch.bulkDocs({
                docs: bulkPutDocs,
            });
        }

        return ret;
    }

    /**
     * create or fetch a collection
     * @deprecated use addCollections() instead, it is faster and better typed
     */
    collection<
        RxDocumentType = any,
        OrmMethods = {},
        StaticMethods = { [key: string]: any }
    >(args: RxCollectionCreator): Promise<
        RxCollection<
            RxDocumentType,
            OrmMethods,
            StaticMethods
        >
    > {
        if (typeof args === 'string') {
            return Promise.resolve(this.collections[args]);
        }

        // collection() is deprecated, call new bulk-creation method
        return this.addCollections({
            [args.name]: args
        }).then(colObject => {
            return colObject[args.name] as any;
        });
    }

    /**
     * delete all data of the collection and its previous versions
     */
    removeCollection(collectionName: string): Promise<void> {
        if ((this.collections as any)[collectionName])
            (this.collections as any)[collectionName].destroy();

        // remove schemas from internal db
        return _removeAllOfCollection(this as any, collectionName)
            // get all relevant pouchdb-instances
            .then(knownVersions => knownVersions
                .map(v => this._spawnPouchDB(collectionName, v)))
            // remove documents
            .then(pouches => {
                return Promise.all(
                    pouches.map(
                        pouch => this.lockedRun(
                            () => pouch.destroy()
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
    dump(_decrypted: boolean, _collections?: string[]): Promise<RxDumpDatabase<Collections>>;
    dump(_decrypted?: false, _collections?: string[]): Promise<RxDumpDatabaseAny<Collections>>;
    dump(_decrypted: boolean = false, _collections?: string[]): Promise<any> {
        throw pluginMissing('json-dump');
    }

    /**
     * Import the parsed JSON export into the collection.
     * @param _exportedJSON The previously exported data from the `<db>.dump()` method.
     * @note When an interface is loaded in this collection all base properties of the type are typed as `any`
     * since data could be encrypted.
     */
    importDump(_exportedJSON: RxDumpDatabaseAny<Collections>): Promise<void> {
        throw pluginMissing('json-dump');
    }

    /**
     * spawn server
     */
    server(_options?: ServerOptions): {
        app: any;
        pouchApp: any;
        server: any;
    } {
        throw pluginMissing('server');
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

    /**
     * destroys the database-instance and all collections
     */
    public destroy(): Promise<boolean> {
        if (this.destroyed) return Promise.resolve(false);
        runPluginHooks('preDestroyRxDatabase', this);
        DB_COUNT--;
        this.destroyed = true;

        if (this.broadcastChannel) {
            /**
             * The broadcast-channel gets closed lazy
             * to ensure that all pending change-events
             * get emitted
             */
            setTimeout(() => (this.broadcastChannel as any).close(), 1000);
        }

        this._subs.map(sub => sub.unsubscribe());

        // destroy all collections
        return Promise.all(Object.keys(this.collections)
            .map(key => (this.collections as any)[key])
            .map(col => col.destroy())
        )
            // remove combination from USED_COMBINATIONS-map
            .then(() => _removeUsedCombination(this.name, this.adapter))
            .then(() => true);
    }

    /**
     * deletes the database and its stored data
     */
    remove(): Promise<void> {
        return this
            .destroy()
            .then(() => removeRxDatabase(this.name, this.adapter));
    }
}

/**
 * checks if an instance with same name and adapter already exists
 * @throws {RxError} if used
 */
function _isNameAdapterUsed(
    name: string,
    adapter: any
) {
    if (!USED_COMBINATIONS[name])
        return false;

    let used = false;
    USED_COMBINATIONS[name].forEach(ad => {
        if (ad === adapter)
            used = true;
    });
    if (used) {
        throw newRxError('DB8', {
            name,
            adapter,
            link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
        });
    }
}

function _removeUsedCombination(name: string, adapter: any) {
    if (!USED_COMBINATIONS[name])
        return;

    const index = USED_COMBINATIONS[name].indexOf(adapter);
    USED_COMBINATIONS[name].splice(index, 1);
}

/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
export function _ensureStorageTokenExists(rxDatabase: RxDatabase): Promise<string> {
    return rxDatabase.internalStore.get(LOCAL_PREFIX + 'storageToken')
        .catch(() => {
            // no doc exists -> insert
            return rxDatabase.internalStore.put({
                _id: LOCAL_PREFIX + 'storageToken',
                value: randomToken(10)
            })
                .catch(() => { })
                .then(() => promiseWait(0));
        })
        .then(() => rxDatabase.internalStore.get(LOCAL_PREFIX + 'storageToken'))
        .then((storageTokenDoc2: any) => storageTokenDoc2.value);
}

/**
 * writes the changeEvent to the broadcastChannel
 */
export function writeToSocket(
    rxDatabase: RxDatabase,
    changeEvent: RxChangeEvent
): Promise<boolean> {
    if (
        rxDatabase.multiInstance &&
        !changeEvent.isIntern() &&
        rxDatabase.broadcastChannel
    ) {
        const sendOverChannel: RxChangeEventBroadcastChannelData = {
            cE: changeEvent.toJSON(),
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
export function _collectionNamePrimary(name: string, schema: RxJsonSchema) {
    return name + '-' + schema.version;
}

/**
 * removes all internal docs of a given collection
 * @return resolves all known collection-versions
 */
export function _removeAllOfCollection(
    rxDatabase: RxDatabase,
    collectionName: string
): Promise<number[]> {
    return rxDatabase.lockedRun(
        () => getAllDocuments(rxDatabase.internalStore)
    ).then((data: any) => {
        const relevantDocs = data
            .map((row: any) => row.doc)
            .filter((doc: any) => {
                const name = doc._id.split('-')[0];
                return name === collectionName;
            });
        return Promise.all(
            relevantDocs
                .map((doc: any) => rxDatabase.lockedRun(
                    () => (rxDatabase.internalStore as any).remove(doc)
                ))
        ).then(() => relevantDocs.map((doc: any) => doc.version));
    });
}

function _prepareBroadcastChannel(rxDatabase: RxDatabase): void {
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
        const changeEvent = new RxChangeEvent(
            msg.cE.operation,
            msg.cE.documentId,
            msg.cE.documentData,
            msg.cE.databaseToken,
            msg.cE.collectionName,
            msg.cE.isLocal,
            msg.cE.startTime,
            msg.cE.endTime,
            msg.cE.previousData
        );
        (rxDatabase.broadcastChannel$ as any).next(changeEvent);
    };


    // TODO only subscribe when something is listening to the event-chain
    rxDatabase._subs.push(
        rxDatabase.broadcastChannel$.subscribe(cE => {
            rxDatabase.$emit(cE);
        })
    );
}

/**
 * do the async things for this database
 */
function prepare(rxDatabase: RxDatabase<any>): Promise<void> {
    return rxDatabase.storage
        .createInternalStorageInstance(
            rxDatabase.name
        )
        .then((internalStore: any) => {
            rxDatabase.internalStore = internalStore;
            return _ensureStorageTokenExists(rxDatabase);
        })
        .then((storageToken: string) => {
            rxDatabase.storageToken = storageToken;
            if (rxDatabase.multiInstance) {
                _prepareBroadcastChannel(rxDatabase);
            }
        });
}

export function createRxDatabase<Collections = { [key: string]: RxCollection }>({
    name,
    adapter,
    password,
    multiInstance = true,
    eventReduce = false,
    ignoreDuplicate = false,
    options = {},
    pouchSettings = {}
}: RxDatabaseCreator): Promise<RxDatabase<Collections>> {

    runPluginHooks('preCreateRxDatabase', {
        name,
        adapter,
        password,
        multiInstance,
        eventReduce,
        ignoreDuplicate,
        options,
        pouchSettings
    });

    // check if pouchdb-adapter
    if (typeof adapter === 'string') {
        // TODO make a function hasAdapter()
        if (!(PouchDB as any).adapters || !(PouchDB as any).adapters[adapter]) {
            throw newRxError('DB9', {
                adapter
            });
        }
    } else {
        isLevelDown(adapter);
        if (!(PouchDB as any).adapters || !(PouchDB as any).adapters.leveldb) {
            throw newRxError('DB10', {
                adapter
            });
        }
    }

    if (password) {
        overwritable.validatePassword(password);
    }

    // check if combination already used
    if (!ignoreDuplicate) {
        _isNameAdapterUsed(name, adapter);
    }

    // add to used_map
    if (!USED_COMBINATIONS[name]) {
        USED_COMBINATIONS[name] = [];
    }
    USED_COMBINATIONS[name].push(adapter);

    const rxDatabase: RxDatabase<Collections> = new RxDatabaseBase(
        name,
        adapter,
        password,
        multiInstance,
        eventReduce,
        options,
        pouchSettings
    ) as any;

    return prepare(rxDatabase)
        .then(() => runAsyncPluginHooks('createRxDatabase', rxDatabase))
        .then(() => rxDatabase);
}

/**
 * removes the database and all its known data
 */
export function removeRxDatabase(
    databaseName: string,
    adapter: any
): Promise<any> {
    const storage = getRxStoragePouchDb(adapter);

    return storage.createInternalStorageInstance(
        databaseName
    ).then(internalStore => {

        return getAllDocuments(internalStore)
            .then(docs => {
                // remove collections storages
                return Promise.all(
                    docs
                        .map((colDoc: any) => colDoc.id)
                        .map((id: string) => {
                            const split = id.split('-');
                            const name = split[0];
                            const version = parseInt(split[1], 10);
                            const instance = storage.createStorageInstance(
                                databaseName,
                                name,
                                version
                            );
                            return instance.destroy();
                        })
                );
            })
            // remove internals
            .then(() => deleteStorageInstance(internalStore));
    });
}

/**
 * check if the given adapter can be used
 */
export function checkAdapter(adapter: any): Promise<boolean> {
    return overwritable.checkAdapter(adapter);
}

export function isInstanceOf(obj: any) {
    return obj instanceof RxDatabaseBase;
}

export function dbCount(): number {
    return DB_COUNT;
}

export default {
    createRxDatabase,
    removeRxDatabase,
    checkAdapter,
    isInstanceOf,
    RxDatabaseBase,
    dbCount
};
