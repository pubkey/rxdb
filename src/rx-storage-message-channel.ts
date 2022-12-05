/**
 * This file contains helpers
 * that are in use when the RxStorage run in another JavaScript process,
 * like electron ipcMain/Renderer, WebWorker and so on
 * where we communicate with the main process with the MessageChannel API.
 */

import {
    filter,
    firstValueFrom,
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import type {
    BulkWriteRow,
    EventBulk,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxDocumentData,
    RxDocumentDataById,
    RxJsonSchema,
    RxStorage,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageCountResult,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult,
    RxStorageStatics
} from './types';
import {
    PROMISE_RESOLVE_VOID,
    randomCouchString
} from './util';

export type RxStorageMessageFromRemote = {
    answerTo: string; // id of the request
    method: keyof RxStorageInstance<any, any, any>;
    error?: any;
    return?: any;
};

export type RxStorageMessageToRemote = {
    /**
     * Unique ID of the request
     */
    requestId: string;
    method: keyof RxStorageInstance<any, any, any>;
    params: any[];
};

export type RxStorageMessageChannelInternals = {
    /**
     * The one of the 2 message ports where we send data to.
     * The other port is send to the remote.
     */
    port: MessagePort;
    messages$: Subject<RxStorageMessageFromRemote>;
};

export type CreateRemoteRxStorageMethod = (port: MessagePort, params: RxStorageInstanceCreationParams<any, any>) => void;

declare type RxStorageMessageChannelSettings = {
    name: string;
    statics: RxStorageStatics;
    createRemoteStorage: CreateRemoteRxStorageMethod;
};

export class RxStorageMessageChannel implements RxStorage<RxStorageMessageChannelInternals, any> {
    public readonly statics: RxStorageStatics;
    public readonly name: string;
    constructor(
        public readonly settings: RxStorageMessageChannelSettings
    ) {
        this.name = settings.name;
        this.statics = settings.statics;
    }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, any>
    ): Promise<RxStorageInstanceMessageChannel<RxDocType>> {
        const messageChannel = new MessageChannel();
        const port = messageChannel.port1;
        const messages$ = new Subject<RxStorageMessageFromRemote>();
        const instanceIdPromise = firstValueFrom(messages$);
        port.onmessage = msg => {
            messages$.next(msg.data);
        };
        this.settings.createRemoteStorage(messageChannel.port2, params);

        const instanceIdResult = await instanceIdPromise;
        if (instanceIdResult.error) {
            throw new Error('could not create instance ' + instanceIdResult.error.toString());
        }

        return new RxStorageInstanceMessageChannel(
            this,
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                port,
                messages$
            },
            params.options
        );
    }
}

export class RxStorageInstanceMessageChannel<RxDocType> implements RxStorageInstance<RxDocType, RxStorageMessageChannelInternals, any, any> {
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>> = new Subject();
    private conflicts$: Subject<RxConflictResultionTask<RxDocType>> = new Subject();
    private subs: Subscription[] = [];

    private closed: boolean = false;
    private lastRequestId: number = 0;
    private requestIdSeed: string = randomCouchString(19);

    constructor(
        public readonly storage: RxStorageMessageChannel,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: RxStorageMessageChannelInternals,
        public readonly options: Readonly<any>
    ) {
        this.subs.push(
            internals.messages$.subscribe(msg => {
                if (msg.method === 'changeStream') {
                    this.changes$.next(msg.return);
                }
                if (msg.method === 'conflictResultionTasks') {
                    this.conflicts$.next(msg.return);
                }
            })
        );
    }

    private async requestRemote(
        methodName: keyof RxStorageInstance<any, any, any>,
        params: any
    ) {
        const requestIdNr = this.lastRequestId++;
        const requestId = this.requestIdSeed + '|' + requestIdNr;
        const responsePromise = firstValueFrom(
            this.internals.messages$.pipe(
                filter(msg => msg.answerTo === requestId)
            )
        );
        const message: RxStorageMessageToRemote = {
            requestId,
            method: methodName,
            params
        };
        this.internals.port.postMessage(message);
        const response = await responsePromise;
        if (response.error) {
            throw new Error(response.error);
        } else {
            return response.return;
        }
    }

    bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        return this.requestRemote('bulkWrite', [documentWrites, context]);
    }
    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>> {
        return this.requestRemote('findDocumentsById', [ids, deleted]);
    }
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>> {
        return this.requestRemote('query', [preparedQuery]);
    }
    count(preparedQuery: any): Promise<RxStorageCountResult> {
        return this.requestRemote('count', [preparedQuery]);
    }
    getAttachmentData(documentId: string, attachmentId: string): Promise<string> {
        return this.requestRemote('getAttachmentData', [documentId, attachmentId]);
    }
    getChangedDocumentsSince(
        limit: number,
        checkpoint?: any
    ): Promise<
        {
            documents: RxDocumentData<RxDocType>[];
            checkpoint: any;
        }> {
        return this.requestRemote('getChangedDocumentsSince', [limit, checkpoint]);
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>> {
        return this.changes$.asObservable();
    }
    cleanup(minDeletedTime: number): Promise<boolean> {
        return this.requestRemote('cleanup', [minDeletedTime]);
    }
    async close(): Promise<void> {
        if (this.closed) {
            return PROMISE_RESOLVE_VOID;
        }
        this.closed = true;
        this.subs.forEach(sub => sub.unsubscribe());
        this.changes$.complete();
        await this.requestRemote('close', []);
        this.internals.port.close();
    }
    async remove(): Promise<void> {
        await this.requestRemote('remove', []);
        return this.close();
    }

    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return this.conflicts$;
    }
    async resolveConflictResultionTask(taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> {
        await this.requestRemote('resolveConflictResultionTask', [taskSolution]);
    }
}

export function getRxStorageMessageChannel(settings: RxStorageMessageChannelSettings) {
    return new RxStorageMessageChannel(settings);
}
