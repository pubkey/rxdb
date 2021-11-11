"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateDatabaseName = validateDatabaseName;

var _rxError = require("../../rx-error");

var _util = require("../../util");

var validCouchDBStringRegexStr = '^[a-z][_$a-z0-9\\-]*$';
var validCouchDBStringRegex = new RegExp(validCouchDBStringRegexStr);
/**
 * Validates that a given string is ok to be used with couchdb-collection-names.
 * We only allow these strings as database- or collection names because it ensures
 * that you later do not get in troubble when you want to use the database together witch couchdb.
 *
 * @link https://docs.couchdb.org/en/stable/api/database/common.html
 * @link https://neighbourhood.ie/blog/2020/10/13/everything-you-need-to-know-about-couchdb-database-names/
 * @throws  {Error}
 */

function validateDatabaseName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw (0, _rxError.newRxTypeError)('UT1', {
      name: name
    });
  } // do not check, if foldername is given


  if ((0, _util.isFolderPath)(name)) {
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

//# sourceMappingURL=check-names.js.map