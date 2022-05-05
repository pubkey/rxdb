"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compareDocsWithIndex = compareDocsWithIndex;
exports.ensureNotRemoved = ensureNotRemoved;
exports.getMemoryCollectionKey = getMemoryCollectionKey;
exports.putWriteRowToState = putWriteRowToState;
exports.removeDocFromState = removeDocFromState;

var _arrayPushAtSortPosition = require("array-push-at-sort-position");

var _rxError = require("../../rx-error");

var _binarySearchBounds = require("./binary-search-bounds");

function getMemoryCollectionKey(databaseName, collectionName) {
  return databaseName + '--memory--' + collectionName;
}

function ensureNotRemoved(instance) {
  if (instance.internals.removed) {
    throw new Error('removed');
  }
}

function putWriteRowToState(primaryPath, schema, state, row, docInState) {
  var docId = row.document[primaryPath];
  state.documents.set(docId, row.document);
  Object.values(state.byIndex).forEach(function (byIndex) {
    var docsWithIndex = byIndex.docsWithIndex;
    var newIndexString = byIndex.getIndexableString(row.document);

    var _pushAtSortPosition = (0, _arrayPushAtSortPosition.pushAtSortPosition)(docsWithIndex, {
      id: docId,
      doc: row.document,
      indexString: newIndexString
    }, function (a, b) {
      if (a.indexString < b.indexString) {
        return -1;
      } else {
        return 1;
      }
    }, true),
        insertPosition = _pushAtSortPosition[1];
    /**
     * Remove previous if it was in the state
     */


    if (docInState) {
      var previousIndexString = byIndex.getIndexableString(docInState);

      if (previousIndexString === newIndexString) {
        /**
         * Index not changed -> The old doc must be before or after the new one.
         */
        var prev = docsWithIndex[insertPosition - 1];

        if (prev && prev.id === docId) {
          docsWithIndex.splice(insertPosition - 1, 1);
        } else {
          var next = docsWithIndex[insertPosition + 1];

          if (next.id === docId) {
            docsWithIndex.splice(insertPosition + 1, 1);
          } else {
            throw (0, _rxError.newRxError)('SNH', {
              args: {
                row: row,
                byIndex: byIndex
              }
            });
          }
        }
      } else {
        /**
         * Index changed, we must search for the old one and remove it.
         */
        var indexBefore = (0, _binarySearchBounds.boundEQ)(docsWithIndex, {
          indexString: previousIndexString
        }, compareDocsWithIndex);
        docsWithIndex.splice(indexBefore, 1);
      }
    }
  });
}

function removeDocFromState(primaryPath, schema, state, doc) {
  var docId = doc[primaryPath];
  state.documents["delete"](docId);
  Object.values(state.byIndex).forEach(function (byIndex) {
    var docsWithIndex = byIndex.docsWithIndex;
    var indexString = byIndex.getIndexableString(doc);
    var positionInIndex = (0, _binarySearchBounds.boundEQ)(docsWithIndex, {
      indexString: indexString
    }, compareDocsWithIndex);
    docsWithIndex.splice(positionInIndex, 1);
  });
}

function compareDocsWithIndex(a, b) {
  if (a.indexString < b.indexString) {
    return -1;
  } else if (a.indexString === b.indexString) {
    return 0;
  } else {
    return 1;
  }
}
//# sourceMappingURL=memory-helper.js.map