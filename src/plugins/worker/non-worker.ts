import { Observable, Subject, Subscription } from 'rxjs';
import { spawn, Worker } from 'threads';
import type {
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxStorageInstance,
    BlobBuffer,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    RxDocumentData,
    RxStorageBulkWriteResponse,
    RxStorageChangedDocumentMeta,
    RxStorageChangeEvent,
    RxStorageQueryResult,
    RxStorageKeyObjectInstance,
    BulkWriteLocalRow,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxKeyObjectStorageInstanceCreationParams,
    EventBulk,
    RxStorageStatics
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

    public async createKeyObjectStorageInstance(
        params: RxKeyObjectStorageInstanceCreationParams<any>
    ): Promise<RxStorageKeyObjectInstanceWorker> {
        const worker = await this.workerPromise;
        const instanceId = await worker.createKeyObjectStorageInstance(params);
        return new RxStorageKeyObjectInstanceWorker(
            params.databaseName,
            params.collectionName,
            {
                rxStorage: this,
                worker,
                instanceId
            },
            params.options
        );
    }
}


export class RxStorageInstanceWorker<DocumentData> implements RxStorageInstance<DocumentData, WorkerStorageInternals, any> {

    /**
     * threads.js uses observable-fns instead of rxjs
     * so we have to transform it.
     */
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>> = new Subject();
    private subs: Subscription[] = [];

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<DocumentData>>,
        public readonly internals: WorkerStorageInternals,
        public readonly options: Readonly<any>
    ) {
        this.subs.push(
            this.internals.worker.changeStream(
                this.internals.instanceId
            ).subscribe(ev => this.changes$.next(ev as any))
        );

    }

    bulkWrite(documentWrites: BulkWriteRow<DocumentData>[]): Promise<RxStorageBulkWriteResponse<DocumentData>> {
        return this.internals.worker.bulkWrite(
            this.internals.instanceId,
            documentWrites
        );
    }
    bulkAddRevisions(documents: RxDocumentData<DocumentData>[]): Promise<void> {
        return this.internals.worker.bulkAddRevisions(
            this.internals.instanceId,
            documents
        );
    }
    findDocumentsById(ids: string[], deleted: boolean): Promise<{ [documentId: string]: RxDocumentData<DocumentData> }> {
        return this.internals.worker.findDocumentsById(
            this.internals.instanceId,
            ids,
            deleted
        );
    }
    query(preparedQuery: any): Promise<RxStorageQueryResult<DocumentData>> {
        return this.internals.worker.query(
            this.internals.instanceId,
            preparedQuery
        );
    }
    getAttachmentData(documentId: string, attachmentId: string): Promise<BlobBuffer> {
        return this.internals.worker.getAttachmentData(
            this.internals.instanceId,
            documentId,
            attachmentId
        );
    }
    getChangedDocuments(options: ChangeStreamOnceOptions): Promise<{ changedDocuments: RxStorageChangedDocumentMeta[]; lastSequence: number; }> {
        return this.internals.worker.getChangedDocuments(
            this.internals.instanceId,
            options
        );
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<DocumentData>>>> {
        return this.changes$.asObservable();
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


export class RxStorageKeyObjectInstanceWorker implements RxStorageKeyObjectInstance<WorkerStorageInternals, any> {

    /**
     * threads.js uses observable-fns instead of rxjs
     * so we have to transform it.
     */
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxLocalDocumentData<{ [key: string]: any; }>>>> = new Subject();
    private subs: Subscription[] = [];

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: WorkerStorageInternals,
        public readonly options: Readonly<any>
    ) {
        this.subs.push(
            this.internals.worker.changeStream(
                this.internals.instanceId
            ).subscribe(ev => this.changes$.next(ev as any))
        );
    }
    bulkWrite<DocumentData>(
        documentWrites: BulkWriteLocalRow<DocumentData>[]
    ): Promise<RxLocalStorageBulkWriteResponse<DocumentData>> {
        return this.internals.worker.bulkWriteLocal(
            this.internals.instanceId,
            documentWrites
        );
    }
    findLocalDocumentsById<DocumentData>(
        ids: string[]
    ): Promise<{ [documentId: string]: RxLocalDocumentData<DocumentData> }> {
        return this.internals.worker.findLocalDocumentsById(
            this.internals.instanceId,
            ids
        );
    }
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxLocalDocumentData<{ [key: string]: any; }>>>> {
        return this.changes$.asObservable();
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
