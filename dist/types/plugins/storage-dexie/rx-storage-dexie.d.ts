import type { RxStorage, RxStorageInstanceCreationParams } from '../../types';
import type { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageInstanceDexie } from './rx-storage-instance-dexie';
export declare class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    settings: DexieSettings;
    name: string;
    statics: Readonly<{
        prepareQuery<RxDocType>(schema: import("../../types").RxJsonSchema<import("../../types").RxDocumentData<RxDocType>>, mutateableQuery: import("../../types").FilledMangoQuery<RxDocType>): any;
        checkpointSchema: import("../../types").DeepReadonlyObject<import("../../types").JsonSchema>;
    }>;
    constructor(settings: DexieSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>): Promise<RxStorageInstanceDexie<RxDocType>>;
}
export declare function getRxStorageDexie(settings?: DexieSettings): RxStorageDexie;
