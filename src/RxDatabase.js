import {
    default as randomToken
} from 'random-token';

import * as util from './util';
import * as RxCollection from './RxCollection';
import * as RxSchema from './RxSchema';
import * as DatabaseSchemas from './Database.schemas';
import * as RxChangeEvent from './RxChangeEvent';
import * as Socket from './Socket';
import * as LeaderElector from './LeaderElector';
import {
    default as PouchDB
} from './PouchDB';

class RxDatabase {

    static settings = {
        minPassLength: 8
    };

    constructor(prefix, adapter, password, multiInstance = false) {
        this.prefix = prefix;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;

        this.token = randomToken(10);

        this.subs = [];
        this.destroyed = false;


        // cache for collection-objects
        this.collections = {};

        // rx
        this.subject = new util.Rx.Subject();
        this.observable$ = this.subject.asObservable()
            .filter(cEvent => cEvent.constructor.name == 'RxChangeEvent');
    }

    /**
     * make the async things for this database
     */
    async prepare() {

        // create internal collections
        // - admin-collection
        this._adminPouch = this._spawnPouchDB('_admin', 0, {
            auto_compaction: false, // no compaction because this only stores local documents
            revs_limit: 1
        });
        // - collections-collection
        this._collectionsPouch = this._spawnPouchDB('_collections', 0, {
            auto_compaction: false, // no compaction because this only stores local documents
            revs_limit: 1
        });

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
     * transforms the given adapter into a pouch-compatible object
     * @return {Object} adapterObject
     */
    get _adapterObj() {
        let adapterObj = {
            db: this.adapter
        };
        if (typeof this.adapter === 'string') {
            adapterObj = {
                adapter: this.adapter
            };
        }
        return adapterObj;
    }

    /**
     * spawns a new pouch-instance
     * @param {string} collectionName
     * @param {string} schemaVersion
     * @param {Object} [pouchSettings={}] pouchSettings
     * @type {Object}
     */
    _spawnPouchDB(collectionName, schemaVersion, pouchSettings = {}) {
        const pouchLocation = this.prefix + '-rxdb-' + schemaVersion + '-' + collectionName;
        return new PouchDB(
            pouchLocation,
            this._adapterObj,
            pouchSettings
        );
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
    async $emit(changeEvent) {
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
     * create or fetch a collection
     * @return {Collection}
     */
    async collection(name, schema, pouchSettings = {}, migrationStrategies = {}) {
        if (name.charAt(0) == '_')
            throw new Error(`collection(${name}): collection-names cannot start with underscore _`);

        if (schema && schema.constructor.name != 'RxSchema')
            schema = RxSchema.create(schema);

        const internalPrimary = this._collectionNamePrimary(name, schema);

        if (!this.collections[name]) {
            // check schemaHash
            const schemaHash = schema.hash();
            let collectionDoc = null;
            try {
                collectionDoc = await this._collectionsPouch.get(internalPrimary);
            } catch (e) {}

            if (collectionDoc && collectionDoc.schemaHash != schemaHash)
                throw new Error(`collection(${name}): another instance created this collection with a different schema`);

            const collection = await RxCollection.create(this, name, schema, pouchSettings, migrationStrategies);
            if (
                Object.keys(collection.schema.getEncryptedPaths()).length > 0 &&
                !this.password
            ) throw new Error(`collection(${name}): schema encrypted but no password given`);

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

            this.collections[name] = collection;
        } else {
            if (schema && schema.hash() != this.collections[name].schema.hash())
                throw new Error(`collection(${name}): already has a different schema`);
        }
        return this.collections[name];
    }

    /**
     * export to json
     * @param {boolean} decrypted
     * @param {?string[]} collections array with collectionNames or null if all
     */
    async dump(decrypted = false, collections = null) {
        const json = {
            name: this.prefix,
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

}


export async function create(prefix, adapter, password, multiInstance = false) {

    util.validateCouchDBString(prefix);

    // TODO check here if name allowed by pouchdb

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


    if (password && typeof password !== 'string') // TODO typecheck here ?
        throw new TypeError('password is no string');
    if (password && password.length < RxDatabase.settings.minPassLength)
        throw new Error(`password must have at least ${RxDatabase.settings.minPassLength} chars`);

    const db = new RxDatabase(prefix, adapter, password, multiInstance);
    await db.prepare();

    return db;
}

export {
    RxSchema as RxSchema
};
