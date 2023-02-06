import { pushAtSortPosition } from 'array-push-at-sort-position';
import { newRxError } from '../../rx-error';
import { boundEQ } from './binary-search-bounds';
export function getMemoryCollectionKey(databaseName, collectionName, schemaVersion) {
  return [databaseName, collectionName, schemaVersion].join('--memory--');
}
export function ensureNotRemoved(instance) {
  if (instance.internals.removed) {
    throw new Error('removed');
  }
}
export function attachmentMapKey(documentId, attachmentId) {
  return documentId + '||' + attachmentId;
}
function sortByIndexStringComparator(a, b) {
  if (a.indexString < b.indexString) {
    return -1;
  } else {
    return 1;
  }
}

/**
 * @hotPath
 */
export function putWriteRowToState(docId, state, stateByIndex, row, docInState) {
  state.documents.set(docId, row.document);
  for (var i = 0; i < stateByIndex.length; ++i) {
    var byIndex = stateByIndex[i];
    var docsWithIndex = byIndex.docsWithIndex;
    var newIndexString = byIndex.getIndexableString(row.document);
    var [, insertPosition] = pushAtSortPosition(docsWithIndex, {
      id: docId,
      doc: row.document,
      indexString: newIndexString
    }, sortByIndexStringComparator, true);

    /**
     * Remove previous if it was in the state
     */
    if (docInState) {
      var previousIndexString = byIndex.getIndexableString(docInState);
      if (previousIndexString === newIndexString) {
        /**
         * Performance shortcut.
         * If index was not changed -> The old doc must be before or after the new one.
         */
        var prev = docsWithIndex[insertPosition - 1];
        if (prev && prev.id === docId) {
          docsWithIndex.splice(insertPosition - 1, 1);
        } else {
          var next = docsWithIndex[insertPosition + 1];
          if (next.id === docId) {
            docsWithIndex.splice(insertPosition + 1, 1);
          } else {
            throw newRxError('SNH', {
              args: {
                row,
                byIndex
              }
            });
          }
        }
      } else {
        /**
         * Index changed, we must search for the old one and remove it.
         */
        var indexBefore = boundEQ(docsWithIndex, {
          indexString: previousIndexString
        }, compareDocsWithIndex);
        docsWithIndex.splice(indexBefore, 1);
      }
    }
  }
}
export function removeDocFromState(primaryPath, schema, state, doc) {
  var docId = doc[primaryPath];
  state.documents.delete(docId);
  Object.values(state.byIndex).forEach(byIndex => {
    var docsWithIndex = byIndex.docsWithIndex;
    var indexString = byIndex.getIndexableString(doc);
    var positionInIndex = boundEQ(docsWithIndex, {
      indexString
    }, compareDocsWithIndex);
    docsWithIndex.splice(positionInIndex, 1);
  });
}
export function compareDocsWithIndex(a, b) {
  if (a.indexString < b.indexString) {
    return -1;
  } else if (a.indexString === b.indexString) {
    return 0;
  } else {
    return 1;
  }
}
//# sourceMappingURL=memory-helper.js.map