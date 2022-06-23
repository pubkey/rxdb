import { Observable } from 'rxjs';
import type { RxStorageInstance, LokiSettings, RxStorageChangeEvent, RxDocumentData, BulkWriteRow, RxStorageBulkWriteResponse, RxStorageQueryResult, RxJsonSchema, MangoQuery, LokiStorageInternals, RxStorageInstanceCreationParams, LokiDatabaseSettings, LokiLocalDatabaseState, EventBulk, LokiChangesCheckpoint, StringKeys, RxDocumentDataById } from '../../types';
import type { RxStorageLoki } from './rx-storage-lokijs';
export declare class RxStorageInstanceLoki<RxDocType> implements RxStorageInstance<RxDocType, LokiStorageInternals, LokiSettings> {
    readonly storage: RxStorageLoki;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: LokiStorageInternals;
    readonly options: Readonly<LokiSettings>;
    readonly databaseSettings: LokiDatabaseSettings;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$;
    private lastChangefeedSequence;
    readonly instanceId: number;
    closed: boolean;
    constructor(storage: RxStorageLoki, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: LokiStorageInternals, options: Readonly<LokiSettings>, databaseSettings: LokiDatabaseSettings);
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>>;
    query(preparedQuery: MangoQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    getAttachmentData(_documentId: string, _attachmentId: string): Promise<string>;
    getChangedDocumentsSince(limit: number, checkpoint?: LokiChangesCheckpoint): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: LokiChangesCheckpoint;
    }[]>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    close(): Promise<void>;
    remove(): Promise<void>;
}
export declare function createLokiLocalState<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>, databaseSettings: LokiDatabaseSettings): Promise<LokiLocalDatabaseState>;
export declare function createLokiStorageInstance<RxDocType>(storage: RxStorageLoki, params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>, databaseSettings: LokiDatabaseSettings): Promise<RxStorageInstanceLoki<RxDocType>>;
