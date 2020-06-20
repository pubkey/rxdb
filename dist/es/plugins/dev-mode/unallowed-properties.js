import { newRxError } from '../../rx-error';
import { rxDatabaseProperties } from './entity-properties';
import { validateCouchDBString } from '../../pouch-db';
import { isFolderPath } from '../../util';
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
}
export function ensureDatabaseNameIsValid(args) {
  /**
   * Not all strings can be used as couchdb collection name
   * So we only allow couchdb-valid string as databse name
   * which solves some strange bugs.
   */
  validateCouchDBString(args.name);
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
//# sourceMappingURL=unallowed-properties.js.map