"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ensurePrimaryKeyValid = ensurePrimaryKeyValid;
var _rxError = require("../../rx-error");
function ensurePrimaryKeyValid(primaryKey, docData) {
  if (!primaryKey) {
    throw (0, _rxError.newRxError)('DOC20', {
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
    throw (0, _rxError.newRxError)('DOC21', {
      primaryKey,
      document: docData
    });
  }
  if (primaryKey.includes('\r') || primaryKey.includes('\n')) {
    throw (0, _rxError.newRxError)('DOC22', {
      primaryKey,
      document: docData
    });
  }
  if (primaryKey.includes('"')) {
    throw (0, _rxError.newRxError)('DOC23', {
      primaryKey,
      document: docData
    });
  }
}
//# sourceMappingURL=check-document.js.map