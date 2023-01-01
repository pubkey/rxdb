/**
 * These files contain the replication protocol.
 * It can be used to replicated RxStorageInstances or RxCollections
 * or even to do a client(s)-server replication.
 */
import type { RxConflictHandler, RxReplicationHandler, RxStorageInstance, RxStorageInstanceReplicationInput, RxStorageInstanceReplicationState } from '../types';
export * from './checkpoint';
export * from './downstream';
export * from './upstream';
export * from './meta-instance';
export * from './conflicts';
export * from './helper';
export declare function replicateRxStorageInstance<RxDocType>(input: RxStorageInstanceReplicationInput<RxDocType>): RxStorageInstanceReplicationState<RxDocType>;
export declare function awaitRxStorageReplicationFirstInSync(state: RxStorageInstanceReplicationState<any>): Promise<void>;
export declare function awaitRxStorageReplicationInSync(replicationState: RxStorageInstanceReplicationState<any>): Promise<[any, any, any]>;
export declare function awaitRxStorageReplicationIdle(state: RxStorageInstanceReplicationState<any>): Promise<void>;
export declare function rxStorageInstanceToReplicationHandler<RxDocType, MasterCheckpointType>(instance: RxStorageInstance<RxDocType, any, any, MasterCheckpointType>, conflictHandler: RxConflictHandler<RxDocType>, databaseInstanceToken: string): RxReplicationHandler<RxDocType, MasterCheckpointType>;
export declare function cancelRxStorageReplication(replicationState: RxStorageInstanceReplicationState<any>): void;
