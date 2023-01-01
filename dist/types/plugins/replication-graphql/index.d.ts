import type { RxCollection, ReplicationPullOptions, ReplicationPushOptions, GraphQLServerUrl, RxGraphQLReplicationQueryBuilderResponseObject, RxGraphQLReplicationClientState } from '../../types';
import { RxReplicationState } from '../replication';
import { SyncOptionsGraphQL } from '../../index';
export declare class RxGraphQLReplicationState<RxDocType, CheckpointType> extends RxReplicationState<RxDocType, CheckpointType> {
    readonly url: GraphQLServerUrl;
    readonly clientState: RxGraphQLReplicationClientState;
    readonly replicationIdentifierHash: string;
    readonly collection: RxCollection<RxDocType>;
    readonly deletedField: string;
    readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live?: boolean | undefined;
    retryTime?: number | undefined;
    autoStart?: boolean | undefined;
    constructor(url: GraphQLServerUrl, clientState: RxGraphQLReplicationClientState, replicationIdentifierHash: string, collection: RxCollection<RxDocType>, deletedField: string, pull?: ReplicationPullOptions<RxDocType, CheckpointType> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean | undefined, retryTime?: number | undefined, autoStart?: boolean | undefined);
    setHeaders(headers: {
        [k: string]: string;
    }): void;
    setCredentials(credentials: RequestCredentials | undefined): void;
    graphQLRequest(queryParams: RxGraphQLReplicationQueryBuilderResponseObject): Promise<any>;
}
export declare function replicateGraphQL<RxDocType, CheckpointType>({ collection, url, headers, credentials, deletedField, waitForLeadership, pull, push, live, retryTime, // in ms
autoStart, }: SyncOptionsGraphQL<RxDocType, CheckpointType>): RxGraphQLReplicationState<RxDocType, CheckpointType>;
export * from './helper';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
export * from './graphql-websocket';
