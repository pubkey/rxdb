import randomToken from 'random-token';
import IdleQueue from 'custom-idle-queue';

import PouchDB from './pouch-db';
import * as util from './util';
import RxError from './rx-error';
import RxCollection from './rx-collection';
import RxSchema from './rx-schema';
import RxChangeEvent from './rx-change-event';
import Socket from './socket';
import overwritable from './overwritable';
import {
    runPluginHooks
} from './hooks';

import {
    Subject
} from 'rxjs/Subject';
import {
    filter
} from 'rxjs/operators/filter';

/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 * @type {Object<string, array>} map with {dbName -> array<adapters>}
 */
const USED_COMBINATIONS = {};

let DB_COUNT = 0;

export class RxDatabase {
    constructor(name, adapter, password, multiInstance, options) {
        if (typeof name !== 'undefined') DB_COUNT++;
        this.name = name;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;
        this.options = options;
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

    get _adminPouch() {
        if (!this.__adminPouch)
            this.__adminPouch = _internalAdminPouch(this.name, this.adapter);
        return this.__adminPouch;
    }

    get _collectionsPouch() {
        if (!this.__collectionsPouch)
            this.__collectionsPouch = _internalCollectionsPouch(this.name, this.adapter);
        return this.__collectionsPouch;
    }

    /**
     * do the async things for this database
     */
    async prepare() {
        // validate/insert password-hash
        if (this.password) {
            // ensure admin-pouch is useable
            await this.lockedRun(
                () => this._adminPouch.info()
            );

            let pwHashDoc = null;
            try {
                pwHashDoc = await this.lockedRun(
                    () => this._adminPouch.get('_local/pwHash')
                );
            } catch (e) {}
            if (!pwHashDoc) {
                try {
                    await this.lockedRun(
                        () => this._adminPouch.put({
                            _id: '_local/pwHash',
                            value: util.hash(this.password)
                        })
                    );
                } catch (e) {}
            }
            if (pwHashDoc && this.password && util.hash(this.password) !== pwHashDoc.value) {
                throw RxError.newRxError('DB1', {
                    passwordHash: util.hash(this.password),
                    existingPasswordHash: pwHashDoc.value
                });
            }
        }

        if (this.multiInstance) {
            // socket
            this.socket = await Socket.create(this);

            // TODO only subscribe when sth is listening to the event-chain
            this._subs.push(
                this.socket.messages$.subscribe(cE => this.$emit(cE))
            );
        }
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
        return _spawnPouchDB(this.name, this.adapter, collectionName, schemaVersion, pouchSettings);
    }

    get isLeader() {
        if (!this.multiInstance) return true;
        return this.leaderElector.isLeader;
    }
    async waitForLeadership() {
        if (!this.multiInstance) return true;
        return this.leaderElector.waitForLeadership();
    }

    /**
     * writes the changeEvent to the socket
     * @param  {RxChangeEvent} changeEvent
     * @return {Promise<boolean>}
     */
    writeToSocket(changeEvent) {
        if (
            this.multiInstance &&
            !changeEvent.isIntern() &&
            this.socket
        ) {
            return this
                .socket
                .write(changeEvent)
                .then(() => true);
        } else
            return Promise.resolve(false);
    }

    /**
     * throw a new event into the event-cicle
     */
    $emit(changeEvent) {
        if (!changeEvent) return;

        // throw in own cycle
        this.subject.next(changeEvent);

        // write to socket if event was created by self
        if (changeEvent.data.it === this.token)
            this.writeToSocket(changeEvent);
    }

    /**
     * @return {Observable} observable
     */
    get $() {
        return this.observable$;
    }

    /**
     * returns the primary for a given collection-data
     * used in the internal pouchdb-instances
     * @param {string} name
     * @param {RxSchema} schema
     */
    _collectionNamePrimary(name, schema) {
        return name + '-' + schema.version;
    }

    /**
     * removes the collection-doc from this._collectionsPouch
     * @return {Promise}
     */
    removeCollectionDoc(name, schema) {
        const docId = this._collectionNamePrimary(name, schema);
        return this
            ._collectionsPouch
            .get(docId)
            .then(doc => this.lockedRun(
                () => this._collectionsPouch.remove(doc)
            ));
    }

    /**
     * removes all internal docs of a given collection
     * @param  {string}  collectionName
     * @return {Promise<string[]>} resolves all known collection-versions
     */
    async _removeAllOfCollection(collectionName) {
        const data = await this.lockedRun(
            () => this._collectionsPouch.allDocs({
                include_docs: true
            })
        );
        const relevantDocs = data.rows
            .map(row => row.doc)
            .filter(doc => {
                const name = doc._id.split('-')[0];
                return name === collectionName;
            });
        await Promise.all(
            relevantDocs
            .map(doc => this.lockedRun(
                () => this._collectionsPouch.remove(doc)
            ))
        );
        return relevantDocs.map(doc => doc.version);
    }

    /**
     * create or fetch a collection
     * @param {{name: string, schema: Object, pouchSettings = {}, migrationStrategies = {}}} args
     * @return {Collection}
     */
    async collection(args) {
        if (typeof args === 'string') return this.collections[args];

        args.database = this;

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

        if (!RxSchema.isInstanceOf(args.schema))
            args.schema = RxSchema.create(args.schema);

        const internalPrimary = this._collectionNamePrimary(args.name, args.schema);

        // check unallowed collection-names
        if (properties().includes(args.name)) {
            throw RxError.newRxError('DB5', {
                name: args.name
            });
        }

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
                    language: {
                        $ne: 'query'
                    }
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
        const knownVersions = await this._removeAllOfCollection(collectionName);
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
     * destroys the database-instance and all collections
     * @return {Promise}
     */
    async destroy() {
        if (this.destroyed) return;
        DB_COUNT--;
        this.destroyed = true;
        this.socket && await this.socket.destroy();
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

export async function create({
    name,
    adapter,
    password,
    multiInstance = true,
    ignoreDuplicate = false,
    options = {}
}) {
    util.validateCouchDBString(name);

    // check if pouchdb-adapter
    if (typeof adapter === 'string') {
        if (!PouchDB.adapters || !PouchDB.adapters[adapter]) {
            throw RxError.newRxError('DB9', {
                adapter
            });
        }
    } else {
        util.isLevelDown(adapter);
        if (!PouchDB.adapters || !PouchDB.adapters.leveldb) {
            throw RxError.newRxError('DB10', {
                adapter
            });
        }
    }

    if (password)
        overwritable.validatePassword(password);

    // check if combination already used
    if (!ignoreDuplicate)
        _isNameAdapterUsed(name, adapter);

    // add to used_map
    if (!USED_COMBINATIONS[name])
        USED_COMBINATIONS[name] = [];
    USED_COMBINATIONS[name].push(adapter);


    const db = new RxDatabase(name, adapter, password, multiInstance, options);
    await db.prepare();

    runPluginHooks('createRxDatabase', db);
    return db;
}


function _spawnPouchDB(dbName, adapter, collectionName, schemaVersion, pouchSettings = {}) {
    const pouchLocation = dbName + '-rxdb-' + schemaVersion + '-' + collectionName;
    const pouchDbParameters = {
        location: pouchLocation,
        adapter: util.adapterObject(adapter),
        settings: pouchSettings
    };
    runPluginHooks('preCreatePouchDb', pouchDbParameters);
    return new PouchDB(
        pouchDbParameters.location,
        pouchDbParameters.adapter,
        pouchDbParameters.settings
    );
}

function _internalAdminPouch(name, adapter) {
    return _spawnPouchDB(name, adapter, '_admin', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    });
}

function _internalCollectionsPouch(name, adapter) {
    return _spawnPouchDB(name, adapter, '_collections', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    });
}

export async function removeDatabase(databaseName, adapter) {
    const adminPouch = _internalAdminPouch(databaseName, adapter);
    const socketPouch = _spawnPouchDB(databaseName, adapter, '_socket', 0);
    const collectionsPouch = _internalCollectionsPouch(databaseName, adapter);
    const collectionsData = await collectionsPouch.allDocs({
        include_docs: true
    });

    // remove collections
    Promise.all(
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
    await Promise.all([
        collectionsPouch.destroy(),
        adminPouch.destroy(),
        socketPouch.destroy()
    ]);
}

/**
 * check is the given adapter can be used
 */
export async function checkAdapter(adapter) {
    return await overwritable.checkAdapter(adapter);
};

export function isInstanceOf(obj) {
    return obj instanceof RxDatabase;
}

export function dbCount() {
    return DB_COUNT;
}

// TODO is this needed?
export {
    RxSchema as RxSchema
};

export default {
    create,
    removeDatabase,
    checkAdapter,
    isInstanceOf,
    RxDatabase,
    RxSchema,
    dbCount
};
