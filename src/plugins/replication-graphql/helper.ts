import { RxGraphQLReplicationClientState, RxGraphQLReplicationQueryBuilderResponseObject } from '../../types';
import { ensureNotFalsy } from '../../plugins/utils';

export const GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'graphql';

export interface GraphQLError {
    message: string;
    locations: Array<{
        line: number;
        column: number;
    }>;
    path: string[];
}
export type GraphQLErrors = Array<GraphQLError>;



export function graphQLRequest(
    httpUrl: string,
    clientState: RxGraphQLReplicationClientState,
    queryParams: RxGraphQLReplicationQueryBuilderResponseObject
) {

    const headers = new Headers(clientState.headers || {});
    headers.append('Content-Type', 'application/json');

    const req = new Request(
        ensureNotFalsy(httpUrl),
        {
            method: 'POST',
            body: JSON.stringify(queryParams),
            headers,
            credentials: clientState.credentials,
        }
    );
    return fetch(req)
        .then((res) => res.json())
        .then((body) => {
            return body;
        });
}
