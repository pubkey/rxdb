import type { SortComparator, QueryMatcher } from 'event-reduce-js';
import { Observable } from 'rxjs';
import type { BlobBuffer, BulkWriteRow, ChangeStreamOnceOptions, MangoQuery, PouchSettings, PreparedQuery, RxDocumentData, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageInstance, RxStorageQueryResult } from '../../types';
import { PouchStorageInternals } from './pouchdb-helper';
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
