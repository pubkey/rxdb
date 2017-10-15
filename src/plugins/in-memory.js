/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields
 */

import RxCollection from '../rx-collection';
import Core from '../core';
import * as util from '../util';
import Crypter from '../crypter';
import ChangeEventBuffer from '../change-event-buffer';
import PouchDB from '../pouch-db';

import PouchAdapterMemory from 'pouchdb-adapter-memory';
import PouchPluginTransform from 'transform-pouch';

const collectionCacheMap = new WeakMap();
const collectionPromiseCacheMap = new WeakMap();

export class InMemoryRxCollection extends RxCollection.RxCollection {
    constructor(parentCollection, pouchSettings) {
        //constructor(database, name, schema, pouchSettings, migrationStrategies, methods) {
        super(
            parentCollection.database,
            parentCollection.name,
            parentCollection.schema,
            pouchSettings, // pouchSettings
            {},
            parentCollection._methods);
        this._parentCollection = parentCollection;
    }

    async prepare() {
        this._crypter = Crypter.create(this.database.password, this.schema);

        this.pouch = new PouchDB(
            'rxdb-in-memory-' + util.randomCouchString(10),
            util.adapterObject('memory'), {}
        );

        this._observable$ = new util.Rx.Subject();
        this._changeEventBuffer = ChangeEventBuffer.create(this);

        // INDEXES
        await Promise.all(
            this.schema.indexes
            .map(indexAr => {
                return this.pouch.createIndex({
                    index: {
                        fields: indexAr
                    }
                });
            })
        );

        this._subs.push(
            this._observable$.subscribe(cE => {
                // when data changes, send it to RxDocument in docCache
                const doc = this._docCache.get(cE.data.doc);
                if (doc) doc._handleChangeEvent(cE);
            })
        );

        // add transformator
        this.pouch.transform({
            incoming: function(doc) {
                console.log('incoming');
                console.dir(doc);
                // do something to the document before storage
                return doc;
            },
            outgoing: function(doc) {
                console.log('outgoins');
                console.dir(doc);
                // do something to the document after retrieval
                return doc;
            }
        });

        // initial sync
        const initialReplicationState = this._parentCollection.sync({
            remote: this.pouch,
            waitForLeadership: false,
            direction: {
                pull: false,
                push: true
            },
            options: {
                live: false,
                retry: false
            },
            /**
             * we use a default-query so we do not sync _design-documents
             */
            query: this._parentCollection.find()
        });
        await initialReplicationState
            .complete$
            .filter(ev => ev.ok === true)
            .first()
            .toPromise();
    }
};

/**
 * called in the proto of RxCollection
 * @return {Promise<RxCollection>}
 */
export async function spawnInMemory() {
    // ensure memory-adapter is added
    Core.plugin(PouchAdapterMemory);
    Core.plugin(PouchPluginTransform);

    if (collectionCacheMap.has(this)) {
        // already exists for this collection -> wait until synced
        await collectionPromiseCacheMap.get(this);
        return collectionCacheMap.get(this);
    }

    const col = new InMemoryRxCollection(this);
    const preparePromise = col.prepare();
    collectionCacheMap.set(this, col);
    collectionPromiseCacheMap.set(this, preparePromise);

    await preparePromise;
    return col;
};


export const rxdb = true;
export const prototypes = {
    RxCollection: proto => {
        proto.inMemory = spawnInMemory;
    }
};
export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable,
    spawnInMemory
};
