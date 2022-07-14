/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
import type { BulkWriteRow, EventBulk, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxDocumentDataById, RxStorage, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageInstanceCreationParams, RxStorageQueryResult } from '../../types';
import { Observable } from 'rxjs';
export declare type InWorkerStorage<RxDocType, CheckpointType> = {
    createStorageInstance(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<number>;
    bulkWrite(instanceId: number, documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(instanceId: number, ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>>;
    query(instanceId: number, preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>>;
    getAttachmentData(instanceId: number, documentId: string, attachmentId: string): Promise<string>;
    getChangedDocumentsSince(instanceId: number, limit: number, checkpoint?: CheckpointType): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: any;
    }[]>;
    changeStream(instanceById: number): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, CheckpointType>>;
    cleanup(instanceId: number, minDeletedTime: number): Promise<boolean>;
    close(instanceId: number): Promise<void>;
    remove(instanceId: number): Promise<void>;
    conflictResultionTasks(instanceById: number): Observable<RxConflictResultionTask<RxDocType>>;
    resolveConflictResultionTask(instanceById: number, taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void>;
};
export declare function wrappedWorkerRxStorage<T, D, CheckpointType = any>(args: {
    storage: RxStorage<T, D>;
}): void;
