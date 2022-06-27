import { Observable, Subject, Subscription } from 'rxjs';
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
    RxDocumentDataById
} from '../../types';
import { getFromMapOrThrow, promiseWait } from '../../util';
import { InWorkerStorage } from './in-worker';

declare type WorkerStorageInternals = {
    rxStorage: RxStorageWorker;
    instanceId: number;
    worker: InWorkerStorage;
}
declare type RxStorageWorkerSettings = {
    statics: RxStorageStatics;
    workerInput: any;
}


/**
 * We have no way to detect if a worker is no longer needed.
 * So we create the worker process on the first RxStorageInstance
 * and have to close it again of no more RxStorageInstances are non-closed.
 */
const WORKER_BY_INSTANCE: Map<RxStorageWorker, {
    workerPromise: Promise<InWorkerStorage>;
    refs: Set<RxStorageInstanceWorker<any>>;
}> = new Map();
export class RxStorageWorker implements RxStorage<WorkerStorageInternals, any> {
    public name = 'worker';

    constructor(
        public readonly settings: RxStorageWorkerSettings,
        public readonly statics: RxStorageStatics
    ) { }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, any>
    ): Promise<RxStorageInstanceWorker<RxDocType>> {


        let workerState = WORKER_BY_INSTANCE.get(this);
        if (!workerState) {
            console.log('WORKER CREATE ' + params.collectionName);
            workerState = {
                workerPromise: spawn<InWorkerStorage>(new Worker(this.settings.workerInput)) as any,
                refs: new Set()
            };
            WORKER_BY_INSTANCE.set(this, workerState);
        }


        const worker = await workerState.workerPromise;
        const instanceId = await worker.createStorageInstance(params);
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
        workerState.refs.add(instance);

        return instance;
    }
}


export class RxStorageInstanceWorker<RxDocType> implements RxStorageInstance<RxDocType, WorkerStorageInternals, any> {

    /**
     * threads.js uses observable-fns instead of rxjs
     * so we have to transform it.
     */
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> = new Subject();
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

    }

    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        return this.internals.worker.bulkWrite(
            this.internals.instanceId,
            documentWrites
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
    getAttachmentData(documentId: string, attachmentId: string): Promise<string> {
        return this.internals.worker.getAttachmentData(
            this.internals.instanceId,
            documentId,
            attachmentId
        );
    }
    async getChangedDocumentsSince(
        limit: number,
        checkpoint?: any
    ): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: any;
    }[]> {
        return this.internals.worker.getChangedDocumentsSince(
            this.internals.instanceId,
            limit,
            checkpoint
        );
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> {
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
        console.log('RxStorageInstanceWorker close(' + this.collectionName + ') 0');
        this.subs.forEach(sub => sub.unsubscribe());
        console.log('RxStorageInstanceWorker close(' + this.collectionName + ') 1');
        try {
            await this.internals.worker.close(
                this.internals.instanceId
            );
        } catch (err) {
            console.log('!! CANNOT CALL worker.close');
            console.dir(err);
        }
        console.log('RxStorageInstanceWorker close(' + this.collectionName + ') 2');
        await removeWorkerRef(this);
        console.log('RxStorageInstanceWorker close(' + this.collectionName + ') 3');
    }
    async remove(): Promise<void> {
        await this.internals.worker.remove(
            this.internals.instanceId
        );
        this.closed = true;
        await removeWorkerRef(this);
    }
}

export function getRxStorageWorker(
    settings: RxStorageWorkerSettings
): RxStorageWorker {
    const storage = new RxStorageWorker(settings, settings.statics);
    return storage;
}


export async function removeWorkerRef(
    instance: RxStorageInstanceWorker<any>
) {
    const workerState = getFromMapOrThrow(WORKER_BY_INSTANCE, instance.storage);
    workerState.refs.delete(instance);
    if (workerState.refs.size === 0) {
        console.log('removeWorkerRef() REMOVE 0 ' + instance.collectionName);
        WORKER_BY_INSTANCE.delete(instance.storage);
        await workerState.workerPromise
            .then(worker => {
                console.log('removeWorkerRef() REMOVE 1 ' + instance.collectionName);
                return Thread.terminate(worker as any).then(() => {
                    console.log('removeWorkerRef() REMOVE 2 ' + instance.collectionName);
                });
                // TODO we should not need the promiseWait
                return promiseWait(1000)
                    .then(() => Thread.terminate(worker as any)).catch(() => { });
            });
    }
}
