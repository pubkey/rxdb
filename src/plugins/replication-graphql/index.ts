/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */

import GraphQLClient from 'graphql-client';
import objectPath from 'object-path';
import {
    ensureNotFalsy,
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
    RxReplicationWriteToMasterRow,
    GraphQLServerUrl,
    RxReplicationPullStreamItem
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

import {
    removeGraphQLWebSocketRef,
    getGraphQLWebSocket
} from './graphql-websocket';
import { Subject } from 'rxjs';

export class RxGraphQLReplicationState<RxDocType, CheckpointType> extends RxReplicationState<RxDocType, CheckpointType> {
    constructor(
        public readonly url: GraphQLServerUrl,
        public readonly clientState: { headers: any; client: any, credentials: string | undefined },
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly deletedField: string,
        public readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live?: boolean,
        public retryTime?: number,
        public autoStart?: boolean
    ) {
        super(
            replicationIdentifierHash,
            collection,
            deletedField,
            pull,
            push,
            live,
            retryTime,
            autoStart
        );
    }

    setHeaders(headers: { [k: string]: string }): void {
        this.clientState.headers = headers;
        this.clientState.client = GraphQLClient({
            url: this.url.http,
            headers,
            credentials: this.clientState.credentials
        });
    }

    setCredentials(credentials: string | undefined) {
        this.clientState.credentials = credentials
        this.clientState.client = GraphQLClient({
            url: this.url.http,
            headers: this.clientState.headers,
            credentials
        });
    }
}

export function syncGraphQL<RxDocType, CheckpointType>(
    this: RxCollection,
    {
        url,
        headers = {},
        credentials,
        deletedField = '_deleted',
        waitForLeadership = true,
        pull,
        push,
        live = true,
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
        headers,
        credentials,
        client: GraphQLClient({
            url: url.http,
            headers,
            credentials
        })
    };


    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, CheckpointType>> = new Subject();

    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, CheckpointType> | undefined;
    if (pull) {
        const pullBatchSize = pull.batchSize ? pull.batchSize : 20;
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: CheckpointType
            ) {
                const pullGraphQL = await pull.queryBuilder(lastPulledCheckpoint, pullBatchSize);
                const result = await mutateableClientState.client.query(pullGraphQL.query, pullGraphQL.variables);
                if (result.errors) {
                    throw result.errors;
                }

                const dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
                let data: any = objectPath.get(result, dataPath);

                if (pull.responseModifier) {
                    data = await pull.responseModifier(
                        data,
                        'handler',
                        lastPulledCheckpoint
                    );
                }

                const docsData: WithDeleted<RxDocType>[] = data.documents;
                const newCheckpoint = data.checkpoint;

                return {
                    documents: docsData,
                    checkpoint: newCheckpoint
                }
            },
            batchSize: pull.batchSize,
            modifier: pull.modifier,
            stream$: pullStream$.asObservable()
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
        GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(url.http ? url.http : url.ws as any),
        collection,
        deletedField,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        live,
        retryTime,
        autoStart
    );

    const mustUseSocket = url.ws &&
        pull &&
        pull.streamQueryBuilder &&
        live;

    const startBefore = graphqlReplicationState.start.bind(graphqlReplicationState);
    graphqlReplicationState.start = () => {
        if (mustUseSocket) {
            const wsClient = getGraphQLWebSocket(ensureNotFalsy(url.ws));

            wsClient.on('connected', () => {
                pullStream$.next('RESYNC');
            });

            const query: any = ensureNotFalsy(pull.streamQueryBuilder)(mutateableClientState.headers);

            wsClient.subscribe(
                query,
                {
                    next: async (streamResponse: any) => {
                        const firstField = Object.keys(streamResponse.data)[0];
                        let data = streamResponse.data[firstField];
                        if (pull.responseModifier) {
                            data = await pull.responseModifier(
                                data,
                                'stream'
                            );
                        }
                        pullStream$.next(data);
                    },
                    error: (error: any) => {
                        pullStream$.error(error);
                    },
                    complete: () => {
                        pullStream$.complete();
                    }
                });
        }
        return startBefore();
    }

    const cancelBefore = graphqlReplicationState.cancel.bind(graphqlReplicationState);
    graphqlReplicationState.cancel = () => {
        pullStream$.complete();
        if (mustUseSocket) {
            removeGraphQLWebSocketRef(ensureNotFalsy(url.ws));
        }
        return cancelBefore();
    }

    startReplicationOnLeaderShip(waitForLeadership, graphqlReplicationState);
    return graphqlReplicationState;
}

export * from './helper';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
export * from './graphql-websocket';

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
