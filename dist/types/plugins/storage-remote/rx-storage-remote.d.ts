import { Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, RxDocumentData, RxJsonSchema, RxStorage, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult } from '../../types/index.d.ts';
import type { MessageFromRemote, RemoteMessageChannel, RxStorageRemoteInternals, RxStorageRemoteSettings } from './storage-remote-types.ts';
export declare class RxStorageRemote implements RxStorage<RxStorageRemoteInternals, any> {
    readonly settings: RxStorageRemoteSettings;
    readonly name: string;
    readonly rxdbVersion = "16.21.1";
    private seed;
    private lastRequestId;
    messageChannelIfOneMode?: Promise<RemoteMessageChannel>;
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
    private subs;
    private closed?;
    messages$: Observable<MessageFromRemote>;
    constructor(storage: RxStorageRemote, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: RxStorageRemoteInternals, options: Readonly<any>);
    private requestRemote;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentData<RxDocType>[]>;
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>>;
    count(preparedQuery: any): Promise<RxStorageCountResult>;
    getAttachmentData(documentId: string, attachmentId: string, digest: string): Promise<string>;
    getChangedDocumentsSince(limit: number, checkpoint?: any): Promise<{
        documents: RxDocumentData<RxDocType>[];
        checkpoint: any;
    }>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>>;
    cleanup(minDeletedTime: number): Promise<boolean>;
    close(): Promise<void>;
    remove(): Promise<void>;
}
export declare function getRxStorageRemote(settings: RxStorageRemoteSettings): RxStorageRemote;
