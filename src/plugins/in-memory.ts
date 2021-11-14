/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */

import {
    Subject,
    fromEvent as ObservableFromEvent,
    Observable,
    firstValueFrom
} from 'rxjs';

import {
    filter,
    map,
    mergeMap,
    delay
} from 'rxjs/operators';

import type {
    RxCollection,
    RxCouchDBReplicationState,
    PouchDBInstance,
    RxPlugin,
    PouchBulkDocResultRow,
    RxChangeEvent
} from '../types';
import {
    RxCollectionBase
} from '../rx-collection';
import {
    clone,
    PROMISE_RESOLVE_VOID,
    randomCouchString
} from '../util';
import {
    PouchDB,
    getRxStoragePouch,
    pouchSwapIdToPrimary,
    pouchSwapPrimaryToId,
} from '../plugins/pouchdb';
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
    newRxError
} from '../rx-error';
import { getDocumentDataOfRxChangeEvent } from '../rx-change-event';
import { _handleFromStorageInstance, _handleToStorageInstance } from '../rx-collection-helper';

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
        public readonly parentCollection: RxCollection<RxDocumentType, OrmMethods>,
        public readonly pouchSettings?: any
    ) {
        super(
            parentCollection.database as any,
            parentCollection.name,
            toCleanSchema(parentCollection.schema),
            pouchSettings, // pouchSettings
            {} as any,
            (parentCollection as any)._methods);
        this._isInMemory = true;

        parentCollection.onDestroy.then(() => this.destroy());
        this._crypter = createCrypter(this.database.password, this.schema);
        this._changeStreams = [];

        /**
         * runs on parentCollection.destroy()
         * Cleans up everything to free up memory
         */
        this.onDestroy.then(() => {
            this._changeStreams.forEach((stream: any) => stream.cancel());
            // delete all data
            this.storageInstance.internals.pouch.destroy();
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

        this._observable$ = new Subject();
        this._changeEventBuffer = createChangeEventBuffer(this as any);

        const parentProto = Object.getPrototypeOf(parentCollection);
        this._oldPouchPut = (parentProto as any)._pouchPut.bind(this);

        this._nonPersistentRevisions = new Set();
        this._nonPersistentRevisionsSubject = new Subject(); // emits Set.size() when Set is changed
    }
    public _changeStreams: any;
    public _oldPouchPut: Function;
    public _nonPersistentRevisions: any;
    public _nonPersistentRevisionsSubject: any;


    /**
     * @overwrite
     */
    public _eventCounter: number = 0;

    prepareChild() {
        return setIndexes(this.schema, this.storageInstance.internals.pouch)
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
            .then(() => replicateExistingDocuments(this.parentCollection as any, this as any))
            .then(() => {
                /**
                 * create an ongoing replications between both sides
                 */
                const thisToParentSub = streamChangedDocuments(this as any)
                    .pipe(
                        mergeMap(doc => applyChangedDocumentToPouch(this.parentCollection, doc)
                            .then(() => doc['_rev'])
                        )
                    )
                    .subscribe(changeRev => {
                        this._nonPersistentRevisions.delete(changeRev);
                        this._nonPersistentRevisionsSubject.next(this._nonPersistentRevisions.size);
                    });
                this._subs.push(thisToParentSub);

                const parentToThisSub = streamChangedDocuments(this.parentCollection)
                    .subscribe(doc => applyChangedDocumentToPouch(this as any, doc));
                this._subs.push(parentToThisSub);
            });
    }

    /**
     * waits until all writes are persistent
     * in the parent collection
     */
    awaitPersistence(): Promise<any> {
        if (this._nonPersistentRevisions.size === 0) {
            return PROMISE_RESOLVE_VOID;
        }
        return firstValueFrom(
            this._nonPersistentRevisionsSubject.pipe(
                filter(() => this._nonPersistentRevisions.size === 0),
            )
        );
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
        const doc = getDocumentDataOfRxChangeEvent(changeEvent);
        if ((this._changeEventBuffer as any).hasChangeWithRevision(doc && doc._rev)) {
            return;
        }

        (this._observable$ as any).next(changeEvent);

        // run compaction each 10 events
        this._eventCounter++;
        if (this._eventCounter === 10) {
            this._eventCounter = 0;
            this.storageInstance.internals.pouch.compact();
        }
    }

    /**
     * @overwrite
     * Replication on the inMemory is dangerous,
     * replicate with it's parent instead
     */
    syncCouchDB(): RxCouchDBReplicationState {
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
    const pouch: PouchDBInstance = fromCollection.storageInstance.internals.pouch;
    return pouch.allDocs({
        attachments: false,
        include_docs: true
    }).then(allRows => {
        const docs = allRows
            .rows
            .map((row: any) => row.doc)
            .filter((doc: any) => !doc.language) // do not replicate design-docs
            .map((doc: any) => _handleFromStorageInstance(fromCollection, doc))
            // swap back primary because keyCompression:false
            .map((doc: any) => {
                const primaryKey: string = fromCollection.schema.primaryPath as any;
                return pouchSwapPrimaryToId(primaryKey, doc);
            });

        if (docs.length === 0) {
            // nothing to replicate
            return Promise.resolve([]);
        }
        else {
            return toCollection.storageInstance.internals.pouch.bulkDocs({
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
    rxCollection: RxCollection<any, any>,
    prevFilter = (_i: any) => true
): Observable<any> {
    if (!(rxCollection as any)._doNotEmitSet) {
        (rxCollection as any)._doNotEmitSet = new Set();
    }

    const observable = ObservableFromEvent(
        rxCollection.storageInstance.internals.pouch
            .changes({
                since: 'now',
                live: true,
                include_docs: true
            }),
        'change'
    )
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
                if ((rxCollection as any)._doNotEmitSet.has(emitFlag)) {
                    return false;
                } else {
                    return true;
                }
            }),
            filter(change => prevFilter(change)),
            map(change => _handleFromStorageInstance(rxCollection, change.doc)),
            map(d => {
                const primaryKey: string = rxCollection.schema.primaryPath as any;
                return pouchSwapIdToPrimary(primaryKey, d);
            })
        );
    return observable;
}

/**
 * writes the doc-data into the pouchdb of the collection
 * without changeing the revision
 */
export function applyChangedDocumentToPouch(
    rxCollection: RxCollection<any, any>,
    docData: any
): Promise<any> {
    if (!(rxCollection as any)._doNotEmitSet) {
        (rxCollection as any)._doNotEmitSet = new Set();
    }

    const primaryKey: string = rxCollection.schema.primaryPath as any;

    let transformedDoc = _handleToStorageInstance(rxCollection, docData);
    transformedDoc = pouchSwapPrimaryToId(
        primaryKey,
        transformedDoc
    );

    return rxCollection.storageInstance.internals.pouch.get(transformedDoc._id)
        .then((oldDoc: any) => transformedDoc._rev = oldDoc._rev)
        .catch(() => {
            // doc not found, do not use a revision
            delete transformedDoc._rev;
        }).then(() => rxCollection.storageInstance.internals.pouch.bulkDocs({
            docs: [transformedDoc]
        }, BULK_DOC_OPTIONS))
        .then((bulkRet: any) => {
            if (bulkRet.length > 0 && !(bulkRet[0] as PouchBulkDocResultRow).ok) {
                throw new Error(JSON.stringify(bulkRet[0]));
            }
            // set the flag so this does not appear in the own event-stream again
            const emitFlag = transformedDoc._id + ':' + (bulkRet[0] as PouchBulkDocResultRow).rev;
            (rxCollection as any)._doNotEmitSet.add(emitFlag);

            // remove from the list later to not have a memory-leak
            setTimeout(() => (rxCollection as any)._doNotEmitSet.delete(emitFlag), 30 * 1000);

            return transformedDoc;
        });
}

let INIT_DONE = false;
/**
 * called in the proto of RxCollection
 */
export async function inMemory(
    this: RxCollection
): Promise<RxCollection> {
    if (!INIT_DONE) {
        INIT_DONE = true;
        // ensure memory-adapter is added
        if (!(PouchDB as any).adapters || !(PouchDB as any).adapters.memory) {
            throw newRxError('IM1');
        }
    }

    if (collectionCacheMap.has(this)) {
        // already exists for this collection -> wait until synced
        return collectionPromiseCacheMap.get(this)
            .then(() => collectionCacheMap.get(this));
    }

    const col = new InMemoryRxCollection(this);
    await prepareInMemoryRxCollection(col);

    const preparePromise = col.prepareChild();
    collectionCacheMap.set(this, col);
    collectionPromiseCacheMap.set(this, preparePromise);

    return preparePromise.then(() => col) as any;
}

export async function prepareInMemoryRxCollection(instance: InMemoryRxCollection<any, {}>): Promise<void> {
    const memoryStorage = getRxStoragePouch('memory', {});
    instance.storageInstance = await memoryStorage.createStorageInstance({
        databaseName: 'rxdb-in-memory',
        collectionName: randomCouchString(10),
        schema: instance.schema.jsonSchema,
        options: instance.pouchSettings,
        idleQueue: instance.database.idleQueue
    });
    (instance as any).pouch = instance.storageInstance.internals.pouch;
}


export const rxdb = true;
export const prototypes = {
    RxCollection: (proto: any) => {
        proto.inMemory = inMemory;
    }
};

export const RxDBInMemoryPlugin: RxPlugin = {
    name: 'in-memory',
    rxdb,
    prototypes
};
