import type { LokiDatabaseSettings, LokiSettings, LokiStorageInternals, RxStorage, RxStorageInstanceCreationParams } from '../../types/index.d.ts';
import { RxStorageInstanceLoki } from './rx-storage-instance-loki.ts';
import type { LeaderElector } from 'broadcast-channel';
export declare class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    databaseSettings: LokiDatabaseSettings;
    name: string;
    readonly rxdbVersion = "15.11.1";
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
        instancesCount: number;
    }>;
    constructor(databaseSettings: LokiDatabaseSettings);
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>): Promise<RxStorageInstanceLoki<RxDocType>>;
}
export declare function getRxStorageLoki(databaseSettings?: LokiDatabaseSettings): RxStorageLoki;
