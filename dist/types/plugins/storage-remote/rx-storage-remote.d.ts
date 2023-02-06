import { Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxDocumentDataById, RxJsonSchema, RxStorage, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, RxStorageStatics } from '../../types';
import type { MessageFromRemote, RxStorageRemoteInternals, RxStorageRemoteSettings } from './storage-remote-types';
export declare class RxStorageRemote implements RxStorage<RxStorageRemoteInternals, any> {
    readonly settings: RxStorageRemoteSettings;
    readonly statics: RxStorageStatics;
    readonly name: string;
    private requestIdSeed;
    private lastRequestId;
    constructor(settings: RxStorageRemoteSettings);
    getRequestId(): string;
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<RxStorageInstanceRemote<RxDocType>>;
    customRequest<In, Out>(data: In): Promise<Out>;
}
export declare class RxStorageInstanceRemote<RxDocType> implements RxStorageInstance<RxDocType, RxStorageRemoteInternals, any, any> {
    readonly storage: RxStorageRemote;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: RxStorageRemoteInternals;
    readonly options: Readonly<any>;
    private changes$;
    private conflicts$;
    private subs;
    private closed;
    messages$: Observable<MessageFromRemote>;
    constructor(storage: RxStorageRemote, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: RxStorageRemoteInternals, options: Readonly<any>);
    private requestRemote;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>>;
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>>;
    count(preparedQuery: any): Promise<RxStorageCountResult>;
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
    resolveConflictResultionTask(taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void>;
}
export declare function getRxStorageRemote(settings: RxStorageRemoteSettings): RxStorageRemote;
