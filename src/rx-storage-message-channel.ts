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
    ensureNotFalsy,
    PROMISE_RESOLVE_VOID,
    randomCouchString
} from './util';

export type RxStorageMessageFromRemote = {
    instanceId: string;
    answerTo: string; // id of the request
    method: keyof RxStorageInstance<any, any, any>;
    error?: any;
    return?: any;
};

export type RxStorageMessageToRemote = {
    instanceId: string;
    /**
     * Unique ID of the request
     */
    requestId: string;
    method: keyof RxStorageInstance<any, any, any>;
    params: any[];
};

export type RxStorageMessageChannelInternals = {
    params: RxStorageInstanceCreationParams<any, any>;
    /**
     * The one of the 2 message ports where we send data to.
     * The other port is send to the remote.
     */
    port: MessagePort;
    messages$: Subject<RxStorageMessageFromRemote>;
};

export type CreateRemoteRxStorageMethod = (
    port: MessagePort,
    params: RxStorageInstanceCreationParams<any, any>
) => void;

declare type RxStorageMessageChannelSettings = {
    name: string;
    statics: RxStorageStatics;
    createRemoteStorage: CreateRemoteRxStorageMethod;
};

export class RxStorageMessageChannel implements RxStorage<RxStorageMessageChannelInternals, any> {
    public readonly statics: RxStorageStatics;
    public readonly name: string;
    public readonly messageChannelByPort = new WeakMap<MessagePort, MessageChannel>();
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
        this.messageChannelByPort.set(messageChannel.port1, messageChannel);
        this.messageChannelByPort.set(messageChannel.port2, messageChannel);
        const port = messageChannel.port1;
        const messages$ = new Subject<RxStorageMessageFromRemote>();
        const waitForOkPromise = firstValueFrom(messages$);
        port.onmessage = msg => {
            messages$.next(msg.data);
        };
        this.settings.createRemoteStorage(
            messageChannel.port2,
            params
        );

        const waitForOkResult = await waitForOkPromise;
        if (waitForOkResult.error) {
            throw new Error('could not create instance ' + waitForOkResult.error.toString());
        }
        return new RxStorageInstanceMessageChannel(
            this,
            params.databaseName,
            params.collectionName,
            params.schema,
            {
                params,
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
            instanceId: this.internals.params.databaseInstanceToken,
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


export type RxMessageChannelExposeSettings = {
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
export function exposeRxStorageMessageChannel(settings: RxMessageChannelExposeSettings) {
    type InstanceState = {
        storageInstance: RxStorageInstance<any, any, any>;
        ports: MessagePort[];
        params: RxStorageInstanceCreationParams<any, any>;
    };
    const instanceByFullName: Map<string, InstanceState> = new Map();
    const stateByPort: Map<MessagePort, {
        subs: Subscription[];
        state: InstanceState;
    }> = new Map();


    /**
     * Create new RxStorageInstances
     * on request.
     */
    settings.onCreateRemoteStorage$.subscribe(async (data) => {
        const params = data.params;
        const port = data.port;
        /**
         * We de-duplicate the storage instances.
         * This makes sense in many environments like
         * electron where on main process contains the storage
         * for multiple renderer processes. Same goes for SharedWorkers etc.
         */
        const fullName = [
            params.databaseName,
            params.collectionName,
            params.schema.version
        ].join('|');

        let state = instanceByFullName.get(fullName);
        if (!state) {
            try {
                const newRxStorageInstance = await settings.storage.createStorageInstance(params);
                state = {
                    storageInstance: newRxStorageInstance,
                    ports: [port],
                    params
                };
                instanceByFullName.set(fullName, state);
            } catch (err) {
                port.postMessage({
                    key: 'error',
                    error: 'could not call createStorageInstance'
                });
                return;
            }
        }
        port.postMessage({ key: 'ok' });
        const subs: Subscription[] = [];
        stateByPort.set(port, {
            state,
            subs
        });

        /**
         * Automatically subscribe to the streams$
         * because we always need them.
         */
        subs.push(
            state.storageInstance.changeStream().subscribe(changes => {
                const message: RxStorageMessageFromRemote = {
                    instanceId: params.databaseInstanceToken,
                    answerTo: 'changestream',
                    method: 'changeStream',
                    return: changes
                };
                port.postMessage(message);
            })
        );
        subs.push(
            state.storageInstance.conflictResultionTasks().subscribe(conflicts => {
                const message: RxStorageMessageFromRemote = {
                    instanceId: params.databaseInstanceToken,
                    answerTo: 'conflictResultionTasks',
                    method: 'conflictResultionTasks',
                    return: conflicts
                };
                port.postMessage(message);
            })
        );


        port.onmessage = async (plainMessage) => {
            const message: RxStorageMessageToRemote = plainMessage.data;
            let result;
            try {
                /**
                 * On calls to 'close()',
                 * we only close the main instance if there are no other
                 * ports connected.
                 */
                if (
                    message.method === 'close' &&
                    ensureNotFalsy(state).ports.length > 1
                ) {
                    const closeBreakResponse: RxStorageMessageFromRemote = {
                        instanceId: params.databaseInstanceToken,
                        answerTo: message.requestId,
                        method: message.method,
                        return: null
                    };
                    port.postMessage(closeBreakResponse);
                    return;
                }

                result = await (ensureNotFalsy(state).storageInstance as any)[message.method](...message.params);
                if (
                    message.method === 'close' ||
                    message.method === 'remove'
                ) {
                    subs.forEach(sub => sub.unsubscribe());
                    ensureNotFalsy(state).ports = ensureNotFalsy(state).ports.filter(p => p !== port);
                    instanceByFullName.delete(fullName);
                    stateByPort.delete(port);
                    /**
                     * TODO how to notify the other ports on remove() ?
                     */
                }
                const response: RxStorageMessageFromRemote = {
                    instanceId: params.databaseInstanceToken,
                    answerTo: message.requestId,
                    method: message.method,
                    return: result
                };
                port.postMessage(response);
            } catch (err) {
                const errorResponse: RxStorageMessageFromRemote = {
                    instanceId: params.databaseInstanceToken,
                    answerTo: message.requestId,
                    method: message.method,
                    error: (err as any).toString()
                };
                port.postMessage(errorResponse);
            }
        };
    });

    return {
        instanceByFullName,
        stateByPort
    };
}
