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
import { InternalStoreDocType } from './rx-database-internal-store';
import type { RxConflictHandler, RxDocumentData, RxStorageBulkWriteError, RxStorageInstanceReplicationInput, RxStorageInstanceReplicationState, RxStorageReplicationDirection } from './types';
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
    checkpointDoc?: RxDocumentData<InternalStoreDocType>;
}>;
export declare function getCheckpointKey<RxDocType>(input: RxStorageInstanceReplicationInput<RxDocType>): string;
/**
 * Resolves a conflict error.
 * Returns the resolved document.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the downstream, never in the upstream.
 */
export declare function resolveConflictError<RxDocType>(conflictHandler: RxConflictHandler<RxDocType>, error: RxStorageBulkWriteError<RxDocType>): Promise<RxDocumentData<RxDocType> | undefined>;
export declare function setCheckpoint<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, direction: RxStorageReplicationDirection, checkpointDoc?: RxDocumentData<InternalStoreDocType>): Promise<void>;
export declare function awaitRxStorageReplicationFirstInSync(state: RxStorageInstanceReplicationState<any>): Promise<[boolean, boolean]>;
export declare function awaitRxStorageReplicationIdle(state: RxStorageInstanceReplicationState<any>): Promise<void>;
export declare function isDocumentStateFromDownstream<RxDocType>(state: RxStorageInstanceReplicationState<any>, docData: RxDocumentData<RxDocType>): boolean;
export declare function isDocumentStateFromUpstream<RxDocType>(state: RxStorageInstanceReplicationState<any>, docData: RxDocumentData<RxDocType>): boolean;
