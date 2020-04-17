import { newRxError } from '../../rx-error';
import { rxDatabaseProperties } from './entity-properties';
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
//# sourceMappingURL=unallowed-properties.js.map