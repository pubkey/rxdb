import {
    default as PouchDB
} from './PouchDB';

import {
    default as objectPath
} from 'object-path';

import {
    default as clone
} from 'clone';

import * as util from './util';
import * as RxDocument from './RxDocument';
import * as RxQuery from './RxQuery';
import * as RxChangeEvent from './RxChangeEvent';
import * as KeyCompressor from './KeyCompressor';
import * as Crypter from './Crypter';


class RxCollection {

    static HOOKS_WHEN = ['pre', 'post'];
    static HOOKS_KEYS = ['insert', 'save', 'remove'];

    constructor(database, name, schema, pouchSettings = {}, migrationStrategies = {}) {
        this.database = database;
        this.name = name;
        this.schema = schema;
        this.migrationStrategies = migrationStrategies;
        this.synced = false;
        this.keyCompressor = KeyCompressor.create(this.schema);

        this.hooks = {};

        this.pouchSettings = pouchSettings;

        this.subs = [];
        this.pouchSyncs = [];

        this.pouch = this.database._spawnPouchDB(this.name, schema.version, pouchSettings);

        this.observable$ = this.database.$
            .filter(event => event.data.col == this.name);
    }
    async prepare() {

        this.crypter = Crypter.create(this.database.password, this.schema);

        // INDEXES
        await Promise.all(
            this.schema.indexes
            .map(indexAr => {
                const compressedIdx = indexAr
                    .map(key => {
                        const ret = this.keyCompressor.table[key] ? this.keyCompressor.table[key] : key;
                        return ret;
                    });

                this.pouch.createIndex({
                    index: {
                        fields: compressedIdx
                    }
                });
            }));

        // HOOKS
        RxCollection.HOOKS_KEYS.forEach(key => {
            RxCollection.HOOKS_WHEN.map(when => {
                const fnName = when + util.ucfirst(key);
                this[fnName] = (fun, parallel) => this.addHook(when, key, fun, parallel);
            });
        });

        // MIGRATION

    }



    /**
     * returns pouchdb-instances from all existing equal collections with previous version
     * @return {Object} with version: Pouchdb | {0: {}, 1: {}}
     */
    async _getOldCollections() {
        const ret = {};

        // get colDocs
        const oldColDocs = await Promise.all(
            this.schema.previousVersions
            .map(v => {
                console.log(this.name + '-' + v);
                return v;
            })
            .map(v => this.database._collectionsPouch.get(this.name + '-' + v))
            .map(fun => fun.catch(e => null)) // auto-catch so Promise.all continues
        );

        console.dir(oldColDocs);

        // spawn pouchdb-instances
        oldColDocs
            .filter(colDoc => colDoc != null)
            .forEach(colDoc => {
                const pouch = this.database._spawnPouchDB(this.name, this.schema.version, this.pouchSettings);
                ret[colDoc.schema.version] = pouch;
            });

        return ret;
    }


    /**
     * wrappers for Pouch.put/get to handle keycompression etc
     */
    _handleToPouch(docData) {
        const encrypted = this.crypter.encrypt(docData);
        const swapped = this.schema.swapPrimaryToId(encrypted);
        const compressed = this.keyCompressor.compress(swapped);
        return compressed;
    }
    _handleFromPouch(docData, noDecrypt = false) {
        const swapped = this.schema.swapIdToPrimary(docData);
        const decompressed = this.keyCompressor.decompress(swapped);
        if (noDecrypt) return decompressed;
        const decrypted = this.crypter.decrypt(decompressed);
        return decrypted;
    }
    async _pouchPut(obj) {
        obj = this._handleToPouch(obj);
        return this.pouch.put(obj);
    }
    async _pouchGet(key) {
        let doc = await this.pouch.get(key);
        doc = this._handleFromPouch(doc);
        return doc;
    }
    /**
     * wrapps pouch-find
     * @param {RxQuery} rxQuery
     * @param {?number} limit overwrites the limit
     * @param {?boolean} noDecrypt if true, decryption will not be made
     * @return {Object[]} array with documents-data
     */
    async _pouchFind(rxQuery, limit, noDecrypt = false) {
        const compressedQueryJSON = rxQuery.keyCompress();
        if (limit) compressedQueryJSON.limit = limit;
        const docsCompressed = await this.pouch.find(compressedQueryJSON);
        const docs = docsCompressed.docs
            .map(doc => this._handleFromPouch(doc, noDecrypt));

        return docs;
    }


    /**
     * returns observable
     */
    get $() {
        return this.observable$;
    }
    $emit = changeEvent => this.database.$emit(changeEvent);


