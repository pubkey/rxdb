/**
 * This file contains helpers
 * that are in use when the RxStorage run in another JavaScript process,
 * like electron ipcMain/Renderer, WebWorker and so on
 * where we communicate with the main process with the MessageChannel API.
 */
import { Observable, Subject, Subscription } from 'rxjs';
import type { BulkWriteRow, EventBulk, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxDocumentDataById, RxJsonSchema, RxStorage, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, RxStorageStatics } from './types';
export declare type RxStorageMessageFromRemote = {
    instanceId: string;
    answerTo: string;
    method: keyof RxStorageInstance<any, any, any>;
    error?: any;
    return?: any;
};
export declare type RxStorageMessageToRemote = {
    instanceId: string;
    /**
     * Unique ID of the request
     */
    requestId: string;
    method: keyof RxStorageInstance<any, any, any>;
    params: any[];
};
export declare type RxStorageMessageChannelInternals = {
    params: RxStorageInstanceCreationParams<any, any>;
    /**
     * The one of the 2 message ports where we send data to.
     * The other port is send to the remote.
     */
    port: MessagePort;
    messages$: Subject<RxStorageMessageFromRemote>;
};
export declare type CreateRemoteRxStorageMethod = (port: MessagePort, params: RxStorageInstanceCreationParams<any, any>) => void;
declare type RxStorageMessageChannelSettings = {
    name: string;
    statics: RxStorageStatics;
    createRemoteStorage: CreateRemoteRxStorageMethod;
};
export declare class RxStorageMessageChannel implements RxStorage<RxStorageMessageChannelInternals, any> {
    readonly settings: RxStorageMessageChannelSettings;
    readonly statics: RxStorageStatics;
    readonly name: string;
    readonly messageChannelByPort: WeakMap<MessagePort, MessageChannel>;
    constructor(settings: RxStorageMessageChannelSettings);
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
    private lastRequestId;
    private requestIdSeed;
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
export declare function getRxStorageMessageChannel(settings: RxStorageMessageChannelSettings): RxStorageMessageChannel;
export declare type RxMessageChannelExposeSettings = {
    onCreateRemoteStorage$: Subject<{
        port: MessagePort;
        params: RxStorageInstanceCreationParams<any, any>;
    }>;
    /**
     * The original storage
     * which actually stores the data.
     */
    storage: RxStorage<any, any>;
};
/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
export declare function exposeRxStorageMessageChannel(settings: RxMessageChannelExposeSettings): {
    instanceByFullName: Map<string, {
        storageInstance: RxStorageInstance<any, any, any>;
        ports: MessagePort[];
        params: RxStorageInstanceCreationParams<any, any>;
    }>;
    stateByPort: Map<MessagePort, {
        subs: Subscription[];
        state: {
            storageInstance: RxStorageInstance<any, any, any>;
            ports: MessagePort[];
            params: RxStorageInstanceCreationParams<any, any>;
        };
    }>;
};
export {};
