import type {
    RxDocumentData,
    RxJsonSchema
} from '../../types/index.d.ts';
import type {
    DocWithIndexString,
    MemoryStorageInternals,
    MemoryStorageInternalsByIndex
} from './memory-types.ts';
import type { RxStorageInstanceMemory } from './rx-storage-instance-memory.ts';
import {
    pushAtSortPosition
} from 'array-push-at-sort-position';
import { newRxError } from '../../rx-error.ts';
import { boundEQByIndexString } from './binary-search-bounds.ts';


export function getMemoryCollectionKey(
    databaseName: string,
    collectionName: string,
    schemaVersion: number
): string {
    return [
        databaseName,
        collectionName,
        schemaVersion
    ].join('--memory--');
}


export function ensureNotRemoved(
    instance: RxStorageInstanceMemory<any>
) {
    if (instance.internals.removed) {
        throw new Error(
            'removed already ' +
            instance.databaseName + ' - ' + instance.collectionName +
            ' - ' + instance.schema.version
        );
    }
}

export function attachmentMapKey(documentId: string, attachmentId: string): string {
    return documentId + '||' + attachmentId;
}


/**
 * @performance
 * Threshold for using in-place splice vs. full merge-sort when inserting
 * documents into indexes. Below this batch size, in-place binary search + splice
 * is faster because it avoids allocating a new full-size array and copying all elements.
 */
const IN_PLACE_INSERT_THRESHOLD = 64;

function sortByIndexStringComparator<RxDocType>(a: DocWithIndexString<RxDocType>, b: DocWithIndexString<RxDocType>) {
    if (a[0] < b[0]) {
        return -1;
    } else {
        return 1;
    }
}



/**
 * @hotPath
 */
export function putWriteRowToState<RxDocType>(
    docId: string,
    state: MemoryStorageInternals<RxDocType>,
    stateByIndex: MemoryStorageInternalsByIndex<RxDocType>[],
    document: RxDocumentData<RxDocType>,
    docInState?: RxDocumentData<RxDocType>
) {
    state.documents.set(docId, document as any);
    const stateByIndexLength = stateByIndex.length;
    for (let i = 0; i < stateByIndexLength; ++i) {
        const byIndex = stateByIndex[i];
        const docsWithIndex = byIndex.docsWithIndex;
        const getIndexableString = byIndex.getIndexableString;
        const newIndexString = getIndexableString(document as any);

        /**
         * @performance
         * When updating a document, first compute whether the index changed.
         * If it did not change, we only need to update the document reference
         * in-place without any splice operations.
         */
        if (docInState) {
            const previousIndexString = getIndexableString(docInState);
            if (previousIndexString === newIndexString) {
                /**
                 * Performance shortcut.
                 * Index did not change, so the old entry is at the same position.
                 * We can find it by string-specialized binary search and update in-place.
                 */
                const eqPos = boundEQByIndexString(
                    docsWithIndex,
                    previousIndexString
                );
                if (eqPos !== -1) {
                    /**
                     * There might be multiple entries with the same index string
                     * (e.g. different documents). Search around eqPos for ours.
                     */
                    if (docsWithIndex[eqPos][2] === docId) {
                        docsWithIndex[eqPos][1] = document;
                        continue;
                    }
                    // Check neighbors
                    const prev = docsWithIndex[eqPos - 1];
                    if (prev && prev[0] === previousIndexString && prev[2] === docId) {
                        docsWithIndex[eqPos - 1][1] = document;
                        continue;
                    }
                    const next = docsWithIndex[eqPos + 1];
                    if (next && next[0] === previousIndexString && next[2] === docId) {
                        docsWithIndex[eqPos + 1][1] = document;
                        continue;
                    }
                }
                // Fallback: use the old insert+remove approach
                const insertPosition = pushAtSortPosition(
                    docsWithIndex,
                    [newIndexString, document, docId],
                    sortByIndexStringComparator,
                    0
                );
                const prevEntry = docsWithIndex[insertPosition - 1];
                if (prevEntry && prevEntry[2] === docId) {
                    docsWithIndex.splice(insertPosition - 1, 1);
                } else {
                    const nextEntry = docsWithIndex[insertPosition + 1];
                    if (nextEntry[2] === docId) {
                        docsWithIndex.splice(insertPosition + 1, 1);
                    } else {
                        throw newRxError('SNH', {
                            document,
                            args: {
                                byIndex
                            }
                        });
                    }
                }
                continue;
            } else {
                /**
                 * Index changed, we must remove the old entry and insert the new one.
                 */
                const indexBefore = boundEQByIndexString(
                    docsWithIndex,
                    previousIndexString
                );
                if (indexBefore !== -1) {
                    docsWithIndex.splice(indexBefore, 1);
                }
            }
        }

        pushAtSortPosition(
            docsWithIndex,
            [newIndexString, document, docId],
            sortByIndexStringComparator,
            0
        );
    }
}


/**
 * @hotPath
 * Efficiently inserts multiple documents into the state at once.
 *
 * Uses two strategies based on batch size:
 * - For small batches (relative to existing index size), uses in-place
 *   binary search + splice per document. This avoids allocating a new
 *   full-size array and copying all elements, reducing GC pressure.
 * - For large batches (or empty indexes), pre-computes all index entries,
 *   sorts them, and merges into the existing sorted arrays in a single pass.
 */
