/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import { BehaviorSubject, Subject, Subscription, Observable } from 'rxjs';
import type { RxCollection, GraphQLSyncPullOptions, GraphQLSyncPushOptions, RxPlugin, RxDocumentData } from '../../types';
export declare class RxGraphQLReplicationState<RxDocType> {
    readonly collection: RxCollection<RxDocType>;
    readonly url: string;
    headers: {
        [k: string]: string;
    };
    readonly pull: GraphQLSyncPullOptions<RxDocType>;
    readonly push: GraphQLSyncPushOptions<RxDocType>;
    readonly deletedFlag: string;
    readonly live: boolean;
    liveInterval: number;
    retryTime: number;
    constructor(collection: RxCollection<RxDocType>, url: string, headers: {
        [k: string]: string;
    }, pull: GraphQLSyncPullOptions<RxDocType>, push: GraphQLSyncPushOptions<RxDocType>, deletedFlag: string, live: boolean, liveInterval: number, retryTime: number);
    client: any;
    endpointHash: string;
    _subjects: {
        received: Subject<unknown>;
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
    received$: Observable<RxDocumentData<RxDocType>>;
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
     * Pull all changes from the server,
     * start from the last pulled change.
     * @return true if successfully, false if something errored
     */
    runPull(): Promise<boolean>;
    /**
     * @return true if successfull, false if not
     */
    runPush(): Promise<boolean>;
    handleDocumentsFromRemote(docs: any[]): Promise<boolean>;
    cancel(): Promise<any>;
    setHeaders(headers: {
        [k: string]: string;
    }): void;
}
export declare function syncGraphQL(this: RxCollection, { url, headers, waitForLeadership, pull, push, deletedFlag, live, liveInterval, // in ms
retryTime, // in ms
autoStart }: any): RxGraphQLReplicationState<any>;
export * from './helper';
export * from './crawling-checkpoint';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
export declare const rxdb = true;
export declare const prototypes: {
    RxCollection: (proto: any) => void;
};
export declare const RxDBReplicationGraphQLPlugin: RxPlugin;
