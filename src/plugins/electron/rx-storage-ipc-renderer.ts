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
} from '../../types';
import {
    PROMISE_RESOLVE_VOID,
    randomCouchString
} from '../../util';
import {
    IpcMessageFromMain,
    IpcMessageFromRenderer,
    IPC_RENDERER_KEY_PREFIX,
    IPC_RENDERER_TO_MAIN
} from './electron-helper';

export type RxStorageIpcRendererInternals = {
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


export class RxStorageIpcRenderer implements RxStorage<RxStorageIpcRendererInternals, any> {
    public name = 'ipc-renderer';

    constructor(
        public readonly settings: RxStorageIpcRendererSettings,
        public readonly statics: RxStorageStatics
    ) { }

    public async invoke<T>(eventName: string, args?: any): Promise<T> {
        const result = await this.settings.ipcRenderer.invoke(
            [
                IPC_RENDERER_KEY_PREFIX,
                'invoke',
                this.settings.key,
                eventName
            ].join('|'),
            args
        );
        if (result.error) {
            throw new Error(result.error);
        } else {
            return result.value;
        }
    }

    public postMessage(eventName: string, args?: any): MessagePort {
        const messageChannel = new MessageChannel();
        this.settings.ipcRenderer.postMessage(
            [
                IPC_RENDERER_KEY_PREFIX,
                'postMessage',
                this.settings.key,
                eventName
            ].join('|'),
            args,
            [messageChannel.port2]
        );
        return messageChannel.port1;
    }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, any>
    ): Promise<RxStorageInstanceIpcRenderer<RxDocType>> {
        const messages$ = new Subject<IpcMessageFromMain>();
        const instanceIdPromise = firstValueFrom(messages$);
        const channelId = randomCouchString(10);
        const port = this.postMessage(
            'createStorageInstance',
            Object.assign({}, params, { channelId }));
        port.onmessage = msg => {
            messages$.next(msg.data);
        };
        const instanceIdResult = await instanceIdPromise;
        if (instanceIdResult.error) {
            throw new Error('could not create instance ' + instanceIdResult.error.toString());
        }
        const instanceId: string = instanceIdResult.return;
        return new RxStorageInstanceIpcRenderer(
            this,
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                channelId,
                instanceId,
                port,
                messages$,
                rxStorage: this,
                ipcRenderer: this.settings.ipcRenderer
            },
            params.options
        );
    }
}


export class RxStorageInstanceIpcRenderer<RxDocType> implements RxStorageInstance<RxDocType, RxStorageIpcRendererInternals, any, any> {
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>> = new Subject();
    private conflicts$: Subject<RxConflictResultionTask<RxDocType>> = new Subject();
    private subs: Subscription[] = [];

    private closed: boolean = false;
    public readonly instanceId: string;
    private lastRequestId: number = 0;
    private requestIdSeed: string = randomCouchString(19);

    constructor(
        public readonly storage: RxStorageIpcRenderer,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: RxStorageIpcRendererInternals,
        public readonly options: Readonly<any>
    ) {

        this.instanceId = internals.instanceId;

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

    public async requestMain(
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
        const message: IpcMessageFromRenderer = {
            channelId: this.internals.channelId,
            requestId,
            method: methodName,
            params
        };
        this.internals.ipcRenderer.send(IPC_RENDERER_TO_MAIN, message);
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
        return this.requestMain('bulkWrite', [documentWrites, context]);
    }


    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>> {
        return this.requestMain('findDocumentsById', [ids, deleted]);
    }
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>> {
        return this.requestMain('query', [preparedQuery]);
    }
    count(preparedQuery: any): Promise<RxStorageCountResult> {
        return this.requestMain('count', [preparedQuery]);
    }
    getAttachmentData(documentId: string, attachmentId: string): Promise<string> {
        return this.requestMain('getAttachmentData', [documentId, attachmentId]);
    }
    getChangedDocumentsSince(
        limit: number,
        checkpoint?: any
    ): Promise<
        {
            documents: RxDocumentData<RxDocType>[];
            checkpoint: any;
        }> {
        return this.requestMain('getChangedDocumentsSince', [limit, checkpoint]);
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>> {
        return this.changes$.asObservable();
    }
    cleanup(minDeletedTime: number): Promise<boolean> {
        return this.requestMain('cleanup', [minDeletedTime]);
    }
    async close(): Promise<void> {
        if (this.closed) {
            return PROMISE_RESOLVE_VOID;
        }
        this.closed = true;
        this.subs.forEach(sub => sub.unsubscribe());
        this.changes$.complete();
        await this.requestMain('close', []);
        this.internals.port.close();
    }
    async remove(): Promise<void> {
        await this.requestMain('remove', []);
        return this.close();
    }

    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return this.conflicts$;
    }
    async resolveConflictResultionTask(taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> {
        await this.requestMain('resolveConflictResultionTask', [taskSolution]);
    }
}
export function getRxStorageIpcRenderer(
    settings: RxStorageIpcRendererSettings
): RxStorageIpcRenderer {
    const storage = new RxStorageIpcRenderer(settings, settings.statics);
    return storage;
}
