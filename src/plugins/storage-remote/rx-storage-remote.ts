import { ensureNotFalsy } from 'event-reduce-js';
import {
    firstValueFrom,
    filter,
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
import type {
    MessageFromRemote,
    MessageToRemote,
    RxStorageMessageChannelInternals,
    RxStorageRemoteSettings
} from './storage-remote-types';




export class RxStorageMessageChannel implements RxStorage<RxStorageMessageChannelInternals, any> {
    public readonly statics: RxStorageStatics;
    public readonly name: string = 'remote';
    public readonly messageChannelByPort = new WeakMap<MessagePort, MessageChannel>();
    private requestIdSeed: string = randomCouchString(10);
    private lastRequestId: number = 0;
    constructor(
        public readonly settings: RxStorageRemoteSettings
    ) {
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
            connectionId: this.getRequestId(),
            method: 'create',
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
    messages$: Observable<MessageFromRemote>;

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
        const message: MessageToRemote = {
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
