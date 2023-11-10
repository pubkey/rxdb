"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  deepFreezeWhenDevMode: true,
  DEV_MODE_PLUGIN_NAME: true,
  RxDBDevModePlugin: true
};
exports.RxDBDevModePlugin = exports.DEV_MODE_PLUGIN_NAME = void 0;
exports.deepFreezeWhenDevMode = deepFreezeWhenDevMode;
var _errorMessages = require("./error-messages");
var _checkSchema = require("./check-schema");
Object.keys(_checkSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _checkSchema[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
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
    get: function () {
      return _unallowedProperties[key];
    }
  });
});
var _checkQuery = require("./check-query");
Object.keys(_checkQuery).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _checkQuery[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _checkQuery[key];
    }
  });
});
var _rxError = require("../../rx-error");
var _utils = require("../../plugins/utils");
var _checkDocument = require("./check-document");
/**
 * Deep freezes and object when in dev-mode.
 * Deep-Freezing has the same performance as deep-cloning, so we only do that in dev-mode.
 * Also we can ensure the readonly state via typescript
 * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
function deepFreezeWhenDevMode(obj) {
  // direct return if not suitable for deepFreeze()
  if (!obj || typeof obj === 'string' || typeof obj === 'number') {
    return obj;
  }
  return (0, _utils.deepFreeze)(obj);
}
var DEV_MODE_PLUGIN_NAME = exports.DEV_MODE_PLUGIN_NAME = 'dev-mode';
var RxDBDevModePlugin = exports.RxDBDevModePlugin = {
  name: DEV_MODE_PLUGIN_NAME,
  rxdb: true,
  init: () => {
    console.warn(['-------------- RxDB dev-mode warning -------------------------------', 'you are seeing this because you use the RxDB dev-mode plugin https://rxdb.info/dev-mode.html', 'This is great in development mode, because it will run many checks to ensure', 'that you use RxDB correct. If you see this in production mode,', 'you did something wrong because the dev-mode plugin will decrease the performance.', '', '🤗 Hint: To get the most out of RxDB, check out the Premium Plugins', 'to get access to faster storages and more professional features: https://rxdb.info/premium.html', '', 'Also take part in the RxDB User Survey: https://rxdb.info/survey.html', '---------------------------------------------------------------------'].join('\n'));
  },
  overwritable: {
    isDevMode() {
      return true;
    },
    deepFreezeWhenDevMode,
    tunnelErrorMessage(code) {
      if (!_errorMessages.ERROR_MESSAGES[code]) {
        console.error('RxDB: Error-Code not known: ' + code);
        throw new Error('Error-Code ' + code + ' not known, contact the maintainer');
      }
      return _errorMessages.ERROR_MESSAGES[code];
    }
  },
  hooks: {
    preCreateRxSchema: {
      after: _checkSchema.checkSchema
    },
    preCreateRxDatabase: {
      after: function (args) {
        (0, _unallowedProperties.ensureDatabaseNameIsValid)(args);
      }
    },
    preCreateRxCollection: {
      after: function (args) {
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
            args
          });
        }
      }
    },
    createRxDocument: {
      before: function (doc) {
        (0, _checkDocument.ensurePrimaryKeyValid)(doc.primary, doc.toJSON(true));
      }
    },
    preCreateRxQuery: {
      after: function (args) {
        (0, _checkQuery.checkQuery)(args);
      }
    },
    prePrepareQuery: {
      after: args => {
        (0, _checkQuery.checkMangoQuery)(args);
      }
    },
    createRxCollection: {
      after: args => {
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
//# sourceMappingURL=index.js.map