/// <reference types="pouchdb-core" />
/// <reference types="node" />
import type { DeterministicSortComparator, QueryMatcher } from 'event-reduce-js';
import type { LokiDatabaseSettings, LokiSettings, LokiStorageInternals, MangoQuery, RxDocumentWriteData, RxJsonSchema, RxStorage, RxStorageInstanceCreationParams, RxStorageStatics } from '../../types';
import { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import type { LeaderElector } from 'broadcast-channel';
export declare const RxStorageLokiStatics: RxStorageStatics;
export declare class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    databaseSettings: LokiDatabaseSettings;
    name: string;
    statics: Readonly<{
        hash(data: string | Blob | Buffer): Promise<string>;
        hashKey: string;
        doesBroadcastChangestream(): boolean;
        prepareQuery<DocumentData>(schema: RxJsonSchema<DocumentData>, mutateableQuery: import("../../types").FilledMangoQuery<DocumentData>): any;
        getSortComparator<DocumentData_1>(schema: RxJsonSchema<DocumentData_1>, query: MangoQuery<DocumentData_1>): DeterministicSortComparator<DocumentData_1>;
        getQueryMatcher<DocumentData_2>(schema: RxJsonSchema<DocumentData_2>, query: MangoQuery<DocumentData_2>): QueryMatcher<RxDocumentWriteData<DocumentData_2>>;
    }>;
    /**
     * Create one leader elector by db name.
     * This is done inside of the storage, not globally
     * to make it easier to test multi-tab behavior.
     */
    leaderElectorByLokiDbName: Map<string, {
        leaderElector: LeaderElector;
        /**
         * Count the instances that currently use the elector.
         * If is goes to zero again, the elector can be closed.
         */
        intancesCount: number;
    }>;
    constructor(databaseSettings: LokiDatabaseSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>): Promise<RxStorageInstanceLoki<RxDocType>>;
}
export declare function getRxStorageLoki(databaseSettings?: LokiDatabaseSettings): RxStorageLoki;
