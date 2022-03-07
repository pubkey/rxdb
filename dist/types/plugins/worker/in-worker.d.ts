/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
import type { BulkWriteRow, ChangeStreamOnceOptions, EventBulk, RxDocumentData, RxStorage, RxStorageBulkWriteResponse, RxStorageChangedDocumentMeta, RxStorageChangeEvent, RxStorageInstanceCreationParams, RxStorageQueryResult } from '../../types';
import { Observable } from 'rxjs';
export declare type InWorkerStorage = {
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<number>;
    bulkWrite<DocumentData>(instanceId: number, documentWrites: BulkWriteRow<DocumentData>[]): Promise<RxStorageBulkWriteResponse<DocumentData>>;
    findDocumentsById<DocumentData>(instanceId: number, ids: string[], deleted: boolean): Promise<{
        [documentId: string]: RxDocumentData<DocumentData>;
    }>;
    query<DocumentData>(instanceId: number, preparedQuery: any): Promise<RxStorageQueryResult<DocumentData>>;
    getAttachmentData(instanceId: number, documentId: string, attachmentId: string): Promise<string>;
    getChangedDocuments(instanceId: number, options: ChangeStreamOnceOptions): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }>;
    changeStream<DocumentData>(instanceById: number): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>>;
    close(instanceId: number): Promise<void>;
    remove(instanceId: number): Promise<void>;
};
export declare function wrappedRxStorage<T, D>(args: {
    storage: RxStorage<T, D>;
}): void;
