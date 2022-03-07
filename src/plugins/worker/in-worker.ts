/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
import type {
    BulkWriteRow,
    ChangeStreamOnceOptions,
    EventBulk,
    RxDocumentData,
    RxStorage,
    RxStorageBulkWriteResponse,
    RxStorageChangedDocumentMeta,
    RxStorageChangeEvent,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult
} from '../../types';
import { expose } from 'threads/worker';
import { getFromMapOrThrow } from '../../util';
import { Observable } from 'rxjs';


export type InWorkerStorage = {
    createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, any>
    ): Promise<number>;
    bulkWrite<DocumentData>(
        instanceId: number,
        documentWrites: BulkWriteRow<DocumentData>[]
    ): Promise<RxStorageBulkWriteResponse<DocumentData>>;
    findDocumentsById<DocumentData>(
        instanceId: number,
        ids: string[], deleted: boolean
    ): Promise<{ [documentId: string]: RxDocumentData<DocumentData> }>;
    query<DocumentData>(
        instanceId: number,
        preparedQuery: any
    ): Promise<RxStorageQueryResult<DocumentData>>;
    getAttachmentData(
        instanceId: number,
        documentId: string,
        attachmentId: string
    ): Promise<string>;
    getChangedDocuments(
        instanceId: number,
        options: ChangeStreamOnceOptions
    ): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }>;
    changeStream<DocumentData>(
        instanceById: number
    ): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>>;
    close(instanceId: number): Promise<void>;
    remove(instanceId: number): Promise<void>;
}

export function wrappedRxStorage<T, D>(
    args: {
        storage: RxStorage<T, D>
    }
) {
    let nextId = 0;
    const instanceById: Map<number, any> = new Map();

    const exposeMe: InWorkerStorage = {
        /**
         * RxStorageInstance
         */
        async createStorageInstance(params) {
            const instanceId = nextId++;
            const instance = await args.storage.createStorageInstance(params);
            instanceById.set(instanceId, instance);
            return instanceId;
        },
        bulkWrite<DocumentData>(
            instanceId: number,
            documentWrites: BulkWriteRow<DocumentData>[]
        ) {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.bulkWrite(documentWrites);
        },
        findDocumentsById<DocumentData>(
            instanceId: number,
            ids: string[],
            deleted: boolean
        ): Promise<{ [documentId: string]: RxDocumentData<DocumentData> }> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.findDocumentsById(ids, deleted);
        },
        query<DocumentData>(
            instanceId: number,
            preparedQuery: any
        ): Promise<RxStorageQueryResult<DocumentData>> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.query(preparedQuery);
        },
        getAttachmentData(
            instanceId: number,
            documentId: string,
            attachmentId: string
        ): Promise<string> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.getAttachmentData(
                documentId,
                attachmentId
            );
        },
        getChangedDocuments(
            instanceId: number,
            options: ChangeStreamOnceOptions
        ): Promise<{
            changedDocuments: RxStorageChangedDocumentMeta[];
            lastSequence: number;
        }> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.getChangedDocuments(
                options
            );
        },
        changeStream<DocumentData>(
            instanceId: number
        ): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.changeStream();
        },
        close(instanceId: number) {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.close();
        },
        remove(instanceId: number) {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.remove();
        }
    }
    expose(exposeMe);
}
