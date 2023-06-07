import type { RxCollection, ReplicationPullOptions, ReplicationPushOptions } from '../../types';
import { RxReplicationState } from '../replication';
import type { NatsCheckpointType, NatsSyncOptions } from './nats-types';
export * from './nats-types';
export * from './nats-helper';
export declare class RxNatsReplicationState<RxDocType> extends RxReplicationState<RxDocType, NatsCheckpointType> {
    readonly replicationIdentifierHash: string;
    readonly collection: RxCollection<RxDocType>;
    readonly pull?: ReplicationPullOptions<RxDocType, NatsCheckpointType> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live: boolean;
    retryTime: number;
    autoStart: boolean;
    constructor(replicationIdentifierHash: string, collection: RxCollection<RxDocType>, pull?: ReplicationPullOptions<RxDocType, NatsCheckpointType> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean, retryTime?: number, autoStart?: boolean);
}
export declare function replicateNats<RxDocType>(options: NatsSyncOptions<RxDocType>): RxNatsReplicationState<RxDocType>;
