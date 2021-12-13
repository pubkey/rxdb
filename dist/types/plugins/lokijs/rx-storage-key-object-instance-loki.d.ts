import { Observable } from 'rxjs';
import type { BulkWriteLocalRow, EventBulk, LokiDatabaseSettings, LokiLocalDatabaseState, LokiSettings, LokiStorageInternals, RxKeyObjectStorageInstanceCreationParams, RxLocalDocumentData, RxLocalStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageKeyObjectInstance } from '../../types';
import { RxStorageLoki } from './rx-storage-lokijs';
export declare class RxStorageKeyObjectInstanceLoki implements RxStorageKeyObjectInstance<LokiStorageInternals, LokiSettings> {
    readonly storage: RxStorageLoki;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly internals: LokiStorageInternals;
    readonly options: Readonly<LokiSettings>;
    readonly databaseSettings: LokiDatabaseSettings;
    private changes$;
    instanceId: number;
    private closed;
    constructor(storage: RxStorageLoki, databaseName: string, collectionName: string, internals: LokiStorageInternals, options: Readonly<LokiSettings>, databaseSettings: LokiDatabaseSettings);
    private getLocalState;
    /**
     * If the local state must be used, that one is returned.
     * Returns false if a remote instance must be used.
     */
    mustUseLocalState(): Promise<LokiLocalDatabaseState | false>;
    private requestRemoteInstance;
    bulkWrite<RxDocType>(documentWrites: BulkWriteLocalRow<RxDocType>[]): Promise<RxLocalStorageBulkWriteResponse<RxDocType>>;
    findLocalDocumentsById<RxDocType = any>(ids: string[]): Promise<{
        [documentId: string]: RxLocalDocumentData<RxDocType>;
    }>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxLocalDocumentData<{
        [key: string]: any;
    }>>>>;
    close(): Promise<void>;
    remove(): Promise<void>;
}
export declare function createLokiKeyValueLocalState(params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>, databaseSettings: LokiDatabaseSettings): Promise<LokiLocalDatabaseState>;
export declare function createLokiKeyObjectStorageInstance(storage: RxStorageLoki, params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>, databaseSettings: LokiDatabaseSettings): Promise<RxStorageKeyObjectInstanceLoki>;
