import type {
    LokiDatabaseSettings,
    LokiSettings,
    LokiStorageInternals,
    RxKeyObjectStorageInstanceCreationParams,
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types';
import { hash } from '../../util';
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
        public databseSettings: LokiDatabaseSettings = {}
    ) { }

    hash(data: Buffer | Blob | string): Promise<string> {
        return Promise.resolve(hash(data));
    }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>
    ): Promise<RxStorageInstanceLoki<RxDocType>> {
        return createLokiStorageInstance(params);
    }

    public async createKeyObjectStorageInstance(
        params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>
    ): Promise<RxStorageKeyObjectInstanceLoki> {
        return createLokiKeyObjectStorageInstance(params);
    }
}

export function getRxStorageLoki(
    databaseSettings?: LokiDatabaseSettings
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
