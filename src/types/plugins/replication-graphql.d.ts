import { RxReplicationWriteToMasterRow } from '../replication-protocol';
import { ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions } from './replication';

export interface RxGraphQLReplicationQueryBuilderResponseObject {
    query: string;
    variables: any;
}

export type RxGraphQLReplicationQueryBuilderResponse =
    RxGraphQLReplicationQueryBuilderResponseObject |
    Promise<RxGraphQLReplicationQueryBuilderResponseObject>;
export type RxGraphQLReplicationPushQueryBuilder = (
    // typed 'any' because the data might be modified by the push.modifier.
    rows: RxReplicationWriteToMasterRow<any>[]
) => RxGraphQLReplicationQueryBuilderResponse;


export type RxGraphQLReplicationPullQueryBuilder<CheckpointType> = (
    latestPulledCheckpoint: CheckpointType | null
) => RxGraphQLReplicationQueryBuilderResponse;
export type GraphQLSyncPullOptions<RxDocType, CheckpointType> = Omit<
    ReplicationPullOptions<RxDocType, CheckpointType>,
    'handler'
> & {
    queryBuilder: RxGraphQLReplicationPullQueryBuilder<CheckpointType>;
    dataPath?: string;
}

export type GraphQLSyncPushOptions<RxDocType> = Omit<
    ReplicationPushOptions<RxDocType>,
    'handler'
> & {
    queryBuilder: RxGraphQLReplicationPushQueryBuilder;
}


export type SyncOptionsGraphQL<RxDocType, CheckpointType> = Omit<
    ReplicationOptions<RxDocType, CheckpointType>,
    'pull' | 'push' | 'replicationIdentifier' | 'collection'
> & {
    url: string;
    headers?: { [k: string]: string }; // send with all requests to the endpoint
    pull?: GraphQLSyncPullOptions<RxDocType, CheckpointType>;
    push?: GraphQLSyncPushOptions<RxDocType>;
}
