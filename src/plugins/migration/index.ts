import {
    combineLatest,
    Observable
} from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';
import type {
    RxPlugin,
    RxCollection,
    RxDatabase,
    AllMigrationStates
} from '../../types';
import {
    mustMigrate,
    DataMigrator,
    createDataMigrator
} from './data-migrator';
import { getMigrationStateByDatabase, onDatabaseDestroy } from './migration-state';

export const DATA_MIGRATOR_BY_COLLECTION: WeakMap<RxCollection, DataMigrator> = new WeakMap();

export const RxDBMigrationPlugin: RxPlugin = {
    name: 'migration',
    rxdb: true,
    hooks: {
        preDestroyRxDatabase: onDatabaseDestroy
    },
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.migrationStates = function (this: RxDatabase): Observable<AllMigrationStates> {
                return getMigrationStateByDatabase(this).pipe(
                    switchMap(list => combineLatest(list)),
                    shareReplay({
                        bufferSize: 1,
                        refCount: true
                    })
                );
            };
        },
        RxCollection: (proto: any) => {
            proto.getDataMigrator = function (this: RxCollection): DataMigrator {
                if (!DATA_MIGRATOR_BY_COLLECTION.has(this)) {
                    DATA_MIGRATOR_BY_COLLECTION.set(
                        this,
                        createDataMigrator(
                            this.asRxCollection,
                            this.migrationStrategies
                        )
                    );

                }
                return DATA_MIGRATOR_BY_COLLECTION.get(this) as any;
            };
            proto.migrationNeeded = function (this: RxCollection) {
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
    _migrateDocument,
    deleteOldCollection,
    migrateOldCollection,
    migratePromise,
    DataMigrator
} from './data-migrator';
