import randomToken from 'random-token';
import PouchDB from './PouchDB';

import * as util from './util';
import * as RxCollection from './RxCollection';
import * as RxSchema from './RxSchema';
import * as RxChangeEvent from './RxChangeEvent';
import * as Socket from './Socket';
import * as LeaderElector from './LeaderElector';

const SETTINGS = {
    minPassLength: 8
};

export class RxDatabase {


    constructor(name, adapter, password, multiInstance) {
        this.name = name;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;

        this.token = randomToken(10);

        this.subs = [];
        this.destroyed = false;


        // cache for collection-objects
        this.collections = {};

        // this is needed to preserver attribute-name
        this.subject = null;
        this.observable$ = null;
    }

    /**
     * make the async things for this database
     */
    async prepare() {

        // rx
        this.subject = new util.Rx.Subject();
        this.observable$ = this.subject.asObservable()
            .filter(cEvent => RxChangeEvent.isInstanceOf(cEvent));

        // create internal collections
        const internalPouch = _internalPouchDbs(this.name, this.adapter);
        this._adminPouch = internalPouch._adminPouch;
        this._collectionsPouch = internalPouch._collectionsPouch;

        // validate/insert password-hash
        if (this.password) {
            let pwHashDoc = null;
            try {
                pwHashDoc = await this._adminPouch.get('_local/pwHash');
            } catch (e) {}
            if (!pwHashDoc) {
                try {
                    await this._adminPouch.put({
                        _id: '_local/pwHash',
                        value: util.hash(this.password)
                    });
                } catch (e) {}
            }
            if (pwHashDoc && this.password && util.hash(this.password) != pwHashDoc.value)
                throw new Error('another instance on this adapter has a different password');
        }

        if (this.multiInstance) {
            // socket
            this.socket = await Socket.create(this);

            //TODO only subscribe when sth is listening to the event-chain
            this.socket.messages$.subscribe(cE => this.$emit(cE));
        }

        // leader elector
        this.leaderElector = await LeaderElector.create(this);
    }

    /**
     * spawns a new pouch-instance
     * @param {string} collectionName
     * @param {string} schemaVersion
     * @param {Object} [pouchSettings={}] pouchSettings
     * @type {Object}
     */
    _spawnPouchDB(collectionName, schemaVersion, pouchSettings = {}) {
        return _spawnPouchDB(this.name, this.adapter, collectionName, schemaVersion, pouchSettings = {});
    }

    get isLeader() {
        if (!this.multiInstance) return true;
        return this.leaderElector.isLeader;
    }
    async waitForLeadership() {
        if (!this.multiInstance) return true;
        return this.leaderElector.waitForLeadership();
    }

    async writeToSocket(changeEvent) {
        if (
            this.multiInstance &&
            !changeEvent.isIntern() &&
            this.socket
        ) {
            await this.socket.write(changeEvent);
            return true;
        }
        return false;
    }

