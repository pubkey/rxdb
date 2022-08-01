/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */

import type {
    Observable
} from 'rxjs';
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
    RxDocumentData,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxReplicationWriteToMasterRow
} from '../../types';
import {
    replicateRxCollection,
    RxReplicationStateBase
} from '../replication';
import {
    addRxPlugin,
    RxError,
    RxTypeError,
    SyncOptionsGraphQL,
    WithDeleted
} from '../../index';

export class RxGraphQLReplicationState<RxDocType> {

    public received$: Observable<RxDocumentData<RxDocType>>;
    public send$: Observable<any> = undefined as any;
    public error$: Observable<RxError | RxTypeError> = undefined as any;
    public canceled$: Observable<boolean> = undefined as any;
    public active$: Observable<boolean> = undefined as any;

    constructor(
        /**
         * The GraphQL replication uses the replication primitives plugin
         * internally. So we need that replicationState.
         */
        public readonly replicationState: RxReplicationStateBase<RxDocType, any>, // TODO type checkpoint
        public readonly collection: RxCollection<RxDocType>,
        public readonly url: string,
        public readonly clientState: { client: any }
    ) {
        // map observables from replicationState to this
        this.received$ = replicationState.subjects.received.asObservable();
        this.send$ = replicationState.subjects.send.asObservable();
        this.error$ = replicationState.subjects.error.asObservable();
        this.canceled$ = replicationState.subjects.canceled.asObservable();
        this.active$ = replicationState.subjects.active.asObservable();
    }


    isStopped(): boolean {
        return this.replicationState.isStopped();
    }

    awaitInitialReplication(): Promise<void> {
        return this.replicationState.awaitInitialReplication();
    }

    awaitInSync() {
        return this.replicationState.awaitInSync();
    }

    start(): Promise<void> {
        return this.replicationState.start();
    }

    notifyAboutRemoteChange() {
        this.replicationState.remoteEvents$.next('RESYNC');
    }

    cancel(): Promise<any> {
        return this.replicationState.cancel();
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
    }: SyncOptionsGraphQL<CheckpointType>
): RxGraphQLReplicationState<RxDocType> {
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
            }
        }
    }
    let replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined;
    if (push) {
        replicationPrimitivesPush = {
            batchSize: push.batchSize,
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
            }
        };
    }

    const replicationState = replicateRxCollection<RxDocType, CheckpointType>({
        replicationIdentifier: GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(url),
        collection,
        pull: replicationPrimitivesPull,
        push: replicationPrimitivesPush,
        waitForLeadership,
        live,
        retryTime,
        autoStart
    });

    const graphqlReplicationState = new RxGraphQLReplicationState(
        replicationState,
        collection,
        url,
        mutateableClientState
    );

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
