/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
import type { BulkWriteRow, EventBulk, RxDocumentData, RxDocumentDataById, RxStorage, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageInstanceCreationParams, RxStorageQueryResult } from '../../types';
import { Observable } from 'rxjs';
export declare type InWorkerStorage = {
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<number>;
    bulkWrite<DocumentData>(instanceId: number, documentWrites: BulkWriteRow<DocumentData>[]): Promise<RxStorageBulkWriteResponse<DocumentData>>;
    findDocumentsById<DocumentData>(instanceId: number, ids: string[], deleted: boolean): Promise<RxDocumentDataById<DocumentData>>;
    query<DocumentData>(instanceId: number, preparedQuery: any): Promise<RxStorageQueryResult<DocumentData>>;
    getAttachmentData(instanceId: number, documentId: string, attachmentId: string): Promise<string>;
    getChangedDocumentsSince<RxDocType>(instanceId: number, limit: number, checkpoint: any): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: any;
    }[]>;
    changeStream<DocumentData>(instanceById: number): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>>;
    cleanup(instanceId: number, minDeletedTime: number): Promise<boolean>;
    close(instanceId: number): Promise<void>;
    remove(instanceId: number): Promise<void>;
};
export declare function wrappedWorkerRxStorage<T, D>(args: {
    storage: RxStorage<T, D>;
}): void;
