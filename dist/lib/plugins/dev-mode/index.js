"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  deepFreezeWhenDevMode: true,
  RxDBDevModePlugin: true
};
exports.RxDBDevModePlugin = void 0;
exports.deepFreezeWhenDevMode = deepFreezeWhenDevMode;
var _errorMessages = require("./error-messages");
var _checkSchema = require("./check-schema");
Object.keys(_checkSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _checkSchema[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _checkSchema[key];
    }
  });
});
var _checkOrm = require("./check-orm");
var _checkMigrationStrategies = require("./check-migration-strategies");
var _unallowedProperties = require("./unallowed-properties");
Object.keys(_unallowedProperties).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _unallowedProperties[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _unallowedProperties[key];
    }
  });
});
var _checkQuery = require("./check-query");
var _rxError = require("../../rx-error");
var _deepFreeze = _interopRequireDefault(require("deep-freeze"));
/**
 * Deep freezes and object when in dev-mode.
 * Deep-Freezing has the same performaance as deep-cloning, so we only do that in dev-mode.
 * Also we can ensure the readonly state via typescript
 * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
function deepFreezeWhenDevMode(obj) {
  // direct return if not suitable for deepFreeze()
  if (!obj || typeof obj === 'string' || typeof obj === 'number') {
    return obj;
  }
  return (0, _deepFreeze["default"])(obj);
}
var DEV_MODE_PLUGIN_NAME = 'dev-mode';
var RxDBDevModePlugin = {
  name: DEV_MODE_PLUGIN_NAME,
  rxdb: true,
  overwritable: {
    isDevMode: function isDevMode() {
      return true;
    },
    deepFreezeWhenDevMode: deepFreezeWhenDevMode,
    tunnelErrorMessage: function tunnelErrorMessage(code) {
      if (!_errorMessages.ERROR_MESSAGES[code]) {
        console.error('RxDB: Error-Code not known: ' + code);
        throw new Error('Error-Code ' + code + ' not known, contact the maintainer');
      }
      return _errorMessages.ERROR_MESSAGES[code];
    }
  },
  hooks: {
    preAddRxPlugin: {
      after: function after(args) {
        /**
         * throw when dev mode is added multiple times
         * because there is no way that this was done intentional.
         * Likely the developer has mixed core and default usage of RxDB.
         */
        if (args.plugin.name === DEV_MODE_PLUGIN_NAME) {
          throw (0, _rxError.newRxError)('DEV1', {
            plugins: args.plugins
          });
        }
      }
    },
    preCreateRxSchema: {
      after: _checkSchema.checkSchema
    },
    preCreateRxDatabase: {
      after: function after(args) {
        (0, _unallowedProperties.ensureDatabaseNameIsValid)(args);
      }
    },
    preCreateRxCollection: {
      after: function after(args) {
        (0, _unallowedProperties.ensureCollectionNameValid)(args);
        (0, _checkOrm.checkOrmDocumentMethods)(args.schema, args.methods);
        if (args.name.charAt(0) === '_') {
          throw (0, _rxError.newRxError)('DB2', {
            name: args.name
          });
        }
        if (!args.schema) {
          throw (0, _rxError.newRxError)('DB4', {
            name: args.name,
            args: args
          });
        }
      }
    },
    preCreateRxQuery: {
      after: function after(args) {
        (0, _checkQuery.checkQuery)(args);
      }
    },
    prePrepareQuery: {
      after: function after(args) {
        (0, _checkQuery.checkMangoQuery)(args);
      }
    },
    createRxCollection: {
      after: function after(args) {
        // check ORM-methods
        (0, _checkOrm.checkOrmMethods)(args.creator.statics);
        (0, _checkOrm.checkOrmMethods)(args.creator.methods);
        (0, _checkOrm.checkOrmMethods)(args.creator.attachments);

        // check migration strategies
        if (args.creator.schema && args.creator.migrationStrategies) {
          (0, _checkMigrationStrategies.checkMigrationStrategies)(args.creator.schema, args.creator.migrationStrategies);
        }
      }
    }
  }
};
exports.RxDBDevModePlugin = RxDBDevModePlugin;
//# sourceMappingURL=index.js.map