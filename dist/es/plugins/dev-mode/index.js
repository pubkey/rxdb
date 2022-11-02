import { ERROR_MESSAGES } from './error-messages';
import { checkSchema } from './check-schema';
import { checkOrmDocumentMethods, checkOrmMethods } from './check-orm';
import { checkMigrationStrategies } from './check-migration-strategies';
import { ensureCollectionNameValid, ensureDatabaseNameIsValid } from './unallowed-properties';
import { checkMangoQuery, checkQuery } from './check-query';
import { newRxError } from '../../rx-error';
import { deepFreeze } from '../../util';
export * from './check-schema';
export * from './unallowed-properties';
export * from './check-query';

/**
 * Deep freezes and object when in dev-mode.
 * Deep-Freezing has the same performaance as deep-cloning, so we only do that in dev-mode.
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
var DEV_MODE_PLUGIN_NAME = 'dev-mode';
export var RxDBDevModePlugin = {
  name: DEV_MODE_PLUGIN_NAME,
  rxdb: true,
  overwritable: {
    isDevMode: function isDevMode() {
      return true;
    },
    deepFreezeWhenDevMode: deepFreezeWhenDevMode,
    tunnelErrorMessage: function tunnelErrorMessage(code) {
      if (!ERROR_MESSAGES[code]) {
        console.error('RxDB: Error-Code not known: ' + code);
        throw new Error('Error-Code ' + code + ' not known, contact the maintainer');
      }
      return ERROR_MESSAGES[code];
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
          throw newRxError('DEV1', {
            plugins: args.plugins
          });
        }
      }
    },
    preCreateRxSchema: {
      after: checkSchema
    },
    preCreateRxDatabase: {
      after: function after(args) {
        ensureDatabaseNameIsValid(args);
      }
    },
    preCreateRxCollection: {
      after: function after(args) {
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
            args: args
          });
        }
      }
    },
    preCreateRxQuery: {
      after: function after(args) {
        checkQuery(args);
      }
    },
    prePrepareQuery: {
      after: function after(args) {
        checkMangoQuery(args);
      }
    },
    createRxCollection: {
      after: function after(args) {
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