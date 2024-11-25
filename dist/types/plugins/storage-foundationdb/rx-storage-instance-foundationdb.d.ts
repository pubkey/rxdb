import { Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, PreparedQuery, RxDocumentData, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageDefaultCheckpoint, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, StringKeys } from '../../types/index.d.ts';
import type { FoundationDBStorageInternals, RxStorageFoundationDB, RxStorageFoundationDBInstanceCreationOptions, RxStorageFoundationDBSettings } from './foundationdb-types.ts';
export declare class RxStorageInstanceFoundationDB<RxDocType> implements RxStorageInstance<RxDocType, FoundationDBStorageInternals<RxDocType>, RxStorageFoundationDBInstanceCreationOptions, RxStorageDefaultCheckpoint> {
    readonly storage: RxStorageFoundationDB;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: FoundationDBStorageInternals<RxDocType>;
    readonly options: Readonly<RxStorageFoundationDBInstanceCreationOptions>;
    readonly settings: RxStorageFoundationDBSettings;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    closed?: Promise<void>;
    private changes$;
    constructor(storage: RxStorageFoundationDB, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: FoundationDBStorageInternals<RxDocType>, options: Readonly<RxStorageFoundationDBInstanceCreationOptions>, settings: RxStorageFoundationDBSettings);
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], withDeleted: boolean): Promise<RxDocumentData<RxDocType>[]>;
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    count(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageCountResult>;
    getAttachmentData(documentId: string, attachmentId: string, _digest: string): Promise<string>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocType>, RxStorageDefaultCheckpoint>>;
    remove(): Promise<void>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    close(): Promise<void>;
}
export declare function createFoundationDBStorageInstance<RxDocType>(storage: RxStorageFoundationDB, params: RxStorageInstanceCreationParams<RxDocType, RxStorageFoundationDBInstanceCreationOptions>, settings: RxStorageFoundationDBSettings): Promise<RxStorageInstanceFoundationDB<RxDocType>>;