    /**
     * throw a new event into the event-cicle
     */
    $emit(changeEvent) {
        if (!changeEvent) return;

        // throw in own cycle
        this.subject.next(changeEvent);

        // write to socket if event was created by self
        if (changeEvent.data.it == this.token)
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
    async removeCollectionDoc(name, schema) {
        const docId = this._collectionNamePrimary(name, schema);
        const doc = await this._collectionsPouch.get(docId);
        return this._collectionsPouch.remove(doc);
    }

    /**
     * removes all internal docs of a given collection
     * @param  {string}  collectionName
     * @return {Promise<string[]>} resolves all known collection-versions
     */
    async _removeAllOfCollection(collectionName) {
        const data = await this._collectionsPouch.allDocs({
            include_docs: true
        });
        const relevantDocs = data.rows
            .map(row => row.doc)
            .filter(doc => {
                const name = doc._id.split('-')[0];
                return name == collectionName;
            });
        await Promise.all(
            relevantDocs
            .map(doc => this._collectionsPouch.remove(doc))
        );
        return relevantDocs.map(doc => doc.version);
    }

    /**
     * create or fetch a collection
     * @param {{name: string, schema: Object, pouchSettings = {}, migrationStrategies = {}}} args
     * @return {Collection}
     */
    async collection(args) {
        args.database = this;

        if (args.name.charAt(0) == '_')
            throw new Error(`collection(${args.name}): collection-names cannot start with underscore _`);

        if (this.collections[args.name])
            throw new Error(`collection(${args.name}) already exists. use myDatabase.${args.name} to get it`);

        if (!args.schema)
            throw new Error(`collection(${args.name}): schema is missing`);

        if (!RxSchema.isInstanceOf(args.schema))
            args.schema = RxSchema.create(args.schema);

        const internalPrimary = this._collectionNamePrimary(args.name, args.schema);

        // check unallowed collection-names
        if (properties().includes(args.name))
            throw new Error(`Collection-name ${args.name} not allowed`);

        // check schemaHash
        const schemaHash = args.schema.hash;
        let collectionDoc = null;
        try {
            collectionDoc = await this._collectionsPouch.get(internalPrimary);
        } catch (e) {}

        if (collectionDoc && collectionDoc.schemaHash != schemaHash)
            throw new Error(`collection(${args.name}): another instance created this collection with a different schema`);

        const collection = await RxCollection.create(args);
        if (
            Object.keys(collection.schema.encryptedPaths).length > 0 &&
            !this.password
        ) throw new Error(`collection(${args.name}): schema encrypted but no password given`);

        if (!collectionDoc) {
            try {
                await this._collectionsPouch.put({
                    _id: internalPrimary,
                    schemaHash,
                    schema: collection.schema.normalized,
                    version: collection.schema.version
                });
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
        await Promise.all(pouches.map(pouch => pouch.destroy()));
    }


    /**
     * export to json
     * @param {boolean} decrypted
     * @param {?string[]} collections array with collectionNames or null if all
     */
    async dump(decrypted = false, collections = null) {
        const json = {
            name: this.name,
            instanceToken: this.token,
            encrypted: false,
            passwordHash: null,
            collections: []
        };

        if (this.password) {
            json.passwordHash = util.hash(this.password);
            if (decrypted) json.encrypted = false;
            else json.encrypted = true;
        }

        const useCollections = Object.keys(this.collections)
            .filter(colName => !collections || collections.includes(colName))
            .filter(colName => colName.charAt(0) != '_')
            .map(colName => this.collections[colName]);

        json.collections = await Promise.all(
            useCollections
            .map(col => col.dump(decrypted))
        );

        return json;
    }


    /**
     * import json
     * @param {Object} dump
     */
    async importDump(dump) {
        return Promise.all(
            dump.collections
            .filter(colDump => this.collections[colDump.name])
            .map(colDump => this.collections[colDump.name].importDump(colDump))
        );
    }

    async destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.socket && this.socket.destroy();
        await this.leaderElector.destroy();
        this.subs.map(sub => sub.unsubscribe());
        Object.keys(this.collections)
            .map(key => this.collections[key])
            .map(col => col.destroy());
    }

    async remove() {
        await this.destroy();
        await removeDatabase(this.name, this.adapter);
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

export async function create({
    name,
    adapter,
    password,
    multiInstance = true
}) {
    util.validateCouchDBString(name);

    // check if pouchdb-adapter
    if (typeof adapter == 'string') {
        if (!PouchDB.adapters || !PouchDB.adapters[adapter]) {
            throw new Error(
                `Adapter ${adapter} not added.
                 Use RxDB.plugin(require('pouchdb-adapter-${adapter}');`
            );
        }
    } else {
        util.isLevelDown(adapter);
        if (!PouchDB.adapters || !PouchDB.adapters.leveldb) {
            throw new Error(
                `To use leveldown-adapters, you have to add the leveldb-plugin.
                 Use RxDB.plugin(require('pouchdb-adapter-leveldb'));`);
        }
    }

    if (password && typeof password !== 'string')
        throw new TypeError('password is no string');
    if (password && password.length < SETTINGS.minPassLength)
        throw new Error(`password must have at least ${SETTINGS.minPassLength} chars`);

    const db = new RxDatabase(name, adapter, password, multiInstance);
    await db.prepare();

    return db;
}

/**
 * transforms the given adapter into a pouch-compatible object
 * @return {Object} adapterObject
 */
function _adapterObject(adapter) {
    let adapterObj = {
        db: adapter
    };
    if (typeof adapter === 'string') {
        adapterObj = {
            adapter: adapter
        };
    }
    return adapterObj;
}

function _spawnPouchDB(dbName, adapter, collectionName, schemaVersion, pouchSettings = {}) {
    const pouchLocation = dbName + '-rxdb-' + schemaVersion + '-' + collectionName;
    return new PouchDB(
        pouchLocation,
        _adapterObject(adapter),
        pouchSettings
    );
}

function _internalPouchDbs(dbName, adapter) {
    const ret = {};
    // create internal collections
    // - admin-collection
    ret._adminPouch = _spawnPouchDB(dbName, adapter, '_admin', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    });
    // - collections-collection
    ret._collectionsPouch = _spawnPouchDB(dbName, adapter, '_collections', 0, {
        auto_compaction: false, // no compaction because this only stores local documents
        revs_limit: 1
    });
    return ret;
}

export async function removeDatabase(databaseName, adapter) {
    const internalPouch = _internalPouchDbs(databaseName, adapter);
    const collectionsPouch = internalPouch._collectionsPouch;
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
    await Promise.all(
        Object.values(internalPouch)
        .map(pouch => pouch.destroy())
    );
}

export {
    RxSchema as RxSchema
};
