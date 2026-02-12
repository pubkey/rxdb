/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with a remote graphql endpoint.
 */
import {
    ensureNotFalsy,
    flatClone
} from '../../plugins/utils/index.ts';

import {
    getDataFromResult,
    graphQLRequest
} from './helper.ts';

import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import type {
    RxCollection,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow,
    GraphQLServerUrl,
    RxReplicationPullStreamItem,
    RxGraphQLReplicationQueryBuilderResponseObject,
    RxGraphQLReplicationClientState,
    ById
} from '../../types/index.d.ts';
import {
    RxReplicationState,
    startReplicationOnLeaderShip
} from '../replication/index.ts';
import {
    addRxPlugin,
    SyncOptionsGraphQL,
    WithDeleted
} from '../../index.ts';

import {
    removeGraphQLWebSocketRef,
    getGraphQLWebSocket
} from './graphql-websocket.ts';
import { Subject } from 'rxjs';


export class RxGraphQLReplicationState<RxDocType, CheckpointType> extends RxReplicationState<RxDocType, CheckpointType> {
    constructor(
        public readonly url: GraphQLServerUrl,
        public readonly clientState: RxGraphQLReplicationClientState,
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType, any, any, any>,
        public readonly deletedField: string,
        public readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live?: boolean,
        public retryTime?: number,
        public autoStart?: boolean,
        public readonly customFetch?: WindowOrWorkerGlobalScope['fetch']
    ) {
        super(
            replicationIdentifier,
            collection,
            deletedField,
            pull,
            push,
            live,
            retryTime,
            autoStart
        );
    }

    setHeaders(headers: ById<string>): void {
        this.clientState.headers = flatClone(headers);
    }

    setCredentials(credentials: RequestCredentials | undefined) {
        this.clientState.credentials = credentials;
    }

    graphQLRequest(
        queryParams: RxGraphQLReplicationQueryBuilderResponseObject
    ) {
        return graphQLRequest(
            this.customFetch ?? fetch,
            ensureNotFalsy(this.url.http),
            this.clientState,
            queryParams
        );
    }
}

export function replicateGraphQL<RxDocType, CheckpointType>(
    {
        collection,
        url,
        headers = {},
        credentials,
        deletedField = '_deleted',
        waitForLeadership = true,
        pull,
        push,
        live = true,
        fetch: customFetch,
        retryTime = 1000 * 5, // in ms
        autoStart = true,
        replicationIdentifier
    }: SyncOptionsGraphQL<RxDocType, CheckpointType>
): RxGraphQLReplicationState<RxDocType, CheckpointType> {
    addRxPlugin(RxDBLeaderElectionPlugin);
    /**
     * We use this object to store the GraphQL client
     * so we can later swap out the client inside of the replication handlers.
     */
    const mutateableClientState = {
        headers,
        credentials
    };


    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, CheckpointType>> = new Subject();

    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, CheckpointType> | undefined;
    if (pull) {
        const pullBatchSize = pull.batchSize ? pull.batchSize : 20;
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: CheckpointType | undefined
            ) {
                const pullGraphQL = await pull.queryBuilder(lastPulledCheckpoint, pullBatchSize);
                const result = await graphqlReplicationState.graphQLRequest(pullGraphQL);
                if (result.errors) {
                    throw result.errors;
                }
                let data: any = getDataFromResult(result, pull.dataPath);
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
                };
            },
            batchSize: pull.batchSize,
            modifier: pull.modifier,
            stream$: pullStream$.asObservable()
        };
    }
    let replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined;
    if (push) {
        replicationPrimitivesPush = {
            async handler(
                rows: RxReplicationWriteToMasterRow<RxDocType>[]
            ) {
                const pushObj = await push.queryBuilder(rows);
                const result = await graphqlReplicationState.graphQLRequest(pushObj);

                if (result.errors) {
                    throw result.errors;
                }
                let data: any = getDataFromResult(result, push.dataPath);
                if (push.responseModifier) {
                    data = await push.responseModifier(
                        data,
                    );
                }

                return data;
            },
            batchSize: push.batchSize,
            modifier: push.modifier
        };
    }

    const graphqlReplicationState = new RxGraphQLReplicationState(
        url,
        mutateableClientState,
        replicationIdentifier,
        collection,
        deletedField,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        live,
        retryTime,
        autoStart,
        customFetch
    );

    const mustUseSocket = url.ws &&
        pull &&
        pull.streamQueryBuilder &&
        live;

    const startBefore = graphqlReplicationState.start.bind(graphqlReplicationState);
    graphqlReplicationState.start = () => {
        if (mustUseSocket) {
            const httpHeaders = pull.includeWsHeaders ? mutateableClientState.headers : undefined;
            const wsClient = getGraphQLWebSocket(ensureNotFalsy(url.ws), httpHeaders, pull.wsOptions);

            wsClient.on('connected', () => {
                pullStream$.next('RESYNC');
            });

            const query: any = ensureNotFalsy(pull.streamQueryBuilder)(mutateableClientState.headers);

            wsClient.subscribe(
                query,
                {
                    next: async (streamResponse: any) => {
                        // In graphql-ws, the streamResponse is the execution result payload
                        // which should have a 'data' field according to GraphQL spec
                        let responseData = streamResponse?.data;
                        
                        // If there's no data field, the response itself might be the data
                        if (!responseData) {
                            responseData = streamResponse;
                        }
                        
                        if (!responseData || typeof responseData !== 'object') {
                            return;
                        }
                        
                        const firstFieldKeys = Object.keys(responseData);
                        if (firstFieldKeys.length === 0) {
                            return;
                        }
                        
                        const firstField = firstFieldKeys[0];
                        let data = responseData[firstField];
                        
                        if (!data) {
                            return;
                        }
                        
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
    };

    const cancelBefore = graphqlReplicationState.cancel.bind(graphqlReplicationState);
    graphqlReplicationState.cancel = () => {
        if (!graphqlReplicationState.isStopped()) {
            pullStream$.complete();
            if (mustUseSocket) {
                removeGraphQLWebSocketRef(ensureNotFalsy(url.ws));
            }
        }
        return cancelBefore();
    };

    startReplicationOnLeaderShip(waitForLeadership, graphqlReplicationState);
    return graphqlReplicationState;
}

export * from './helper.ts';
export * from './graphql-schema-from-rx-schema.ts';
export * from './query-builder-from-rx-schema.ts';
export * from './graphql-websocket.ts';

