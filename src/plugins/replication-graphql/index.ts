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
    flatClone
} from '../../util';

import {
    hash
} from '../../util';

import {
    DEFAULT_MODIFIER,
    GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX
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
    ReplicationPushOptions
} from '../../types';
import { replicateRxCollection, RxReplicationStateBase } from '../replication';
import {
    RxReplicationError,
    RxReplicationPullError,
    RxReplicationPushError
} from '../replication/rx-replication-error';
import { newRxError } from '../../rx-error';
import { addRxPlugin, SyncOptionsGraphQL } from '../../index';

export class RxGraphQLReplicationState<RxDocType> {

    public received$: Observable<RxDocumentData<RxDocType>>;
    public send$: Observable<any> = undefined as any;
    public error$: Observable<RxReplicationError<RxDocType>> = undefined as any;
    public canceled$: Observable<boolean> = undefined as any;
    public active$: Observable<boolean> = undefined as any;
    public initialReplicationComplete$: Observable<true>;

    constructor(
        /**
         * The GraphQL replication uses the replication primitives plugin
         * internally. So we need that replicationState.
         */
        public readonly replicationState: RxReplicationStateBase<RxDocType>,
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
        this.initialReplicationComplete$ = replicationState.initialReplicationComplete$;
    }


    isStopped(): boolean {
        return this.replicationState.isStopped();
    }

    awaitInitialReplication(): Promise<true> {
        return this.replicationState.awaitInitialReplication();
    }

    run(retryOnFail = true): Promise<void> {
        return this.replicationState.run(retryOnFail);
    }

    notifyAboutRemoteChange(): Promise<void> {
        return this.replicationState.notifyAboutRemoteChange();
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

export function syncGraphQL<RxDocType>(
    this: RxCollection,
    {
        url,
        headers = {},
        waitForLeadership = true,
        pull,
        push,
        deletedFlag = '_deleted',
        live = false,
        liveInterval = 1000 * 10, // in ms
        retryTime = 1000 * 5, // in ms
        autoStart = true,
    }: SyncOptionsGraphQL<RxDocType>
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

    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType> | undefined;
    if (pull) {
        replicationPrimitivesPull = {
            async handler(latestPulledDocument) {
                const pullGraphQL = await pull.queryBuilder(latestPulledDocument);
                const result = await mutateableClientState.client.query(pullGraphQL.query, pullGraphQL.variables);
                if (result.errors) {
                    if (typeof result.errors === 'string') {
                        throw new RxReplicationPullError(
                            result.errors,
                            latestPulledDocument,
                        );
                    } else {
                        throw new RxReplicationPullError(
                            overwritable.tunnelErrorMessage('GQL2'),
                            latestPulledDocument,
                            result.errors
                        );
                    }
                }

                const dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
                const docsData: any[] = objectPath.get(result, dataPath);

                // optimization shortcut, do not proceed if there are no documents.
                if (docsData.length === 0) {
                    return {
                        documents: [],
                        hasMoreDocuments: false
                    };
                }

                let hasMoreDocuments: boolean = false;
                if (docsData.length > pull.batchSize) {
                    throw newRxError('GQL3', {
                        args: {
                            pull,
                            documents: docsData
                        }
                    });
                } else if (docsData.length === pull.batchSize) {
                    hasMoreDocuments = true;
                }

                const modified: any[] = (await Promise.all(docsData
                    .map(async (doc: any) => {
                        // swap out deleted flag
                        if (deletedFlag !== '_deleted') {
                            const isDeleted = !!doc[deletedFlag];
                            doc._deleted = isDeleted;
                            delete doc[deletedFlag];
                        }

                        return await pullModifier(doc);
                    })
                )).filter(doc => !!doc);
                return {
                    documents: modified,
                    hasMoreDocuments
                }
            }
        }
    }
    let replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined;
    if (push) {
        replicationPrimitivesPush = {
            batchSize: push.batchSize,
            async handler(docs: RxDocumentData<RxDocType>[]) {
                let modifiedPushDocs: RxDocumentData<RxDocType>[] = await Promise.all(
                    docs.map(async (doc) => {
                        let changedDoc: any = flatClone(doc);

                        // swap out deleted flag
                        if (deletedFlag !== '_deleted') {
                            const isDeleted = !!doc._deleted;
                            changedDoc[deletedFlag] = isDeleted;
                            delete changedDoc._deleted;
                        }

                        changedDoc = await pushModifier(changedDoc);
                        return changedDoc ? changedDoc : null;
                    })
                );
                /**
                 * The push modifier might have returned null instead of a document
                 * which means that these documents must not be pushed and filtered out.
                 */
                modifiedPushDocs = modifiedPushDocs.filter(doc => !!doc) as any;

                /**
                 * Optimization shortcut.
                 * If we have no more documents to push,
                 * because all were filtered out by the modifier,
                 * we can quit here.
                 */
                if (modifiedPushDocs.length === 0) {
                    return;
                }

                const pushObj = await push.queryBuilder(modifiedPushDocs);
                const result = await mutateableClientState.client.query(pushObj.query, pushObj.variables);
                if (result.errors) {
                    if (typeof result.errors === 'string') {
                        throw new RxReplicationPushError(
                            result.errors,
                            docs
                        );
                    } else {
                        throw new RxReplicationPushError(
                            overwritable.tunnelErrorMessage('GQL4'),
                            docs,
                            result.errors
                        );
                    }
                }
            }
        };
    }

    const replicationState = replicateRxCollection<RxDocType>({
        replicationIdentifier: GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + hash(url),
        collection,
        deletedFlag,
        pull: replicationPrimitivesPull,
        push: replicationPrimitivesPush,
        waitForLeadership,
        live,
        liveInterval,
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
