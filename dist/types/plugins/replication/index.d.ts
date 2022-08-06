/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import type { ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions, RxCollection, RxDocumentData, RxError, RxReplicationPullStreamItem, RxStorageInstance, RxStorageInstanceReplicationState, RxStorageReplicationMeta, RxTypeError, WithDeleted } from '../../types';
export declare const REPLICATION_STATE_BY_COLLECTION: WeakMap<RxCollection, RxReplicationState<any, any>[]>;
export declare class RxReplicationState<RxDocType, CheckpointType> {
    /**
     * hash of the identifier, used to flag revisions
     * and to identify which documents state came from the remote.
     */
    readonly replicationIdentifierHash: string;
    readonly collection: RxCollection<RxDocType>;
    readonly deletedField: string;
    readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType> | undefined;
    readonly push?: ReplicationPushOptions<RxDocType> | undefined;
    readonly live?: boolean | undefined;
    retryTime?: number | undefined;
    autoStart?: boolean | undefined;
    readonly subs: Subscription[];
    readonly subjects: {
        received: Subject<RxDocumentData<RxDocType>>;
        send: Subject<WithDeleted<RxDocType>>;
        error: Subject<RxError | RxTypeError>;
        canceled: BehaviorSubject<boolean>;
        active: BehaviorSubject<boolean>;
        initialReplicationComplete: BehaviorSubject<boolean>;
    };
    readonly received$: Observable<RxDocumentData<RxDocType>>;
    readonly send$: Observable<WithDeleted<RxDocType>>;
    readonly error$: Observable<RxError | RxTypeError>;
    readonly canceled$: Observable<any>;
    readonly active$: Observable<boolean>;
    private startPromise;
    constructor(
    /**
     * hash of the identifier, used to flag revisions
     * and to identify which documents state came from the remote.
     */
    replicationIdentifierHash: string, collection: RxCollection<RxDocType>, deletedField: string, pull?: ReplicationPullOptions<RxDocType, CheckpointType> | undefined, push?: ReplicationPushOptions<RxDocType> | undefined, live?: boolean | undefined, retryTime?: number | undefined, autoStart?: boolean | undefined);
    private callOnStart;
    internalReplicationState?: RxStorageInstanceReplicationState<RxDocType>;
    metaInstance?: RxStorageInstance<RxStorageReplicationMeta, any, {}, any>;
    remoteEvents$: Subject<RxReplicationPullStreamItem<RxDocType, CheckpointType>>;
    start(): Promise<void>;
    isStopped(): boolean;
    awaitInitialReplication(): Promise<void>;
    /**
     * Returns a promise that resolves when:
     * - All local data is replicated with the remote
     * - No replication cycle is running or in retry-state
     *
     * WARNING: USing this function directly in a multi-tab browser application
     * is dangerous because only the leading instance will ever be replicated,
     * so this promise will not resolve in the other tabs.
     * For multi-tab support you should set and observe a flag in a local document.
     */
    awaitInSync(): Promise<true>;
    reSync(): void;
    emitEvent(ev: RxReplicationPullStreamItem<RxDocType, CheckpointType>): void;
    cancel(): Promise<any>;
}
export declare function replicateRxCollection<RxDocType, CheckpointType>({ replicationIdentifier, collection, deletedField, pull, push, live, retryTime, waitForLeadership, autoStart, }: ReplicationOptions<RxDocType, CheckpointType>): RxReplicationState<RxDocType, CheckpointType>;
export declare function startReplicationOnLeaderShip(waitForLeadership: boolean, replicationState: RxReplicationState<any, any>): Promise<void>;
export declare function swapDefaultDeletedTodeletedField<RxDocType>(deletedField: string, doc: WithDeleted<RxDocType>): RxDocType;
export declare function swapdeletedFieldToDefaultDeleted<RxDocType>(deletedField: string, doc: RxDocType): WithDeleted<RxDocType>;
