import type {
    LokiDatabaseSettings,
    LokiSettings,
    LokiStorageInternals,
    RxKeyObjectStorageInstanceCreationParams,
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types';
import { flatClone, hash } from '../../util';
import {
    createLokiStorageInstance,
    RxStorageInstanceLoki
} from './rx-storage-instance-loki';
import {
    createLokiKeyObjectStorageInstance,
    RxStorageKeyObjectInstanceLoki
} from './rx-storage-key-object-instance-loki';

export class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    public name = 'lokijs';

    constructor(
        public databaseSettings: LokiDatabaseSettings
    ) { }

    hash(data: Buffer | Blob | string): Promise<string> {
        return Promise.resolve(hash(data));
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

export function getRxStorageLoki(
    databaseSettings: LokiDatabaseSettings = {}
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
