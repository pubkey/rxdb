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
    latestPulledCheckpoint: CheckpointType | null,
    limit: number
) => RxGraphQLReplicationQueryBuilderResponse;
export type GraphQLSyncPullOptions<RxDocType, CheckpointType> = Omit<
    ReplicationPullOptions<RxDocType, CheckpointType>,
    'handler' | 'stream$'
> & {
    queryBuilder: RxGraphQLReplicationPullQueryBuilder<CheckpointType>;
    streamQueryBuilder?: RxGraphQLReplicationPullStreamQueryBuilder;
    dataPath?: string;
}

export type RxGraphQLReplicationPullStreamQueryBuilder = (headers: { [k: string]: string }) => RxGraphQLReplicationQueryBuilderResponse;

export type GraphQLSyncPushOptions<RxDocType> = Omit<
    ReplicationPushOptions<RxDocType>,
    'handler'
> & {
    queryBuilder: RxGraphQLReplicationPushQueryBuilder;
}

export type GraphQLServerUrl = {
    http?: string;
    ws?: string;
};

export type SyncOptionsGraphQL<RxDocType, CheckpointType> = Omit<
    ReplicationOptions<RxDocType, CheckpointType>,
    'pull' | 'push' | 'replicationIdentifier' | 'collection'
> & {
    url: GraphQLServerUrl;
    headers?: { [k: string]: string }; // send with all requests to the endpoint
    pull?: GraphQLSyncPullOptions<RxDocType, CheckpointType>;
    push?: GraphQLSyncPushOptions<RxDocType>;
}
