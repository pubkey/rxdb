import {
    combineLatest,
    Observable
} from 'rxjs';
import {
    shareReplay,
    switchMap
} from 'rxjs/operators';
import type {
    RxPlugin,
    RxCollection,
    RxDatabase,
    AllMigrationStates
} from '../../types';
import { PROMISE_RESOLVE_FALSE, RXJS_SHARE_REPLAY_DEFAULTS } from '../../plugins/utils';
import {
    mustMigrate,
    DataMigrator
} from './data-migrator';
import {
    getMigrationStateByDatabase,
    onDatabaseDestroy
} from './migration-state';

export const DATA_MIGRATOR_BY_COLLECTION: WeakMap<RxCollection, DataMigrator> = new WeakMap();

export const RxDBMigrationPlugin: RxPlugin = {
    name: 'migration',
    rxdb: true,
    hooks: {
        preDestroyRxDatabase: {
            after: onDatabaseDestroy
        }
    },
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.migrationStates = function (this: RxDatabase): Observable<AllMigrationStates> {
                return getMigrationStateByDatabase(this).pipe(
                    switchMap(list => combineLatest(list)),
                    shareReplay(RXJS_SHARE_REPLAY_DEFAULTS)
                );
            };
        },
        RxCollection: (proto: any) => {
            proto.getDataMigrator = function (this: RxCollection): DataMigrator {
                if (!DATA_MIGRATOR_BY_COLLECTION.has(this)) {
                    DATA_MIGRATOR_BY_COLLECTION.set(
                        this,
                        new DataMigrator(
                            this.asRxCollection,
                            this.migrationStrategies
                        )
                    );

                }
                return DATA_MIGRATOR_BY_COLLECTION.get(this) as any;
            };
            proto.migrationNeeded = function (this: RxCollection) {
                if (this.schema.version === 0) {
                    return PROMISE_RESOLVE_FALSE;
                }
                return mustMigrate(this.getDataMigrator());
            };
        }
    }
};


// used in tests
export {
    _getOldCollections,
    getBatchOfOldCollection,
    migrateDocumentData,
    _migrateDocuments,
    deleteOldCollection,
    migrateOldCollection,
    migratePromise,
    DataMigrator
} from './data-migrator';
