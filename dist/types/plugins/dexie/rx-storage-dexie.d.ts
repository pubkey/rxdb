/// <reference types="pouchdb-core" />
/// <reference types="node" />
import type { DeterministicSortComparator, QueryMatcher } from 'event-reduce-js';
import type { MangoQuery, RxDocumentWriteData, RxJsonSchema, RxKeyObjectStorageInstanceCreationParams, RxStorage, RxStorageInstanceCreationParams, RxStorageStatics } from '../../types';
import { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageInstanceDexie } from './rx-storage-instance-dexie';
import { RxStorageKeyObjectInstanceDexie } from './rx-storage-key-object-instance-dexie';
export declare const RxStorageDexieStatics: RxStorageStatics;
export declare class RxStorageDexie implements RxStorage<DexieStorageInternals, DexieSettings> {
    settings: DexieSettings;
    name: string;
    statics: Readonly<{
        hash(data: string | Blob | Buffer): Promise<string>;
        hashKey: string;
        doesBroadcastChangestream(): boolean;
        prepareQuery<DocumentData>(schema: RxJsonSchema<DocumentData>, mutateableQuery: import("../../types").FilledMangoQuery<DocumentData>): any;
        getSortComparator<DocumentData_1>(schema: RxJsonSchema<DocumentData_1>, query: MangoQuery<DocumentData_1>): DeterministicSortComparator<DocumentData_1>;
        getQueryMatcher<DocumentData_2>(schema: RxJsonSchema<DocumentData_2>, query: MangoQuery<DocumentData_2>): QueryMatcher<RxDocumentWriteData<DocumentData_2>>;
    }>;
    constructor(settings: DexieSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>): Promise<RxStorageInstanceDexie<RxDocType>>;
    createKeyObjectStorageInstance(params: RxKeyObjectStorageInstanceCreationParams<DexieSettings>): Promise<RxStorageKeyObjectInstanceDexie>;
}
export declare function getRxStorageDexie(settings?: DexieSettings): RxStorageDexie;
