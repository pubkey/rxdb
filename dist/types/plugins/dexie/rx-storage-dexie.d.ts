import type { RxStorage, RxStorageInstanceCreationParams } from '../../types';
import type { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageInstanceDexie } from './rx-storage-instance-dexie';
export declare class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    settings: DexieSettings;
    name: string;
    statics: Readonly<{
        prepareQuery<RxDocType>(schema: import("../../types").RxJsonSchema<import("../../types").RxDocumentData<RxDocType>>, mutateableQuery: import("../../types").FilledMangoQuery<RxDocType>): any;
        getSortComparator<RxDocType_1>(schema: import("../../types").RxJsonSchema<import("../../types").RxDocumentData<RxDocType_1>>, preparedQuery: any): import("event-reduce-js").DeterministicSortComparator<RxDocType_1>;
        getQueryMatcher<RxDocType_2>(schema: import("../../types").RxJsonSchema<import("../../types").RxDocumentData<RxDocType_2>>, preparedQuery: any): import("event-reduce-js").QueryMatcher<import("../../types").RxDocumentData<RxDocType_2>>;
        checkpointSchema: import("../../types").DeepReadonlyObject<import("../../types").JsonSchema<any>>;
    }>;
    constructor(settings: DexieSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>): Promise<RxStorageInstanceDexie<RxDocType>>;
}
export declare function getRxStorageDexie(settings?: DexieSettings): RxStorageDexie;
