import type { RxCollection, ReplicationPullOptions, ReplicationPushOptions } from '../../types/index.d.ts';
import { RxReplicationState } from '../replication/index.ts';
import type { NatsCheckpointType, NatsSyncOptions } from './nats-types.ts';
export * from './nats-types.ts';
export * from './nats-helper.ts';
export declare class RxNatsReplicationState<RxDocType> extends RxReplicationState<RxDocType, NatsCheckpointType> {
    readonly replicationIdentifier: string;
    readonly collection: RxCollection<RxDocType>;
    readonly pull?: ReplicationPullOptions<RxDocType, NatsCheckpointType> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live: boolean;
    retryTime: number;
    autoStart: boolean;
    constructor(replicationIdentifier: string, collection: RxCollection<RxDocType>, pull?: ReplicationPullOptions<RxDocType, NatsCheckpointType> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean, retryTime?: number, autoStart?: boolean);
}
export declare function replicateNats<RxDocType>(options: NatsSyncOptions<RxDocType>): RxNatsReplicationState<RxDocType>;