export function bulkInsertToState<RxDocType>(
    primaryPath: string,
    state: MemoryStorageInternals<RxDocType>,
    stateByIndex: MemoryStorageInternalsByIndex<RxDocType>[],
    docs: { document: RxDocumentData<RxDocType> }[]
) {
    const docsLength = docs.length;
    const stateByIndexLength = stateByIndex.length;

    // Extract documents and docIds once, store in Map
    const documents: RxDocumentData<RxDocType>[] = new Array(docsLength);
    const docIds: string[] = new Array(docsLength);
    for (let i = 0; i < docsLength; ++i) {
        const doc = docs[i].document;
        const docId: string = (doc as any)[primaryPath];
        documents[i] = doc;
        docIds[i] = docId;
        state.documents.set(docId, doc as any);
    }

    /**
     * @performance
     * For small batch sizes, use in-place binary search + splice
     * instead of creating a full merged array copy. This is faster
     * for serial inserts and small bulk inserts because it avoids:
     * - Allocating a new array of size n+m
     * - Copying all n existing elements
     * - GC pressure from discarding the old array
     *
     * The threshold is based on when the merge approach becomes more
     * efficient than individual splices.
     */
    const useInPlaceInsert = docsLength < IN_PLACE_INSERT_THRESHOLD;

    if (useInPlaceInsert) {
        for (let indexI = 0; indexI < stateByIndexLength; ++indexI) {
            const byIndex = stateByIndex[indexI];
            const docsWithIndex = byIndex.docsWithIndex;
            const getIndexableString = byIndex.getIndexableString;

            if (docsWithIndex.length === 0) {
                for (let i = 0; i < docsLength; ++i) {
                    const doc = documents[i];
                    const indexString = getIndexableString(doc as any);
                    docsWithIndex.push([indexString, doc, docIds[i]]);
                }
                docsWithIndex.sort(sortByIndexStringComparator);
            } else {
                for (let i = 0; i < docsLength; ++i) {
                    const doc = documents[i];
                    const indexString = getIndexableString(doc as any);
                    const newEntry: DocWithIndexString<RxDocType> = [indexString, doc, docIds[i]];
                    pushAtSortPosition(
                        docsWithIndex,
                        newEntry,
                        sortByIndexStringComparator,
                        0
                    );
                }
            }
        }
    } else {
        // For each index, batch-compute entries, sort, and merge
        for (let indexI = 0; indexI < stateByIndexLength; ++indexI) {
            const byIndex = stateByIndex[indexI];
            const docsWithIndex = byIndex.docsWithIndex;
            const getIndexableString = byIndex.getIndexableString;

            // Build new entries
            const newEntries: DocWithIndexString<RxDocType>[] = new Array(docsLength);
            for (let i = 0; i < docsLength; ++i) {
                const doc = documents[i];
                newEntries[i] = [
                    getIndexableString(doc as any),
                    doc,
                    docIds[i]
                ];
            }

            // Sort by index string
            newEntries.sort(sortByIndexStringComparator);

            if (docsWithIndex.length === 0) {
                // Index is empty, just assign sorted entries
                byIndex.docsWithIndex = newEntries;
            } else {
                // Merge sorted arrays
                byIndex.docsWithIndex = mergeSortedArrays(docsWithIndex, newEntries);
            }
        }
    }
}


/**
 * Merges two sorted DocWithIndexString arrays into a single sorted array.
 * Runs in O(n + m) where n and m are the lengths of the input arrays.
 * @performance Comparator is inlined to avoid function call overhead
 * per comparison, which is significant for large arrays.
 */
function mergeSortedArrays<RxDocType>(
    a: DocWithIndexString<RxDocType>[],
    b: DocWithIndexString<RxDocType>[]
): DocWithIndexString<RxDocType>[] {
    const aLen = a.length;
    const bLen = b.length;
    const result: DocWithIndexString<RxDocType>[] = new Array(aLen + bLen);
    let ai = 0;
    let bi = 0;
    let ri = 0;

    while (ai < aLen && bi < bLen) {
        if (a[ai][0] <= b[bi][0]) {
            result[ri++] = a[ai++];
        } else {
            result[ri++] = b[bi++];
        }
    }

    while (ai < aLen) {
        result[ri++] = a[ai++];
    }
    while (bi < bLen) {
        result[ri++] = b[bi++];
    }

    return result;
}

export function removeDocFromState<RxDocType>(
    primaryPath: string,
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    state: MemoryStorageInternals<RxDocType>,
    doc: RxDocumentData<RxDocType>
) {
    const docId: string = (doc as any)[primaryPath];
    state.documents.delete(docId);

    const stateByIndex = state.byIndexArray;
    for (let i = 0; i < stateByIndex.length; ++i) {
        const byIndex = stateByIndex[i];
        const docsWithIndex = byIndex.docsWithIndex;
        const indexString = byIndex.getIndexableString(doc);

        const positionInIndex = boundEQByIndexString(
            docsWithIndex,
            indexString
        );
        if (positionInIndex !== -1) {
            docsWithIndex.splice(positionInIndex, 1);
        }
    }
}


export function compareDocsWithIndex<RxDocType>(
    a: DocWithIndexString<RxDocType>,
    b: DocWithIndexString<RxDocType>
): 1 | 0 | -1 {
    const indexStringA = a[0];
    const indexStringB = b[0];
    if (indexStringA < indexStringB) {
        return -1;
    } else if (indexStringA === indexStringB) {
        return 0;
    } else {
        return 1;
    }
}
