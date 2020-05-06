import { ERROR_MESSAGES } from './error-messages';
import { checkSchema } from './check-schema';
import { checkOrmMethods } from './check-orm';
import { checkMigrationStrategies } from './check-migration-strategies';
import { ensureCollectionNameValid } from './unallowed-properties';
import { validateCouchDBString } from '../../pouch-db';
export * from './check-schema';
export var RxDBDevModePlugin = {
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
    preCreateRxSchema: checkSchema,
    preCreateRxDatabase: function preCreateRxDatabase(args) {
      validateCouchDBString(args.name);
    },
    preCreateRxCollection: function preCreateRxCollection(args) {
      ensureCollectionNameValid(args);
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