import { Subject } from 'rxjs';
import type { DefaultPreparedQuery, EventBulk, RxAttachmentWriteData, RxConflictResultionTask, RxDocumentData, RxStorage, RxStorageChangeEvent, RxStorageDefaultCheckpoint } from '../../types';
export type RxStorageMemorySettings = {};
export type RxStorageMemoryInstanceCreationOptions = {};
export type RxStorageMemory = RxStorage<MemoryStorageInternals<any>, RxStorageMemoryInstanceCreationOptions> & {
    /**
     * State by collectionKey
     */
    collectionStates: Map<string, MemoryStorageInternals<any>>;
};
export type MemoryStorageInternalsByIndex<RxDocType> = {
    index: string[];
    docsWithIndex: DocWithIndexString<RxDocType>[];
    getIndexableString: (docData: RxDocumentData<RxDocType>) => string;
};
/**
 * The internals are shared between multiple storage instances
 * that have been created with the same [databaseName+collectionName] combination.
 */
export type MemoryStorageInternals<RxDocType> = {
    /**
     * We re-use the memory state when multiple instances
     * are created with the same params.
     * If refCount beomces 0, we can delete the state.
     */
    refCount: number;
    /**
     * If this becomes true,
     * it means that an instance has called remove()
     * so all other instances should also not work anymore.
     */
    removed: boolean;
    documents: Map<string, RxDocumentData<RxDocType>>;
    /**
     * Attachments data, indexed by a combined string
     * consisting of [documentId + '||' + attachmentId]
     */
    attachments: Map<string, RxAttachmentWriteData>;
    byIndex: {
        /**
         * Because RxDB requires a deterministic sorting
         * on all indexes, we can be sure that the composed index key
         * of each document is unique, because it contains the primaryKey
         * as last index part.
         * So we do not have to store the index-position when we want to do fast
         * writes. Instead we can do a binary search over the existing array
         * because RxDB also knows the previous state of the document when we do a bulkWrite().
         */
        [indexName: string]: MemoryStorageInternalsByIndex<RxDocType>;
    };
    /**
     * To easier test the conflict resolution,
     * the memory storage exposes the conflict resolution task subject
     * so that we can inject own tasks during tests.
     */
    conflictResultionTasks$: Subject<RxConflictResultionTask<RxDocType>>;
    changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
};
export type DocWithIndexString<RxDocType> = {
    id: string;
    doc: RxDocumentData<RxDocType>;
    indexString: string;
};
export type MemoryPreparedQuery<DocType> = DefaultPreparedQuery<DocType>;
