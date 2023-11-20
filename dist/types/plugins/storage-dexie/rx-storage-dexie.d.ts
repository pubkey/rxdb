import type { RxStorage, RxStorageInstanceCreationParams } from '../../types/index.d.ts';
import type { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie.d.ts';
import { RxStorageInstanceDexie } from './rx-storage-instance-dexie.ts';
export declare class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    settings: DexieSettings;
    name: string;
    statics: Readonly<{
        prepareQuery<RxDocType>(schema: import("../../types/rx-schema").RxJsonSchema<import("../../types/rx-storage").RxDocumentData<RxDocType>>, mutateableQuery: import("../../types/rx-storage.interface").FilledMangoQuery<RxDocType>): any;
        checkpointSchema: import("../../types/util").DeepReadonlyObject<import("../../types/rx-schema").JsonSchema>;
    }>;
    constructor(settings: DexieSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>): Promise<RxStorageInstanceDexie<RxDocType>>;
}
export declare function getRxStorageDexie(settings?: DexieSettings): RxStorageDexie;
