/// <reference types="pouchdb-core" />
/// <reference types="node" />
import type { LokiDatabaseSettings, LokiSettings, LokiStorageInternals, RxKeyObjectStorageInstanceCreationParams, RxStorage, RxStorageInstanceCreationParams } from '../../types';
import { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';
export declare class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    databaseSettings: LokiDatabaseSettings;
    name: string;
    constructor(databaseSettings: LokiDatabaseSettings);
    hash(data: Buffer | Blob | string): Promise<string>;
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>): Promise<RxStorageInstanceLoki<RxDocType>>;
    createKeyObjectStorageInstance(params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>): Promise<RxStorageKeyObjectInstanceLoki>;
}
export declare function getRxStorageLoki(databaseSettings?: LokiDatabaseSettings): RxStorageLoki;
