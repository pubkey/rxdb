import type { RxStorageInstanceReplicationInput, RxStorageInstanceReplicationState, RxStorageReplicationDirection } from '../types/index.d.ts';
export declare function getLastCheckpointDoc<RxDocType, CheckpointType>(state: RxStorageInstanceReplicationState<RxDocType>, direction: RxStorageReplicationDirection): Promise<undefined | CheckpointType>;
/**
 * Sets the checkpoint,
 * automatically resolves conflicts that appear.
 */
export declare function setCheckpoint<RxDocType, CheckpointType>(state: RxStorageInstanceReplicationState<RxDocType>, direction: RxStorageReplicationDirection, checkpoint: CheckpointType): Promise<void>;
export declare function getCheckpointKey<RxDocType>(input: RxStorageInstanceReplicationInput<RxDocType>): Promise<string>;
