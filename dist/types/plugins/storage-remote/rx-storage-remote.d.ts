import { Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxDocumentDataById, RxJsonSchema, RxStorage, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, RxStorageStatics } from '../../types';
import type { MessageFromRemote, RxStorageMessageChannelInternals, RxStorageRemoteSettings } from './storage-remote-types';
export declare class RxStorageMessageChannel implements RxStorage<RxStorageMessageChannelInternals, any> {
    readonly settings: RxStorageRemoteSettings;
    readonly statics: RxStorageStatics;
    readonly name: string;
    readonly messageChannelByPort: WeakMap<MessagePort, MessageChannel>;
    private requestIdSeed;
    private lastRequestId;
    constructor(settings: RxStorageRemoteSettings);
    getRequestId(): string;
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<RxStorageInstanceMessageChannel<RxDocType>>;
}
export declare class RxStorageInstanceMessageChannel<RxDocType> implements RxStorageInstance<RxDocType, RxStorageMessageChannelInternals, any, any> {
    readonly storage: RxStorageMessageChannel;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: RxStorageMessageChannelInternals;
    readonly options: Readonly<any>;
    private changes$;
    private conflicts$;
    private subs;
    private closed;
    messages$: Observable<MessageFromRemote>;
    constructor(storage: RxStorageMessageChannel, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: RxStorageMessageChannelInternals, options: Readonly<any>);
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
export declare function getRxStorageRemote(settings: RxStorageRemoteSettings): RxStorageMessageChannel;
