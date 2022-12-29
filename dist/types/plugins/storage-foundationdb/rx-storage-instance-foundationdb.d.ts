import { Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxDocumentDataById, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageDefaultCheckpoint, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, StringKeys } from '../../types';
import type { FoundationDBPreparedQuery, FoundationDBStorageInternals, RxStorageFoundationDB, RxStorageFoundationDBInstanceCreationOptions, RxStorageFoundationDBSettings } from './foundationdb-types';
export declare class RxStorageInstanceFoundationDB<RxDocType> implements RxStorageInstance<RxDocType, FoundationDBStorageInternals<RxDocType>, RxStorageFoundationDBInstanceCreationOptions, RxStorageDefaultCheckpoint> {
    readonly storage: RxStorageFoundationDB;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: FoundationDBStorageInternals<RxDocType>;
    readonly options: Readonly<RxStorageFoundationDBInstanceCreationOptions>;
    readonly settings: RxStorageFoundationDBSettings;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    closed: boolean;
    private changes$;
    constructor(storage: RxStorageFoundationDB, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: FoundationDBStorageInternals<RxDocType>, options: Readonly<RxStorageFoundationDBInstanceCreationOptions>, settings: RxStorageFoundationDBSettings);
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], withDeleted: boolean): Promise<RxDocumentDataById<RxDocType>>;
    query(preparedQuery: FoundationDBPreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    count(preparedQuery: FoundationDBPreparedQuery<RxDocType>): Promise<RxStorageCountResult>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<string>;
    getChangedDocumentsSince(limit: number, checkpoint?: RxStorageDefaultCheckpoint): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: RxStorageDefaultCheckpoint;
    }>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocType>, RxStorageDefaultCheckpoint>>;
    remove(): Promise<void>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>>;
    resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void>;
    close(): Promise<undefined>;
}
export declare function createFoundationDBStorageInstance<RxDocType>(storage: RxStorageFoundationDB, params: RxStorageInstanceCreationParams<RxDocType, RxStorageFoundationDBInstanceCreationOptions>, settings: RxStorageFoundationDBSettings): Promise<RxStorageInstanceFoundationDB<RxDocType>>;
