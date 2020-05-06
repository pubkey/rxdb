"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxDBDevModePlugin: true
};
exports.RxDBDevModePlugin = void 0;

var _errorMessages = require("./error-messages");

var _checkSchema = require("./check-schema");

Object.keys(_checkSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
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

var _pouchDb = require("../../pouch-db");

var RxDBDevModePlugin = {
  rxdb: true,
  overwritable: {
    isDevMode: function isDevMode() {
      return true;
    },
    tunnelErrorMessage: function tunnelErrorMessage(code) {
      if (!_errorMessages.ERROR_MESSAGES[code]) {
        console.error('RxDB: Error-Code not known: ' + code);
        throw new Error('Error-Code ' + code + ' not known, contact the maintainer');
      }

      return _errorMessages.ERROR_MESSAGES[code];
    }
  },
  hooks: {
    preCreateRxSchema: _checkSchema.checkSchema,
    preCreateRxDatabase: function preCreateRxDatabase(args) {
      (0, _pouchDb.validateCouchDBString)(args.name);
    },
    preCreateRxCollection: function preCreateRxCollection(args) {
      (0, _unallowedProperties.ensureCollectionNameValid)(args);
    },
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