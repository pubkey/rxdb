import type { RxStorage, RxStorageInstanceCreationParams } from '../../types/index.d.ts';
import type { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie.d.ts';
import { RxStorageInstanceDexie } from './rx-storage-instance-dexie.ts';
export declare class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    settings: DexieSettings;
    name: string;
    readonly rxdbVersion = "16.12.0";
    constructor(settings: DexieSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>): Promise<RxStorageInstanceDexie<RxDocType>>;
}
export declare function getRxStorageDexie(settings?: DexieSettings): RxStorageDexie;
