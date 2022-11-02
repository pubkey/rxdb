import { RxGraphQLReplicationClientState, RxGraphQLReplicationQueryBuilderResponseObject } from '../../types';
export declare const GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = "rxdb-replication-graphql-";
export interface GraphQLError {
    message: string;
    locations: Array<{
        line: number;
        column: number;
    }>;
    path: string[];
}
export declare type GraphQLErrors = Array<GraphQLError>;
export declare function graphQLRequest(httpUrl: string, clientState: RxGraphQLReplicationClientState, queryParams: RxGraphQLReplicationQueryBuilderResponseObject): Promise<any>;
