import type { RxStorageInstanceReplicationState } from '../types/index.d.ts';
/**
 * Writes all documents from the master to the fork.
 * The downstream has two operation modes
 * - Sync by iterating over the checkpoints via downstreamResyncOnce()
 * - Sync by listening to the changestream via downstreamProcessChanges()
 * We need this to be able to do initial syncs
 * and still can have fast event based sync when the client is not offline.
 */
export declare function startReplicationDownstream<RxDocType, CheckpointType = any>(state: RxStorageInstanceReplicationState<RxDocType>): Promise<void>;
