/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import type { Observable } from 'rxjs';
import type { RxCollection, RxPlugin, RxDocumentData } from '../../types';
import { RxReplicationStateBase } from '../replication';
import { RxReplicationError } from '../replication/rx-replication-error';
import { SyncOptionsGraphQL } from '../../index';
export declare class RxGraphQLReplicationState<RxDocType> {
    /**
     * The GraphQL replication uses the replication primitives plugin
     * internally. So we need that replicationState.
     */
    readonly replicationState: RxReplicationStateBase<RxDocType>;
    readonly collection: RxCollection<RxDocType>;
    readonly url: string;
    readonly clientState: {
        client: any;
    };
    received$: Observable<RxDocumentData<RxDocType>>;
    send$: Observable<any>;
    error$: Observable<RxReplicationError<RxDocType>>;
    canceled$: Observable<boolean>;
    active$: Observable<boolean>;
    initialReplicationComplete$: Observable<true>;
    constructor(
    /**
     * The GraphQL replication uses the replication primitives plugin
     * internally. So we need that replicationState.
     */
    replicationState: RxReplicationStateBase<RxDocType>, collection: RxCollection<RxDocType>, url: string, clientState: {
        client: any;
    });
    isStopped(): boolean;
    awaitInitialReplication(): Promise<true>;
    run(retryOnFail?: boolean): Promise<void>;
    notifyAboutRemoteChange(): Promise<void>;
    cancel(): Promise<any>;
    setHeaders(headers: {
        [k: string]: string;
    }): void;
}
export declare function syncGraphQL<RxDocType>(this: RxCollection, { url, headers, waitForLeadership, pull, push, deletedFlag, live, liveInterval, // in ms
retryTime, // in ms
autoStart, }: SyncOptionsGraphQL<RxDocType>): RxGraphQLReplicationState<RxDocType>;
export * from './helper';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
export declare const RxDBReplicationGraphQLPlugin: RxPlugin;
