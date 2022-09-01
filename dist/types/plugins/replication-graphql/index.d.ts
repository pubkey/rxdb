/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import type { RxCollection, RxPlugin, ReplicationPullOptions, ReplicationPushOptions, GraphQLServerUrl } from '../../types';
import { RxReplicationState } from '../replication';
import { SyncOptionsGraphQL } from '../../index';
export declare class RxGraphQLReplicationState<RxDocType, CheckpointType> extends RxReplicationState<RxDocType, CheckpointType> {
    readonly url: GraphQLServerUrl;
    readonly clientState: {
        headers: any;
        client: any;
    };
    readonly replicationIdentifierHash: string;
    readonly collection: RxCollection<RxDocType>;
    readonly deletedField: string;
    readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live?: boolean | undefined;
    retryTime?: number | undefined;
    autoStart?: boolean | undefined;
    constructor(url: GraphQLServerUrl, clientState: {
        headers: any;
        client: any;
    }, replicationIdentifierHash: string, collection: RxCollection<RxDocType>, deletedField: string, pull?: ReplicationPullOptions<RxDocType, CheckpointType> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean | undefined, retryTime?: number | undefined, autoStart?: boolean | undefined);
    setHeaders(headers: {
        [k: string]: string;
    }): void;
}
export declare function syncGraphQL<RxDocType, CheckpointType>(this: RxCollection, { url, headers, deletedField, waitForLeadership, pull, push, live, retryTime, // in ms
autoStart, }: SyncOptionsGraphQL<RxDocType, CheckpointType>): RxGraphQLReplicationState<RxDocType, CheckpointType>;
export * from './helper';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
export * from './graphql-websocket';
export declare const RxDBReplicationGraphQLPlugin: RxPlugin;
