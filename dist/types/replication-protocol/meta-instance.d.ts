import type { BulkWriteRow, ById, RxDocumentData, RxJsonSchema, RxStorageInstanceReplicationState, RxStorageReplicationMeta, WithDeleted } from '../types';
export declare function getRxReplicationMetaInstanceSchema(replicatedDocumentsSchema: RxJsonSchema<RxDocumentData<any>>, encrypted: boolean): RxJsonSchema<RxDocumentData<RxStorageReplicationMeta>>;
/**
 * Returns the document states of what the fork instance
 * assumes to be the latest state on the master instance.
 */
export declare function getAssumedMasterState<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, docIds: string[]): Promise<ById<{
    docData: WithDeleted<RxDocType>;
    metaDocument: RxDocumentData<RxStorageReplicationMeta>;
}>>;
export declare function getMetaWriteRow<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, newMasterDocState: WithDeleted<RxDocType>, previous?: RxDocumentData<RxStorageReplicationMeta>, isResolvedConflict?: string): BulkWriteRow<RxStorageReplicationMeta>;
