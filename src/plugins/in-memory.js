/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */

import {
    Subject,
    fromEvent as ObservableFromEvent
} from 'rxjs';

import {
    filter,
    map,
    mergeMap,
    first
} from 'rxjs/operators';

import RxCollection from '../rx-collection';
import {
    clone,
    randomCouchString,
    adapterObject
} from '../util';
import Core from '../core';
import Crypter from '../crypter';
import ChangeEventBuffer from '../change-event-buffer';
import RxSchema from '../rx-schema';
import PouchDB from '../pouch-db';
import RxError from '../rx-error';

// add the watch-for-changes-plugin
import RxDBWatchForChangesPlugin from '../plugins/watch-for-changes';
Core.plugin(RxDBWatchForChangesPlugin);

const collectionCacheMap = new WeakMap();
const collectionPromiseCacheMap = new WeakMap();
const BULK_DOC_OPTIONS = {
    new_edits: true
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

        const parentProto = Object.getPrototypeOf(parentCollection);
        this._oldPouchPut = parentProto._pouchPut.bind(this);

        this._nonPersistentRevisions = new Set();
        this._nonPersistentRevisionsSubject = new Subject(); // emits Set.size() when Set is changed
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


        /**
         * create an ongoing replications between both sides
         */
        const thisToParentSub = streamChangedDocuments(this)
            .pipe(
                mergeMap(doc => applyChangedDocumentToPouch(this._parentCollection, doc)
                    .then(() => doc._rev)
                )
            )
            .subscribe(changeRev => {
                this._nonPersistentRevisions.delete(changeRev);
                this._nonPersistentRevisionsSubject.next(this._nonPersistentRevisions.size);
            });
        this._subs.push(thisToParentSub);

        const parentToThisSub = streamChangedDocuments(this._parentCollection)
            .subscribe(doc => applyChangedDocumentToPouch(this, doc));
        this._subs.push(parentToThisSub);
    }

    /**
     * waits until all writes are persistent
     * in the parent collection
     * @return {Promise}
     */
    awaitPersistence() {
        if (this._nonPersistentRevisions.size === 0) return Promise.resolve();
        return this._nonPersistentRevisionsSubject.pipe(
            filter(() => this._nonPersistentRevisions.size === 0),
            first()
        ).toPromise();
    }

    /**
     * To know which events are replicated and which are not,
     * the _pouchPut is wrapped
     * @overwrite
     */
    async _pouchPut(obj, overwrite) {
        const ret = await this._oldPouchPut(obj, overwrite);
        this._nonPersistentRevisions.add(ret.rev);
        return ret;
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
     * @overwrite
     * Replication on the inMemory is dangerous,
     * replicate with it's parent instead
     */
    sync() {
        throw RxError.newRxError('IM2');
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
    newSchemaJson.keyCompression = false;
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
export function replicateExistingDocuments(fromCollection, toCollection) {
    return fromCollection.pouch.allDocs({
        attachments: false,
        include_docs: true
    }).then(allRows => {

        const docs = allRows
            .rows
            .map(row => row.doc)
            .filter(doc => !doc.language) // do not replicate design-docs
            .map(doc => fromCollection._handleFromPouch(doc))
            // swap back primary because keyCompression:false
            .map(doc => fromCollection.schema.swapPrimaryToId(doc));

        if (docs.length === 0) return []; // nothing to replicate
        else {
            return toCollection.pouch.bulkDocs({
                docs
            }, {
                new_edits: false
            }).then(() => docs);
        }
    });
}

/**
 * sets the indexes from the schema at the pouchdb
 * @param {RxSchema} schema
 * @param {PouchDB} pouch
 * @return {Promise<void>}
 */
export function setIndexes(schema, pouch) {
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

/**
 * returns an observable that streams all changes
 * as plain documents that have no encryption or keyCompression.
 * We use this to replicate changes from one collection to the other
 * @param {RxCollection} rxCollection
 * @param {Function?} prevFilter can be used to filter changes before doing anything
 * @return {Observable<any>} observable that emits document-data
 */
export function streamChangedDocuments(rxCollection, prevFilter = () => true) {
    if (!rxCollection._doNotEmitSet) rxCollection._doNotEmitSet = new Set();

    const observable = ObservableFromEvent(rxCollection.pouch
            .changes({
                since: 'now',
                live: true,
                include_docs: true
            }), 'change')
        .pipe(
            map(changeAr => changeAr[0]), // rxjs emits an array for whatever reason
            filter(change => {
                // changes on the doNotEmit-list shell not be fired
                const emitFlag = change.id + ':' + change.doc._rev;
                if (rxCollection._doNotEmitSet.has(emitFlag)) return false;
                else return true;
            }),
            filter(change => prevFilter(change)),
            map(change => rxCollection._handleFromPouch(change.doc))
        );
    return observable;
}

/**
 * writes the doc-data into the pouchdb of the collection
 * without changeing the revision
 * @param  {RxCollection} rxCollection
 * @param  {any} docData
 * @return {Promise<any>} promise that resolved with the transformed doc-data
 */
export async function applyChangedDocumentToPouch(rxCollection, docData) {
    if (!rxCollection._doNotEmitSet) rxCollection._doNotEmitSet = new Set();

    const transformedDoc = rxCollection._handleToPouch(docData);

    try {
        const oldDoc = await rxCollection.pouch.get(transformedDoc._id);
        transformedDoc._rev = oldDoc._rev;
    } catch (err) {
        // doc not found, do not use a revision
        delete transformedDoc._rev;
    }

    const bulkRet = await rxCollection.pouch.bulkDocs({
        docs: [transformedDoc]
    }, BULK_DOC_OPTIONS);

    if (bulkRet.length > 0 && !bulkRet[0].ok) {
        throw new Error(JSON.stringify(bulkRet[0]));
    }

    // set the flag so this does not appear in the own event-stream again
    const emitFlag = transformedDoc._id + ':' + bulkRet[0].rev;
    rxCollection._doNotEmitSet.add(emitFlag);

    // remove from the list later to not have a memory-leak
    setTimeout(() => rxCollection._doNotEmitSet.delete(emitFlag), 30 * 1000);

    return transformedDoc;
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
