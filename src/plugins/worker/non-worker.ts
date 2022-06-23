import { Observable, Subject, Subscription } from 'rxjs';
import { spawn, Worker } from 'threads';
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
 * Instead we reuse open workers so that creating many databases,
 * does not flood the OS by opening many threads.
 */
const WORKER_BY_INPUT: Map<any, Promise<InWorkerStorage>> = new Map();

export class RxStorageWorker implements RxStorage<WorkerStorageInternals, any> {
    public name = 'worker';

    public readonly workerPromise: Promise<InWorkerStorage>;
    constructor(
        public readonly settings: RxStorageWorkerSettings,
        public readonly statics: RxStorageStatics
    ) {
        const workerInput = this.settings.workerInput;
        let workerPromise = WORKER_BY_INPUT.get(workerInput);
        if (!workerPromise) {
            workerPromise = spawn<InWorkerStorage>(new Worker(this.settings.workerInput)) as any;
            WORKER_BY_INPUT.set(workerInput, workerPromise as any);
        }
        this.workerPromise = workerPromise as any;
    }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, any>
    ): Promise<RxStorageInstanceWorker<RxDocType>> {
        const worker = await this.workerPromise;
        const instanceId = await worker.createStorageInstance(params);
        return new RxStorageInstanceWorker(
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
    }
}


export class RxStorageInstanceWorker<RxDocType> implements RxStorageInstance<RxDocType, WorkerStorageInternals, any> {

    /**
     * threads.js uses observable-fns instead of rxjs
     * so we have to transform it.
     */
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> = new Subject();
    private subs: Subscription[] = [];

    constructor(
        public readonly storage: RxStorage<WorkerStorageInternals, any>,
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
    close(): Promise<void> {
        this.subs.forEach(sub => sub.unsubscribe());
        return this.internals.worker.close(
            this.internals.instanceId
        );
    }
    remove(): Promise<void> {
        return this.internals.worker.remove(
            this.internals.instanceId
        );
    }
}

export function getRxStorageWorker(
    settings: RxStorageWorkerSettings
): RxStorageWorker {
    const storage = new RxStorageWorker(settings, settings.statics);
    return storage;
}
