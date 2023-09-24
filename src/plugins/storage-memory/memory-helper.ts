import type {
    BulkWriteRow,
    RxDocumentData,
    RxJsonSchema
} from '../../types';
import type {
    DocWithIndexString,
    MemoryStorageInternals,
    MemoryStorageInternalsByIndex
} from './memory-types';
import type { RxStorageInstanceMemory } from './rx-storage-instance-memory';
import {
    pushAtSortPosition
} from 'array-push-at-sort-position';
import { newRxError } from '../../rx-error';
import { boundEQ } from './binary-search-bounds';


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
        throw new Error('removed');
    }
}

export function attachmentMapKey(documentId: string, attachmentId: string): string {
    return documentId + '||' + attachmentId;
}

function sortByIndexStringComparator<RxDocType>(a: DocWithIndexString<RxDocType>, b: DocWithIndexString<RxDocType>) {
    if (a.indexString < b.indexString) {
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
    row: BulkWriteRow<RxDocType>,
    docInState?: RxDocumentData<RxDocType>
) {
    const document = row.document;
    state.documents.set(docId, document as any);
    for (let i = 0; i < stateByIndex.length; ++i) {
        const byIndex = stateByIndex[i];
        const docsWithIndex = byIndex.docsWithIndex;
        const getIndexableString = byIndex.getIndexableString;
        const newIndexString = getIndexableString(document as any);
        const insertPosition = pushAtSortPosition(
            docsWithIndex,
            {
                id: docId,
                doc: document,
                indexString: newIndexString
            },
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
                if (prev && prev.id === docId) {
                    docsWithIndex.splice(insertPosition - 1, 1);
                } else {
                    const next = docsWithIndex[insertPosition + 1];
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
                const indexBefore = boundEQ(
                    docsWithIndex,
                    {
                        indexString: previousIndexString
                    } as any,
                    compareDocsWithIndex
                );
                docsWithIndex.splice(indexBefore, 1);
            }
        }
    }
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
            {
                indexString
            } as any,
            compareDocsWithIndex
        );
        docsWithIndex.splice(positionInIndex, 1);
    });
}


export function compareDocsWithIndex<RxDocType>(
    a: DocWithIndexString<RxDocType>,
    b: DocWithIndexString<RxDocType>
): 1 | 0 | -1 {
    const indexStringA = a.indexString;
    const indexStringB = b.indexString;
    if (indexStringA < indexStringB) {
        return -1;
    } else if (indexStringA === indexStringB) {
        return 0;
    } else {
        return 1;
    }
}
