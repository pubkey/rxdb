/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
import type { BlobBuffer, BulkWriteLocalRow, BulkWriteRow, ChangeStreamOnceOptions, EventBulk, RxDocumentData, RxKeyObjectStorageInstanceCreationParams, RxLocalDocumentData, RxLocalStorageBulkWriteResponse, RxStorage, RxStorageBulkWriteResponse, RxStorageChangedDocumentMeta, RxStorageChangeEvent, RxStorageInstanceCreationParams, RxStorageQueryResult } from '../../types';
import { Observable } from 'rxjs';
export declare type InWorkerStorage = {
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<number>;
    bulkWrite<DocumentData>(instanceId: number, documentWrites: BulkWriteRow<DocumentData>[]): Promise<RxStorageBulkWriteResponse<DocumentData>>;
    bulkAddRevisions<DocumentData>(instanceId: number, documents: RxDocumentData<DocumentData>[]): Promise<void>;
    findDocumentsById<DocumentData>(instanceId: number, ids: string[], deleted: boolean): Promise<{
        [documentId: string]: RxDocumentData<DocumentData>;
    }>;
    query<DocumentData>(instanceId: number, preparedQuery: any): Promise<RxStorageQueryResult<DocumentData>>;
    getAttachmentData(instanceId: number, documentId: string, attachmentId: string): Promise<BlobBuffer>;
    getChangedDocuments(instanceId: number, options: ChangeStreamOnceOptions): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }>;
    changeStream<DocumentData>(instanceById: number): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>>;
    close(instanceId: number): Promise<void>;
    remove(instanceId: number): Promise<void>;
    createKeyObjectStorageInstance(params: RxKeyObjectStorageInstanceCreationParams<any>): Promise<number>;
    bulkWriteLocal<DocumentData>(instanceId: number, documentWrites: BulkWriteLocalRow<DocumentData>[]): Promise<RxLocalStorageBulkWriteResponse<DocumentData>>;
    findLocalDocumentsById<DocumentData>(instanceId: number, ids: string[]): Promise<{
        [documentId: string]: RxLocalDocumentData<DocumentData>;
    }>;
};
export declare function wrappedRxStorage<T, D>(args: {
    storage: RxStorage<T, D>;
}): void;
