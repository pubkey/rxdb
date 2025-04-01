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
