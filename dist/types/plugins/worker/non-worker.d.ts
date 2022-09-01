import { Observable } from 'rxjs';
import type { RxJsonSchema, RxStorage, RxStorageInstanceCreationParams, RxStorageInstance, BulkWriteRow, RxDocumentData, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageQueryResult, EventBulk, RxStorageStatics, RxDocumentDataById, RxConflictResultionTask, RxConflictResultionTaskSolution } from '../../types';
import { InWorkerStorage } from './in-worker';
declare type WorkerStorageInternals = {
    rxStorage: RxStorageWorker;
    instanceId: number;
    worker: InWorkerStorage<any, any>;
};
declare type RxStorageWorkerSettings = {
    statics: RxStorageStatics;
    workerInput: any;
};
export declare class RxStorageWorker implements RxStorage<WorkerStorageInternals, any> {
    readonly settings: RxStorageWorkerSettings;
    readonly statics: RxStorageStatics;
    name: string;
    constructor(settings: RxStorageWorkerSettings, statics: RxStorageStatics);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<RxStorageInstanceWorker<RxDocType>>;
}
export declare class RxStorageInstanceWorker<RxDocType> implements RxStorageInstance<RxDocType, WorkerStorageInternals, any, any> {
    readonly storage: RxStorageWorker;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: WorkerStorageInternals;
    readonly options: Readonly<any>;
    /**
     * threads.js uses observable-fns instead of rxjs
     * so we have to transform it.
     */
    private changes$;
    private conflicts$;
    private subs;
    private closed;
    constructor(storage: RxStorageWorker, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: WorkerStorageInternals, options: Readonly<any>);
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>>;
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<string>;
    getChangedDocumentsSince(limit: number, checkpoint?: any): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: any;
    }>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>>;
    cleanup(minDeletedTime: number): Promise<boolean>;
    close(): Promise<void>;
    remove(): Promise<void>;
    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>>;
    resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void>;
}
export declare function getRxStorageWorker(settings: RxStorageWorkerSettings): RxStorageWorker;
/**
 * TODO we have a bug.
 * When the exact same RxStorage opens and closes
 * many RxStorage instances, then it might happen
 * that some calls to createStorageInstance() time out,
 * because the worker thread is in the closing state.
 */
export declare function removeWorkerRef(instance: RxStorageInstanceWorker<any>): Promise<void>;
export {};
