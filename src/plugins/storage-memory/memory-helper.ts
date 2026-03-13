import type {
    BulkWriteRow,
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
import { boundEQ } from './binary-search-bounds.ts';


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
    for (let i = 0; i < stateByIndex.length; ++i) {
        const byIndex = stateByIndex[i];
        const docsWithIndex = byIndex.docsWithIndex;
        const getIndexableString = byIndex.getIndexableString;
        const newIndexString = getIndexableString(document as any);
        const insertPosition = pushAtSortPosition(
            docsWithIndex,
            [
                newIndexString,
                document,
                docId,
            ],
            sortByIndexStringComparator,
            0
        );

        /**
         * Remove previous if it was in the state
         */
        if (docInState) {
            const previousIndexString = getIndexableString(docInState);
            if (previousIndexString === newIndexString) {
                /**
                 * Performance shortcut.
                 * If index was not changed -> The old doc must be before or after the new one.
                 */
                const prev = docsWithIndex[insertPosition - 1];
                if (prev && prev[2] === docId) {
                    docsWithIndex.splice(insertPosition - 1, 1);
                } else {
                    const next = docsWithIndex[insertPosition + 1];
                    if (next[2] === docId) {
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
            } else {
                /**
                 * Index changed, we must search for the old one and remove it.
                 */
                const indexBefore = boundEQ(
                    docsWithIndex,
                    [
                        previousIndexString
                    ] as any,
                    compareDocsWithIndex
                );
                docsWithIndex.splice(indexBefore, 1);
            }
        }
    }
}


/**
 * @hotPath
 * Efficiently inserts multiple documents into the state at once.
 * Instead of inserting one-by-one with Array.splice() (O(n) per insert),
 * this pre-computes all index entries, sorts them, and merges them into
 * the existing sorted arrays in a single pass (O(n log n + n + m)).
 */
export function bulkInsertToState<RxDocType>(
    primaryPath: string,
    state: MemoryStorageInternals<RxDocType>,
    stateByIndex: MemoryStorageInternalsByIndex<RxDocType>[],
    docs: { document: RxDocumentData<RxDocType> }[]
) {
    const docsLength = docs.length;

    // Store all documents in the Map
    for (let i = 0; i < docsLength; ++i) {
        const doc = docs[i].document;
        const docId: string = (doc as any)[primaryPath];
        state.documents.set(docId, doc as any);
    }

    // For each index, batch-compute entries, sort, and merge
    for (let indexI = 0; indexI < stateByIndex.length; ++indexI) {
        const byIndex = stateByIndex[indexI];
        const docsWithIndex = byIndex.docsWithIndex;
        const getIndexableString = byIndex.getIndexableString;

        // Build new entries
        const newEntries: DocWithIndexString<RxDocType>[] = new Array(docsLength);
        for (let i = 0; i < docsLength; ++i) {
            const doc = docs[i].document;
            const docId: string = (doc as any)[primaryPath];
            newEntries[i] = [
                getIndexableString(doc as any),
                doc,
                docId
            ];
        }

        // Sort by index string
        newEntries.sort(sortByIndexStringComparator);

        if (docsWithIndex.length === 0) {
            // Index is empty, just assign sorted entries
            byIndex.docsWithIndex = newEntries;
        } else {
            // Merge sorted arrays
            byIndex.docsWithIndex = mergeSortedArrays(docsWithIndex, newEntries, sortByIndexStringComparator);
        }
    }
}


/**
 * Merges two sorted arrays into a single sorted array.
 * Runs in O(n + m) where n and m are the lengths of the input arrays.
 */
function mergeSortedArrays<T>(
    a: T[],
    b: T[],
    comparator: (x: T, y: T) => number
): T[] {
    const aLen = a.length;
    const bLen = b.length;
    const result: T[] = new Array(aLen + bLen);
    let ai = 0;
    let bi = 0;
    let ri = 0;

    while (ai < aLen && bi < bLen) {
        if (comparator(a[ai], b[bi]) <= 0) {
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

    Object.values(state.byIndex).forEach(byIndex => {
        const docsWithIndex = byIndex.docsWithIndex;
        const indexString = byIndex.getIndexableString(doc);

        const positionInIndex = boundEQ(
            docsWithIndex,
            [
                indexString
            ] as any,
            compareDocsWithIndex
        );
        docsWithIndex.splice(positionInIndex, 1);
    });
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
