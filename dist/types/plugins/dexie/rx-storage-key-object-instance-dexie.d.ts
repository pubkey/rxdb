import { Observable } from 'rxjs';
import type { BulkWriteLocalRow, DexieSettings, DexieStorageInternals, EventBulk, RxKeyObjectStorageInstanceCreationParams, RxLocalDocumentData, RxLocalStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageKeyObjectInstance } from '../../types';
import { RxStorageDexie } from './rx-storage-dexie';
export declare class RxStorageKeyObjectInstanceDexie implements RxStorageKeyObjectInstance<DexieStorageInternals, DexieSettings> {
    readonly storage: RxStorageDexie;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly internals: DexieStorageInternals;
    readonly options: Readonly<DexieSettings>;
    readonly settings: DexieSettings;
    private changes$;
    instanceId: number;
    closed: boolean;
    constructor(storage: RxStorageDexie, databaseName: string, collectionName: string, internals: DexieStorageInternals, options: Readonly<DexieSettings>, settings: DexieSettings);
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
export declare function createDexieKeyObjectStorageInstance(storage: RxStorageDexie, params: RxKeyObjectStorageInstanceCreationParams<DexieSettings>, settings: DexieSettings): Promise<RxStorageKeyObjectInstanceDexie>;
