import type { BulkWriteRow, ById, RxDocumentData, RxJsonSchema, RxStorageInstanceReplicationState, RxStorageReplicationMeta, WithDeleted } from '../types/index.d.ts';
export declare const META_INSTANCE_SCHEMA_TITLE = "RxReplicationProtocolMetaData";
export declare function getRxReplicationMetaInstanceSchema<RxDocType, CheckpointType>(replicatedDocumentsSchema: RxJsonSchema<RxDocumentData<RxDocType>>, encrypted: boolean): RxJsonSchema<RxDocumentData<RxStorageReplicationMeta<RxDocType, CheckpointType>>>;
/**
 * Returns the document states of what the fork instance
 * assumes to be the latest state on the master instance.
 */
export declare function getAssumedMasterState<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, docIds: string[]): Promise<ById<{
    docData: WithDeleted<RxDocType>;
    metaDocument: RxDocumentData<RxStorageReplicationMeta<RxDocType, any>>;
}>>;
export declare function getMetaWriteRow<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, newMasterDocState: WithDeleted<RxDocType>, previous?: RxDocumentData<RxStorageReplicationMeta<RxDocType, any>>, isResolvedConflict?: string): Promise<BulkWriteRow<RxStorageReplicationMeta<RxDocType, any>>>;
