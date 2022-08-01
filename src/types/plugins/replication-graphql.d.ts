import { RxReplicationWriteToMasterRow } from '../replication-protocol';

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

export interface GraphQLSyncPullOptions<CheckpointType> {
    queryBuilder: RxGraphQLReplicationPullQueryBuilder<CheckpointType>;
    /**
     * Amount of documents that the remote will send in one request.
     * If the response contains less then [batchSize] documents,
     * RxDB will assume there are no more changes on the backend
     * that are not replicated.
     */
    batchSize: number;
    dataPath?: string;
}
export interface GraphQLSyncPushOptions {
    queryBuilder: RxGraphQLReplicationPushQueryBuilder;
    batchSize?: number;
}

export type SyncOptionsGraphQL<CheckpointType> = {
    url: string;
    headers?: { [k: string]: string }; // send with all requests to the endpoint
    waitForLeadership?: boolean; // default=true
    pull?: GraphQLSyncPullOptions<CheckpointType>;
    push?: GraphQLSyncPushOptions;
    deletedFlag?: string; // default='_deleted'
    live?: boolean; // default=false
    retryTime?: number; // time in milliseconds
    autoStart?: boolean; // default=true
};
