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

export function attachmentMapKey(documentId: string, attachmentId: string): string {
    return documentId + '||' + attachmentId;
}

const SORT_BY_INDEX_STRING = (a: DocWithIndexString<any>, b: DocWithIndexString<any>) => {
    if (a.indexString < b.indexString) {
        return -1;
    } else {
        return 1;
    }
};



export function putWriteRowToState<RxDocType>(
    docId: string,
    state: MemoryStorageInternals<RxDocType>,
    stateByIndex: MemoryStorageInternalsByIndex<RxDocType>[],
    row: BulkWriteRow<RxDocType>,
    docInState?: RxDocumentData<RxDocType>
) {
    state.documents.set(docId, row.document as any);
    stateByIndex.forEach(byIndex => {
        const docsWithIndex = byIndex.docsWithIndex;
        const newIndexString = byIndex.getIndexableString(row.document as any);
        const [, insertPosition] = pushAtSortPosition(
            docsWithIndex,
            {
                id: docId,
                doc: row.document,
                indexString: newIndexString
            },
            SORT_BY_INDEX_STRING,
            true
        );

        /**
         * Remove previous if it was in the state
         */
        if (docInState) {
            const previousIndexString = byIndex.getIndexableString(docInState);
            if (previousIndexString === newIndexString) {
                /**
                 * Index not changed -> The old doc must be before or after the new one.
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
    if (a.indexString < b.indexString) {
        return -1;
    } else if (a.indexString === b.indexString) {
        return 0;
    } else {
        return 1;
    }
}
