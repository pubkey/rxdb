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
    constructor(parentCollection, pouchSettings = {}) {
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
        this._crypter = Crypter.create(this.database.password, this.schema);
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

        this.pouch = new PouchDB(
            'rxdb-in-memory-' + randomCouchString(10),
            adapterObject('memory'), {}
        );

        this._observable$ = new Subject();
        this._changeEventBuffer = ChangeEventBuffer.create(this);
    }

    async prepare() {

        await setIndexes(this.schema, this.pouch);

        this._subs.push(
            this._observable$.subscribe(cE => {
                // when data changes, send it to RxDocument in docCache
                const doc = this._docCache.get(cE.data.doc);
                if (doc) doc._handleChangeEvent(cE);
            })
        );

        /* REPLICATION BETWEEN THIS AND PARENT */

        // initial sync parent's docs to own
        await replicateExistingDocuments(this._parentCollection, this);


        /**
         * call watchForChanges() on both sides,
         * to ensure none-rxdb-changes like replication
         * will fire into the change-event-stream
         */
        this._parentCollection.watchForChanges();
        this.watchForChanges();


        await this._sync();
    }

    /**
     * this does the initial sync
     * so that the in-memory-collection has the same docs as the original
     * @return {Promise}
     */
    async _sync() {

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

/**
 * returns a version of the schema that:
 * - disabled the keyCompression
 * - has no encryption
 * - has no attachments
 * @param  {RxSchema} rxSchema
 * @return {RxSchema}
 */
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

/**
 * replicates all documents from the parent to the inMemoryCollection
 * @param  {RxCollection} fromCollection
 * @param  {RxCollection} toCollection
 * @return {Promise<{}[]>} Promise that resolves with an array of the docs data
 */
export async function replicateExistingDocuments(fromCollection, toCollection) {
    // initial sync parent's docs to own
    const allRows = await fromCollection.pouch.allDocs({
        attachments: false,
        include_docs: true
    });

    const docs = allRows
        .rows
        .map(row => row.doc)
        .filter(doc => !doc.language) // do not replicate design-docs
        .map(doc => fromCollection._handleFromPouch(doc))
        // swap back primary because disableKeyCompression:true
        .map(doc => fromCollection.schema.swapPrimaryToId(doc));

    if (docs.length === 0) return []; // nothing to replicate
    else {
        await toCollection.pouch.bulkDocs({
            docs
        }, BULK_DOC_OPTIONS);
        return docs;
    }
}

/**
 * sets the indexes from the schema at the pouchdb
 * @param {RxSchema} schema
 * @param {PouchDB} pouch
 * @return {Promise<void>}
 */
export async function setIndexes(schema, pouch) {
    return Promise.all(
        schema.indexes
        .map(indexAr => {
            return pouch.createIndex({
                index: {
                    fields: indexAr
                }
            });
        })
    );
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
