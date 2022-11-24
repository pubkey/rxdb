import {
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import {
    spawn,
    Worker,
    Thread
} from 'threads';
import type {
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxStorageInstance,
    BulkWriteRow,
    RxDocumentData,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageQueryResult,
    EventBulk,
    RxStorageStatics,
    RxDocumentDataById,
    RxConflictResultionTask,
    RxConflictResultionTaskSolution,
    RxStorageCountResult
} from '../../types';
import {
    ensureNotFalsy,
    getFromMapOrThrow
} from '../../util';
import { InWorkerStorage } from './in-worker';

declare type WorkerStorageInternals = {
    rxStorage: RxStorageWorker;
    instanceId: number;
    worker: InWorkerStorage<any, any>;
};
declare type RxStorageWorkerSettings = {
    statics: RxStorageStatics;
    workerInput: any;
};


/**
 * We have no way to detect if a worker is no longer needed.
 * So we create the worker process on the first RxStorageInstance
 * and have to close it again of no more RxStorageInstances are non-closed.
 */
const WORKER_BY_INSTANCE: Map<RxStorageWorker, {
    workerPromise: Promise<InWorkerStorage<any, any>>;
    refs: Set<RxStorageInstanceWorker<any>>;
}> = new Map();

export class RxStorageWorker implements RxStorage<WorkerStorageInternals, any> {
    public name = 'worker';

    constructor(
        public readonly settings: RxStorageWorkerSettings,
        public readonly statics: RxStorageStatics
    ) { }

    createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, any>
    ): Promise<RxStorageInstanceWorker<RxDocType>> {
        let workerState = WORKER_BY_INSTANCE.get(this);
        if (!workerState) {
            workerState = {
                workerPromise: spawn<InWorkerStorage<RxDocType, any>>(new Worker(this.settings.workerInput)) as any,
                refs: new Set()
            };
            WORKER_BY_INSTANCE.set(this, workerState);
        }

        return workerState.workerPromise.then(worker => {
            return worker.createStorageInstance(params)
                .then(instanceId => {
                    const instance = new RxStorageInstanceWorker(
                        this,
                        params.databaseName,
                        params.collectionName,
                        params.schema,
                        {
                            rxStorage: this,
                            instanceId,
                            worker
                        },
                        params.options
                    );
                    ensureNotFalsy(workerState).refs.add(instance);
                    return instance;
                });
        });
    }
}


export class RxStorageInstanceWorker<RxDocType> implements RxStorageInstance<
    RxDocType,
    WorkerStorageInternals,
    any,
    any
> {
    /**
     * threads.js uses observable-fns instead of rxjs
     * so we have to transform it.
     */
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>> = new Subject();
    private conflicts$: Subject<RxConflictResultionTask<RxDocType>> = new Subject();
    private subs: Subscription[] = [];

    private closed: boolean = false;

    constructor(
        public readonly storage: RxStorageWorker,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: WorkerStorageInternals,
        public readonly options: Readonly<any>
    ) {
        this.subs.push(
            this.internals.worker.changeStream(
                this.internals.instanceId
            ).subscribe(ev => this.changes$.next(ev as any))
        );
        this.subs.push(
            this.internals.worker.conflictResultionTasks(
                this.internals.instanceId
            ).subscribe(ev => this.conflicts$.next(ev as any))
        );
    }

    bulkWrite(
        documentWrites: BulkWriteRow<RxDocType>[],
        context: string
    ): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        return this.internals.worker.bulkWrite(
            this.internals.instanceId,
            documentWrites,
            context
        );
    }
    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>> {
        return this.internals.worker.findDocumentsById(
            this.internals.instanceId,
            ids,
            deleted
        );
    }
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>> {
        return this.internals.worker.query(
            this.internals.instanceId,
            preparedQuery
        );
    }
    count(preparedQuery: any): Promise<RxStorageCountResult> {
        return this.internals.worker.count(
            this.internals.instanceId,
            preparedQuery
        );
    }
    getAttachmentData(documentId: string, attachmentId: string): Promise<string> {
        return this.internals.worker.getAttachmentData(
            this.internals.instanceId,
            documentId,
            attachmentId
        );
    }
    getChangedDocumentsSince(
        limit: number,
        checkpoint?: any
    ) {
        return this.internals.worker.getChangedDocumentsSince(
            this.internals.instanceId,
            limit,
            checkpoint
        );
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>> {
        return this.changes$.asObservable();
    }
    cleanup(minDeletedTime: number) {
        return this.internals.worker.cleanup(
            this.internals.instanceId,
            minDeletedTime
        );
    }
    async close(): Promise<void> {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.subs.forEach(sub => sub.unsubscribe());
        await this.internals.worker.close(
            this.internals.instanceId
        );
        await removeWorkerRef(this);
    }
    async remove(): Promise<void> {
        await this.internals.worker.remove(
            this.internals.instanceId
        );
        this.closed = true;
        await removeWorkerRef(this);
    }

    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>> {
        return this.conflicts$;
    }
    async resolveConflictResultionTask(taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void> {
        await this.internals.worker.resolveConflictResultionTask(
            this.internals.instanceId,
            taskSolution
        );
    }

}

export function getRxStorageWorker(
    settings: RxStorageWorkerSettings
): RxStorageWorker {
    const storage = new RxStorageWorker(settings, settings.statics);
    return storage;
}

/**
 * TODO we have a bug.
 * When the exact same RxStorage opens and closes
 * many RxStorage instances, then it might happen
 * that some calls to createStorageInstance() time out,
 * because the worker thread is in the closing state.
 */
export async function removeWorkerRef(
    instance: RxStorageInstanceWorker<any>
) {
    const workerState = getFromMapOrThrow(WORKER_BY_INSTANCE, instance.storage);
    workerState.refs.delete(instance);
    if (workerState.refs.size === 0) {
        WORKER_BY_INSTANCE.delete(instance.storage);
        await workerState.workerPromise
            .then(worker => Thread.terminate(worker as any));
    }
}
