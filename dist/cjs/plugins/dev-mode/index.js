"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  disableWarnings: true,
  deepFreezeWhenDevMode: true,
  DEV_MODE_PLUGIN_NAME: true,
  RxDBDevModePlugin: true
};
exports.RxDBDevModePlugin = exports.DEV_MODE_PLUGIN_NAME = void 0;
exports.deepFreezeWhenDevMode = deepFreezeWhenDevMode;
exports.disableWarnings = disableWarnings;
var _errorMessages = require("./error-messages.js");
var _checkSchema = require("./check-schema.js");
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
var _checkOrm = require("./check-orm.js");
var _checkMigrationStrategies = require("./check-migration-strategies.js");
var _unallowedProperties = require("./unallowed-properties.js");
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
var _checkQuery = require("./check-query.js");
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
var _rxError = require("../../rx-error.js");
var _index = require("../../plugins/utils/index.js");
var _checkDocument = require("./check-document.js");
var _devModeTracking = require("./dev-mode-tracking.js");
var showDevModeWarning = true;

/**
 * Suppresses the warning message shown in the console, typically invoked once the developer (hello!) 
 * has acknowledged it.
 */
function disableWarnings() {
  showDevModeWarning = false;
}

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
  return (0, _index.deepFreeze)(obj);
}
var DEV_MODE_PLUGIN_NAME = exports.DEV_MODE_PLUGIN_NAME = 'dev-mode';
var RxDBDevModePlugin = exports.RxDBDevModePlugin = {
  name: DEV_MODE_PLUGIN_NAME,
  rxdb: true,
  init: () => {
    (0, _devModeTracking.addDevModeTrackingIframe)();
    if (showDevModeWarning) {
      console.warn(['-------------- RxDB dev-mode warning -------------------------------', 'you are seeing this because you use the RxDB dev-mode plugin https://rxdb.info/dev-mode.html?console=dev-mode ', 'This is great in development mode, because it will run many checks to ensure', 'that you use RxDB correct. If you see this in production mode,', 'you did something wrong because the dev-mode plugin will decrease the performance.', '', '🤗 Hint: To get the most out of RxDB, check out the Premium Plugins', 'to get access to faster storages and more professional features: https://rxdb.info/premium/?console=dev-mode ', '', 'You can disable this warning by calling disableWarnings() from the dev-mode plugin.',
      // '',
      // 'Also take part in the RxDB User Survey: https://rxdb.info/survey.html',
      '---------------------------------------------------------------------'].join('\n'));
    }
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
      var errorMessage = _errorMessages.ERROR_MESSAGES[code];
      return "\nError message: " + errorMessage + "\nError code: " + code;
    }
  },
  hooks: {
    preCreateRxSchema: {
      after: _checkSchema.checkSchema
    },
    preCreateRxDatabase: {
      before: function (args) {
        if (!args.storage.name.startsWith('validate-')) {
          throw (0, _rxError.newRxError)('DVM1', {
            database: args.name,
            storage: args.storage.name
          });
        }
      },
      after: function (args) {
        (0, _unallowedProperties.ensureDatabaseNameIsValid)(args);
      }
    },
    createRxDatabase: {
      after: async function (args) {}
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
    prePrepareRxQuery: {
      after: function (args) {
        (0, _checkQuery.isQueryAllowed)(args);
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
    preStorageWrite: {
      before: args => {
        (0, _checkDocument.checkWriteRows)(args.storageInstance, args.rows);
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