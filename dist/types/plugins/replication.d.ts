/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */
import { BehaviorSubject, Subject, Subscription, Observable } from 'rxjs';
import type { RxQuery, RxCollection, PouchSyncHandler, PouchReplicationOptions, RxPlugin } from '../types';
export interface SyncOptions {
    remote: string | any;
    waitForLeadership?: boolean;
    direction?: {
        push?: boolean;
        pull?: boolean;
    };
    options?: PouchReplicationOptions;
    query?: RxQuery;
}
export declare class RxReplicationStateBase {
    collection: RxCollection;
    private syncOptions;
    _subs: Subscription[];
    _pouchEventEmitterObject?: PouchSyncHandler | null;
    _subjects: {
        change: Subject<unknown>;
        docs: Subject<unknown>;
        denied: Subject<unknown>;
        active: BehaviorSubject<boolean>;
        complete: BehaviorSubject<boolean>;
        alive: BehaviorSubject<boolean>;
        error: Subject<unknown>;
    };
    constructor(collection: RxCollection, syncOptions: SyncOptions);
    awaitInitialReplication(): Promise<void>;
    cancel(): void;
}
export declare type RxReplicationState = RxReplicationStateBase & {
    change$: Observable<any>;
    docs$: Observable<any>;
    denied$: Observable<any>;
    active$: Observable<any>;
    alive$: Observable<boolean>;
    complete$: Observable<any>;
    error$: Observable<any>;
};
export declare function setPouchEventEmitter(rxRepState: RxReplicationState, evEmitter: PouchSyncHandler): void;
export declare function createRxReplicationState(collection: RxCollection, syncOptions: SyncOptions): RxReplicationState;
export declare function sync(this: RxCollection, { remote, waitForLeadership, direction, options, query }: SyncOptions): any;
export declare const rxdb = true;
export declare const prototypes: {
    RxCollection: (proto: any) => void;
};
export declare const hooks: {
    createRxCollection: (collection: RxCollection) => void;
};
export declare const RxDBReplicationPlugin: RxPlugin;
