/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */

import {
    Subject
} from 'rxjs';

import {
    first,
    filter
} from 'rxjs/operators';

import RxCollection from '../rx-collection';
import RxChangeEvent from '../rx-change-event';
import {
    clone,
    randomCouchString,
    adapterObject,
    getHeightOfRevision
} from '../util';
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

        // add orm functions and options from parent
        this.options = parentCollection.options;
        Object
            .entries(parentCollection._statics)
            .forEach(([funName, fun]) => this.__defineGetter__(funName, () => fun.bind(this)));
    }

    async prepare() {
        this._crypter = Crypter.create(this.database.password, this.schema);

        this.pouch = new PouchDB(
            'rxdb-in-memory-' + randomCouchString(10),
            adapterObject('memory'), {}
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

        this._parentCollection.watchForChanges();
        this.watchForChanges();

        /**
         * Sync from parent to inMemory.
         * We do not think in the other direction because writes will always go
         * to the parent. See _pouchPut()
         *
         * @type {[type]}
         */
        const fromParentStream = this._parentCollection.pouch.changes({
            since: 'now',
            include_docs: true,
            live: true
        }).on('change', async (change) => {
            let doc = this._parentCollection._handleFromPouch(change.doc);
            doc = this.schema.swapPrimaryToId(doc);

            if (doc._deleted) {
                // because bulkDocs does not work when _deleted=true && new_edits=false, we have to do a workarround here
                const foundBefore = await this.pouch.get(doc._id).catch(() => null);

                doc._rev = foundBefore._rev;
                const res = await this.pouch.put(doc);
                doc._rev = res.rev;

                // because pouch.put will not emit the event, do it manually
                const cE = RxChangeEvent.fromPouchChange(doc, this);
                this.$emit(cE);

            } else {
                await this.pouch.bulkDocs({
                    docs: [doc]
                }, BULK_DOC_OPTIONS);
            }
        });
        this._changeStreams.push(fromParentStream);
    }


    /**
     * @overwrite
     */
    $emit(changeEvent) {
        if (this._changeEventBuffer.hasChangeWithRevision(changeEvent.data.v && changeEvent.data.v._rev)) return;

        this._observable$.next(changeEvent);

        // run compaction each 10 events
        if (!this._eventCounter) this._eventCounter = 0;
        this._eventCounter++;
        if (this._eventCounter === 10) {
            this._eventCounter = 0;
            this.pouch.compact();
        }
    }

    /**
     * When a write is done to the inMemory-collection,
     * we write to the parent and wait for the replication-event
     * This ensures that writes are really persistend when done,
     * and also makes it only nessesary to replicate one side
     * @overwrite
     */
    async _pouchPut(obj, overwrite = false) {
        const ret = await this._parentCollection._pouchPut(obj, overwrite);
        const changeRev = ret.rev;

        // wait until the change is replicated from parent to inMemory
        await this.$.pipe(
            filter(cE => {
                if (obj._deleted) {
                    // removes have a different revision because they cannot be handled via bulkDocs
                    // so we check for equal height and _id
                    const isRevHeight = getHeightOfRevision(cE.data.v._rev);
                    const mustRevHeight = getHeightOfRevision(obj._rev) + 1;
                    if (isRevHeight === mustRevHeight && obj._id === cE.data.doc) return true;
                    else return false;
                } else {
                    // use the one with the same revision
                    return cE.data.v && cE.data.v._rev === changeRev;
                }
            }),
            first()
        ).toPromise();

        return ret;
    }
}


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
}


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
