import { combineLatest } from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';
import { PROMISE_RESOLVE_FALSE, RXJS_SHARE_REPLAY_DEFAULTS } from '../../plugins/utils';
import { mustMigrate, DataMigrator } from './data-migrator';
import { getMigrationStateByDatabase, onDatabaseDestroy } from './migration-state';
export var DATA_MIGRATOR_BY_COLLECTION = new WeakMap();
export var RxDBMigrationPlugin = {
  name: 'migration',
  rxdb: true,
  hooks: {
    preDestroyRxDatabase: {
      after: onDatabaseDestroy
    }
  },
  prototypes: {
    RxDatabase: proto => {
      proto.migrationStates = function () {
        return getMigrationStateByDatabase(this).pipe(switchMap(list => combineLatest(list)), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
      };
    },
    RxCollection: proto => {
      proto.getDataMigrator = function () {
        if (!DATA_MIGRATOR_BY_COLLECTION.has(this)) {
          DATA_MIGRATOR_BY_COLLECTION.set(this, new DataMigrator(this.asRxCollection, this.migrationStrategies));
        }
        return DATA_MIGRATOR_BY_COLLECTION.get(this);
      };
      proto.migrationNeeded = function () {
        if (this.schema.version === 0) {
          return PROMISE_RESOLVE_FALSE;
        }
        return mustMigrate(this.getDataMigrator());
      };
    }
  }
};

// used in tests
export { _getOldCollections, getBatchOfOldCollection, migrateDocumentData, _migrateDocuments, deleteOldCollection, migrateOldCollection, migratePromise, DataMigrator } from './data-migrator';
//# sourceMappingURL=index.js.map