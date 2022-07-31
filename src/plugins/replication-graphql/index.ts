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
    DEFAULT_MODIFIER,
    GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX,
    swapDeletedFlagToDeleted,
    swapDeletedToDeletedFlag
} from './helper';

import { RxDBLeaderElectionPlugin } from '../leader-election';
import {
    overwritable
} from '../../overwritable';
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
    RxReplicationError,
    RxReplicationPullError,
    RxReplicationPushError
} from '../replication/rx-replication-error';
import {
    addRxPlugin,
    SyncOptionsGraphQL,
    WithDeleted
} from '../../index';

export class RxGraphQLReplicationState<RxDocType> {

    public received$: Observable<RxDocumentData<RxDocType>>;
    public send$: Observable<any> = undefined as any;
    public error$: Observable<RxReplicationError<RxDocType, any>> = undefined as any;
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
        deletedFlag = '_deleted',
        live = false,
        retryTime = 1000 * 5, // in ms
        autoStart = true,
    }: SyncOptionsGraphQL<RxDocType, CheckpointType>
): RxGraphQLReplicationState<RxDocType> {
    const collection = this;

    // fill in defaults for pull & push
    const pullModifier = pull && pull.modifier ? pull.modifier : DEFAULT_MODIFIER;
    const pushModifier = push && push.modifier ? push.modifier : DEFAULT_MODIFIER;

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
                    console.log('pull error:');
                    console.log(JSON.stringify(result, null, 4));
                    if (typeof result.errors === 'string') {
                        throw new RxReplicationPullError(
                            result.errors,
                            lastPulledCheckpoint,
                        );
                    } else {
                        throw new RxReplicationPullError(
                            overwritable.tunnelErrorMessage('GQL2'),
                            lastPulledCheckpoint,
                            result.errors
                        );
                    }
                }

                const dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
                const data: any = objectPath.get(result, dataPath);

                const docsData: WithDeleted<RxDocType>[] = data.documents;
                const newCheckpoint = data.checkpoint;

                // optimization shortcut, do not proceed if there are no documents.
                if (docsData.length === 0) {
                    return {
                        documents: [],
                        checkpoint: lastPulledCheckpoint
                    };
                }

                const modified: any[] = (await Promise.all(
                    docsData.map((doc: WithDeleted<RxDocType>) => {
                        doc = swapDeletedFlagToDeleted(deletedFlag, doc);
                        return pullModifier(doc);
                    })
                )).filter(doc => !!doc);
                return {
                    documents: modified,
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
                let modifiedPushRows: RxReplicationWriteToMasterRow<any>[] = await Promise.all(
                    rows.map(async (row) => {
                        let useRow: RxReplicationWriteToMasterRow<any> = {
                            newDocumentState: swapDeletedToDeletedFlag(deletedFlag, row.newDocumentState),
                            assumedMasterState: row.assumedMasterState ? swapDeletedToDeletedFlag(deletedFlag, row.assumedMasterState) : undefined
                        };
                        useRow = await pushModifier(useRow);
                        return useRow ? useRow : null;
                    })
                ) as any;

                /**
                 * The push modifier might have returned null instead of a document
                 * which means that these documents must not be pushed and filtered out.
                 */
                modifiedPushRows = modifiedPushRows.filter(row => !!row) as any;

                /**
                 * Optimization shortcut.
                 * If we have no more documents to push,
                 * because all were filtered out by the modifier,
                 * we can quit here.
                 */
                if (modifiedPushRows.length === 0) {
                    return [];
                }

                const pushObj = await push.queryBuilder(modifiedPushRows);
                const result = await mutateableClientState.client.query(pushObj.query, pushObj.variables);

                if (result.errors) {
                    if (typeof result.errors === 'string') {
                        throw new RxReplicationPushError(
                            result.errors,
                            modifiedPushRows
                        );
                    } else {
                        throw new RxReplicationPushError(
                            overwritable.tunnelErrorMessage('GQL4'),
                            modifiedPushRows,
                            result.errors
                        );
                    }
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
        deletedFlag,
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
