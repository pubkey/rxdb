/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import { BehaviorSubject, Subject, Subscription, Observable } from 'rxjs';
import { RxCollection, GraphQLSyncPullOptions, GraphQLSyncPushOptions } from '../../types';
export declare class RxGraphQLReplicationState {
    collection: RxCollection;
    pull: GraphQLSyncPullOptions;
    push: GraphQLSyncPushOptions;
    deletedFlag: string;
    live: boolean;
    liveInterval: number;
    retryTime: number;
    constructor(collection: RxCollection, url: string, headers: {
        [k: string]: string;
    }, pull: GraphQLSyncPullOptions, push: GraphQLSyncPushOptions, deletedFlag: string, live: boolean, liveInterval: number, retryTime: number);
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
    run(): Promise<void>;
    _run(): Promise<boolean>;
    /**
     * @return true if no errors occured
     */
    runPull(): Promise<boolean>;
    runPush(): Promise<boolean>;
    handleDocumentFromRemote(doc: any, docsWithRevisions: any[]): Promise<void>;
    cancel(): Promise<any>;
}
export declare function syncGraphQL(this: RxCollection, { url, headers, waitForLeadership, pull, push, deletedFlag, live, liveInterval, // in ms
retryTime, // in ms
autoStart }: any): RxGraphQLReplicationState;
export declare const rxdb = true;
export declare const prototypes: {
    RxCollection: (proto: any) => void;
};
declare const _default: {
    rxdb: boolean;
    prototypes: {
        RxCollection: (proto: any) => void;
    };
};
export default _default;
