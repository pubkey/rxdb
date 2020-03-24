"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBDevModePlugin = void 0;

var _errorMessages = require("./error-messages");

var _checkSchema = require("./check-schema");

var _checkOrm = require("./check-orm");

var _checkMigrationStrategies = require("./check-migration-strategies");

var RxDBDevModePlugin = {
  rxdb: true,
  overwritable: {
    isDevMove: function isDevMove() {
      return true;
    },
    tunnelErrorMessage: function tunnelErrorMessage(code) {
      if (!_errorMessages.ERROR_MESSAGES[code]) {
        console.error('RxDB: Error-Code not known: ' + code);
        throw new Error('Error-Cdoe ' + code + ' not known, contact the maintainer');
      }

      return _errorMessages.ERROR_MESSAGES[code];
    }
  },
  hooks: {
    preCreateRxSchema: _checkSchema.checkSchema,
    createRxCollection: function createRxCollection(args) {
      // check ORM-methods
      (0, _checkOrm.checkOrmMethods)(args.statics);
      (0, _checkOrm.checkOrmMethods)(args.methods);
      (0, _checkOrm.checkOrmMethods)(args.attachments); // check migration strategies

      if (args.schema && args.migrationStrategies) {
        (0, _checkMigrationStrategies.checkMigrationStrategies)(args.schema, args.migrationStrategies);
      }
    }
  }
};
exports.RxDBDevModePlugin = RxDBDevModePlugin;

//# sourceMappingURL=index.js.map