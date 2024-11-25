import { shareReplay } from 'rxjs';
import { getFromMapOrCreate, PROMISE_RESOLVE_FALSE, RXJS_SHARE_REPLAY_DEFAULTS } from "../../plugins/utils/index.js";
import { RxMigrationState } from "./rx-migration-state.js";
import { getMigrationStateByDatabase, mustMigrate, onDatabaseClose } from "./migration-helpers.js";
import { addRxPlugin } from "../../plugin.js";
import { RxDBLocalDocumentsPlugin } from "../local-documents/index.js";
export var DATA_MIGRATOR_BY_COLLECTION = new WeakMap();
export var RxDBMigrationPlugin = {
  name: 'migration-schema',
  rxdb: true,
  init() {
    addRxPlugin(RxDBLocalDocumentsPlugin);
  },
  hooks: {
    preCloseRxDatabase: {
      after: onDatabaseClose
    }
  },
  prototypes: {
    RxDatabase: proto => {
      proto.migrationStates = function () {
        return getMigrationStateByDatabase(this).pipe(shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
      };
    },
    RxCollection: proto => {
      proto.getMigrationState = function () {
        return getFromMapOrCreate(DATA_MIGRATOR_BY_COLLECTION, this, () => new RxMigrationState(this.asRxCollection, this.migrationStrategies));
      };
      proto.migrationNeeded = function () {
        if (this.schema.version === 0) {
          return PROMISE_RESOLVE_FALSE;
        }
        return mustMigrate(this.getMigrationState());
      };
    }
  }
};
export var RxDBMigrationSchemaPlugin = RxDBMigrationPlugin;
export * from "./rx-migration-state.js";
export * from "./migration-helpers.js";
export * from "./migration-types.js";
//# sourceMappingURL=index.js.map