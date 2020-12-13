import { ERROR_MESSAGES } from './error-messages';
import { checkSchema } from './check-schema';
import { checkOrmMethods } from './check-orm';
import { checkMigrationStrategies } from './check-migration-strategies';
import { ensureCollectionNameValid, ensureDatabaseNameIsValid } from './unallowed-properties';
import { checkQuery } from './check-query';
import { newRxError } from '../../rx-error';
export * from './check-schema';
var DEV_MODE_PLUGIN_NAME = 'dev-mode';
export var RxDBDevModePlugin = {
  name: DEV_MODE_PLUGIN_NAME,
  rxdb: true,
  overwritable: {
    isDevMode: function isDevMode() {
      return true;
    },
    tunnelErrorMessage: function tunnelErrorMessage(code) {
      if (!ERROR_MESSAGES[code]) {
        console.error('RxDB: Error-Code not known: ' + code);
        throw new Error('Error-Code ' + code + ' not known, contact the maintainer');
      }

      return ERROR_MESSAGES[code];
    }
  },
  hooks: {
    preAddRxPlugin: function preAddRxPlugin(args) {
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
    },
    preCreateRxSchema: checkSchema,
    preCreateRxDatabase: function preCreateRxDatabase(args) {
      ensureDatabaseNameIsValid(args);
    },
    preCreateRxCollection: function preCreateRxCollection(args) {
      ensureCollectionNameValid(args);

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
    },
    preCreateRxQuery: function preCreateRxQuery(args) {
      checkQuery(args);
    },
    createRxCollection: function createRxCollection(args) {
      // check ORM-methods
      checkOrmMethods(args.statics);
      checkOrmMethods(args.methods);
      checkOrmMethods(args.attachments); // check migration strategies

      if (args.schema && args.migrationStrategies) {
        checkMigrationStrategies(args.schema, args.migrationStrategies);
      }
    }
  }
};
//# sourceMappingURL=index.js.map