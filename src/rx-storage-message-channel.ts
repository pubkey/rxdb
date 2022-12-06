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
    connectionId: string;
    answerTo: string; // id of the request
    method: keyof RxStorageInstance<any, any, any> | 'createRxStorageInstance';
    error?: any;
    return?: any;
};

export type RxStorageMessageToRemote = {
    connectionId: string;
    /**
     * Unique ID of the request
     */
    requestId: string;
    method: keyof RxStorageInstance<any, any, any>;
    params: any[];
};

export type RxStorageCreateConnectionMessage = {
    isCreate: true;
    requestId: string;
    params: RxStorageInstanceCreationParams<any, any>;
};

export type RxStorageMessageChannelInternals = {
    params: RxStorageInstanceCreationParams<any, any>;
    connectionId: string;
};

export type CreateRemoteRxStorageMethod = (
    port: MessagePort,
    params: RxStorageInstanceCreationParams<any, any>
) => void;

export type RxStorageMessageChannelSettings = {
    name: string;
    statics: RxStorageStatics;
    send(msg: RxStorageMessageToRemote | RxStorageCreateConnectionMessage): void;
    messages$: Observable<RxStorageMessageFromRemote>;
};

export type RxMessageChannelExposeSettings = {
    send(msg: RxStorageMessageFromRemote): void;
    messages$: Observable<RxStorageMessageToRemote | RxStorageCreateConnectionMessage>;
    /**
     * The original storage
     * which actually stores the data.
     */
    storage: RxStorage<any, any>;
};

export class RxStorageMessageChannel implements RxStorage<RxStorageMessageChannelInternals, any> {
    public readonly statics: RxStorageStatics;
    public readonly name: string;
    public readonly messageChannelByPort = new WeakMap<MessagePort, MessageChannel>();
    private requestIdSeed: string = randomCouchString(10);
    private lastRequestId: number = 0;
    constructor(
        public readonly settings: RxStorageMessageChannelSettings
    ) {
        this.name = settings.name;
        this.statics = settings.statics;
    }

    public getRequestId() {
        const newId = this.lastRequestId++;
        return this.requestIdSeed + '|' + newId;
    }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, any>
    ): Promise<RxStorageInstanceMessageChannel<RxDocType>> {

        const requestId = this.getRequestId();
        const waitForOkPromise = firstValueFrom(this.settings.messages$.pipe(
            filter(msg => msg.answerTo === requestId)
        ));
        this.settings.send({
            isCreate: true,
            requestId,
            params
        });

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
                connectionId: ensureNotFalsy(waitForOkResult.connectionId)
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
    messages$: Observable<RxStorageMessageFromRemote>;

    constructor(
        public readonly storage: RxStorageMessageChannel,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: RxStorageMessageChannelInternals,
        public readonly options: Readonly<any>
    ) {
        this.messages$ = this.storage.settings.messages$.pipe(
            filter(msg => msg.connectionId === this.internals.connectionId)
        );
        this.subs.push(
            this.messages$.subscribe(msg => {
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
        const requestId = this.storage.getRequestId();
        const responsePromise = firstValueFrom(
            this.messages$.pipe(
                filter(msg => msg.answerTo === requestId)
            )
        );
        const message: RxStorageMessageToRemote = {
            connectionId: this.internals.connectionId,
            requestId,
            method: methodName,
            params
        };
        this.storage.settings.send(message);
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

/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
export function exposeRxStorageMessageChannel(settings: RxMessageChannelExposeSettings) {
    type InstanceState = {
        storageInstance: RxStorageInstance<any, any, any>;
        connectionIds: Set<string>;
        params: RxStorageInstanceCreationParams<any, any>;
    };
    const instanceByFullName: Map<string, InstanceState> = new Map();
    const stateByPort: Map<MessagePort, {
        subs: Subscription[];
        state: InstanceState;
    }> = new Map();



    settings.messages$.pipe(
        filter(msg => !!(msg as RxStorageCreateConnectionMessage).isCreate)
    ).subscribe(async (plainMsg) => {
        const msg: RxStorageCreateConnectionMessage = plainMsg as any;
        const connectionId = randomCouchString(10);
        const params = msg.params;
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
                    connectionIds: new Set(),
                    params
                };
                instanceByFullName.set(fullName, state);
            } catch (err: any) {
                settings.send({
                    answerTo: msg.requestId,
                    connectionId,
                    method: 'createRxStorageInstance',
                    error: err.toString()
                });
                return;
            }
        }
        state.connectionIds.add(connectionId);
        const subs: Subscription[] = [];
        /**
         * Automatically subscribe to the streams$
         * because we always need them.
         */
        subs.push(
            state.storageInstance.changeStream().subscribe(changes => {
                const message: RxStorageMessageFromRemote = {
                    connectionId,
                    answerTo: 'changestream',
                    method: 'changeStream',
                    return: changes
                };

                settings.send(message);
            })
        );
        subs.push(
            state.storageInstance.conflictResultionTasks().subscribe(conflicts => {
                const message: RxStorageMessageFromRemote = {
                    connectionId,
                    answerTo: 'conflictResultionTasks',
                    method: 'conflictResultionTasks',
                    return: conflicts
                };
                settings.send(message);
            })
        );
        subs.push(
            settings.messages$.pipe(
                filter(subMsg => (subMsg as RxStorageMessageToRemote).connectionId === connectionId)
            ).subscribe(async (plainMessage) => {
                const message: RxStorageMessageToRemote = plainMessage as any;
                let result;
                try {
                    /**
                     * On calls to 'close()',
                     * we only close the main instance if there are no other
                     * ports connected.
                     */
                    if (
                        message.method === 'close' &&
                        ensureNotFalsy(state).connectionIds.size > 1
                    ) {
                        const closeBreakResponse: RxStorageMessageFromRemote = {
                            connectionId,
                            answerTo: message.requestId,
                            method: message.method,
                            return: null
                        };
                        settings.send(closeBreakResponse);
                        ensureNotFalsy(state).connectionIds.delete(connectionId);
                        subs.forEach(sub => sub.unsubscribe());
                        return;
                    }

                    result = await (ensureNotFalsy(state).storageInstance as any)[message.method](...message.params);
                    if (
                        message.method === 'close' ||
                        message.method === 'remove'
                    ) {
                        subs.forEach(sub => sub.unsubscribe());
                        ensureNotFalsy(state).connectionIds.delete(connectionId);
                        instanceByFullName.delete(fullName);
                        /**
                         * TODO how to notify the other ports on remove() ?
                         */
                    }
                    const response: RxStorageMessageFromRemote = {
                        connectionId,
                        answerTo: message.requestId,
                        method: message.method,
                        return: result
                    };
                    settings.send(response);
                } catch (err) {
                    const errorResponse: RxStorageMessageFromRemote = {
                        connectionId,
                        answerTo: message.requestId,
                        method: message.method,
                        error: (err as any).toString()
                    };
                    settings.send(errorResponse);
                }
            })
        );

    });


    return {
        instanceByFullName,
        stateByPort
    };
}
