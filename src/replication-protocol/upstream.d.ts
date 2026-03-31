import type { RxStorageInstanceReplicationState } from '../types/index.d.ts';
/**
 * Writes all document changes from the fork to the master.
 * The upstream runs on two modes:
 * - For initial replication, a checkpoint-iteration is used
 * - For ongoing local writes, we just subscribe to the changeStream of the fork.
 *   In contrast to the master, the fork can be assumed to never loose connection,
 *   so we do not have to prepare for missed out events.
 */
export declare function startReplicationUpstream<RxDocType, CheckpointType>(state: RxStorageInstanceReplicationState<RxDocType>): Promise<void>;
