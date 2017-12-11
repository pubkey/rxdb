/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields
 */

import clone from 'clone';
import {
    Subject
} from 'rxjs/Subject';

import RxCollection from '../rx-collection';
import * as util from '../util';
import Crypter from '../crypter';
import ChangeEventBuffer from '../change-event-buffer';
import RxSchema from '../rx-schema';
import PouchDB from '../pouch-db';
import RxError from '../rx-error';

const collectionCacheMap = new WeakMap();
const collectionPromiseCacheMap = new WeakMap();
const BULK_DOC_OPTIONS = {
    new_edits: false
};

export class InMemoryRxCollection extends RxCollection.RxCollection {
    constructor(parentCollection, pouchSettings) {
        //constructor(database, name, schema, pouchSettings, migrationStrategies, methods) {
        super(
            parentCollection.database,
            parentCollection.name,
            toCleanSchema(parentCollection.schema),
            pouchSettings, // pouchSettings
            {},
            parentCollection._methods);
        this._isInMemory = true;
        this._parentCollection = parentCollection;
        this._parentCollection.onDestroy.then(() => this.destroy());

        this._changeStreams = [];


        /**
         * runs on parentCollection.destroy()
         * Cleans up everything to free up memory
         */
        this.onDestroy.then(() => {
            this._changeStreams.forEach(stream => stream.cancel());
            this.pouch.destroy();
        });
    }

    async prepare() {
        this._crypter = Crypter.create(this.database.password, this.schema);

        this.pouch = new PouchDB(
            'rxdb-in-memory-' + util.randomCouchString(10),
            util.adapterObject('memory'), {}
        );

        this._observable$ = new Subject();
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

        await this._initialSync();
    }

    /**
     * this does the initial sync
     * so that the in-memory-collection has the same docs as the original
     * @return {Promise}
     */
    async _initialSync() {
        // initial sync parent's docs to own
        const allRows = await this._parentCollection.pouch.allDocs({
            attachments: false,
            include_docs: true
        });
        await this.pouch.bulkDocs({
            docs: allRows
                .rows
                .map(row => row.doc)
                .filter(doc => !doc.language) // do not replicate design-docs
                .map(doc => this._parentCollection._handleFromPouch(doc))
                // swap back primary because disableKeyCompression:true
                .map(doc => this._parentCollection.schema.swapPrimaryToId(doc))
        }, BULK_DOC_OPTIONS);

        // sync from own to parent
        this._parentCollection.watchForChanges();
        this.watchForChanges();
        const fromOwnStream = this.pouch.changes({
            since: 'now',
            include_docs: true,
            live: true
        }).on('change', async (change) => {
            const doc = this._parentCollection._handleToPouch(change.doc);
            // console.log('write to parent:');
            // console.dir(doc);
            this._parentCollection.pouch.bulkDocs({
                docs: [doc]
            }, BULK_DOC_OPTIONS);
        });
        this._changeStreams.push(fromOwnStream);

        // sync from parent to own
        const fromParentStream = this._parentCollection.pouch.changes({
            since: 'now',
            include_docs: true,
            live: true
        }).on('change', async (change) => {
            let doc = this._parentCollection._handleFromPouch(change.doc);
            doc = this.schema.swapPrimaryToId(doc);
            // console.log('write to own2:');
            // console.dir(doc);
            this.pouch.bulkDocs({
                docs: [doc]
            }, BULK_DOC_OPTIONS);
        });
        this._changeStreams.push(fromParentStream);
    }


    /**
     * @overwrite
     */
    $emit(changeEvent) {
        this._observable$.next(changeEvent);

        // run compaction each 10 events
        if (!this._eventCounter) this._eventCounter = 0;
        this._eventCounter++;
        if (this._eventCounter === 10) {
            this._eventCounter = 0;
            this.pouch.compact();
        }

        //        console.log('$emit called:');
        //        console.dir(changeEvent);
    }
};


function toCleanSchema(rxSchema) {
    const newSchemaJson = clone(rxSchema.jsonID);
    newSchemaJson.disableKeyCompression = true;
    delete newSchemaJson.properties._id;
    delete newSchemaJson.properties._rev;
    delete newSchemaJson.properties._attachments;

    const removeEncryption = (schema, complete) => {
        delete schema.encrypted;
        Object.values(schema)
            .filter(val => typeof val === 'object')
            .forEach(val => removeEncryption(val, complete));
    };
    removeEncryption(newSchemaJson, newSchemaJson);

    return RxSchema.create(newSchemaJson);
}


let INIT_DONE = false;
/**
 * called in the proto of RxCollection
 * @return {Promise<RxCollection>}
 */
export async function spawnInMemory() {
    if (!INIT_DONE) {
        INIT_DONE = true;
        // ensure memory-adapter is added
        if (!PouchDB.adapters || !PouchDB.adapters.memory)
            throw RxError.newRxError('IM1');
    }

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
