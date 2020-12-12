import type {
    RxPlugin,
    RxCollection
} from '../../types';
import { mustMigrate, DataMigrator, createDataMigrator } from './data-migrator';


export const DATA_MIGRATOR_BY_COLLECTION: WeakMap<RxCollection, DataMigrator> = new WeakMap();

export const RxDBMigrationPlugin: RxPlugin = {
    name: 'migration',
    rxdb: true,
    prototypes: {
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
