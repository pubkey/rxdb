import { Observable } from 'rxjs';
import type { RxJsonSchema, RxStorage, RxStorageInstanceCreationParams, RxStorageInstance, BulkWriteRow, ChangeStreamOnceOptions, RxDocumentData, RxStorageBulkWriteResponse, RxStorageChangedDocumentMeta, RxStorageChangeEvent, RxStorageQueryResult, EventBulk, RxStorageStatics } from '../../types';
import { InWorkerStorage } from './in-worker';
declare type WorkerStorageInternals = {
    rxStorage: RxStorageWorker;
    instanceId: number;
    worker: InWorkerStorage;
};
declare type RxStorageWorkerSettings = {
    statics: RxStorageStatics;
    workerInput: any;
};
export declare class RxStorageWorker implements RxStorage<WorkerStorageInternals, any> {
    readonly settings: RxStorageWorkerSettings;
    readonly statics: RxStorageStatics;
    name: string;
    readonly workerPromise: Promise<InWorkerStorage>;
    constructor(settings: RxStorageWorkerSettings, statics: RxStorageStatics);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<RxStorageInstanceWorker<RxDocType>>;
}
export declare class RxStorageInstanceWorker<DocumentData> implements RxStorageInstance<DocumentData, WorkerStorageInternals, any> {
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<DocumentData>>;
    readonly internals: WorkerStorageInternals;
    readonly options: Readonly<any>;
    /**
     * threads.js uses observable-fns instead of rxjs
     * so we have to transform it.
     */
    private changes$;
    private subs;
    constructor(databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<DocumentData>>, internals: WorkerStorageInternals, options: Readonly<any>);
    bulkWrite(documentWrites: BulkWriteRow<DocumentData>[]): Promise<RxStorageBulkWriteResponse<DocumentData>>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<{
        [documentId: string]: RxDocumentData<DocumentData>;
    }>;
    query(preparedQuery: any): Promise<RxStorageQueryResult<DocumentData>>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<string>;
    getChangedDocuments(options: ChangeStreamOnceOptions): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>>;
    cleanup(minDeletedTime: number): Promise<boolean>;
    close(): Promise<void>;
    remove(): Promise<void>;
}
export declare function getRxStorageWorker(settings: RxStorageWorkerSettings): RxStorageWorker;
export {};
