/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */

import {
    Subject,
    fromEvent as ObservableFromEvent,
    Observable
} from 'rxjs';

import {
    filter,
    map,
    mergeMap,
    first,
    delay
} from 'rxjs/operators';

import type {
    RxCollection,
    RxReplicationState,
    PouchDBInstance,
    RxPlugin
} from '../types';
import {
    RxCollectionBase
} from '../rx-collection';
import {
    clone,
    randomCouchString
} from '../util';
import {
    addRxPlugin,
} from '../core';
import {
    createCrypter
} from '../crypter';
import {
    createChangeEventBuffer
} from '../change-event-buffer';
import {
    createRxSchema,
    RxSchema
} from '../rx-schema';
import {
    PouchDB
} from '../pouch-db';
import {
    RxChangeEvent
} from '../rx-change-event';
import {
    newRxError
} from '../rx-error';
import {
    getRxStoragePouchDb
} from '../rx-storage-pouchdb';

// add the watch-for-changes-plugin
import { RxDBWatchForChangesPlugin } from '../plugins/watch-for-changes';
addRxPlugin(RxDBWatchForChangesPlugin);

const collectionCacheMap = new WeakMap();
const collectionPromiseCacheMap = new WeakMap();
const BULK_DOC_OPTIONS = {
    new_edits: true
};
const BULK_DOC_OPTIONS_FALSE = {
    new_edits: false
};

