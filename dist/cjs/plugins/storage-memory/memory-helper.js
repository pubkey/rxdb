"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.attachmentMapKey = attachmentMapKey;
exports.compareDocsWithIndex = compareDocsWithIndex;
exports.ensureNotRemoved = ensureNotRemoved;
exports.getMemoryCollectionKey = getMemoryCollectionKey;
exports.putWriteRowToState = putWriteRowToState;
exports.removeDocFromState = removeDocFromState;
var _arrayPushAtSortPosition = require("array-push-at-sort-position");
var _rxError = require("../../rx-error.js");
var _binarySearchBounds = require("./binary-search-bounds.js");
function getMemoryCollectionKey(databaseName, collectionName, schemaVersion) {
  return [databaseName, collectionName, schemaVersion].join('--memory--');
}
function ensureNotRemoved(instance) {
  if (instance.internals.removed) {
    throw new Error('removed already ' + instance.databaseName + ' - ' + instance.collectionName + ' - ' + instance.schema.version);
  }
}
function attachmentMapKey(documentId, attachmentId) {
  return documentId + '||' + attachmentId;
}
function sortByIndexStringComparator(a, b) {
  if (a[0] < b[0]) {
    return -1;
  } else {
    return 1;
  }
}

/**
 * @hotPath
 */
function putWriteRowToState(docId, state, stateByIndex, document, docInState) {
  state.documents.set(docId, document);
  for (var i = 0; i < stateByIndex.length; ++i) {
    var byIndex = stateByIndex[i];
    var docsWithIndex = byIndex.docsWithIndex;
    var getIndexableString = byIndex.getIndexableString;
    var newIndexString = getIndexableString(document);
    var insertPosition = (0, _arrayPushAtSortPosition.pushAtSortPosition)(docsWithIndex, [newIndexString, document, docId], sortByIndexStringComparator, 0);

    /**
     * Remove previous if it was in the state
     */
    if (docInState) {
      var previousIndexString = getIndexableString(docInState);
      if (previousIndexString === newIndexString) {
        /**
         * Performance shortcut.
         * If index was not changed -> The old doc must be before or after the new one.
         */
        var prev = docsWithIndex[insertPosition - 1];
        if (prev && prev[2] === docId) {
          docsWithIndex.splice(insertPosition - 1, 1);
        } else {
          var next = docsWithIndex[insertPosition + 1];
          if (next[2] === docId) {
            docsWithIndex.splice(insertPosition + 1, 1);
          } else {
            throw (0, _rxError.newRxError)('SNH', {
              document,
              args: {
                byIndex
              }
            });
          }
        }
      } else {
        /**
         * Index changed, we must search for the old one and remove it.
         */
        var indexBefore = (0, _binarySearchBounds.boundEQ)(docsWithIndex, [previousIndexString], compareDocsWithIndex);
        docsWithIndex.splice(indexBefore, 1);
      }
    }
  }
}
function removeDocFromState(primaryPath, schema, state, doc) {
  var docId = doc[primaryPath];
  state.documents.delete(docId);
  Object.values(state.byIndex).forEach(byIndex => {
    var docsWithIndex = byIndex.docsWithIndex;
    var indexString = byIndex.getIndexableString(doc);
    var positionInIndex = (0, _binarySearchBounds.boundEQ)(docsWithIndex, [indexString], compareDocsWithIndex);
    docsWithIndex.splice(positionInIndex, 1);
  });
}
function compareDocsWithIndex(a, b) {
  var indexStringA = a[0];
  var indexStringB = b[0];
  if (indexStringA < indexStringB) {
    return -1;
  } else if (indexStringA === indexStringB) {
    return 0;
  } else {
    return 1;
  }
}
//# sourceMappingURL=memory-helper.js.map