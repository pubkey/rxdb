import { Observable } from 'rxjs';
import type { RxStorageInstance, RxStorageChangeEvent, RxDocumentData, BulkWriteRow, RxStorageBulkWriteResponse, RxStorageQueryResult, RxJsonSchema, RxStorageInstanceCreationParams, EventBulk, StringKeys, RxStorageDefaultCheckpoint, RxStorageCountResult, PreparedQuery } from '../../types/index.d.ts';
import type { DenoKVSettings, DenoKVStorageInternals } from './denokv-types.ts';
import { RxStorageDenoKV } from './index.ts';
export declare class RxStorageInstanceDenoKV<RxDocType> implements RxStorageInstance<RxDocType, DenoKVStorageInternals<RxDocType>, DenoKVSettings, RxStorageDefaultCheckpoint> {
    readonly storage: RxStorageDenoKV;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: DenoKVStorageInternals<RxDocType>;
    readonly options: Readonly<DenoKVSettings>;
    readonly settings: DenoKVSettings;
    readonly keySpace: string;
    readonly kvOptions: {
        consistency: "strong" | "eventual";
    };
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$;
    closed?: Promise<void>;
    readonly kvPromise: Promise<any>;
    constructor(storage: RxStorageDenoKV, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: DenoKVStorageInternals<RxDocType>, options: Readonly<DenoKVSettings>, settings: DenoKVSettings, keySpace?: string, kvOptions?: {
        consistency: "strong" | "eventual";
    });
    /**
     * DenoKV has no transactions
     * so we have to ensure that there is no write in between our queries
     * which would confuse RxDB and return wrong query results.
     */
    retryUntilNoWriteInBetween<T>(fn: () => Promise<T>): Promise<T>;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], withDeleted: boolean): Promise<RxDocumentData<RxDocType>[]>;
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    count(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageCountResult>;
    getAttachmentData(documentId: string, attachmentId: string, digest: string): Promise<string>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    close(): Promise<void>;
    remove(): Promise<void>;
}
export declare function createDenoKVStorageInstance<RxDocType>(storage: RxStorageDenoKV, params: RxStorageInstanceCreationParams<RxDocType, DenoKVSettings>, settings: DenoKVSettings): Promise<RxStorageInstanceDenoKV<RxDocType>>;
