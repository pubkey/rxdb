/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */
import { BehaviorSubject, Subject, Subscription, Observable } from 'rxjs';
import type { RxCollection, PouchSyncHandler, RxPlugin, SyncOptions, PouchDBInstance } from '../../types';
export declare class RxCouchDBReplicationStateBase {
    readonly collection: RxCollection;
    readonly syncOptions: SyncOptions;
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
    canceled: boolean;
    constructor(collection: RxCollection, syncOptions: SyncOptions);
    awaitInitialReplication(): Promise<void>;
    /**
     * Returns false when the replication has already been canceled
     */
    cancel(): Promise<boolean>;
}
export declare type RxCouchDBReplicationState = RxCouchDBReplicationStateBase & {
    change$: Observable<any>;
    docs$: Observable<any>;
    denied$: Observable<any>;
    active$: Observable<any>;
    alive$: Observable<boolean>;
    complete$: Observable<any>;
    error$: Observable<any>;
};
export declare function setPouchEventEmitter(rxRepState: RxCouchDBReplicationState, evEmitter: PouchSyncHandler): void;
export declare function createRxCouchDBReplicationState(collection: RxCollection, syncOptions: SyncOptions): RxCouchDBReplicationState;
/**
 * get the correct function-name for pouchdb-replication
 */
export declare function pouchReplicationFunction(pouch: PouchDBInstance, { pull, push }: {
    pull?: boolean | undefined;
    push?: boolean | undefined;
}): any;
export declare function syncCouchDB(this: RxCollection, { remote, waitForLeadership, direction, options, query }: SyncOptions): any;
export declare const RxDBReplicationCouchDBPlugin: RxPlugin;
