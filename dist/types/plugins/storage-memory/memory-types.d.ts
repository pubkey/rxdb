import { Subject } from 'rxjs';
import type { CategorizeBulkWriteRowsOutput, EventBulk, RxAttachmentWriteData, RxDocumentData, RxJsonSchema, RxStorage, RxStorageChangeEvent, RxStorageDefaultCheckpoint } from '../../types/index.d.ts';
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
    id: string;
    /**
     * Schema of the first instance created with the given settings.
     * Used to ensure that the same storage is not re-created with
     * a different schema.
     */
    schema: RxJsonSchema<RxDocumentData<RxDocType>>;
    /**
     * We reuse the memory state when multiple instances
     * are created with the same params.
     * If refCount becomes 0, we can delete the state.
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
    attachments: Map<string, {
        writeData: RxAttachmentWriteData;
        digest: string;
    }>;
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
     * We need these to do lazy writes.
     */
    ensurePersistenceTask?: CategorizeBulkWriteRowsOutput<RxDocType>;
    ensurePersistenceIdlePromise?: Promise<void>;
    changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
};
export type DocWithIndexString<RxDocType> = [
    string,
    RxDocumentData<RxDocType>,
    string
];
