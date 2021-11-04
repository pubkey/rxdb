import type { SortComparator, QueryMatcher } from 'event-reduce-js';
import { Observable } from 'rxjs';
import type { RxStorageInstance, LokiSettings, RxStorageChangeEvent, RxDocumentData, BulkWriteRow, RxStorageBulkWriteResponse, RxStorageQueryResult, BlobBuffer, ChangeStreamOnceOptions, RxJsonSchema, MangoQuery, LokiStorageInternals, RxStorageChangedDocumentMeta, RxStorageInstanceCreationParams, LokiRemoteRequestBroadcastMessage, LokiRemoteResponseBroadcastMessage, LokiLocalState, LokiDatabaseSettings } from '../../types';
import type { BroadcastChannel, LeaderElector } from 'broadcast-channel';
export declare class RxStorageInstanceLoki<RxDocType> implements RxStorageInstance<RxDocType, LokiStorageInternals, LokiSettings> {
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocType>>;
    readonly internals: LokiStorageInternals;
    readonly options: Readonly<LokiSettings>;
    readonly databaseSettings: LokiDatabaseSettings;
    readonly broadcastChannel?: BroadcastChannel<LokiRemoteRequestBroadcastMessage | LokiRemoteResponseBroadcastMessage> | undefined;
    readonly primaryPath: keyof RxDocType;
    private changes$;
    private lastChangefeedSequence;
    readonly instanceId: number;
    readonly leaderElector?: LeaderElector;
    constructor(databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocType>>, internals: LokiStorageInternals, options: Readonly<LokiSettings>, databaseSettings: LokiDatabaseSettings, broadcastChannel?: BroadcastChannel<LokiRemoteRequestBroadcastMessage | LokiRemoteResponseBroadcastMessage> | undefined);
    private getLocalState;
    /**
     * If the local state must be used, that one is returned.
     * Returns false if a remote instance must be used.
     */
    private mustUseLocalState;
    private requestRemoteInstance;
    /**
     * Adds an entry to the changes feed
     * that can be queried to check which documents have been
     * changed since sequence X.
     */
    private addChangeDocumentMeta;
    prepareQuery(mutateableQuery: MangoQuery<RxDocType>): MangoQuery<RxDocType>;
    getSortComparator(query: MangoQuery<RxDocType>): SortComparator<RxDocType>;
    /**
     * Returns a function that determines if a document matches a query selector.
     * It is important to have the exact same logix as lokijs uses, to be sure
     * that the event-reduce algorithm works correct.
     * But LokisJS does not export such a function, the query logic is deep inside of
     * the Resultset prototype.
     * Because I am lazy, I do not copy paste and maintain that code.
     * Instead we create a fake Resultset and apply the prototype method Resultset.prototype.find(),
     * same with Collection.
     */
    getQueryMatcher(query: MangoQuery<RxDocType>): QueryMatcher<RxDocType>;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<Map<string, RxDocumentData<RxDocType>>>;
    query(preparedQuery: MangoQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    getAttachmentData(_documentId: string, _attachmentId: string): Promise<BlobBuffer>;
    getChangedDocuments(options: ChangeStreamOnceOptions): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }>;
    changeStream(): Observable<RxStorageChangeEvent<RxDocumentData<RxDocType>>>;
    close(): Promise<void>;
    remove(): Promise<void>;
}
export declare function createLokiLocalState<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>, databaseSettings: LokiDatabaseSettings): Promise<LokiLocalState>;
export declare function createLokiStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>, databaseSettings: LokiDatabaseSettings): Promise<RxStorageInstanceLoki<RxDocType>>;
