/**
 * Replicates two RxStorageInstances
 * with each other.
 *
 * Compared to the 'normal' replication plugins,
 * this one is made for internal use where:
 * - No permission handling is needed.
 * - It is made so that the write amount on the master is less but might increase on the child.
 * - It does not have to be easy to implement a compatible backend.
 *   Here we use another RxStorageImplementation as replication goal
 *   so it has to exactly behave like the RxStorage interface defines.
 *
 * This is made to be used internally by plugins
 * to get a really fast replication performance.
 *
 * The replication works like git, where the fork contains all new writes
 * and must be merged with the master before it can push it's new state to the master.
 */
import type { BulkWriteRow, RxConflictHandler, RxDocumentData, RxJsonSchema, RxStorageBulkWriteError, RxStorageInstanceReplicationInput, RxStorageInstanceReplicationState, RxStorageReplicationDirection, RxStorageReplicationMeta } from './types';
export declare const RX_REPLICATION_META_INSTANCE_SCHEMA: RxJsonSchema<RxDocumentData<RxStorageReplicationMeta>>;
export declare function replicateRxStorageInstance<RxDocType>(input: RxStorageInstanceReplicationInput<RxDocType>): RxStorageInstanceReplicationState<RxDocType>;
/**
 * Writes all documents from the master to the fork.
 */
export declare function startReplicationDownstream<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>): void;
/**
 * Writes all document changes from the client to the master.
 */
export declare function startReplicationUpstream<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>): void;
export declare function getLastCheckpointDoc<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, direction: RxStorageReplicationDirection): Promise<undefined | {
    checkpoint: any;
    checkpointDoc?: RxDocumentData<RxStorageReplicationMeta>;
}>;
export declare function getCheckpointKey<RxDocType>(input: RxStorageInstanceReplicationInput<RxDocType>): string;
/**
 * Resolves a conflict error.
 * Returns the resolved document that must be written to the fork.
 * Then the new document state can be pushed upstream.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the upstream, never in the downstream.
 */
export declare function resolveConflictError<RxDocType>(conflictHandler: RxConflictHandler<RxDocType>, error: RxStorageBulkWriteError<RxDocType>): Promise<RxDocumentData<RxDocType> | undefined>;
export declare function setCheckpoint<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, direction: RxStorageReplicationDirection, checkpointDoc?: RxDocumentData<RxStorageReplicationMeta>): Promise<void>;
export declare function awaitRxStorageReplicationFirstInSync(state: RxStorageInstanceReplicationState<any>): Promise<[boolean, boolean]>;
export declare function awaitRxStorageReplicationIdle(state: RxStorageInstanceReplicationState<any>): Promise<void>;
export declare function getAssumedMasterState<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, docIds: string[]): Promise<{
    [docId: string]: {
        docData: RxDocumentData<RxDocType>;
        metaDocument: RxDocumentData<RxStorageReplicationMeta>;
    };
}>;
export declare function getMetaWriteRow<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, newMasterDocState: RxDocumentData<RxDocType>, previous?: RxDocumentData<RxStorageReplicationMeta>): BulkWriteRow<RxStorageReplicationMeta>;
