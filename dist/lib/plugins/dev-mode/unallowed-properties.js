"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ensureCollectionNameValid = ensureCollectionNameValid;
exports.ensureDatabaseNameIsValid = ensureDatabaseNameIsValid;
exports.validateDatabaseName = validateDatabaseName;
var _rxError = require("../../rx-error");
var _entityProperties = require("./entity-properties");
var _utils = require("../../plugins/utils");
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
  validateDatabaseName(args.name);
}
function ensureDatabaseNameIsValid(args) {
  validateDatabaseName(args.name);

  /**
   * The server-plugin has problems when a path with and ending slash is given
   * So we do not allow this.
   * @link https://github.com/pubkey/rxdb/issues/2251
   */
  if ((0, _utils.isFolderPath)(args.name)) {
    if (args.name.endsWith('/') || args.name.endsWith('\\')) {
      throw (0, _rxError.newRxError)('DB11', {
        name: args.name
      });
    }
  }
}
var validCouchDBStringRegexStr = '^[a-z][_$a-z0-9\\-]*$';
var validCouchDBStringRegex = new RegExp(validCouchDBStringRegexStr);

/**
 * Validates that a given string is ok to be used with couchdb-collection-names.
 * We only allow these strings as database- or collection names because it ensures
 * that you later do not get in troubble when you want to use the database together witch couchdb.
 *
 * @link https://docs.couchdb.org/en/stable/api/database/common.html
 * @link https://neighbourhood.ie/blog/2020/10/13/everything-you-need-to-know-about-couchdb-database-names/
 * @throws  {RxError}
 */
function validateDatabaseName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw (0, _rxError.newRxTypeError)('UT1', {
      name
    });
  }

  // do not check, if foldername is given
  if ((0, _utils.isFolderPath)(name)) {
    return true;
  }
  if (!name.match(validCouchDBStringRegex)) {
    throw (0, _rxError.newRxError)('UT2', {
      regex: validCouchDBStringRegexStr,
      givenName: name
    });
  }
  return true;
}
//# sourceMappingURL=unallowed-properties.js.map