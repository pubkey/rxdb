/// <reference types="node" />
/// <reference types="pouchdb-core" />
import type { MangoQuery, PouchDBInstance, PouchSettings, RxStorageBulkWriteResponse, RxJsonSchema, RxLocalDocumentData, RxStorageQueryResult, RxStorageInstanceCreationParams, ChangeStreamEvent, ChangeStreamOnceOptions, PouchChangeRow, RxLocalStorageBulkWriteResponse, RxDocumentData, WithAttachments, RxDocumentWriteData, RxAttachmentWriteData, RxAttachmentData, BlobBuffer, PreparedQuery, RxStorage, RxStorageInstance, RxStorageKeyObjectInstance, BulkWriteRow, BulkWriteLocalRow, RxStorageChangeEvent } from '../../types';
import type { SortComparator, QueryMatcher, ChangeEvent } from 'event-reduce-js';
import { Observable } from 'rxjs';
/**
 * prefix of local pouchdb documents
 */
export declare const POUCHDB_LOCAL_PREFIX: '_local/';
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */
export declare const POUCHDB_DESIGN_PREFIX: '_design/';
export declare type PouchStorageInternals = {
    pouch: PouchDBInstance;
};
/**
 * Used to check in tests if all instances have been cleaned up.
 */
export declare const OPEN_POUCHDB_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstancePouch | RxStorageInstancePouch<any>>;
export declare class RxStorageKeyObjectInstancePouch implements RxStorageKeyObjectInstance<PouchStorageInternals, PouchSettings> {
    readonly databaseName: string;
    readonly collectionName: string;
    readonly internals: Readonly<PouchStorageInternals>;
    readonly options: Readonly<PouchSettings>;
    private changes$;
    constructor(databaseName: string, collectionName: string, internals: Readonly<PouchStorageInternals>, options: Readonly<PouchSettings>);
    close(): Promise<void>;
    remove(): Promise<void>;
    bulkWrite<D = any>(documentWrites: BulkWriteLocalRow<D>[]): Promise<RxLocalStorageBulkWriteResponse<D>>;
    findLocalDocumentsById<D = any>(ids: string[]): Promise<Map<string, RxLocalDocumentData<D>>>;
    changeStream(): Observable<RxStorageChangeEvent<RxLocalDocumentData>>;
}
export declare class RxStorageInstancePouch<RxDocType> implements RxStorageInstance<RxDocType, PouchStorageInternals, PouchSettings> {
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocType>>;
    readonly internals: Readonly<PouchStorageInternals>;
    readonly options: Readonly<PouchSettings>;
    private changes$;
    private subs;
    private emittedEventIds;
    private primaryPath;
    constructor(databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocType>>, internals: Readonly<PouchStorageInternals>, options: Readonly<PouchSettings>);
    private addEventToChangeStream;
    close(): Promise<void>;
    remove(): Promise<void>;
    getSortComparator(query: MangoQuery<RxDocType>): SortComparator<RxDocType>;
    /**
     * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-selector-core/src/matches-selector.js
     */
    getQueryMatcher(query: MangoQuery<RxDocType>): QueryMatcher<RxDocType>;
    /**
     * pouchdb has many bugs and strange behaviors
     * this functions takes a normal mango query
     * and transforms it to one that fits for pouchdb
     */
    prepareQuery(mutateableQuery: MangoQuery<RxDocType>): PreparedQuery<RxDocType>;
    bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void>;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<BlobBuffer>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<Map<string, RxDocumentData<RxDocType>>>;
    changeStream(): Observable<RxStorageChangeEvent<RxDocumentData<RxDocType>>>;
    getChangedDocuments(options: ChangeStreamOnceOptions): Promise<{
        changedDocuments: {
            id: string;
            sequence: number;
        }[];
        lastSequence: number;
    }>;
}
export declare class RxStoragePouch implements RxStorage<PouchStorageInternals, PouchSettings> {
    adapter: any;
    pouchSettings: PouchSettings;
    name: string;
    constructor(adapter: any, pouchSettings?: PouchSettings);
    /**
     * create the same diggest as an attachment with that data
     * would have created by pouchdb internally.
     */
    hash(data: Buffer | Blob | string): Promise<string>;
    private createPouch;
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, PouchSettings>): Promise<RxStorageInstancePouch<RxDocType>>;
    createKeyObjectStorageInstance(databaseName: string, collectionName: string, options: PouchSettings): Promise<RxStorageKeyObjectInstancePouch>;
}
export declare function writeAttachmentsToAttachments(attachments: {
    [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData;
}): Promise<{
    [attachmentId: string]: RxAttachmentData;
}>;
/**
 * Checks if all is ok with the given adapter,
 * else throws an error.
 */
export declare function checkPouchAdapter(adapter: string | any): void;
export declare function pouchHash(data: Buffer | Blob | string): Promise<string>;
export declare function pouchSwapIdToPrimary<T>(primaryKey: keyof T, docData: any): any;
export declare function pouchDocumentDataToRxDocumentData<T>(primaryKey: keyof T, pouchDoc: WithAttachments<T>): RxDocumentData<T>;
export declare function rxDocumentDataToPouchDocumentData<T>(primaryKey: keyof T, doc: RxDocumentData<T> | RxDocumentWriteData<T>): WithAttachments<T & {
    _id: string;
}>;
export declare function pouchSwapPrimaryToId<RxDocType>(primaryKey: keyof RxDocType, docData: any): any;
/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */
export declare function pouchStripLocalFlagFromPrimary(str: string): string;
export declare function getEventKey(isLocal: boolean, primary: string, revision: string): string;
export declare function pouchChangeRowToChangeEvent<DocumentData>(primaryKey: keyof DocumentData, pouchDoc: any): ChangeEvent<RxDocumentData<DocumentData>>;
export declare function pouchChangeRowToChangeStreamEvent<DocumentData>(primaryKey: keyof DocumentData, pouchRow: PouchChangeRow): ChangeStreamEvent<DocumentData>;
/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export declare function primarySwapPouchDbQuerySelector<RxDocType>(selector: any, primaryKey: keyof RxDocType): any;
/**
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */
export declare function createIndexesOnPouch(pouch: PouchDBInstance, schema: RxJsonSchema<any>): Promise<void>;
/**
 * returns the pouchdb-database-name
 */
export declare function getPouchLocation(dbName: string, collectionName: string, schemaVersion: number): string;
export declare function getRxStoragePouch(adapter: any, pouchSettings?: PouchSettings): RxStoragePouch;
