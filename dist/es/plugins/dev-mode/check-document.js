import { newRxError } from '../../rx-error';
export function ensurePrimaryKeyValid(primaryKey, docData) {
  if (!primaryKey) {
    throw newRxError('DOC20', {
      primaryKey,
      document: docData
    });
  }

  /**
   * This is required so that we can left-pad
   * the primaryKey and we are still able to de-left-pad
   * it to get again the original key.
   */
  if (primaryKey !== primaryKey.trim()) {
    throw newRxError('DOC21', {
      primaryKey,
      document: docData
    });
  }
  if (primaryKey.includes('\r') || primaryKey.includes('\n')) {
    throw newRxError('DOC22', {
      primaryKey,
      document: docData
    });
  }
  if (primaryKey.includes('"')) {
    throw newRxError('DOC23', {
      primaryKey,
      document: docData
    });
  }
}
//# sourceMappingURL=check-document.js.map