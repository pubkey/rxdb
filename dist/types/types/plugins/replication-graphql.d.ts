import { RxReplicationWriteToMasterRow } from '../replication-protocol';
import { ById, MaybePromise } from '../util';
import { ReplicationOptions, ReplicationPullHandlerResult, ReplicationPullOptions, ReplicationPushOptions } from './replication';

export interface RxGraphQLReplicationQueryBuilderResponseObject {
    query: string;
    variables: any;
}

export type RxGraphQLReplicationClientState = {
    headers: ById<string>;
    credentials: RequestCredentials | undefined;
};

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
    responseModifier?: RxGraphQLPullResponseModifier<RxDocType, CheckpointType>;
};

export type RxGraphQLPullResponseModifier<RxDocType, CheckpointType> = (
    // the exact response that was returned from the server
    plainResponse: ReplicationPullHandlerResult<RxDocType, CheckpointType> | any,
    // either 'handler' if it came from the pull.handler, or 'stream' if it came from the pull.stream
    origin: 'handler' | 'stream',
    requestCheckpoint?: CheckpointType
) => MaybePromise<ReplicationPullHandlerResult<RxDocType, CheckpointType>>;

export type RxGraphQLReplicationPullStreamQueryBuilder = (headers: { [k: string]: string; }) => RxGraphQLReplicationQueryBuilderResponse;

export type GraphQLSyncPushOptions<RxDocType> = Omit<
ReplicationPushOptions<RxDocType>,
'handler'
> & {
    queryBuilder: RxGraphQLReplicationPushQueryBuilder;
};

export type GraphQLServerUrl = {
    http?: string;
    ws?: string;
};

export type SyncOptionsGraphQL<RxDocType, CheckpointType> = Omit<
ReplicationOptions<RxDocType, CheckpointType>,
'pull' | 'push' | 'replicationIdentifier'
> & {
    url: GraphQLServerUrl;
    headers?: { [k: string]: string; }; // send with all requests to the endpoint
    credentials?: RequestCredentials;
    pull?: GraphQLSyncPullOptions<RxDocType, CheckpointType>;
    push?: GraphQLSyncPushOptions<RxDocType>;
};
