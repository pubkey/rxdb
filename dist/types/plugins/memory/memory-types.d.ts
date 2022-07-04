import { Subject } from 'rxjs';
import type { DexiePreparedQuery, RxAttachmentWriteData, RxConflictResultionTask, RxDocumentData, RxStorage } from '../../types';
export declare type RxStorageMemorySettings = {};
export declare type RxStorageMemoryInstanceCreationOptions = {};
export declare type RxStorageMemory = RxStorage<MemoryStorageInternals<any>, RxStorageMemoryInstanceCreationOptions> & {
    /**
     * State by collectionKey
     */
    collectionStates: Map<string, MemoryStorageInternals<any>>;
};
export declare type MemoryStorageInternalsByIndex<RxDocType> = {
    index: string[];
    docsWithIndex: DocWithIndexString<RxDocType>[];
    getIndexableString: (docData: RxDocumentData<RxDocType>) => string;
};
/**
 * The internals are shared between multiple storage instances
 * that have been created with the same [databaseName+collectionName] combination.
 */
export declare type MemoryStorageInternals<RxDocType> = {
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
         * writes. Instead we can do a binary search over the exisiting array
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
};
export declare type DocWithIndexString<RxDocType> = {
    id: string;
    doc: RxDocumentData<RxDocType>;
    indexString: string;
};
export declare type MemoryPreparedQuery<DocType> = DexiePreparedQuery<DocType>;
export declare type MemoryChangesCheckpoint = {
    id: string;
    lwt: number;
};
