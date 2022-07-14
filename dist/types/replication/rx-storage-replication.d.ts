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
import type { RxConflictHandler, RxReplicationHandler, RxStorageInstance, RxStorageInstanceReplicationInput, RxStorageInstanceReplicationState } from '../types';
export declare function replicateRxStorageInstance<RxDocType>(input: RxStorageInstanceReplicationInput<RxDocType>): RxStorageInstanceReplicationState<RxDocType>;
export declare function awaitRxStorageReplicationFirstInSync(state: RxStorageInstanceReplicationState<any>): Promise<[boolean, boolean]>;
export declare function awaitRxStorageReplicationIdle(state: RxStorageInstanceReplicationState<any>): Promise<void>;
export declare function rxStorageInstanceToReplicationHandler<RxDocType, MasterCheckpointType>(instance: RxStorageInstance<RxDocType, any, any, MasterCheckpointType>, conflictHandler: RxConflictHandler<RxDocType>): RxReplicationHandler<RxDocType, MasterCheckpointType>;
