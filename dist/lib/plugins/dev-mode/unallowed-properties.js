"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ensureCollectionNameValid = ensureCollectionNameValid;
exports.ensureDatabaseNameIsValid = ensureDatabaseNameIsValid;

var _rxError = require("../../rx-error");

var _entityProperties = require("./entity-properties");

var _util = require("../../util");

var _checkNames = require("./check-names");

/**
 * if the name of a collection
 * clashes with a property of RxDatabase,
 * we get problems so this function prohibits this
 */
function ensureCollectionNameValid(args) {
  if ((0, _entityProperties.rxDatabaseProperties)().includes(args.name)) {
    throw (0, _rxError.newRxError)('DB5', {
      name: args.name
    });
  }
}

function ensureDatabaseNameIsValid(args) {
  (0, _checkNames.validateDatabaseName)(args.name);
  /**
   * The server-plugin has problems when a path with and ending slash is given
   * So we do not allow this.
   * @link https://github.com/pubkey/rxdb/issues/2251
   */

  if ((0, _util.isFolderPath)(args.name)) {
    if (args.name.endsWith('/') || args.name.endsWith('\\')) {
      throw (0, _rxError.newRxError)('DB11', {
        name: args.name
      });
    }
  }
}

//# sourceMappingURL=unallowed-properties.js.map