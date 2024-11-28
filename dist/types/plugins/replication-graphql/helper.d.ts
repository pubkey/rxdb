import type { RxGraphQLReplicationClientState, RxGraphQLReplicationQueryBuilderResponseObject } from '../../types/index.d.ts';
export declare const GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = "graphql";
export interface GraphQLError {
    message: string;
    locations: Array<{
        line: number;
        column: number;
    }>;
    path: string[];
}
export type GraphQLErrors = Array<GraphQLError>;
export declare function graphQLRequest(fetchRequest: WindowOrWorkerGlobalScope['fetch'], httpUrl: string, clientState: RxGraphQLReplicationClientState, queryParams: RxGraphQLReplicationQueryBuilderResponseObject): Promise<any>;
export declare function getDataFromResult(result: {
    data: object;
}, userDefinedDataPath: string | string[] | undefined): any;
