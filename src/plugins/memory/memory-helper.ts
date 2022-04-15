import { getIndexableString } from '../../custom-index';
import type { BulkWriteRow, RxDocumentData, RxJsonSchema } from '../../types';
import type { DocWithIndexString, MemoryStorageInternals } from './memory-types';
import type { RxStorageInstanceMemory } from './rx-storage-instance-memory';
import {
    pushAtSortPosition
} from 'array-push-at-sort-position';
import { newRxError } from '../../rx-error';


import {
    eq as boundEQ
} from 'binary-search-bounds';

export function getMemoryCollectionKey(
    databaseName: string,
    collectionName: string
): string {
    return databaseName + '--memory--' + collectionName;
}


export function ensureNotRemoved(
    instance: RxStorageInstanceMemory<any>
) {
    if (instance.internals.removed) {
        throw new Error('removed');
    }
}

export function putWriteRowToState<RxDocType>(
    primaryPath: string,
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    state: MemoryStorageInternals<RxDocType>,
    row: BulkWriteRow<RxDocType>,
    docInState?: RxDocumentData<RxDocType>
) {
    const docId: string = (row.document as any)[primaryPath];
    state.documents.set(docId, row.document);


    Object.values(state.byIndex).forEach(byIndex => {
        const docsWithIndex = byIndex.docsWithIndex;
        const newIndexString = getIndexableString(schema, byIndex.index, row.document);

        const [, insertPosition] = pushAtSortPosition(
            docsWithIndex,
            {
                id: docId,
                doc: row.document,
                indexString: newIndexString
            },
            (a: DocWithIndexString<RxDocType>, b: DocWithIndexString<RxDocType>) => {
                if (a.indexString < b.indexString) {
                    return -1;
                } else {
                    return 1;
                }
            },
            true
        );


        /**
         * Remove previous if it was in the state
         */
        if (docInState) {
            const previousIndexString = getIndexableString(schema, byIndex.index, docInState);
            if (previousIndexString === newIndexString) {
                /**
                 * Index not changed -> The old doc must be before or after the new one.
                 */
                const prev = docsWithIndex[insertPosition - 1];
                if (prev && prev.id === docId) {
                    docsWithIndex.splice(insertPosition - 1, 1)
                } else {
                    const next = docsWithIndex[insertPosition + 1];
                    if (next.id === docId) {
                        docsWithIndex.splice(insertPosition + 1, 1)
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
                const indexBefore = boundEQ(
                    docsWithIndex,
                    {
                        indexString: previousIndexString
                    },
                    compareDocsWithIndex
                );
                console.log('indexBefore: ' + indexBefore);

                if (docsWithIndex[indexBefore].id !== docId) {
                    console.dir(docsWithIndex[indexBefore]);
                    throw new Error('wrong doc index found ' + docId);
                }

                docsWithIndex.splice(indexBefore, 1)
            }
        }
    });
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
        const indexString = getIndexableString(schema, byIndex.index, doc);

        const positionInIndex = boundEQ(
            docsWithIndex,
            {
                indexString
            },
            compareDocsWithIndex
        );
        docsWithIndex.splice(positionInIndex, 1);
    });
}


export function compareDocsWithIndex<RxDocType>(
    a: DocWithIndexString<RxDocType>,
    b: DocWithIndexString<RxDocType>
): 1 | 0 | -1 {
    if (a.indexString < b.indexString) {
        return -1;
    } else if (a.indexString === b.indexString) {
        return 0;
    } else {
        return 1;
    }
}


export function findPositionByLowerBoundIndexString<RxDocType>(
    docsWithIndex: DocWithIndexString<RxDocType>[],
    lowerBoundIndexString: string
): number {
    const compare = (a: DocWithIndexString<RxDocType>, b: DocWithIndexString<RxDocType>) => {
        if (a.indexString > b.indexString) {
            return -1;
        } else {
            return 1;
        }
    }

    const res = binarySearchA(docsWithIndex, j => 0 < compare({
        indexString: lowerBoundIndexString
    }, j));

    console.log('::::::::::::::::');
    console.dir(res);

    return res;
}


function binarySearchA(array: any[], pred) {
    let lo = -1, hi = array.length;
    while (1 + lo < hi) {
        const mi = lo + ((hi - lo) >> 1);
        if (pred(array[mi])) {
            hi = mi;
        } else {
            lo = mi;
        }
    }
    return hi;
}


/**
 *
 * @link https://github.com/darkskyapp/binary-search/blob/master/index.js
 * TODO use a better tests npm module instead
 */
export function binarySearch<T>(haystack: T[], needle: any, comparator: any, low: any, high: any) {
    var mid, cmp;

    if (low === undefined)
        low = 0;

    else {
        low = low | 0;
        if (low < 0 || low >= haystack.length)
            throw new RangeError("invalid lower bound");
    }

    if (high === undefined)
        high = haystack.length - 1;

    else {
        high = high | 0;
        if (high < low || high >= haystack.length)
            throw new RangeError("invalid upper bound");
    }

    while (low <= high) {
        // The naive `low + high >>> 1` could fail for array lengths > 2**31
        // because `>>>` converts its operands to int32. `low + (high - low >>> 1)`
        // works for array lengths <= 2**32-1 which is also Javascript's max array
        // length.
        mid = low + ((high - low) >>> 1);
        cmp = +comparator(haystack[mid], needle, mid, haystack);

        // Too low.
        if (cmp < 0.0)
            low = mid + 1;

        // Too high.
        else if (cmp > 0.0)
            high = mid - 1;

        // Key found.
        else
            return mid;
    }

    // Key not found.
    return ~low;
}
