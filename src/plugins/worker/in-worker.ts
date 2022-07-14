/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
import type {
    BulkWriteRow,
    EventBulk,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxDocumentData,
    RxDocumentDataById,
    RxStorage,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult
} from '../../types';
import { expose } from 'threads/worker';
import { getFromMapOrThrow } from '../../util';
import { Observable } from 'rxjs';


export type InWorkerStorage<RxDocType, CheckpointType> = {
    createStorageInstance(
        params: RxStorageInstanceCreationParams<RxDocType, any>
    ): Promise<number>;
    bulkWrite(
        instanceId: number,
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(
        instanceId: number,
        ids: string[], deleted: boolean
    ): Promise<RxDocumentDataById<RxDocType>>;
    query(
        instanceId: number,
        preparedQuery: any
    ): Promise<RxStorageQueryResult<RxDocType>>;
    getAttachmentData(
        instanceId: number,
        documentId: string,
        attachmentId: string
    ): Promise<string>;
    getChangedDocumentsSince(
        instanceId: number,
        limit: number,
        checkpoint?: CheckpointType
    ): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: any;
    }[]>;
    changeStream(
        instanceById: number
    ): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, CheckpointType>>;
    cleanup(instanceId: number, minDeletedTime: number): Promise<boolean>;
    close(instanceId: number): Promise<void>;
    remove(instanceId: number): Promise<void>;

    conflictResultionTasks(
        instanceById: number
    ): Observable<RxConflictResultionTask<RxDocType>>;
    resolveConflictResultionTask(
        instanceById: number,
        taskSolution: RxConflictResultionTaskSolution<RxDocType>
    ): Promise<void>;
}

export function wrappedWorkerRxStorage<T, D, CheckpointType = any>(
    args: {
        storage: RxStorage<T, D>
    }
) {
    let nextId = 0;
    const instanceById: Map<number, any> = new Map();

    const exposeMe: InWorkerStorage<any, CheckpointType> = {
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
            documentWrites: BulkWriteRow<DocumentData>[],
            context: string
        ) {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.bulkWrite(documentWrites, context);
        },
        findDocumentsById<DocumentData>(
            instanceId: number,
            ids: string[],
            deleted: boolean
        ): Promise<RxDocumentDataById<DocumentData>> {
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
        getChangedDocumentsSince<RxDocType>(
            instanceId: number,
            limit: number,
            checkpoint: any
        ): Promise<{
            document: RxDocumentData<RxDocType>;
            checkpoint: any;
        }[]> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.getChangedDocumentsSince(
                limit,
                checkpoint
            );
        },
        changeStream<DocumentData>(
            instanceId: number
        ): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>, CheckpointType>> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.changeStream();
        },
        cleanup(
            instanceId: number,
            minDeletedTime: number
        ) {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.cleanup(minDeletedTime);
        },
        close(instanceId: number) {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.close();
        },
        remove(instanceId: number) {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.remove();
        },

        conflictResultionTasks<RxDocType>(
            instanceId: number
        ): Observable<RxConflictResultionTask<RxDocType>> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.conflictResultionTasks();
        },
        resolveConflictResultionTask<RxDocType>(
            instanceId: number,
            taskSolution: RxConflictResultionTaskSolution<RxDocType>
        ): Promise<void> {
            const instance = getFromMapOrThrow(instanceById, instanceId);
            return instance.resolveConflictResultionTask(taskSolution);
        }
    }
    expose(exposeMe);
}
