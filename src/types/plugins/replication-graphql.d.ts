import { RxDocumentData } from '../rx-storage';

export interface RxGraphQLReplicationQueryBuilderResponseObject {
    query: string;
    variables: any;
}

export type RxGraphQLReplicationQueryBuilderResponse =
    RxGraphQLReplicationQueryBuilderResponseObject |
    Promise<RxGraphQLReplicationQueryBuilderResponseObject>;

export type RxGraphQLReplicationPushQueryBuilder = (
    // typed 'any' because the data might be modified by the push.modifier.
    docs: any[]
    ) =>
    RxGraphQLReplicationQueryBuilderResponse;
export type RxGraphQLReplicationPullQueryBuilder<RxDocType> = (latestPulledDocument: RxDocumentData<RxDocType> | null) =>
    RxGraphQLReplicationQueryBuilderResponse;

export interface GraphQLSyncPullOptions<RxDocType> {
    queryBuilder: RxGraphQLReplicationPullQueryBuilder<RxDocType>;
    /**
     * Amount of documents that the remote will send in one request.
     * If the response contains less then [batchSize] documents,
     * RxDB will assume there are no more changes on the backend
     * that are not replicated.
     */
    batchSize: number;
    modifier?: (doc: RxDocType | any) => Promise<any> | any;
    dataPath?: string | ((result: any) => any[]);
}
export interface GraphQLSyncPushOptions<RxDocType> {
    queryBuilder: RxGraphQLReplicationPushQueryBuilder;
    modifier?: (doc: RxDocumentData<RxDocType>) => Promise<any> | any;
    batchSize?: number;
}

export type SyncOptionsGraphQL<RxDocType> = {
    url: string;
    headers?: { [k: string]: string }; // send with all requests to the endpoint
    waitForLeadership?: boolean; // default=true
    pull?: GraphQLSyncPullOptions<RxDocType>;
    push?: GraphQLSyncPushOptions<RxDocType>;
    deletedFlag?: string; // default='_deleted'
    live?: boolean; // default=false
    liveInterval?: number; // time in milliseconds
    retryTime?: number; // time in milliseconds
    autoStart?: boolean; // default=true
};
