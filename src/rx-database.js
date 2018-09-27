import randomToken from 'random-token';
import IdleQueue from 'custom-idle-queue';
import BroadcastChannel from 'broadcast-channel';

import PouchDB from './pouch-db';
import {
    adapterObject,
    hash,
    validateCouchDBString,
    isLevelDown
} from './util';
import RxError from './rx-error';
import RxCollection from './rx-collection';
import RxSchema from './rx-schema';
import RxChangeEvent from './rx-change-event';
import overwritable from './overwritable';
import {
    runPluginHooks
} from './hooks';

import {
    Subject
} from 'rxjs';
import {
    filter
} from 'rxjs/operators';

/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 * @type {Object<string, array>} map with {dbName -> array<adapters>}
 */
const USED_COMBINATIONS = {};

let DB_COUNT = 0;

export class RxDatabase {
    constructor(name, adapter, password, multiInstance, queryChangeDetection, options, pouchSettings) {
        if (typeof name !== 'undefined') DB_COUNT++;
        this.name = name;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;
        this.queryChangeDetection = queryChangeDetection;
        this.options = options;
        this.pouchSettings = pouchSettings;
        this.idleQueue = new IdleQueue();
        this.token = randomToken(10);

        this._subs = [];
        this.destroyed = false;


        // cache for collection-objects
        this.collections = {};

        // rx
        this.subject = new Subject();
        this.observable$ = this.subject.asObservable().pipe(
            filter(cEvent => RxChangeEvent.isInstanceOf(cEvent))
        );
    }

    dangerousRemoveCollectionInfo() {
        const colPouch = this._collectionsPouch;
        return colPouch.allDocs()
            .then(docsRes => {
                return Promise.all(
                    docsRes.rows
                    .map(row => ({
                        _id: row.key,
                        _rev: row.value.rev
                    }))
                    .map(doc => colPouch.remove(doc._id, doc._rev))
                );
            });
    }

    get leaderElector() {
        if (!this._leaderElector)
            this._leaderElector = overwritable.createLeaderElector(this);
        return this._leaderElector;
    }

    /**
     * spawns a new pouch-instance
     * @param {string} collectionName
     * @param {string} schemaVersion
     * @param {Object} [pouchSettings={}] pouchSettings
     * @type {Object}
     */
    _spawnPouchDB(collectionName, schemaVersion, pouchSettings = {}) {
        return _spawnPouchDB(this.name, this.adapter, collectionName, schemaVersion, pouchSettings, this.pouchSettings);
    }

    get isLeader() {
        if (!this.multiInstance) return true;
        return this.leaderElector.isLeader;
    }