export
    class InMemoryRxCollection<RxDocumentType, OrmMethods>
    extends RxCollectionBase<RxDocumentType, OrmMethods> {

    constructor(
        parentCollection: RxCollection,
        pouchSettings = {}
    ) {
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
        this._crypter = createCrypter(this.database.password, this.schema);
        this._changeStreams = [];

        /**
         * runs on parentCollection.destroy()
         * Cleans up everything to free up memory
         */
        this.onDestroy.then(() => {
            this._changeStreams.forEach((stream: any) => stream.cancel());
            this.pouch.destroy();
        });

        // add orm functions and options from parent
        this.options = parentCollection.options;
        Object
            .entries(parentCollection.statics)
            .forEach(([funName, fun]) => {
                Object.defineProperty(this, funName, {
                    get: () => (fun as any).bind(this)
                });
            });

        const storage = getRxStoragePouchDb('memory');
        this.pouch = storage.createStorageInstance(
            'rxdb-in-memory',
            randomCouchString(10),
            0
        );

        this._observable$ = new Subject();
        this._changeEventBuffer = createChangeEventBuffer(this as any);

        const parentProto = Object.getPrototypeOf(parentCollection);
        this._oldPouchPut = parentProto._pouchPut.bind(this);

        this._nonPersistentRevisions = new Set();
        this._nonPersistentRevisionsSubject = new Subject(); // emits Set.size() when Set is changed
    }
    private _parentCollection: RxCollection<RxDocumentType, OrmMethods>;
    public _changeStreams: any;
    public _oldPouchPut: Function;
    public _nonPersistentRevisions: any;
    public _nonPersistentRevisionsSubject: any;


    /**
     * @overwrite
     */
    public _eventCounter: number = 0;

    prepareChild() {
        return setIndexes(this.schema, this.pouch)
            .then(() => {
                this._subs.push(
                    (this._observable$ as any).subscribe((cE: RxChangeEvent) => {
                        // when data changes, send it to RxDocument in docCache
                        const doc = this._docCache.get(cE.documentId);
                        if (doc) doc._handleChangeEvent(cE);
                    })
                );
            })
            // initial sync parent's docs to own
            .then(() => replicateExistingDocuments(this._parentCollection, this as any))
            .then(() => {
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
                const thisToParentSub = streamChangedDocuments(this as any)
                    .pipe(
                        mergeMap(doc => applyChangedDocumentToPouch(this._parentCollection, doc)
                            .then(() => doc['_rev'])
                        )
                    )
                    .subscribe(changeRev => {
                        this._nonPersistentRevisions.delete(changeRev);
                        this._nonPersistentRevisionsSubject.next(this._nonPersistentRevisions.size);
                    });
                this._subs.push(thisToParentSub);

                const parentToThisSub = streamChangedDocuments(this._parentCollection)
                    .subscribe(doc => applyChangedDocumentToPouch(this as any, doc));
                this._subs.push(parentToThisSub);
            });
    }

    /**
     * waits until all writes are persistent
     * in the parent collection
     */
    awaitPersistence(): Promise<any> {
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
    _pouchPut(obj: any, overwrite: boolean) {
        return this._oldPouchPut(obj, overwrite).then((ret: any) => {
            this._nonPersistentRevisions.add(ret.rev);
            return ret;
        });
    }
    $emit(changeEvent: RxChangeEvent) {
        if ((this._changeEventBuffer as any).hasChangeWithRevision(changeEvent.documentData && changeEvent.documentData._rev)) {
            return;
        }

        (this._observable$ as any).next(changeEvent);

        // run compaction each 10 events
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
    sync(): RxReplicationState {
        throw newRxError('IM2');
    }
}

/**
 * returns a version of the schema that:
 * - disabled the keyCompression
 * - has no encryption
 * - has no attachments
 */
function toCleanSchema(rxSchema: RxSchema): RxSchema {
    const newSchemaJson = clone(rxSchema.jsonSchema);
    newSchemaJson.keyCompression = false;
    delete newSchemaJson.properties._id;
    delete newSchemaJson.properties._rev;
    delete newSchemaJson.properties._attachments;

    const removeEncryption = (schema: any, complete: any) => {
        delete schema.encrypted;
        Object.values(schema)
            .filter(val => typeof val === 'object')
            .forEach(val => removeEncryption(val, complete));
    };
    removeEncryption(newSchemaJson, newSchemaJson);

    return createRxSchema(newSchemaJson);
}

/**
 * replicates all documents from the parent to the inMemoryCollection
 * @return Promise that resolves with an array of the docs data
 */
export function replicateExistingDocuments(
    fromCollection: RxCollection,
    toCollection: RxCollection
): Promise<any[]> {
    return fromCollection.pouch.allDocs({
        attachments: false,
        include_docs: true
    }).then(allRows => {
        const docs = allRows
            .rows
            .map((row: any) => row.doc)
            .filter((doc: any) => !doc.language) // do not replicate design-docs
            .map((doc: any) => fromCollection._handleFromPouch(doc))
            // swap back primary because keyCompression:false
            .map((doc: any) => fromCollection.schema.swapPrimaryToId(doc));

        if (docs.length === 0) return Promise.resolve([]); // nothing to replicate
        else {
            return toCollection.pouch.bulkDocs({
                docs
            }, BULK_DOC_OPTIONS_FALSE)
                .then(() => docs);
        }
    });
}

/**
 * sets the indexes from the schema at the pouchdb
 */
export function setIndexes(
    schema: RxSchema,
    pouch: PouchDBInstance,
): Promise<any> {
    return Promise.all(
        schema.indexes
            .map(indexAr => {
                const indexName = 'idx-rxdb-' + indexAr.join(',');
                return pouch.createIndex({
                    ddoc: indexName,
                    name: indexName,
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
 * @param prevFilter can be used to filter changes before doing anything
 * @return observable that emits document-data
 */
export function streamChangedDocuments(
    rxCollection: RxCollection,
    prevFilter = (_i: any) => true
): Observable<any> {
    if (!rxCollection._doNotEmitSet) rxCollection._doNotEmitSet = new Set();

    const observable = ObservableFromEvent(rxCollection.pouch
        .changes({
            since: 'now',
            live: true,
            include_docs: true
        }), 'change')
        .pipe(
            /**
             * we need this delay because with pouchdb 7.2.2
             * it happened that _doNotEmitSet.add() from applyChangedDocumentToPouch()
             * was called after the change was streamed downwards
             * which then leads to a wrong detection
             */
            delay(0),
            map((changeAr: any) => changeAr[0]), // rxjs emits an array for whatever reason
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
 */
export function applyChangedDocumentToPouch(
    rxCollection: RxCollection,
    docData: any
): Promise<any> {
    if (!rxCollection._doNotEmitSet) rxCollection._doNotEmitSet = new Set();

    const transformedDoc = rxCollection._handleToPouch(docData);

    return rxCollection.pouch.get(transformedDoc._id)
        .then(oldDoc => transformedDoc._rev = oldDoc._rev)
        .catch(() => {
            // doc not found, do not use a revision
            delete transformedDoc._rev;
        }).then(() => rxCollection.pouch.bulkDocs({
            docs: [transformedDoc]
        }, BULK_DOC_OPTIONS))
        .then(bulkRet => {
            if (bulkRet.length > 0 && !bulkRet[0].ok) {
                throw new Error(JSON.stringify(bulkRet[0]));
            }
            // set the flag so this does not appear in the own event-stream again
            const emitFlag = transformedDoc._id + ':' + bulkRet[0].rev;
            rxCollection._doNotEmitSet.add(emitFlag);

            // remove from the list later to not have a memory-leak
            setTimeout(() => rxCollection._doNotEmitSet.delete(emitFlag), 30 * 1000);

            return transformedDoc;
        });
}

let INIT_DONE = false;
/**
 * called in the proto of RxCollection
 */
export function spawnInMemory(
    this: RxCollection
): Promise<RxCollection> {
    if (!INIT_DONE) {
        INIT_DONE = true;
        // ensure memory-adapter is added
        if (!(PouchDB as any).adapters || !(PouchDB as any).adapters.memory)
            throw newRxError('IM1');
    }

    if (collectionCacheMap.has(this)) {
        // already exists for this collection -> wait until synced
        return collectionPromiseCacheMap.get(this)
            .then(() => collectionCacheMap.get(this));
    }

    const col = new InMemoryRxCollection(this);
    const preparePromise = col.prepareChild();
    collectionCacheMap.set(this, col);
    collectionPromiseCacheMap.set(this, preparePromise);

    return preparePromise.then(() => col) as any;
}


export const rxdb = true;
export const prototypes = {
    RxCollection: (proto: any) => {
        proto.inMemory = spawnInMemory;
    }
};

export const RxDBInMemoryPlugin: RxPlugin = {
    name: 'in-memory',
    rxdb,
    prototypes
};
