import { newRxError, newRxTypeError } from "../../rx-error.js";
import { rxDatabaseProperties } from "./entity-properties.js";
import { isFolderPath } from "../../plugins/utils/index.js";

/**
 * if the name of a collection
 * clashes with a property of RxDatabase,
 * we get problems so this function prohibits this
 */
export function ensureCollectionNameValid(args) {
  if (rxDatabaseProperties().includes(args.name)) {
    throw newRxError('DB5', {
      name: args.name
    });
  }
  validateDatabaseName(args.name);
}
export function ensureDatabaseNameIsValid(args) {
  validateDatabaseName(args.name);
  if (args.name.includes('$')) {
    throw newRxError('DB13', {
      name: args.name
    });
  }

  /**
   * The server-plugin has problems when a path with and ending slash is given
   * So we do not allow this.
   * @link https://github.com/pubkey/rxdb/issues/2251
   */
  if (isFolderPath(args.name)) {
    if (args.name.endsWith('/') || args.name.endsWith('\\')) {
      throw newRxError('DB11', {
        name: args.name
      });
    }
  }
}

/**
 * In contrast to CouchDB, we still allow inner uppercase letters
 * like the name fooBar. This makes it way less confusing when naming
 * collections with a JavaScript variable name convention.
 */
var validCouchDBStringRegexStr = '^[a-z][_$a-zA-Z0-9\\-]*$';
var validCouchDBStringRegex = new RegExp(validCouchDBStringRegexStr);

/**
 * Validates that a given string is ok to be used with couchdb-collection-names.
 * We only allow these strings as database- or collection names because it ensures
 * that you later do not get in trouble when you want to use the database together witch couchdb.
 *
 * @link https://docs.couchdb.org/en/stable/api/database/common.html
 * @link https://neighbourhood.ie/blog/2020/10/13/everything-you-need-to-know-about-couchdb-database-names/
 * @throws  {RxError}
 */
export function validateDatabaseName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw newRxTypeError('UT1', {
      name
    });
  }

  // do not check, if foldername is given
  if (isFolderPath(name)) {
    return true;
  }
  if (!name.match(validCouchDBStringRegex) &&
  /**
   * The string ':memory:' is used in the SQLite RxStorage
   * to persist data into a memory state. Often used in tests.
   */
  name !== ':memory:') {
    throw newRxError('UT2', {
      regex: validCouchDBStringRegexStr,
      givenName: name
    });
  }
  return true;
}
//# sourceMappingURL=unallowed-properties.js.map