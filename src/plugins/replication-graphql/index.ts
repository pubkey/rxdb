/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */

import GraphQLClient from 'graphql-client';
import objectPath from 'object-path';
import {
    fastUnsecureHash
} from '../../util';

import {
    GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX
} from './helper';

import { RxDBLeaderElectionPlugin } from '../leader-election';
import type {
    RxCollection,
    RxPlugin,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow
} from '../../types';
import {
    RxReplicationState,
    startReplicationOnLeaderShip
} from '../replication';
import {
    addRxPlugin,
    SyncOptionsGraphQL,
    WithDeleted
} from '../../index';

export class RxGraphQLReplicationState<RxDocType, CheckpointType> extends RxReplicationState<RxDocType, CheckpointType> {

    constructor(
        public readonly url: string,
        public readonly clientState: { client: any },
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live?: boolean,
        public retryTime?: number,
        public autoStart?: boolean
    ) {
        super(
            replicationIdentifierHash,
            collection,
            pull,
            push,
            live,
            retryTime,
            autoStart
        );
    }

    setHeaders(headers: { [k: string]: string }): void {
        this.clientState.client = GraphQLClient({
            url: this.url,
            headers
        });
    }
}

export function syncGraphQL<RxDocType, CheckpointType>(
    this: RxCollection,
    {
        url,
        headers = {},
        waitForLeadership = true,
        pull,
        push,
        live = false,
        retryTime = 1000 * 5, // in ms
        autoStart = true,
    }: SyncOptionsGraphQL<RxDocType, CheckpointType>
): RxGraphQLReplicationState<RxDocType, CheckpointType> {
    const collection = this;

    /**
     * We use this object to store the GraphQL client
     * so we can later swap out the client inside of the replication handlers.
     */
    const mutateableClientState = {
        client: GraphQLClient({
            url,
            headers
        })
    }

    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, CheckpointType> | undefined;
    if (pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: CheckpointType
            ) {
                const pullGraphQL = await pull.queryBuilder(lastPulledCheckpoint);
                const result = await mutateableClientState.client.query(pullGraphQL.query, pullGraphQL.variables);
                if (result.errors) {
                    throw result.errors;
                }

                const dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
                const data: any = objectPath.get(result, dataPath);

                const docsData: WithDeleted<RxDocType>[] = data.documents;
                const newCheckpoint = data.checkpoint;

                return {
                    documents: docsData,
                    checkpoint: newCheckpoint
                }
            },
            batchSize: pull.batchSize,
            modifier: pull.modifier
        }
    }
    let replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined;
    if (push) {
        replicationPrimitivesPush = {
            async handler(
                rows: RxReplicationWriteToMasterRow<RxDocType>[]
            ) {
                const pushObj = await push.queryBuilder(rows);
                const result = await mutateableClientState.client.query(pushObj.query, pushObj.variables);

                if (result.errors) {
                    throw result.errors;
                }
                const dataPath = Object.keys(result.data)[0];
                const data: any = objectPath.get(result.data, dataPath);
                return data;
            },
            batchSize: push.batchSize,
            modifier: push.modifier
        };
    }


    const graphqlReplicationState = new RxGraphQLReplicationState(
        url,
        mutateableClientState,
        GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(url),
        collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        live,
        retryTime,
        autoStart
    );

    startReplicationOnLeaderShip(waitForLeadership, graphqlReplicationState);
    return graphqlReplicationState;
}

export * from './helper';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';

export const RxDBReplicationGraphQLPlugin: RxPlugin = {
    name: 'replication-graphql',
    init() {
        addRxPlugin(RxDBLeaderElectionPlugin);
    },
    rxdb: true,
    prototypes: {
        RxCollection: (proto: any) => {
            proto.syncGraphQL = syncGraphQL;
        }
    }
};
