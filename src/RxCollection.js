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

class RxCollection {

    static HOOKS_WHEN = ['pre', 'post'];
    static HOOKS_KEYS = ['insert', 'save', 'update', 'remove'];

    constructor(database, name, schema, pouchSettings = {}) {
        this.database = database;
        this.name = name;
        this.schema = schema;
        this.synced = false;

        this.hooks = {};

        let adapterObj = {
            db: this.database.adapter
        };
        if (typeof this.database.adapter === 'string') {
            adapterObj = {
                adapter: this.database.adapter
            };
        }

        this.subs = [];
        this.pouchSyncs = [];

        this.pouch = new PouchDB(
            database.prefix + ':RxDB:' + name,
            adapterObj,
            pouchSettings
        );

        this.observable$ = this.database.$
            .filter(event => event.data.col == this.name);
    }
    async prepare() {
        // INDEXES
        await Promise.all(
            this.schema.indexes
            .map(indexAr => this.pouch.createIndex({
                index: {
                    fields: indexAr
                }
            })));

        // HOOKS
        RxCollection.HOOKS_KEYS.forEach(key => {
            RxCollection.HOOKS_WHEN.map(when => {
                const fnName = when + util.ucfirst(key);
                this[fnName] = (fun, parallel) => this.addHook(when, key, fun, parallel);
            });
        });
    }

    /**
     * returns observable
     */
    get $() {
        return this.observable$;
    }
    $emit = changeEvent => this.database.$emit(changeEvent);


    async insert(json) {
        if (json._id)
            throw new Error('do not provide ._id, it will be generated');

        //console.log('RxCollection.insert():');
        //console.dir(json);

        json = clone(json);
        json._id = util.generate_id();


        this.schema.validate(json);


        this._runHooks('pre', 'insert', json);


        // handle encrypted fields
        const encPaths = this.schema.getEncryptedPaths();
        Object.keys(encPaths).map(path => {
            let value = objectPath.get(json, path);
            let encrypted = this.database._encrypt(value);
            objectPath.set(json, path, encrypted);
        });

        // primary swap
        const swappedDoc = this.schema.swapPrimaryToId(json);

        const insertResult = await this.pouch.put(swappedDoc);

        const newDocData = json;
        newDocData._id = insertResult.id;
        newDocData._rev = insertResult.rev;
        const newDoc = RxDocument.create(this, newDocData, {});

        this._runHooks('post', 'insert', newDoc);

        // event
        const emitEvent = RxChangeEvent.create(
            'RxCollection.insert',
            this.database,
            this,
            newDoc,
            newDocData
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
            const queryJSON = query.toJSON();
            const docs = await this.pouch.find(queryJSON);
            const ret = RxDocument.createAr(this, docs.docs, queryJSON);
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


        query.exec = async() => {
            const queryJSON = query.toJSON();
            queryJSON.limit = 1;
            const docs = await this.pouch.find(queryJSON);
            if (docs.docs.length === 0) return null;

            const doc = docs.docs.shift();
            const ret = RxDocument.create(this, doc, queryJSON);
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
        const json = {
            name: this.name,
            schemaHash: this.schema.hash(),
            encrypted: false,
            passwordHash: null,
            docs: []
        };

        if (this.database.password) {
            json.passwordHash = util.hash(this.database.password);
            if (decrypted) json.encrypted = false;
            else json.encrypted = true;
        }

        const docs = await this.find().exec();
        docs.map(doc => {
            let useData = doc.rawData;
            if (this.database.password && decrypted)
                useData = Object.assign(doc.rawData, doc.data);

            delete useData._rev;
            json.docs.push(useData);
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


        // decrypt docs
        const decDocs = [];
        exportedJSON.docs.map(docData => {
            docData = clone(docData);
            if (exportedJSON.encrypted) {
                const encPaths = this.schema.getEncryptedPaths();
                Object.keys(encPaths).map(path => {
                    let encrypted = objectPath.get(docData, path);
                    if (!encrypted) return;
                    let decrypted = this.database._decrypt(encrypted);
                    objectPath.set(docData, path, decrypted);
                });
            }
            decDocs.push(docData);
        });

        // check if docs match schema
        decDocs.map(decDoc => {
            this.schema.validate(decDoc);
        });

        // import
        let fns = [];
        exportedJSON.docs.map(decDocs => {
            fns.push(this.pouch.put(decDocs));
        });
        await Promise.all(fns);
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
            console.log('sync error:');
            console.log(JSON.stringify(err));
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
            hooks.series[i](doc);

        await Promise.all(
            hooks.parallel
            .map(hook => hook(doc))
        );
    }


    async destroy() {
        this.subs.map(sub => sub.unsubscribe());
        this.pouchSyncs.map(sync => sync.cancel());
        delete this.database.collections[this.name];
    }

}



export async function create(database, name, schema, pouchSettings = {}) {
    if (schema.constructor.name != 'RxSchema')
        throw new TypeError('given schema is no Schema-object');

    if (database.constructor.name != 'RxDatabase')
        throw new TypeError('given database is no Database-object');

    if (
        typeof name != 'string' ||
        name.length == 0
    ) throw new TypeError('given name is no string or empty');

    const collection = new RxCollection(database, name, schema);
    await collection.prepare();

    return collection;
}