    /**
     * @return {Promise}
     */
    waitForLeadership() {
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
    $emit(changeEvent) {
        if (!changeEvent) return;

        // emit into own stream
        this.subject.next(changeEvent);

        // write to socket if event was created by this instance
        if (changeEvent.data.it === this.token) {
            writeToSocket(this, changeEvent);
        }
    }

    /**
     * @return {Observable} observable
     */
    get $() {
        return this.observable$;
    }

    /**
     * removes the collection-doc from this._collectionsPouch
     * @return {Promise}
     */
    removeCollectionDoc(name, schema) {
        const docId = _collectionNamePrimary(name, schema);
        return this
            ._collectionsPouch
            .get(docId)
            .then(doc => this.lockedRun(
                () => this._collectionsPouch.remove(doc)
            ));
    }

    /**
     * create or fetch a collection
     * @param {{name: string, schema: Object, pouchSettings = {}, migrationStrategies = {}}} args
     * @return {Collection}
     */
    async collection(args) {
        if (typeof args === 'string') return this.collections[args];

        args.database = this;

        runPluginHooks('preCreateRxCollection', args);

        if (args.name.charAt(0) === '_') {
            throw RxError.newRxError('DB2', {
                name: args.name
            });
        }
        if (this.collections[args.name]) {
            throw RxError.newRxError('DB3', {
                name: args.name
            });
        }
        if (!args.schema) {
            throw RxError.newRxError('DB4', {
                name: args.name,
                args
            });
        }

        const internalPrimary = _collectionNamePrimary(args.name, args.schema);

        // check unallowed collection-names
        if (properties().includes(args.name)) {
            throw RxError.newRxError('DB5', {
                name: args.name
            });
        }

        args.schema = RxSchema.create(args.schema);

        // check schemaHash
        const schemaHash = args.schema.hash;
        let collectionDoc = null;
        try {
            collectionDoc = await this.lockedRun(
                () => this._collectionsPouch.get(internalPrimary)
            );
        } catch (e) {}

        if (collectionDoc && collectionDoc.schemaHash !== schemaHash) {
            // collection already exists with different schema, check if it has documents
            const pouch = this._spawnPouchDB(args.name, args.schema.version, args.pouchSettings);
            const oneDoc = await pouch.find({
                selector: {
                    _id: {}
                },
                limit: 1
            });
            if (oneDoc.docs.length !== 0) {
                // we have one document
                throw RxError.newRxError('DB6', {
                    name: args.name,
                    previousSchemaHash: collectionDoc.schemaHash,
                    schemaHash
                });
            }
        }

        const collection = await RxCollection.create(args);

        if (
            Object.keys(collection.schema.encryptedPaths).length > 0 &&
            !this.password
        ) {
            throw RxError.newRxError('DB7', {
                name: args.name
            });
        }

        if (!collectionDoc) {
            try {
                await this.lockedRun(
                    () => this._collectionsPouch.put({
                        _id: internalPrimary,
                        schemaHash,
                        schema: collection.schema.normalized,
                        version: collection.schema.version
                    })
                );
            } catch (e) {}
        }

        const cEvent = RxChangeEvent.create(
            'RxDatabase.collection',
            this
        );
        cEvent.data.v = collection.name;
        cEvent.data.col = '_collections';
        this.$emit(cEvent);

        this.collections[args.name] = collection;
        this.__defineGetter__(args.name, () => this.collections[args.name]);

        return collection;
    }

    /**
     * delete all data of the collection and its previous versions
     * @param  {string}  collectionName
     * @return {Promise}
     */
    async removeCollection(collectionName) {
        if (this.collections[collectionName])
            await this.collections[collectionName].destroy();

        // remove schemas from internal db
        const knownVersions = await _removeAllOfCollection(this, collectionName);
        // get all relevant pouchdb-instances
        const pouches = knownVersions
            .map(v => this._spawnPouchDB(collectionName, v));

        // remove documents
        return Promise.all(
            pouches.map(pouch => this.lockedRun(
                () => pouch.destroy()
            ))
        );
    }


    /**
     * runs the given function between idleQueue-locking
     * @return {any}
     */
    lockedRun(fun) {
        return this.idleQueue.wrapCall(fun);
    }

    requestIdlePromise() {
        return this.idleQueue.requestIdlePromise();
    }

    /**
     * export to json
     * @param {boolean} decrypted
     * @param {?string[]} collections array with collectionNames or null if all
     */
    dump() {
        throw RxError.pluginMissing('json-dump');
    }

    /**
     * import json
     * @param {Object} dump
     */
    importDump() {
        throw RxError.pluginMissing('json-dump');
    }

    /**
     * spawn server
     */
    server() {
        throw RxError.pluginMissing('server');
    }

    /**
     * destroys the database-instance and all collections
     * @return {Promise}
     */
    async destroy() {
        if (this.destroyed) return;
        runPluginHooks('preDestroyRxDatabase', this);
        DB_COUNT--;
        this.destroyed = true;

        if (this.broadcastChannel) {
            /**
             * The broadcast-channel gets closed lazy
             * to ensure that all pending change-events
             * get emitted
             */
            setTimeout(() => this.broadcastChannel.close(), 1000);
        }

        if (this._leaderElector)
            await this._leaderElector.destroy();
        this._subs.map(sub => sub.unsubscribe());

        // destroy all collections
        await Promise.all(Object.keys(this.collections)
            .map(key => this.collections[key])
            .map(col => col.destroy())
        );


        // remove combination from USED_COMBINATIONS-map
        _removeUsedCombination(this.name, this.adapter);
    }

    /**
     * deletes the database and its stored data
     * @return {Promise}
     */
    remove() {
        return this
            .destroy()
            .then(() => removeDatabase(this.name, this.adapter));
    }
}


/**
 * returns all possible properties of a RxDatabase-instance
 * @return {string[]} property-names
 */
let _properties = null;
export function properties() {
    if (!_properties) {
        const pseudoInstance = new RxDatabase();
        const ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        const prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
        _properties = [...ownProperties, ...prototypeProperties];
    }
    return _properties;
}

/**
 * checks if an instance with same name and adapter already exists
 * @param       {string}  name
 * @param       {any}  adapter
 * @throws {RxError} if used
 */
function _isNameAdapterUsed(name, adapter) {
    if (!USED_COMBINATIONS[name])
        return false;

    let used = false;
    USED_COMBINATIONS[name].forEach(ad => {
        if (ad === adapter)
            used = true;
    });
    if (used) {
        throw RxError.newRxError('DB8', {
            name,
            adapter,
            link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
        });
    }
}

function _removeUsedCombination(name, adapter) {
    if (!USED_COMBINATIONS[name])
        return;

    const index = USED_COMBINATIONS[name].indexOf(adapter);
    USED_COMBINATIONS[name].splice(index, 1);
}

/**
 * validates and inserts the password-hash
 * to ensure there is/was no other instance with a different password
 */
export async function _preparePasswordHash(rxDatabase) {
    if (!rxDatabase.password) return false;

    const pwHash = hash(rxDatabase.password);

    let pwHashDoc = null;
    try {
        pwHashDoc = await rxDatabase._adminPouch.get('_local/pwHash');
    } catch (e) {}


    /**
     * if pwHash was not saved, we save it,
     * this operation might throw because another instance runs save at the same time,
     * also we do not await the output because it does not mather
     */
    if (!pwHashDoc) {
        rxDatabase._adminPouch.put({
            _id: '_local/pwHash',
            value: pwHash
        }).catch(() => null);
    }

    // different hash was already set by other instance
    if (pwHashDoc && rxDatabase.password && pwHash !== pwHashDoc.value) {
        throw RxError.newRxError('DB1', {
            passwordHash: hash(rxDatabase.password),
            existingPasswordHash: pwHashDoc.value
        });
    }

    return true;
}


/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */
export async function _ensureStorageTokenExists(rxDatabase) {
    try {
        await rxDatabase._adminPouch.get('_local/storageToken');
    } catch (err) {
        // no doc exists -> insert
        try {
            await rxDatabase._adminPouch.put({
                _id: '_local/storageToken',
                value: randomToken(10)
            });
        } catch (err2) {}
        await new Promise(res => setTimeout(res, 0));
    }
    const storageTokenDoc2 = await rxDatabase._adminPouch.get('_local/storageToken');
    return storageTokenDoc2.value;
}

/**
 * writes the changeEvent to the broadcastChannel
 * @param  {RxChangeEvent} changeEvent
 * @return {Promise<boolean>}
 */
export function writeToSocket(rxDatabase, changeEvent) {
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
        return rxDatabase.broadcastChannel.postMessage(sendOverChannel);
    } else
        return Promise.resolve(false);
}

