import { Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, RxDocumentData, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, StringKeys } from '../../types';
import type { MemoryChangesCheckpoint, MemoryPreparedQuery, MemoryStorageInternals, RxStorageMemory, RxStorageMemoryInstanceCreationOptions, RxStorageMemorySettings } from './memory-types';
export declare class RxStorageInstanceMemory<RxDocType> implements RxStorageInstance<RxDocType, MemoryStorageInternals<RxDocType>, RxStorageMemoryInstanceCreationOptions> {
    readonly storage: RxStorageMemory;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: MemoryStorageInternals<RxDocType>;
    readonly options: Readonly<RxStorageMemoryInstanceCreationOptions>;
    readonly settings: RxStorageMemorySettings;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$;
    closed: boolean;
    constructor(storage: RxStorageMemory, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: MemoryStorageInternals<RxDocType>, options: Readonly<RxStorageMemoryInstanceCreationOptions>, settings: RxStorageMemorySettings);
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(docIds: string[], withDeleted: boolean): Promise<{
        [documentId: string]: RxDocumentData<RxDocType>;
    }>;
    query(preparedQuery: MemoryPreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    getChangedDocumentsSince(limit: number, checkpoint?: MemoryChangesCheckpoint): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: MemoryChangesCheckpoint;
    }[]>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<string>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>>;
    remove(): Promise<void>;
    close(): Promise<void>;
}
export declare function createMemoryStorageInstance<RxDocType>(storage: RxStorageMemory, params: RxStorageInstanceCreationParams<RxDocType, RxStorageMemoryInstanceCreationOptions>, settings: RxStorageMemorySettings): Promise<RxStorageInstanceMemory<RxDocType>>;
