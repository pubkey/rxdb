import { Observable } from 'rxjs';
import type { RxStorageInstance, LokiSettings, RxStorageChangeEvent, RxDocumentData, BulkWriteRow, RxStorageBulkWriteResponse, RxStorageQueryResult, RxJsonSchema, MangoQuery, LokiStorageInternals, RxStorageInstanceCreationParams, LokiDatabaseSettings, LokiLocalDatabaseState, EventBulk, StringKeys, RxDocumentDataById, RxConflictResultionTask, RxConflictResultionTaskSolution, RxStorageDefaultCheckpoint, RxStorageCountResult } from '../../types';
import type { RxStorageLoki } from './rx-storage-lokijs';
export declare class RxStorageInstanceLoki<RxDocType> implements RxStorageInstance<RxDocType, LokiStorageInternals, LokiSettings, RxStorageDefaultCheckpoint> {
    readonly databaseInstanceToken: string;
    readonly storage: RxStorageLoki;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: LokiStorageInternals;
    readonly options: Readonly<LokiSettings>;
    readonly databaseSettings: LokiDatabaseSettings;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$;
    readonly instanceId: number;
    closed: boolean;
    constructor(databaseInstanceToken: string, storage: RxStorageLoki, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: LokiStorageInternals, options: Readonly<LokiSettings>, databaseSettings: LokiDatabaseSettings);
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>>;
    query(preparedQuery: MangoQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    count(preparedQuery: MangoQuery<RxDocType>): Promise<RxStorageCountResult>;
    getAttachmentData(_documentId: string, _attachmentId: string): Promise<string>;
    getChangedDocumentsSince(limit: number, checkpoint?: RxStorageDefaultCheckpoint | null): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: RxStorageDefaultCheckpoint;
    }>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    close(): Promise<void>;
    remove(): Promise<void>;
    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>>;
    resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void>;
}
export declare function createLokiLocalState<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>, databaseSettings: LokiDatabaseSettings): Promise<LokiLocalDatabaseState>;
export declare function createLokiStorageInstance<RxDocType>(storage: RxStorageLoki, params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>, databaseSettings: LokiDatabaseSettings): Promise<RxStorageInstanceLoki<RxDocType>>;
