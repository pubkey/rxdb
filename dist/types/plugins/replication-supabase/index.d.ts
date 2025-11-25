import { RxReplicationState } from '../replication/index.ts';
import { SupabaseCheckpoint, SyncOptionsSupabase } from './types.ts';
import { ReplicationPullOptions, ReplicationPushOptions, RxCollection } from '../../types/index';
export declare class RxSupabaseReplicationState<RxDocType> extends RxReplicationState<RxDocType, SupabaseCheckpoint> {
    readonly replicationIdentifier: string;
    readonly collection: RxCollection<RxDocType, any, any, any>;
    readonly pull?: ReplicationPullOptions<RxDocType, SupabaseCheckpoint> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live: boolean;
    retryTime: number;
    autoStart: boolean;
    constructor(replicationIdentifier: string, collection: RxCollection<RxDocType, any, any, any>, pull?: ReplicationPullOptions<RxDocType, SupabaseCheckpoint> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean, retryTime?: number, autoStart?: boolean);
}
export declare function replicateSupabase<RxDocType>(options: SyncOptionsSupabase<RxDocType>): RxSupabaseReplicationState<RxDocType>;
