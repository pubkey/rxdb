import type {
    FilledMangoQuery,
    LokiDatabaseSettings,
    LokiSettings,
    LokiStorageInternals,
    RxDocumentData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxStorageStatics
} from '../../types/index.d.ts';
import {
    ensureNotFalsy,
    flatClone
} from '../utils/index.ts';
import {
    createLokiStorageInstance,
    RxStorageInstanceLoki
} from './rx-storage-instance-loki.ts';
import { RX_STORAGE_NAME_LOKIJS } from './lokijs-helper.ts';
import type { LeaderElector } from 'broadcast-channel';

import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper.ts';
import { DEFAULT_CHECKPOINT_SCHEMA } from '../../rx-schema-helper.ts';

export const RxStorageLokiStatics: RxStorageStatics = {
    prepareQuery<RxDocType>(
        _schema: RxJsonSchema<RxDocumentData<RxDocType>>,
        mutateableQuery: FilledMangoQuery<RxDocType>
    ) {
        mutateableQuery = flatClone(mutateableQuery);
        if (Object.keys(ensureNotFalsy(mutateableQuery.selector)).length > 0) {
            mutateableQuery.selector = {
                $and: [
                    {
                        _deleted: false
                    },
                    mutateableQuery.selector
                ]
            } as any;
        } else {
            mutateableQuery.selector = {
                _deleted: false
            } as any;
        }

        return mutateableQuery;
    },
    checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};

export class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    public name = RX_STORAGE_NAME_LOKIJS;
    public statics = RxStorageLokiStatics;

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

export function getRxStorageLoki(
    databaseSettings: LokiDatabaseSettings = {}
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
