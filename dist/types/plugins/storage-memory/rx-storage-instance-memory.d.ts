import { Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxDocumentDataById, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageDefaultCheckpoint, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, StringKeys } from '../../types';
import type { MemoryPreparedQuery, MemoryStorageInternals, RxStorageMemory, RxStorageMemoryInstanceCreationOptions, RxStorageMemorySettings } from './memory-types';
export declare class RxStorageInstanceMemory<RxDocType> implements RxStorageInstance<RxDocType, MemoryStorageInternals<RxDocType>, RxStorageMemoryInstanceCreationOptions, RxStorageDefaultCheckpoint> {
    readonly storage: RxStorageMemory;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: MemoryStorageInternals<RxDocType>;
    readonly options: Readonly<RxStorageMemoryInstanceCreationOptions>;
    readonly settings: RxStorageMemorySettings;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    closed: boolean;
    constructor(storage: RxStorageMemory, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: MemoryStorageInternals<RxDocType>, options: Readonly<RxStorageMemoryInstanceCreationOptions>, settings: RxStorageMemorySettings);
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(docIds: string[], withDeleted: boolean): Promise<RxDocumentDataById<RxDocType>>;
    query(preparedQuery: MemoryPreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    count(preparedQuery: MemoryPreparedQuery<RxDocType>): Promise<RxStorageCountResult>;
    getChangedDocumentsSince(limit: number, checkpoint?: RxStorageDefaultCheckpoint): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: RxStorageDefaultCheckpoint;
    }>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<string>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
    remove(): Promise<void>;
    close(): Promise<void>;
    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>>;
    resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void>;
}
export declare function createMemoryStorageInstance<RxDocType>(storage: RxStorageMemory, params: RxStorageInstanceCreationParams<RxDocType, RxStorageMemoryInstanceCreationOptions>, settings: RxStorageMemorySettings): Promise<RxStorageInstanceMemory<RxDocType>>;
