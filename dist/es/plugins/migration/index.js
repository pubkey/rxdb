import { combineLatest } from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';
import { mustMigrate, createDataMigrator } from './data-migrator';
import { getMigrationStateByDatabase, onDatabaseDestroy } from './migration-state';
export var DATA_MIGRATOR_BY_COLLECTION = new WeakMap();
export var RxDBMigrationPlugin = {
  name: 'migration',
  rxdb: true,
  hooks: {
    preDestroyRxDatabase: onDatabaseDestroy
  },
  prototypes: {
    RxDatabase: function RxDatabase(proto) {
      proto.migrationStates = function () {
        return getMigrationStateByDatabase(this).pipe(switchMap(function (list) {
          return combineLatest(list);
        }), shareReplay({
          bufferSize: 1,
          refCount: true
        }));
      };
    },
    RxCollection: function RxCollection(proto) {
      proto.getDataMigrator = function () {
        if (!DATA_MIGRATOR_BY_COLLECTION.has(this)) {
          DATA_MIGRATOR_BY_COLLECTION.set(this, createDataMigrator(this.asRxCollection, this.migrationStrategies));
        }

        return DATA_MIGRATOR_BY_COLLECTION.get(this);
      };

      proto.migrationNeeded = function () {
        return mustMigrate(this.getDataMigrator());
      };
    }
  }
}; // used in tests

export { _getOldCollections, getBatchOfOldCollection, migrateDocumentData, _migrateDocument, deleteOldCollection, migrateOldCollection, migratePromise, DataMigrator } from './data-migrator';
//# sourceMappingURL=index.js.map