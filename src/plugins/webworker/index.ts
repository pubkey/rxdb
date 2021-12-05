/*
import { spawn, Thread, Worker } from 'threads';
import type { RxStorage } from '../../types';

declare type WebWorkerStorageInternals = {
    worker: Worker;
}
declare type RxStorageWebWorkerSettings = {
    workerInput: any;
}

export class RxStorageWebWorker implements RxStorage<WebWorkerStorageInternals, any> {
    public name = 'worker';

    public readonly workerPromise: Promise<RxStorage<any, any>>;
    constructor(
        public readonly settings: RxStorageWebWorkerSettings
    ) {
        this.workerPromise = spawn(new Worker(this.settings.workerInput)) as any;
    }

    hash(data: Buffer | Blob | string): Promise<string> {
        return this.workerPromise.then(w => w.hash(data));
    }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>
    ): Promise<RxStorageInstanceLoki<RxDocType>> {
        return createLokiStorageInstance(params, this.databaseSettings);
    }

    public async createKeyObjectStorageInstance(
        params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>
    ): Promise<RxStorageKeyObjectInstanceLoki> {

        // ensure we never mix up key-object data with normal storage documents.
        const useParams = flatClone(params);
        useParams.collectionName = params.collectionName + '-key-object';

        return createLokiKeyObjectStorageInstance(params, this.databaseSettings);
    }
}

export async function getRxStorageWebWorker(
    settings: RxStorageWebWorkerSettings
): RxStorageWebWorker {

    const wasdf = await spawn(new Worker('./workers/auth'));

    const storage = new RxStorageWebWorker(settings);
    return storage;
}

*/
