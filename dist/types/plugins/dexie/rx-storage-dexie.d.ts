import type { DeterministicSortComparator, QueryMatcher } from 'event-reduce-js';
import type { RxDocumentData, RxJsonSchema, RxStorage, RxStorageInstanceCreationParams, RxStorageStatics, FilledMangoQuery } from '../../types';
import type { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageInstanceDexie } from './rx-storage-instance-dexie';
export declare const RxStorageDexieStatics: RxStorageStatics;
export declare class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    settings: DexieSettings;
    name: string;
    statics: Readonly<{
        prepareQuery<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, mutateableQuery: FilledMangoQuery<RxDocType>): any;
        getSortComparator<RxDocType_1>(schema: RxJsonSchema<RxDocumentData<RxDocType_1>>, preparedQuery: any): DeterministicSortComparator<RxDocType_1>;
        getQueryMatcher<RxDocType_2>(schema: RxJsonSchema<RxDocumentData<RxDocType_2>>, preparedQuery: any): QueryMatcher<RxDocumentData<RxDocType_2>>;
        checkpointSchema: import("../../types").DeepReadonlyObject<import("../../types").JsonSchema<any>>;
    }>;
    constructor(settings: DexieSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>): Promise<RxStorageInstanceDexie<RxDocType>>;
}
export declare function getRxStorageDexie(settings?: DexieSettings): RxStorageDexie;
