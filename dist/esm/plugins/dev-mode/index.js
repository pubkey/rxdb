import { ERROR_MESSAGES } from "./error-messages.js";
import { checkSchema } from "./check-schema.js";
import { checkOrmDocumentMethods, checkOrmMethods } from "./check-orm.js";
import { checkMigrationStrategies } from "./check-migration-strategies.js";
import { ensureCollectionNameValid, ensureDatabaseNameIsValid } from "./unallowed-properties.js";
import { checkMangoQuery, checkQuery, isQueryAllowed } from "./check-query.js";
import { newRxError } from "../../rx-error.js";
import { deepFreeze } from "../../plugins/utils/index.js";
import { checkWriteRows, ensurePrimaryKeyValid } from "./check-document.js";
import { addDevModeTrackingIframe } from "./dev-mode-tracking.js";
export * from "./check-schema.js";
export * from "./unallowed-properties.js";
export * from "./check-query.js";
var showDevModeWarning = true;

/**
 * Suppresses the warning message shown in the console, typically invoked once the developer (hello!) 
 * has acknowledged it.
 */
export function disableWarnings() {
  showDevModeWarning = false;
}

/**
 * Deep freezes and object when in dev-mode.
 * Deep-Freezing has the same performance as deep-cloning, so we only do that in dev-mode.
 * Also we can ensure the readonly state via typescript
 * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
export function deepFreezeWhenDevMode(obj) {
  // direct return if not suitable for deepFreeze()
  if (!obj || typeof obj === 'string' || typeof obj === 'number') {
    return obj;
  }
  return deepFreeze(obj);
}
export var DEV_MODE_PLUGIN_NAME = 'dev-mode';
export var RxDBDevModePlugin = {
  name: DEV_MODE_PLUGIN_NAME,
  rxdb: true,
  init: () => {
    addDevModeTrackingIframe();
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
      if (!ERROR_MESSAGES[code]) {
        console.error('RxDB: Error-Code not known: ' + code);
        throw new Error('Error-Code ' + code + ' not known, contact the maintainer');
      }
      var errorMessage = ERROR_MESSAGES[code];
      return "\nError message: " + errorMessage + "\nError code: " + code;
    }
  },
  hooks: {
    preCreateRxSchema: {
      after: checkSchema
    },
    preCreateRxDatabase: {
      before: function (args) {
        if (!args.storage.name.startsWith('validate-')) {
          throw newRxError('DVM1', {
            database: args.name,
            storage: args.storage.name
          });
        }
      },
      after: function (args) {
        ensureDatabaseNameIsValid(args);
      }
    },
    createRxDatabase: {
      after: async function (args) {}
    },
    preCreateRxCollection: {
      after: function (args) {
        ensureCollectionNameValid(args);
        checkOrmDocumentMethods(args.schema, args.methods);
        if (args.name.charAt(0) === '_') {
          throw newRxError('DB2', {
            name: args.name
          });
        }
        if (!args.schema) {
          throw newRxError('DB4', {
            name: args.name,
            args
          });
        }
      }
    },
    createRxDocument: {
      before: function (doc) {
        ensurePrimaryKeyValid(doc.primary, doc.toJSON(true));
      }
    },
    prePrepareRxQuery: {
      after: function (args) {
        isQueryAllowed(args);
      }
    },
    preCreateRxQuery: {
      after: function (args) {
        checkQuery(args);
      }
    },
    prePrepareQuery: {
      after: args => {
        checkMangoQuery(args);
      }
    },
    preStorageWrite: {
      before: args => {
        checkWriteRows(args.storageInstance, args.rows);
      }
    },
    createRxCollection: {
      after: args => {
        // check ORM-methods
        checkOrmMethods(args.creator.statics);
        checkOrmMethods(args.creator.methods);
        checkOrmMethods(args.creator.attachments);

        // check migration strategies
        if (args.creator.schema && args.creator.migrationStrategies) {
          checkMigrationStrategies(args.creator.schema, args.creator.migrationStrategies);
        }
      }
    }
  }
};
//# sourceMappingURL=index.js.map