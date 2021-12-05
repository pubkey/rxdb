/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
import type {
    BlobBuffer,
    BulkWriteLocalRow,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    RxDocumentData,
    RxKeyObjectStorageInstanceCreationParams,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
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
    bulkAddRevisions<DocumentData>(
        instanceId: number,
        documents: RxDocumentData<DocumentData>[]
    ): Promise<void>;
    findDocumentsById<DocumentData>(
        instanceId: number,
        ids: string[], deleted: boolean
    ): Promise<Map<string, RxDocumentData<DocumentData>>>;
    query<DocumentData>(
        instanceId: number,
        preparedQuery: any
    ): Promise<RxStorageQueryResult<DocumentData>>;
    getAttachmentData(
        instanceId: number,
        documentId: string,
        attachmentId: string
    ): Promise<BlobBuffer>;
    getChangedDocuments(
        instanceId: number,
        options: ChangeStreamOnceOptions
    ): Promise<{
        changedDocuments: RxStorageChangedDocumentMeta[];
        lastSequence: number;
    }>;
    changeStream<DocumentData>(
        instanceById: number
    ): Observable<RxStorageChangeEvent<RxDocumentData<DocumentData>>>;
    close(instanceId: number): Promise<void>;
    remove(instanceId: number): Promise<void>;

    createKeyObjectStorageInstance(
        params: RxKeyObjectStorageInstanceCreationParams<any>
    ): Promise<number>;
    bulkWriteLocal<DocumentData>(
        instanceId: number,
        documentWrites: BulkWriteLocalRow<DocumentData>[]): Promise<RxLocalStorageBulkWriteResponse<DocumentData>>;
    findLocalDocumentsById<DocumentData>(
        instanceId: number,
        ids: string[]
    ): Promise<Map<string, RxLocalDocumentData<DocumentData>>>;
}

export function wrappedRxStorage<T, D>(
    rxStorage: RxStorage<T, D>
) {
    let nextId = 0;
    const instanceById: Map<number, any> = new Map();

    const exposeMe: InWorkerStorage = {
        /**
         * RxStorageInstance
         */
        async createStorageInstance(params) {
            const instanceId = nextId++;
            const instance = await rxStorage.createStorageInstance(params);
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
        bulkAddRevisions<DocumentData>(
            instanceId: number,
            documents: RxDocumentData<DocumentData>[]
        ) {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.bulkAddRevisions(documents);
        },
        findDocumentsById<DocumentData>(
            instanceId: number,
            ids: string[],
            deleted: boolean
        ): Promise<Map<string, RxDocumentData<DocumentData>>> {
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
        ): Promise<BlobBuffer> {
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
        ): Observable<RxStorageChangeEvent<RxDocumentData<DocumentData>>> {
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
        },

        /**
         * RxKeyObjectStorageInstance
         */
        async createKeyObjectStorageInstance(params) {
            const instanceId = nextId++;
            const instance = await rxStorage.createKeyObjectStorageInstance(params);
            instanceById.set(instanceId, instance);
            return instanceId;
        },
        bulkWriteLocal<DocumentData>(
            instanceId: number,
            documentWrites: BulkWriteLocalRow<DocumentData>[]
        ): Promise<RxLocalStorageBulkWriteResponse<DocumentData>> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.bulkWrite(documentWrites);
        },
        findLocalDocumentsById<DocumentData>(
            instanceId: number,
            ids: string[]
        ): Promise<Map<string, RxLocalDocumentData<DocumentData>>> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.findLocalDocumentsById(ids);
        }
    }
    expose(exposeMe);
}
