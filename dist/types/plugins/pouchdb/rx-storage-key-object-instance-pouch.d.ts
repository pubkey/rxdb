import { Observable } from 'rxjs';
import type { RxStorageKeyObjectInstance, RxStorageChangeEvent, RxLocalDocumentData, BulkWriteLocalRow, RxLocalStorageBulkWriteResponse, PouchSettings, EventBulk } from '../../types';
import { PouchStorageInternals } from './pouchdb-helper';
export declare class RxStorageKeyObjectInstancePouch implements RxStorageKeyObjectInstance<PouchStorageInternals, PouchSettings> {
    readonly databaseName: string;
    readonly collectionName: string;
    readonly internals: Readonly<PouchStorageInternals>;
    readonly options: Readonly<PouchSettings>;
    private changes$;
    constructor(databaseName: string, collectionName: string, internals: Readonly<PouchStorageInternals>, options: Readonly<PouchSettings>);
    close(): Promise<void>;
    remove(): Promise<void>;
    bulkWrite<D = any>(documentWrites: BulkWriteLocalRow<D>[]): Promise<RxLocalStorageBulkWriteResponse<D>>;
    findLocalDocumentsById<D = any>(ids: string[]): Promise<{
        [documentId: string]: RxLocalDocumentData<D>;
    }>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxLocalDocumentData>>>;
}
