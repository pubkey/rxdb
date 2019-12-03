import randomToken from 'random-token';
import IdleQueue from 'custom-idle-queue';
import { BroadcastChannel } from 'broadcast-channel';

import {
    adapterObject,
    hash,
    promiseWait,
    pluginMissing
} from './util';
import {
    newRxError
} from './rx-error';
import {
    createRxSchema
} from './rx-schema';
import {
    isInstanceOf as isInstanceOfRxChangeEvent,
    createChangeEvent,
    changeEventfromJSON
} from './rx-change-event';
import overwritable from './overwritable';
import {
    runPluginHooks
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
    validateCouchDBString,
    isLevelDown
} from './pouch-db';

import {
    create as createRxCollection
} from './rx-collection';
import {
    RxChangeEvent
} from './rx-change-event';
import {
    CollectionsOfDatabase,
    RxChangeEventInsert,
    RxChangeEventUpdate,
    RxChangeEventRemove,
    PouchDBInstance,
    RxChangeEventCollection,
    RxDatabase,
    RxCollectionCreator,
    RxJsonSchema,
    RxCollection,
    PouchSettings,
    ServerOptions,
    RxDatabaseCreator,
    RxDatabaseGenerated
} from './types';

/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 */
const USED_COMBINATIONS: { [k: string]: any[] } = {};

let DB_COUNT = 0;

export class RxDatabaseBase<Collections = CollectionsOfDatabase> {

    constructor(
        public name: string,
        public adapter: any,
        public password: any,
        public multiInstance: boolean,
        public queryChangeDetection: boolean = false,
        public options: any = {},
        public pouchSettings: PouchSettings
    ) {
        this.collections = {} as any;
        if (typeof name !== 'undefined') DB_COUNT++;
    }
    get leaderElector() {
        if (!this._leaderElector)
            this._leaderElector = overwritable.createLeaderElector(this as any);
        return this._leaderElector;
    }

    get isLeader(): boolean {
        if (!this.multiInstance) return true;
        return this.leaderElector.isLeader;
    }

