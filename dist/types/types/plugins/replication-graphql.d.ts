export interface RxGraphQLReplicationQueryBuilderResponseObject {
    query: string;
    variables: any;
}

export type RxGraphQLReplicationQueryBuilderResponse =
    RxGraphQLReplicationQueryBuilderResponseObject |
    Promise<RxGraphQLReplicationQueryBuilderResponseObject>;

export type RxGraphQLReplicationQueryBuilder = (doc: any) =>
    RxGraphQLReplicationQueryBuilderResponse;

export interface GraphQLSyncPullOptions {
    queryBuilder: RxGraphQLReplicationQueryBuilder;
    modifier?: (doc: any) => any;
}
export interface GraphQLSyncPushOptions {
    queryBuilder: RxGraphQLReplicationQueryBuilder;
    modifier?: (doc: any) => any;
    batchSize?: number;
}

export type SyncOptionsGraphQL = {
    url: string;
    headers?: { [k: string]: string }; // send with all requests to the endpoint
    waitForLeadership?: boolean; // default=true
    pull?: GraphQLSyncPullOptions;
    push?: GraphQLSyncPushOptions;
    deletedFlag: string;
    live?: boolean; // default=false
    liveInterval?: number; // time in ms
    retryTime?: number; // time in ms
    autoStart?: boolean; // if this is false, the replication does nothing at start
    syncRevisions?: boolean;
};
