import { ERROR_MESSAGES } from './error-messages';
import { checkSchema } from './check-schema';
import { checkOrmMethods } from './check-orm';
import { checkMigrationStrategies } from './check-migration-strategies';
export var RxDBDevModePlugin = {
  rxdb: true,
  overwritable: {
    isDevMove: function isDevMove() {
      return true;
    },
    tunnelErrorMessage: function tunnelErrorMessage(code) {
      if (!ERROR_MESSAGES[code]) {
        console.error('RxDB: Error-Code not known: ' + code);
        throw new Error('Error-Cdoe ' + code + ' not known, contact the maintainer');
      }

      return ERROR_MESSAGES[code];
    }
  },
  hooks: {
    preCreateRxSchema: checkSchema,
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