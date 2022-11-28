import { Observable, Subject } from 'rxjs';
import type { BulkWriteRow, EventBulk, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxDocumentDataById, RxJsonSchema, RxStorage, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, RxStorageStatics } from '../../types';
import { IpcMessageFromMain } from './electron-helper';
export declare type RxStorageIpcRendererInternals = {
    channelId: string;
    rxStorage: RxStorageIpcRenderer;
    port: MessagePort;
    messages$: Subject<IpcMessageFromMain>;
    instanceId: string;
    ipcRenderer: any;
};
declare type RxStorageIpcRendererSettings = {
    key: string;
    statics: RxStorageStatics;
    ipcRenderer: any;
};
export declare class RxStorageIpcRenderer implements RxStorage<RxStorageIpcRendererInternals, any> {
    readonly settings: RxStorageIpcRendererSettings;
    readonly statics: RxStorageStatics;
    name: string;
    constructor(settings: RxStorageIpcRendererSettings, statics: RxStorageStatics);
    invoke<T>(eventName: string, args?: any): Promise<T>;
    postMessage(eventName: string, args?: any): MessagePort;
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, any>): Promise<RxStorageInstanceIpcRenderer<RxDocType>>;
}
export declare class RxStorageInstanceIpcRenderer<RxDocType> implements RxStorageInstance<RxDocType, RxStorageIpcRendererInternals, any, any> {
    readonly storage: RxStorageIpcRenderer;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: RxStorageIpcRendererInternals;
    readonly options: Readonly<any>;
    private changes$;
    private conflicts$;
    private subs;
    private closed;
    readonly instanceId: string;
    private lastRequestId;
    private requestIdSeed;
    constructor(storage: RxStorageIpcRenderer, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: RxStorageIpcRendererInternals, options: Readonly<any>);
    requestMain(methodName: keyof RxStorageInstance<any, any, any>, params: any): Promise<any>;
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
export declare function getRxStorageIpcRenderer(settings: RxStorageIpcRendererSettings): RxStorageIpcRenderer;
export {};