/**
 * returns the primary for a given collection-data
 * used in the internal pouchdb-instances
 * @param {string} name
 * @param {RxSchema} schema
 */
export function _collectionNamePrimary(name, schema) {
    return name + '-' + schema.version;
}

/**
 * removes all internal docs of a given collection
 * @param  {string}  collectionName
 * @return {Promise<string[]>} resolves all known collection-versions
 */
export function _removeAllOfCollection(rxDatabase, collectionName) {

    return rxDatabase.lockedRun(
        () => rxDatabase._collectionsPouch.allDocs({
            include_docs: true
        })
    ).then(data => {
        const relevantDocs = data.rows
            .map(row => row.doc)
            .filter(doc => {
                const name = doc._id.split('-')[0];
                return name === collectionName;
            });
        return Promise.all(
            relevantDocs
            .map(doc => rxDatabase.lockedRun(
                () => rxDatabase._collectionsPouch.remove(doc)
            ))
        ).then(() => relevantDocs.map(doc => doc.version));
    });
}

function _prepareBroadcastChannel(rxDatabase) {
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
        const changeEvent = RxChangeEvent.fromJSON(msg.d);
        rxDatabase.broadcastChannel$.next(changeEvent);
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
async function prepare(rxDatabase) {
    rxDatabase._adminPouch = _internalAdminPouch(rxDatabase.name, rxDatabase.adapter, rxDatabase.pouchSettings);
    rxDatabase._collectionsPouch = _internalCollectionsPouch(rxDatabase.name, rxDatabase.adapter, rxDatabase.pouchSettings);

    // ensure admin-pouch is useable
    await rxDatabase._adminPouch.info();

    // validate/insert password-hash
    const [
        storageToken
    ] = await Promise.all([
        _ensureStorageTokenExists(rxDatabase),
        _preparePasswordHash(rxDatabase)
    ]);
    rxDatabase.storageToken = storageToken;

    if (rxDatabase.multiInstance) {
        _prepareBroadcastChannel(rxDatabase);
    }
}


export function create({
    name,
    adapter,
    password,
    multiInstance = true,
    queryChangeDetection = false,
    ignoreDuplicate = false,
    options = {},
    pouchSettings = {}
}) {
    validateCouchDBString(name);

    // check if pouchdb-adapter
    if (typeof adapter === 'string') {
        if (!PouchDB.adapters || !PouchDB.adapters[adapter]) {
            throw RxError.newRxError('DB9', {
                adapter
            });
        }
    } else {
        isLevelDown(adapter);
        if (!PouchDB.adapters || !PouchDB.adapters.leveldb) {
            throw RxError.newRxError('DB10', {
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


    const db = new RxDatabase(
        name,
        adapter,
        password,
        multiInstance,
        queryChangeDetection,
        options,
        pouchSettings
    );

    return prepare(db)
        .then(() => {
            runPluginHooks('createRxDatabase', db);
            return db;
        });
}



export function getPouchLocation(dbName, collectionName, schemaVersion) {
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

function _spawnPouchDB(dbName, adapter, collectionName, schemaVersion, pouchSettings = {}, pouchSettingsFromRxDatabaseCreator = {}) {
    const pouchLocation = getPouchLocation(dbName, collectionName, schemaVersion);
    const pouchDbParameters = {
        location: pouchLocation,
        adapter: adapterObject(adapter),
        settings: pouchSettings
    };
    const pouchDBOptions = Object.assign({}, pouchDbParameters.adapter, pouchSettingsFromRxDatabaseCreator);
    runPluginHooks('preCreatePouchDb', pouchDbParameters);
    return new PouchDB(
        pouchDbParameters.location,
        pouchDBOptions,
        pouchDbParameters.settings
    );
}

function _internalAdminPouch(name, adapter, pouchSettingsFromRxDatabaseCreator = {}) {
    return _spawnPouchDB(name, adapter, '_admin', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    }, pouchSettingsFromRxDatabaseCreator);
}

function _internalCollectionsPouch(name, adapter, pouchSettingsFromRxDatabaseCreator = {}) {
    return _spawnPouchDB(name, adapter, '_collections', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    }, pouchSettingsFromRxDatabaseCreator);
}

/**
 *
 * @return {Promise}
 */
export async function removeDatabase(databaseName, adapter) {
    const adminPouch = _internalAdminPouch(databaseName, adapter);
    const collectionsPouch = _internalCollectionsPouch(databaseName, adapter);

    const collectionsData = await collectionsPouch.allDocs({
        include_docs: true
    });

    // remove collections
    await Promise.all(
        collectionsData.rows
        .map(colDoc => colDoc.id)
        .map(id => {
            const split = id.split('-');
            const name = split[0];
            const version = parseInt(split[1], 10);
            const pouch = _spawnPouchDB(databaseName, adapter, name, version);
            return pouch.destroy();
        })
    );

    // remove internals
    return Promise.all([
        collectionsPouch.destroy(),
        adminPouch.destroy()
    ]);
}

/**
 * check is the given adapter can be used
 * @return {Promise}
 */
export function checkAdapter(adapter) {
    return overwritable.checkAdapter(adapter);
}

export function isInstanceOf(obj) {
    return obj instanceof RxDatabase;
}

export function dbCount() {
    return DB_COUNT;
}

export default {
    create,
    removeDatabase,
    checkAdapter,
    isInstanceOf,
    RxDatabase,
    RxSchema,
    dbCount
};
