/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */
import { Observable } from 'rxjs';
import type { RxCollection, RxReplicationState, PouchDBInstance, RxPlugin } from '../types';
import { RxCollectionBase } from '../rx-collection';
import { RxSchema } from '../rx-schema';
import { RxChangeEvent } from '../rx-change-event';
export declare class InMemoryRxCollection<RxDocumentType, OrmMethods> extends RxCollectionBase<RxDocumentType, OrmMethods> {
    constructor(parentCollection: RxCollection, pouchSettings?: {});
    private _parentCollection;
    _changeStreams: any;
    _oldPouchPut: Function;
    _nonPersistentRevisions: any;
    _nonPersistentRevisionsSubject: any;
    /**
     * @overwrite
     */
    _eventCounter: number;
    prepareChild(): Promise<void>;
    /**
     * waits until all writes are persistent
     * in the parent collection
     */
    awaitPersistence(): Promise<any>;
    /**
     * To know which events are replicated and which are not,
     * the _pouchPut is wrapped
     * @overwrite
     */
    _pouchPut(obj: any, overwrite: boolean): any;
    $emit(changeEvent: RxChangeEvent): void;
    /**
     * @overwrite
     * Replication on the inMemory is dangerous,
     * replicate with it's parent instead
     */
    sync(): RxReplicationState;
}
/**
 * replicates all documents from the parent to the inMemoryCollection
 * @return Promise that resolves with an array of the docs data
 */
export declare function replicateExistingDocuments(fromCollection: RxCollection, toCollection: RxCollection): Promise<any[]>;
/**
 * sets the indexes from the schema at the pouchdb
 */
export declare function setIndexes(schema: RxSchema, pouch: PouchDBInstance): Promise<any>;
/**
 * returns an observable that streams all changes
 * as plain documents that have no encryption or keyCompression.
 * We use this to replicate changes from one collection to the other
 * @param prevFilter can be used to filter changes before doing anything
 * @return observable that emits document-data
 */
export declare function streamChangedDocuments(rxCollection: RxCollection, prevFilter?: (_i: any) => boolean): Observable<any>;
/**
 * writes the doc-data into the pouchdb of the collection
 * without changeing the revision
 */
export declare function applyChangedDocumentToPouch(rxCollection: RxCollection, docData: any): Promise<any>;
/**
 * called in the proto of RxCollection
 */
export declare function spawnInMemory(this: RxCollection): Promise<RxCollection>;
export declare const rxdb = true;
export declare const prototypes: {
    RxCollection: (proto: any) => void;
};
export declare const RxDBInMemoryPlugin: RxPlugin;
