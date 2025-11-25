import { newRxError } from "../../rx-error.js";
import { fillPrimaryKey, getPrimaryFieldOfPrimaryKey } from "../../rx-schema-helper.js";
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

/**
 * Deeply checks if the object contains an
 * instance of the JavaScript Date class.
 * @recursive
 */
export function containsDateInstance(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (obj[key] instanceof Date) {
        return true;
      }
      if (typeof obj[key] === 'object' && containsDateInstance(obj[key])) {
        return true;
      }
    }
  }
  return false;
}
export function checkWriteRows(storageInstance, rows) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(storageInstance.schema.primaryKey);
  var _loop = function (writeRow) {
    // ensure that the primary key has not been changed
    writeRow.document = fillPrimaryKey(primaryPath, storageInstance.schema, writeRow.document);

    /**
     * Ensure that _meta fields have been merged
     * and not replaced.
     * This is important so that when one plugin A
     * sets a _meta field and another plugin B does a write
     * to the document, it must be ensured that the
     * field of plugin A was not removed.
     */
    if (writeRow.previous) {
      Object.keys(writeRow.previous._meta).forEach(metaFieldName => {
        if (!Object.prototype.hasOwnProperty.call(writeRow.document._meta, metaFieldName)) {
          throw newRxError('SNH', {
            dataBefore: writeRow.previous,
            dataAfter: writeRow.document,
            args: {
              metaFieldName
            }
          });
        }
      });
    }

    /**
     * Ensure it can be structured cloned
     */
    try {
      /**
       * Notice that structuredClone() is not available
       * in ReactNative, so we test for JSON.stringify() instead
       * @link https://github.com/pubkey/rxdb/issues/5046#issuecomment-1827374498
       */
      if (typeof structuredClone === 'function') {
        structuredClone(writeRow);
      } else {
        JSON.parse(JSON.stringify(writeRow));
      }
    } catch (err) {
      throw newRxError('DOC24', {
        collection: storageInstance.collectionName,
        document: writeRow.document
      });
    }

    /**
     * Ensure it does not contain a Date() object
     */
    if (containsDateInstance(writeRow.document)) {
      throw newRxError('DOC24', {
        collection: storageInstance.collectionName,
        document: writeRow.document
      });
    }
  };
  for (var writeRow of rows) {
    _loop(writeRow);
  }
}
//# sourceMappingURL=check-document.js.map