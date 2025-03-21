import type { SyncOptionsAppwrite, AppwriteCheckpointType } from './appwrite-types';
import { RxReplicationState } from '../replication/index.ts';
import type { ReplicationPullOptions, ReplicationPushOptions, RxCollection } from '../../types';
export declare class RxAppwriteReplicationState<RxDocType> extends RxReplicationState<RxDocType, AppwriteCheckpointType> {
    readonly replicationIdentifierHash: string;
    readonly collection: RxCollection<RxDocType>;
    readonly pull?: ReplicationPullOptions<RxDocType, AppwriteCheckpointType> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live: boolean;
    retryTime: number;
    autoStart: boolean;
    constructor(replicationIdentifierHash: string, collection: RxCollection<RxDocType>, pull?: ReplicationPullOptions<RxDocType, AppwriteCheckpointType> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean, retryTime?: number, autoStart?: boolean);
}
export declare function replicateAppwrite<RxDocType>(options: SyncOptionsAppwrite<RxDocType>): RxAppwriteReplicationState<RxDocType>;
