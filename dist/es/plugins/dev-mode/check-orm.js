import { newRxError, newRxTypeError } from '../../rx-error';
import { rxCollectionProperties, rxDocumentProperties } from './entity-properties';
/**
 * checks if the given static methods are allowed
 * @throws if not allowed
 */

export function checkOrmMethods(statics) {
  if (!statics) {
    return;
  }

  Object.entries(statics).forEach(function (_ref) {
    var k = _ref[0],
        v = _ref[1];

    if (typeof k !== 'string') {
      throw newRxTypeError('COL14', {
        name: k
      });
    }

    if (k.startsWith('_')) {
      throw newRxTypeError('COL15', {
        name: k
      });
    }

    if (typeof v !== 'function') {
      throw newRxTypeError('COL16', {
        name: k,
        type: typeof k
      });
    }

    if (rxCollectionProperties().includes(k) || rxDocumentProperties().includes(k)) {
      throw newRxError('COL17', {
        name: k
      });
    }
  });
}
//# sourceMappingURL=check-orm.js.map