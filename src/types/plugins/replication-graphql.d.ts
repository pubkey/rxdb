import { RxDocumentData } from '../rx-storage';

export interface RxGraphQLReplicationQueryBuilderResponseObject {
    query: string;
    variables: any;
}

export type RxGraphQLReplicationQueryBuilderResponse =
    RxGraphQLReplicationQueryBuilderResponseObject |
    Promise<RxGraphQLReplicationQueryBuilderResponseObject>;

export type RxGraphQLReplicationQueryBuilder = (doc: any) =>
    RxGraphQLReplicationQueryBuilderResponse;

export interface GraphQLSyncPullOptions<RxDocType> {
    queryBuilder: RxGraphQLReplicationQueryBuilder;
    modifier?: (doc: any) => Promise<any> | any;
    dataPath?: string;
}
export interface GraphQLSyncPushOptions<RxDocType> {
    queryBuilder: RxGraphQLReplicationQueryBuilder;
    modifier?: (doc: RxDocumentData<RxDocType>) => Promise<any> | any;
    batchSize?: number;
}

export type SyncOptionsGraphQL<RxDocType> = {
    url: string;
    headers?: { [k: string]: string }; // send with all requests to the endpoint
    waitForLeadership?: boolean; // default=true
    pull?: GraphQLSyncPullOptions<RxDocType>;
    push?: GraphQLSyncPushOptions<RxDocType>;
    deletedFlag: string;
    live?: boolean; // default=false
    liveInterval?: number; // time in ms
    retryTime?: number; // time in ms
    autoStart?: boolean; // if this is false, the replication does nothing at start
};