    /**
     * @param {Object} json data
     * @param {RxDocument} doc which was created
     */
    async insert(json) {
        json = clone(json);

        if (json._id)
            throw new Error('do not provide ._id, it will be generated');

        // fill _id
        if (
            this.schema.primaryPath == '_id' &&
            !json._id
        ) json._id = util.generate_id();

        await this._runHooks('pre', 'insert', json);

        this.schema.validate(json);

        const insertResult = await this._pouchPut(json);

        json[this.schema.primaryPath] = insertResult.id;
        json._rev = insertResult.rev;
        const newDoc = RxDocument.create(this, json, {});

        await this._runHooks('post', 'insert', newDoc);

        // event
        const emitEvent = RxChangeEvent.create(
            'RxCollection.insert',
            this.database,
            this,
            newDoc,
            json
        );
        this.$emit(emitEvent);

        return newDoc;
    }

    /**
     * takes a mongoDB-query-object and returns the documents
     * @param  {object} queryObj
     * @return {RxDocument[]} found documents
     */
    find(queryObj) {
        if (typeof queryObj === 'string')
            throw new Error('if you want to search by _id, use .findOne(_id)');

        const query = RxQuery.create(queryObj, this);
        query.exec = async() => {
            const docs = await this._pouchFind(query);
            const ret = RxDocument.createAr(this, docs, query.toJSON());
            return ret;
        };
        return query;
    }

    findOne(queryObj) {
        let query;

        if (typeof queryObj === 'string') {
            query = RxQuery.create({
                _id: queryObj
            }, this);
        } else query = RxQuery.create(queryObj, this);

        if (
            typeof queryObj === 'number' ||
            Array.isArray(queryObj)
        ) throw new TypeError('.findOne() needs a queryObject or string');

        query.exec = async() => {
            const docs = await this._pouchFind(query, 1);
            if (docs.length === 0) return null;
            const doc = docs.shift();
            const ret = RxDocument.create(this, doc, query.toJSON());
            return ret;
        };
        query.limit = () => {
            throw new Error('.limit() cannot be called on .findOne()');
        };
        return query;
    }

    /**
     * get a query only
     * @return {RxQuery} query which can be subscribed to
     */
    query(queryObj) {
        if (typeof queryObj === 'string')
            throw new Error('if you want to search by _id, use .findOne(_id)');

        const query = RxQuery.create(queryObj, this);
        return query;
    }

    /**
     * export to json
     * @param {boolean} decrypted if true, all encrypted values will be decrypted
     */
    async dump(decrypted = false) {
        const encrypted = !decrypted;

        const json = {
            name: this.name,
            schemaHash: this.schema.hash(),
            encrypted: false,
            passwordHash: null,
            docs: []
        };

        if (this.database.password && encrypted) {
            json.passwordHash = util.hash(this.database.password);
            json.encrypted = true;
        }

        const query = RxQuery.create({}, this);
        let docs = await this._pouchFind(query, null, encrypted);
        json.docs = docs.map(docData => {
            delete docData._rev;
            return docData;
        });
        return json;
    }

    /**
     * imports the json-data into the collection
     * @param {Array} exportedJSON should be an array of raw-data
     */
    async importDump(exportedJSON) {

        // check schemaHash
        if (exportedJSON.schemaHash != this.schema.hash())
            throw new Error('the imported json relies on a different schema');

        // check if passwordHash matches own
        if (
            exportedJSON.encrypted &&
            exportedJSON.passwordHash != util.hash(this.database.password)
        ) throw new Error('json.passwordHash does not match the own');


        const importFns = exportedJSON.docs
            // decrypt
            .map(doc => this.crypter.decrypt(doc))
            // validate schema
            .map(doc => this.schema.validate(doc))
            // import
            .map(doc => this._pouchPut(doc));
        return Promise.all(importFns);
    }


