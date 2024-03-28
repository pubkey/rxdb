import type {
    LokiDatabaseSettings,
    LokiSettings,
    LokiStorageInternals,
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types/index.d.ts';
import {
    createLokiStorageInstance,
    RxStorageInstanceLoki
} from './rx-storage-instance-loki.ts';
import { RX_STORAGE_NAME_LOKIJS } from './lokijs-helper.ts';
import type { LeaderElector } from 'broadcast-channel';

import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';

export class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    public name = RX_STORAGE_NAME_LOKIJS;
    public readonly rxdbVersion = RXDB_VERSION;

    /**
     * Create one leader elector by db name.
     * This is done inside of the storage, not globally
     * to make it easier to test multi-tab behavior.
     */
    public leaderElectorByLokiDbName: Map<string, {
        leaderElector: LeaderElector;
        /**
         * Count the instances that currently use the elector.
         * If is goes to zero again, the elector can be closed.
         */
        instancesCount: number;
    }> = new Map();

    constructor(
        public databaseSettings: LokiDatabaseSettings
    ) { }

    public createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>
    ): Promise<RxStorageInstanceLoki<RxDocType>> {
        ensureRxStorageInstanceParamsAreCorrect(params);
        return createLokiStorageInstance(this, params, this.databaseSettings);
    }
}

/**
 * @deprecated The lokijs RxStorage is deprecated, more info at:
 * @link https://rxdb.info/rx-storage-lokijs.html
 */
export function getRxStorageLoki(
    databaseSettings: LokiDatabaseSettings = {}
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
