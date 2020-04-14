export declare type RxGraphQLReplicationQueryBuilder = (doc: any) => {
    query: string;
    variables: any;
};
export interface GraphQLSyncPullOptions {
    queryBuilder: RxGraphQLReplicationQueryBuilder;
    modifier?: (doc: any) => any;
}
export interface GraphQLSyncPushOptions {
    queryBuilder: RxGraphQLReplicationQueryBuilder;
    modifier?: (doc: any) => any;
    batchSize?: number;
}
export declare type SyncOptionsGraphQL = {
    url: string;
    headers?: {
        [k: string]: string;
    };
    waitForLeadership?: boolean;
    pull?: GraphQLSyncPullOptions;
    push?: GraphQLSyncPushOptions;
    deletedFlag: string;
    live?: boolean;
    liveInterval?: number;
    retryTime?: number;
    autoStart?: boolean;
    syncRevisions?: boolean;
};