    /**
     * TODO make sure that on multiInstances only one can sync
     * because it will have document-conflicts when 2 syncs write to the same storage
     */
    async sync(serverURL, alsoIfNotLeader = false) {

        if (typeof this.pouch.sync !== 'function') {
            throw new Error(
                `RxCollection.sync needs 'pouchdb-replication'. Code:
                 RxDB.plugin(require('pouchdb-replication')); `
            );
        }

        if (!alsoIfNotLeader)
            await this.database.waitForLeadership();

        if (!this.synced) {
            /**
             * this will grap the changes and publish them to the rx-stream
             * this is to ensure that changes from 'synced' dbs will be published
             */
            const sendChanges = {};
            const pouch$ = util.Rx.Observable
                .fromEvent(
                    this.pouch.changes({
                        since: 'now',
                        live: true,
                        include_docs: true
                    }), 'change')
                .filter(c => c.id.charAt(0) != '_')
                .map(c => c.doc)
                .map(doc => {
                    doc._ext = true;
                    return doc;
                })
                .filter(doc => sendChanges[doc._rev] = 'YES')
                .delay(10)
                .map(doc => {
                    let ret = null;
                    if (sendChanges[doc._rev] == 'YES') ret = doc;
                    delete sendChanges[doc._rev];
                    return ret;
                })
                .filter(doc => doc != null)
                .subscribe(doc => {
                    this.$emit(RxChangeEvent.fromPouchChange(doc, this));
                });
            this.subs.push(pouch$);

            const ob2 = this.$
                .map(cE => cE.data.v)
                .map(doc => {
                    if (sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
                })
                .subscribe();
            this.subs.push(ob2);
        }
        this.synced = true;
        const sync = this.pouch.sync(serverURL, {
            live: true,
            retry: true
        }).on('error', function(err) {
            throw new Error(err);
        });
        this.pouchSyncs.push(sync);
        return sync;
    }

    /**
     * HOOKS
     */
    addHook(when, key, fun, parallel = false) {
        if (typeof fun != 'function')
            throw new TypeError(key + '-hook must be a function');

        if (!RxCollection.HOOKS_WHEN.includes(when))
            throw new TypeError('hooks-when not known');

        if (!RxCollection.HOOKS_KEYS.includes(key))
            throw new Error('hook-name ' + key + 'not known');

        const runName = parallel ? 'parallel' : 'series';

        this.hooks[key] = this.hooks[key] || {};
        this.hooks[key][when] = this.hooks[key][when] || {
            series: [],
            parallel: []
        };
        this.hooks[key][when][runName].push(fun);
    }
    getHooks(when, key) {
        try {
            return this.hooks[key][when];
        } catch (e) {
            return {
                series: [],
                parallel: []
            };
        }
    };
    async _runHooks(when, key, doc) {
        const hooks = this.getHooks(when, key);
        if (!hooks) return;

        for (let i = 0; i < hooks.series.length; i++)
            await hooks.series[i](doc);

        await Promise.all(
            hooks.parallel
            .map(hook => hook(doc))
        );
    }


    async _mustMigrate() {

    }


    async destroy() {
        this.subs.map(sub => sub.unsubscribe());
        this.pouchSyncs.map(sync => sync.cancel());
        delete this.database.collections[this.name];
    }

}

/**
 * checks if the collection-name is allowed, throws if not.
 * 'allowed' is defined by couchdb:
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
 * @param  {string} name
 * @throws  {Error}
 * @return {boolean} true
 */
const checkCollectionName = function(name) {
    if (
        typeof name != 'string' ||
        name.length == 0
    ) throw new TypeError('given name is no string or empty');

    /**
     * the starting underscore _ is only allowed for internal collections
     * which never sync with a couchdb
     */
    const regStr = '^[a-z_][a-z0-9_]*$';
    const reg = new RegExp(regStr);
    if (!name.match(reg)) {
        throw new Error(`
              collection-names must match the regex:
              - regex: ${regStr}
              - given: ${name}
      `);
    }
    return true;
};

/**
 * checks if the migrationStrategies are ok, throws if not
 * @param  {RxSchema} schema
 * @param  {Object} migrationStrategies
 * @throws {Error|TypeError} if not ok
 * @return {boolean}
 */
const checkMigrationStrategies = function(schema, migrationStrategies) {
    // migrationStrategies must be object not array
    if (
        typeof migrationStrategies !== 'object' ||
        Array.isArray(migrationStrategies)
    ) throw new TypeError('migrationStrategies must be an object');

    // for every previousVersion there must be strategy
    if (schema.previousVersions.length != Object.keys(migrationStrategies).length) {
        throw new Error(`
      a migrationStrategy is missing
      - have: ${JSON.stringify(Object.keys(migrationStrategies).map(v => parseInt(v)))}
      - should: ${JSON.stringify(schema.previousVersions)}
      `);
    }

    // every strategy must have number as property and be a function
    schema.previousVersions
        .map(vNr => {
            return {
                v: vNr,
                s: migrationStrategies[(vNr + 1) + '']
            };
        })
        .filter(strat => typeof strat.s !== 'function')
        .forEach(strat => {
            throw new TypeError(`migrationStrategy(v${strat.v}) must be a function; is : ${typeof strat}`);
        });

    return true;
};

/**
 * creates and prepares a new collection
 * @param  {RxDatabase}  database
 * @param  {string}  name
 * @param  {RxSchema}  schema
 * @param  {?Object}  [pouchSettings={}]
 * @param  {?Object}  [migrationStrategies={}]
 * @return {Promise.<RxCollection>} promise with collection
 */
export async function create(database, name, schema, pouchSettings = {}, migrationStrategies = {}) {
    if (schema.constructor.name != 'RxSchema')
        throw new TypeError('given schema is no Schema-object');

    if (database.constructor.name != 'RxDatabase')
        throw new TypeError('given database is no Database-object');

    checkCollectionName(name);
    checkMigrationStrategies(schema, migrationStrategies);

    const collection = new RxCollection(database, name, schema);
    await collection.prepare();

    return collection;
}
