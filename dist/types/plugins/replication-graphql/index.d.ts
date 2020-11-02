/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import { BehaviorSubject, Subject, Subscription, Observable } from 'rxjs';
import type { RxCollection, GraphQLSyncPullOptions, GraphQLSyncPushOptions, RxPlugin } from '../../types';
export declare class RxGraphQLReplicationState {
    readonly collection: RxCollection;
    readonly url: string;
    headers: {
        [k: string]: string;
    };
    readonly pull: GraphQLSyncPullOptions;
    readonly push: GraphQLSyncPushOptions;
    readonly deletedFlag: string;
    readonly lastPulledRevField: string;
    readonly live: boolean;
    liveInterval: number;
    retryTime: number;
    readonly syncRevisions: boolean;
    constructor(collection: RxCollection, url: string, headers: {
        [k: string]: string;
    }, pull: GraphQLSyncPullOptions, push: GraphQLSyncPushOptions, deletedFlag: string, lastPulledRevField: string, live: boolean, liveInterval: number, retryTime: number, syncRevisions: boolean);
    client: any;
    endpointHash: string;
    _subjects: {
        recieved: Subject<unknown>;
        send: Subject<unknown>;
        error: Subject<unknown>;
        canceled: BehaviorSubject<boolean>;
        active: BehaviorSubject<boolean>;
        initialReplicationComplete: BehaviorSubject<boolean>;
    };
    _runningPromise: Promise<void>;
    _subs: Subscription[];
    _runQueueCount: number;
    _runCount: number;
    initialReplicationComplete$: Observable<any>;
    recieved$: Observable<any>;
    send$: Observable<any>;
    error$: Observable<any>;
    canceled$: Observable<any>;
    active$: Observable<boolean>;
    /**
     * things that are more complex to not belong into the constructor
     */
    _prepare(): void;
    isStopped(): boolean;
    awaitInitialReplication(): Promise<true>;
    run(retryOnFail?: boolean): Promise<void>;
    /**
     * returns true if retry must be done
     */
    _run(retryOnFail?: boolean): Promise<boolean>;
    /**
     * @return true if sucessfull
     */
    runPull(): Promise<boolean>;
    /**
     * @return true if successfull, false if not
     */
    runPush(): Promise<boolean>;
    handleDocumentsFromRemote(docs: any[], docsWithRevisions: any[]): Promise<void>;
    cancel(): Promise<any>;
    setHeaders(headers: {
        [k: string]: string;
    }): void;
}
export declare function syncGraphQL(this: RxCollection, { url, headers, waitForLeadership, pull, push, deletedFlag, lastPulledRevField, live, liveInterval, // in ms
retryTime, // in ms
autoStart, // if this is false, the replication does nothing at start
syncRevisions, }: any): RxGraphQLReplicationState;
export * from './helper';
export * from './crawling-checkpoint';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
export declare const rxdb = true;
export declare const prototypes: {
    RxCollection: (proto: any) => void;
};
export declare const RxDBReplicationGraphQLPlugin: RxPlugin;
