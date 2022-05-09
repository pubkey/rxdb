import { Observable } from 'rxjs';
import type { RxStorageInstance, RxStorageChangeEvent, RxDocumentData, BulkWriteRow, RxStorageBulkWriteResponse, RxStorageQueryResult, RxJsonSchema, RxStorageInstanceCreationParams, EventBulk, PreparedQuery, DexieChangesCheckpoint, StringKeys } from '../../types';
import { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageDexie } from './rx-storage-dexie';
export declare class RxStorageInstanceDexie<RxDocType> implements RxStorageInstance<RxDocType, DexieStorageInternals, DexieSettings> {
    readonly storage: RxStorageDexie;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: DexieStorageInternals;
    readonly options: Readonly<DexieSettings>;
    readonly settings: DexieSettings;
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    private changes$;
    readonly instanceId: number;
    closed: boolean;
    constructor(storage: RxStorageDexie, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: DexieStorageInternals, options: Readonly<DexieSettings>, settings: DexieSettings);
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<{
        [documentId: string]: RxDocumentData<RxDocType>;
    }>;
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    getChangedDocumentsSince(limit: number, checkpoint?: DexieChangesCheckpoint): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: DexieChangesCheckpoint;
    }[]>;
    remove(): Promise<void>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    getAttachmentData(_documentId: string, _attachmentId: string): Promise<string>;
    close(): Promise<void>;
}
export declare function createDexieStorageInstance<RxDocType>(storage: RxStorageDexie, params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>, settings: DexieSettings): Promise<RxStorageInstanceDexie<RxDocType>>;
