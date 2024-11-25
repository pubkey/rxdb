"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  DATA_MIGRATOR_BY_COLLECTION: true,
  RxDBMigrationPlugin: true,
  RxDBMigrationSchemaPlugin: true
};
exports.RxDBMigrationSchemaPlugin = exports.RxDBMigrationPlugin = exports.DATA_MIGRATOR_BY_COLLECTION = void 0;
var _rxjs = require("rxjs");
var _index = require("../../plugins/utils/index.js");
var _rxMigrationState = require("./rx-migration-state.js");
Object.keys(_rxMigrationState).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxMigrationState[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxMigrationState[key];
    }
  });
});
var _migrationHelpers = require("./migration-helpers.js");
Object.keys(_migrationHelpers).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _migrationHelpers[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _migrationHelpers[key];
    }
  });
});
var _plugin = require("../../plugin.js");
var _index2 = require("../local-documents/index.js");
var _migrationTypes = require("./migration-types.js");
Object.keys(_migrationTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _migrationTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _migrationTypes[key];
    }
  });
});
var DATA_MIGRATOR_BY_COLLECTION = exports.DATA_MIGRATOR_BY_COLLECTION = new WeakMap();
var RxDBMigrationPlugin = exports.RxDBMigrationPlugin = {
  name: 'migration-schema',
  rxdb: true,
  init() {
    (0, _plugin.addRxPlugin)(_index2.RxDBLocalDocumentsPlugin);
  },
  hooks: {
    preCloseRxDatabase: {
      after: _migrationHelpers.onDatabaseClose
    }
  },
  prototypes: {
    RxDatabase: proto => {
      proto.migrationStates = function () {
        return (0, _migrationHelpers.getMigrationStateByDatabase)(this).pipe((0, _rxjs.shareReplay)(_index.RXJS_SHARE_REPLAY_DEFAULTS));
      };
    },
    RxCollection: proto => {
      proto.getMigrationState = function () {
        return (0, _index.getFromMapOrCreate)(DATA_MIGRATOR_BY_COLLECTION, this, () => new _rxMigrationState.RxMigrationState(this.asRxCollection, this.migrationStrategies));
      };
      proto.migrationNeeded = function () {
        if (this.schema.version === 0) {
          return _index.PROMISE_RESOLVE_FALSE;
        }
        return (0, _migrationHelpers.mustMigrate)(this.getMigrationState());
      };
    }
  }
};
var RxDBMigrationSchemaPlugin = exports.RxDBMigrationSchemaPlugin = RxDBMigrationPlugin;
//# sourceMappingURL=index.js.map