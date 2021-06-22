/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields.
 * Writes will still run on the original collection
 */
import { Observable } from 'rxjs';
import type { RxCollection, RxCouchDBReplicationState, PouchDBInstance, RxPlugin, RxChangeEvent } from '../types';
import { RxCollectionBase } from '../rx-collection';
import { RxSchema } from '../rx-schema';
export declare class InMemoryRxCollection<RxDocumentType, OrmMethods> extends RxCollectionBase<RxDocumentType, OrmMethods> {
    readonly parentCollection: RxCollection<RxDocumentType, OrmMethods>;
    readonly pouchSettings?: any;
    constructor(parentCollection: RxCollection<RxDocumentType, OrmMethods>, pouchSettings?: any);
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
    syncCouchDB(): RxCouchDBReplicationState;
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
export declare function streamChangedDocuments(rxCollection: RxCollection<any, any>, prevFilter?: (_i: any) => boolean): Observable<any>;
/**
 * writes the doc-data into the pouchdb of the collection
 * without changeing the revision
 */
export declare function applyChangedDocumentToPouch(rxCollection: RxCollection<any, any>, docData: any): Promise<any>;
/**
 * called in the proto of RxCollection
 */
export declare function inMemory(this: RxCollection): Promise<RxCollection>;
export declare function prepareInMemoryRxCollection(instance: InMemoryRxCollection<any, {}>): Promise<void>;
export declare const rxdb = true;
export declare const prototypes: {
    RxCollection: (proto: any) => void;
};
export declare const RxDBInMemoryPlugin: RxPlugin;