    get $(): Observable<
        RxChangeEventInsert<any> |
        RxChangeEventUpdate<any> |
        RxChangeEventRemove<any> |
        RxChangeEventCollection
    > {
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
    public _adminPouch: PouchDBInstance = {} as PouchDBInstance;

    public _collectionsPouch: PouchDBInstance = {} as PouchDBInstance;

    private _leaderElector?: any;
    /**
     * removes all internal collection-info
     * only use this if you have to upgrade from a major rxdb-version
     * do NEVER use this to change the schema of a collection
     */
    dangerousRemoveCollectionInfo(): Promise<void> {
        const colPouch: any = this._collectionsPouch;
        return colPouch.allDocs()
            .then((docsRes: any) => {
                return Promise.all(
                    docsRes.rows
                        .map((row: any) => ({
                            _id: row.key,
                            _rev: row.value.rev
                        }))
                        .map((doc: any) => colPouch.remove(doc._id, doc._rev))
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
        return _spawnPouchDB(
            this.name, this.adapter,
            collectionName, schemaVersion,
            pouchSettings, this.pouchSettings
        );
    }

    /**
     * returns a promise which resolves when the instance becomes leader
     */
    waitForLeadership(): Promise<boolean> {
        if (!this.multiInstance) return Promise.resolve(true);
        return this.leaderElector.waitForLeadership();
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
        if (changeEvent.data.it === this.token) {
            writeToSocket(this as any, changeEvent);
        }
    }

    /**
     * removes the collection-doc from this._collectionsPouch
     */
    removeCollectionDoc(name: string, schema: any): Promise<void> {
        const docId = _collectionNamePrimary(name, schema);
        return (this._collectionsPouch as any)
            .get(docId)
            .then((doc: any) => this.lockedRun(
                () => (this._collectionsPouch as any).remove(doc)
            ));
    }

    /**
     * create or fetch a collection
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
        if (typeof args === 'string')
            return Promise.resolve(this.collections[args]);

        args = Object.assign({}, args);

        (args as any).database = this;

        runPluginHooks('preCreateRxCollection', args);

        if (args.name.charAt(0) === '_') {
            throw newRxError('DB2', {
                name: args.name
            });
        }
        if ((this.collections as any)[args.name]) {
            throw newRxError('DB3', {
                name: args.name
            });
        }
        if (!args.schema) {
            throw newRxError('DB4', {
                name: args.name,
                args
            });
        }

        const internalPrimary = _collectionNamePrimary(args.name, args.schema);

        // check unallowed collection-names
        if (properties().includes(args.name)) {
            throw newRxError('DB5', {
                name: args.name
            });
        }

        const schema = createRxSchema(args.schema);
        args.schema = schema as any;

        // check schemaHash
        const schemaHash = schema.hash;

        let colDoc: any;
        let col: any;
        return this.lockedRun(
            () => (this._collectionsPouch as any).get(internalPrimary)
        )
            .catch(() => null)
            .then((collectionDoc: any) => {
                colDoc = collectionDoc;

                if (collectionDoc && collectionDoc.schemaHash !== schemaHash) {
                    // collection already exists with different schema, check if it has documents
                    const pouch = this._spawnPouchDB(args.name, args.schema.version, args.pouchSettings);
                    return pouch.find({
                        selector: {
                            _id: {}
                        },
                        limit: 1
                    }).then(oneDoc => {
                        if (oneDoc.docs.length !== 0) {
                            // we have one document
                            throw newRxError('DB6', {
                                name: args.name,
                                previousSchemaHash: collectionDoc.schemaHash,
                                schemaHash
                            });
                        }
                        return collectionDoc;
                    });
                } else return collectionDoc;
            })
            .then(() => createRxCollection(args as any))
            .then((collection: any) => {
                col = collection;
                if (
                    Object.keys(collection.schema.encryptedPaths).length > 0 &&
                    !this.password
                ) {
                    throw newRxError('DB7', {
                        name: args.name
                    });
                }

                if (!colDoc) {
                    return this.lockedRun(
                        () => (this._collectionsPouch as any).put({
                            _id: internalPrimary,
                            schemaHash,
                            schema: collection.schema.normalized,
                            version: collection.schema.version
                        })
                    ).catch(() => { });
                }
            })
            .then(() => {
                const cEvent = createChangeEvent(
                    'RxDatabase.collection',
                    this as any,
                    col
                );
                cEvent.data.v = col.name;
                cEvent.data.col = '_collections';

                (this.collections as any)[args.name] = col;

                if (!(this as any)[args.name]) {
                    Object.defineProperty(this, args.name, {
                        get: () => (this.collections as any)[args.name]
                    });
                }

                this.$emit(cEvent);

                return col;
            });
    }

    /**
     * delete all data of the collection and its previous versions
     */
    removeCollection(collectionName: string): Promise<string[]> {
        if ((this.collections as any)[collectionName])
            (this.collections as any)[collectionName].destroy();

        // remove schemas from internal db
        return _removeAllOfCollection(this as any, collectionName)
            // get all relevant pouchdb-instances
            .then(knownVersions => knownVersions
                .map(v => this._spawnPouchDB(collectionName, v)))
            // remove documents
            .then(pouches => Promise.all(
                pouches.map(pouch => this.lockedRun(
                    () => pouch.destroy()
                ))
            ));
    }


    /**
     * runs the given function between idleQueue-locking
     */
    lockedRun(fun: any): any {
        return this.idleQueue.wrapCall(fun);
    }

    requestIdlePromise() {
        return this.idleQueue.requestIdlePromise();
    }

    /**
     * export to json
     */
    dump(_decrypted: boolean = false, _collections?: string[]): string[] | null {
        throw pluginMissing('json-dump');
    }

    /**
     * import json
     */
    importDump(_json: any): Promise<any> {
        throw pluginMissing('json-dump');
    }

    /**
     * spawn server
     */
    server(_options?: ServerOptions): {
        app: any;
        server: any;
    } {
        throw pluginMissing('server');
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

        if (this._leaderElector)
            this._leaderElector.destroy();

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
            .then(() => removeDatabase(this.name, this.adapter));
    }
}


/**
 * returns all possible properties of a RxDatabase-instance
 */
let _properties: any = null;
export function properties(): string[] {
    if (!_properties) {
        const pseudoInstance: RxDatabaseBase = new (RxDatabaseBase as any)();
        const ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        const prototypeProperties = Object.getOwnPropertyNames(
            Object.getPrototypeOf(pseudoInstance)
        );
        _properties = [...ownProperties, ...prototypeProperties];
    }
    return _properties;
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
 * validates and inserts the password-hash
 * to ensure there is/was no other instance with a different password
 */
export function _preparePasswordHash(
    rxDatabase: RxDatabase
): Promise<boolean> {
    if (!rxDatabase.password) return Promise.resolve(false);

    const pwHash = hash(rxDatabase.password);

    return (rxDatabase._adminPouch as any).get('_local/pwHash')
        .catch(() => null)
        .then((pwHashDoc: any) => {

            /**
             * if pwHash was not saved, we save it,
             * this operation might throw because another instance runs save at the same time,
             * also we do not await the output because it does not mather
             */
            if (!pwHashDoc) {
                (rxDatabase._adminPouch as any).put({
                    _id: '_local/pwHash',
                    value: pwHash
                }).catch(() => null);
            }

            // different hash was already set by other instance
            if (pwHashDoc && rxDatabase.password && pwHash !== pwHashDoc.value) {
                return rxDatabase.destroy().then(() => {
                    throw newRxError('DB1', {
                        passwordHash: hash(rxDatabase.password),
                        existingPasswordHash: pwHashDoc.value
                    });
                });
            }
            return true;
        });
}


/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
export function _ensureStorageTokenExists(rxDatabase: RxDatabase): Promise<string> {
    return (rxDatabase._adminPouch as any).get('_local/storageToken')
        .catch(() => {
            // no doc exists -> insert
            return (rxDatabase._adminPouch as any).put({
                _id: '_local/storageToken',
                value: randomToken(10)
            })
                .catch(() => { })
                .then(() => promiseWait(0));
        })
        .then(() => (rxDatabase._adminPouch as any).get('_local/storageToken'))
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

        const socketDoc = changeEvent.toJSON();
        delete socketDoc.db;
        const sendOverChannel = {
            db: rxDatabase.token, // database-token
            st: rxDatabase.storageToken, // storage-token
            d: socketDoc
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
        () => (rxDatabase._collectionsPouch as any).allDocs({
            include_docs: true
        })
    ).then((data: any) => {
        const relevantDocs = data.rows
            .map((row: any) => row.doc)
            .filter((doc: any) => {
                const name = doc._id.split('-')[0];
                return name === collectionName;
            });
        return Promise.all(
            relevantDocs
                .map((doc: any) => rxDatabase.lockedRun(
                    () => (rxDatabase._collectionsPouch as any).remove(doc)
                ))
        ).then(() => relevantDocs.map((doc: any) => doc.version));
    });
}

function _prepareBroadcastChannel(rxDatabase: RxDatabase) {
    // broadcastChannel
    rxDatabase.broadcastChannel = new BroadcastChannel(
        'RxDB:' +
        rxDatabase.name + ':' +
        'socket'
    );
    rxDatabase.broadcastChannel$ = new Subject();
    rxDatabase.broadcastChannel.onmessage = msg => {
        if (msg.st !== rxDatabase.storageToken) return; // not same storage-state
        if (msg.db === rxDatabase.token) return; // same db
        const changeEvent = changeEventfromJSON(msg.d);
        (rxDatabase.broadcastChannel$ as any).next(changeEvent);
    };


    // TODO only subscribe when sth is listening to the event-chain
    rxDatabase._subs.push(
        rxDatabase.broadcastChannel$.subscribe(cE => {
            rxDatabase.$emit(cE);
        })
    );
}

/**
 * do the async things for this database
 */
function prepare(rxDatabase: RxDatabase): Promise<void> {
    rxDatabase._adminPouch = _internalAdminPouch(rxDatabase.name, rxDatabase.adapter, rxDatabase.pouchSettings);
    rxDatabase._collectionsPouch = _internalCollectionsPouch(rxDatabase.name, rxDatabase.adapter, rxDatabase.pouchSettings);

    // ensure admin-pouch is useable
    return rxDatabase._adminPouch.info().then(() => {
        // validate/insert password-hash
        return Promise.all([
            _ensureStorageTokenExists(rxDatabase),
            _preparePasswordHash(rxDatabase)
        ]);
    }).then(([storageToken]) => {
        rxDatabase.storageToken = storageToken;
        if (rxDatabase.multiInstance) {
            _prepareBroadcastChannel(rxDatabase);
        }
    });
}

export function create<Collections = { [key: string]: RxCollection }>({
    name,
    adapter,
    password,
    multiInstance = true,
    queryChangeDetection = false,
    ignoreDuplicate = false,
    options = {},
    pouchSettings = {}
}: RxDatabaseCreator): Promise<RxDatabase<Collections>> {
    validateCouchDBString(name);

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
    if (!USED_COMBINATIONS[name])
        USED_COMBINATIONS[name] = [];
    USED_COMBINATIONS[name].push(adapter);

    const db = new RxDatabaseBase(
        name,
        adapter,
        password,
        multiInstance,
        queryChangeDetection,
        options,
        pouchSettings
    );

    return prepare(db as any)
        .then(() => {
            runPluginHooks('createRxDatabase', db);
            return db;
        }) as any;
}

export function getPouchLocation(
    dbName: string,
    collectionName: string,
    schemaVersion: number
) {
    const prefix = dbName + '-rxdb-' + schemaVersion + '-';
    if (!collectionName.includes('/')) {
        return prefix + collectionName;
    } else {
        // if collectionName is a path, we have to prefix the last part only
        const split = collectionName.split('/');
        const last = split.pop();

        let ret = split.join('/');
        ret += '/' + prefix + last;
        return ret;
    }
}

function _spawnPouchDB(
    dbName: string,
    adapter: any,
    collectionName: string,
    schemaVersion: number,
    pouchSettings: PouchSettings = {},
    pouchSettingsFromRxDatabaseCreator: PouchSettings = {}
): PouchDBInstance {
    const pouchLocation = getPouchLocation(dbName, collectionName, schemaVersion);
    const pouchDbParameters = {
        location: pouchLocation,
        adapter: adapterObject(adapter),
        settings: pouchSettings
    };
    const pouchDBOptions = Object.assign({},
        pouchDbParameters.adapter,
        pouchSettingsFromRxDatabaseCreator,
        pouchDbParameters.settings
    );
    runPluginHooks('preCreatePouchDb', pouchDbParameters);
    return new PouchDB(
        pouchDbParameters.location,
        pouchDBOptions
    ) as any;
}

function _internalAdminPouch(
    name: string,
    adapter: any,
    pouchSettingsFromRxDatabaseCreator: PouchSettings = {}
) {
    return _spawnPouchDB(
        name,
        adapter,
        '_admin',
        0, {
        // no compaction because this only stores local documents
        auto_compaction: false,
        revs_limit: 1
    },
        pouchSettingsFromRxDatabaseCreator
    );
}

function _internalCollectionsPouch(
    name: string,
    adapter: any,
    pouchSettingsFromRxDatabaseCreator: PouchSettings = {}
) {
    return _spawnPouchDB(
        name,
        adapter,
        '_collections', 0,
        {
            // no compaction because this only stores local documents
            auto_compaction: false,
            revs_limit: 1
        },
        pouchSettingsFromRxDatabaseCreator
    );
}

/**
 * removes the database and all its known data
 */
export function removeDatabase(
    databaseName: string,
    adapter: any
): Promise<any> {
    const adminPouch = _internalAdminPouch(databaseName, adapter);
    const collectionsPouch = _internalCollectionsPouch(databaseName, adapter);

    return collectionsPouch.allDocs({
        include_docs: true
    })
        // remove collections
        .then(collectionsData => Promise.all(
            collectionsData.rows
                .map((colDoc: any) => colDoc.id)
                .map((id: string) => {
                    const split = id.split('-');
                    const name = split[0];
                    const version = parseInt(split[1], 10);
                    const pouch = _spawnPouchDB(databaseName, adapter, name, version);
                    return pouch.destroy();
                })
        ))
        // remove internals
        .then(() => Promise.all([
            collectionsPouch.destroy(),
            adminPouch.destroy()
        ]));
}

/**
 * check is the given adapter can be used
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
    create,
    removeDatabase,
    checkAdapter,
    isInstanceOf,
    RxDatabaseBase,
    dbCount
};
