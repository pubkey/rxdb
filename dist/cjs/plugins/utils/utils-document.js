"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_META_LWT_MINIMUM = void 0;
exports.areRxDocumentArraysEqual = areRxDocumentArraysEqual;
exports.getDefaultRevision = getDefaultRevision;
exports.getDefaultRxDocumentMeta = getDefaultRxDocumentMeta;
exports.getSortDocumentsByLastWriteTimeComparator = getSortDocumentsByLastWriteTimeComparator;
exports.sortDocumentsByLastWriteTime = sortDocumentsByLastWriteTime;
exports.stripMetaDataFromDocument = stripMetaDataFromDocument;
exports.toWithDeleted = toWithDeleted;
var _utilsObject = require("./utils-object.js");
/**
 * We use 1 as minimum so that the value is never falsy.
 * This const is used in several places because querying
 * with a value lower then the minimum could give false results.
 */
var RX_META_LWT_MINIMUM = exports.RX_META_LWT_MINIMUM = 1;
function getDefaultRxDocumentMeta() {
  return {
    /**
     * Set this to 1 to not waste performance
     * while calling new Date()..
     * The storage wrappers will anyway update
     * the lastWrite time while calling transformDocumentDataFromRxDBToRxStorage()
     */
    lwt: RX_META_LWT_MINIMUM
  };
}

/**
 * Returns a revision that is not valid.
 * Use this to have correct typings
 * while the storage wrapper anyway will overwrite the revision.
 */
function getDefaultRevision() {
  /**
   * Use a non-valid revision format,
   * to ensure that the RxStorage will throw
   * when the revision is not replaced downstream.
   */
  return '';
}
function stripMetaDataFromDocument(docData) {
  return Object.assign({}, docData, {
    _meta: undefined,
    _deleted: undefined,
    _rev: undefined
  });
}

/**
 * Faster way to check the equality of document lists
 * compared to doing a deep-equal.
 * Here we only check the ids and revisions.
 */
function areRxDocumentArraysEqual(primaryPath, ar1, ar2) {
  if (ar1.length !== ar2.length) {
    return false;
  }
  var i = 0;
  var len = ar1.length;
  while (i < len) {
    var row1 = ar1[i];
    var row2 = ar2[i];
    i++;
    if (row1[primaryPath] !== row2[primaryPath] || row1._rev !== row2._rev || row1._meta.lwt !== row2._meta.lwt) {
      return false;
    }
  }
  return true;
}
function getSortDocumentsByLastWriteTimeComparator(primaryPath) {
  return (a, b) => {
    if (a._meta.lwt === b._meta.lwt) {
      if (b[primaryPath] < a[primaryPath]) {
        return 1;
      } else {
        return -1;
      }
    } else {
      return a._meta.lwt - b._meta.lwt;
    }
  };
}
function sortDocumentsByLastWriteTime(primaryPath, docs) {
  return docs.sort(getSortDocumentsByLastWriteTimeComparator(primaryPath));
}
function toWithDeleted(docData) {
  docData = (0, _utilsObject.flatClone)(docData);
  docData._deleted = !!docData._deleted;
  return Object.assign(docData, {
    _attachments: undefined,
    _meta: undefined,
    _rev: undefined
  });
}
//# sourceMappingURL=utils-document.js.map