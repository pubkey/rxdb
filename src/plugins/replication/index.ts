/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */

import {
    BehaviorSubject,
    firstValueFrom,
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import {
    filter
} from 'rxjs/operators';
import type {
    EventBulk,
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxCollection,
    RxDocumentData,
    RxReplicationState,
    RxReplicationWriteToMasterRow,
    RxStorageInstanceReplicationState,
    WithDeleted
} from '../../types';
import {
    ensureInteger,
    ensureNotFalsy,
    fastUnsecureHash,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_TRUE
} from '../../util';
import {
    RxReplicationError
} from './rx-replication-error';
import {
    awaitRxStorageReplicationFirstInSync,
    awaitRxStorageReplicationInSync,
    cancelRxStorageReplication,
    replicateRxStorageInstance,
    RX_REPLICATION_META_INSTANCE_SCHEMA
} from '../../replication-protocol';


export const REPLICATION_STATE_BY_COLLECTION: WeakMap<RxCollection, RxReplicationStateBase<any, any>[]> = new WeakMap();

export class RxReplicationStateBase<RxDocType, CheckpointType> {
    public readonly subs: Subscription[] = [];
    public readonly subjects = {
        received: new Subject<RxDocumentData<RxDocType>>(), // all documents that are received from the endpoint
        send: new Subject(), // all documents that are send to the endpoint
        error: new Subject<RxReplicationError<RxDocType>>(), // all errors that are received from the endpoint, emits new Error() objects
        canceled: new BehaviorSubject<boolean>(false), // true when the replication was canceled
        active: new BehaviorSubject<boolean>(false), // true when something is running, false when not
        initialReplicationComplete: new BehaviorSubject<boolean>(false) // true the initial replication-cycle is over
    };
    public liveInterval: number;
    private startPromise: Promise<void>;
    constructor(
        /**
         * hash of the identifier, used to flag revisions
         * and to identify which documents state came from the remote.
         */
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live?: boolean,
        liveInterval?: number,
        public retryTime?: number,
        public autoStart?: boolean,
    ) {
        let replicationStates = REPLICATION_STATE_BY_COLLECTION.get(collection);
        if (!replicationStates) {
            replicationStates = [];
            REPLICATION_STATE_BY_COLLECTION.set(collection, replicationStates);
        }
        replicationStates.push(this);


        // stop the replication when the collection gets destroyed
        this.collection.onDestroy.then(() => {
            this.cancel();
        });

        // create getters for the observables
        Object.keys(this.subjects).forEach(key => {
            Object.defineProperty(this, key + '$', {
                get: function () {
                    return this.subjects[key].asObservable();
                }
            });
        });
        this.liveInterval = liveInterval !== void 0 ? ensureInteger(liveInterval) : 1000 * 10;


        this.startPromise = new Promise(res => {
            this.callOnStart = res;
        });

    }

    private callOnStart: () => void = undefined as any;



    public internalReplicationState?: RxStorageInstanceReplicationState<RxDocType>;
    public remoteEvents$: Subject<
        EventBulk<WithDeleted<RxDocType>, any> |
        'RESYNC'
    > = new Subject();


    public async start(): Promise<void> {
        if (this.isStopped()) {
            return
        }

        const database = this.collection.database;
        const metaInstance = await this.collection.database.storage.createStorageInstance({
            databaseName: database.name,
            collectionName: this.collection.name + '-rx-replication-' + this.replicationIdentifierHash,
            databaseInstanceToken: database.token,
            multiInstance: database.multiInstance, // TODO is this always false?
            options: {},
            schema: RX_REPLICATION_META_INSTANCE_SCHEMA
        });

        this.internalReplicationState = replicateRxStorageInstance({
            bulkSize: this.push && this.push.batchSize ? this.push.batchSize : 100,
            forkInstance: this.collection.storageInstance,
            metaInstance,
            hashFunction: database.hashFunction,
            identifier: 'rx-replication-' + this.replicationIdentifierHash,
            conflictHandler: this.collection.conflictHandler,
            replicationHandler: {
                masterChangeStream$: this.remoteEvents$.asObservable(),
                masterChangesSince: async (
                    checkpoint: CheckpointType,
                    bulkSize: number
                ) => {
                    if (!this.pull) {
                        return {
                            checkpoint: null,
                            documentsData: []
                        };
                    }
                    // TODO retry-logic
                    const result = await this.pull.handler(
                        checkpoint,
                        bulkSize
                    );
                    return {
                        documentsData: result.documents,
                        checkpoint: result.checkpoint
                    }
                },
                masterWrite: async (
                    rows: RxReplicationWriteToMasterRow<RxDocType>[]
                ) => {
                    if (!this.push) {
                        return [];
                    }
                    // TODO add retry logic
                    const result = await this.push.handler(rows);
                    return result;
                }
            }
        });
        if (!this.live) {
            await awaitRxStorageReplicationFirstInSync(this.internalReplicationState);
            await this.cancel();
        }
        this.callOnStart();
    }

    isStopped(): boolean {
        if (this.collection.destroyed) {
            return true;
        }
        if (this.subjects.canceled.getValue()) {
            return true;
        }
        return false;
    }

    async awaitInitialReplication(): Promise<void> {
        console.log('awaitInitialReplication() 0');
        await this.startPromise;
        console.log('awaitInitialReplication() 1');
        console.dir(this.internalReplicationState);
        return awaitRxStorageReplicationFirstInSync(
            ensureNotFalsy(this.internalReplicationState)
        );
    }

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
    async awaitInSync(): Promise<true> {
        await awaitRxStorageReplicationFirstInSync(ensureNotFalsy(this.internalReplicationState));
        await awaitRxStorageReplicationInSync(ensureNotFalsy(this.internalReplicationState));
        return true;
    }

    async cancel(): Promise<any> {
        if (this.isStopped()) {
            return PROMISE_RESOLVE_FALSE;
        }

        if (this.internalReplicationState) {
            await cancelRxStorageReplication(this.internalReplicationState);
        }


        this.subs.forEach(sub => sub.unsubscribe());
        this.subjects.canceled.next(true);

        this.subjects.active.complete();
        this.subjects.canceled.complete();
        this.subjects.error.complete();
        this.subjects.received.complete();
        this.subjects.send.complete();

        return PROMISE_RESOLVE_TRUE;
    }
}


export function replicateRxCollection<RxDocType, CheckpointType>(
    {
        replicationIdentifier,
        collection,
        pull,
        push,
        live = false,
        liveInterval = 1000 * 10,
        retryTime = 1000 * 5,
        waitForLeadership = true,
        autoStart = true,
    }: ReplicationOptions<RxDocType, CheckpointType>
): RxReplicationState<RxDocType, CheckpointType> {
    const replicationIdentifierHash = fastUnsecureHash(
        [
            collection.database.name,
            collection.name,
            replicationIdentifier
        ].join('|')
    );
    const replicationState = new RxReplicationStateBase<RxDocType, CheckpointType>(
        replicationIdentifierHash,
        collection,
        pull,
        push,
        live,
        liveInterval,
        retryTime,
        autoStart
    );
    ensureInteger(replicationState.liveInterval);
    /**
     * Always await this Promise to ensure that the current instance
     * is leader when waitForLeadership=true
     */
    const mustWaitForLeadership = waitForLeadership && collection.database.multiInstance;
    const waitTillRun: Promise<any> = mustWaitForLeadership ? collection.database.waitForLeadership() : PROMISE_RESOLVE_TRUE;
    waitTillRun.then(() => {
        if (replicationState.isStopped()) {
            return;
        }
        if (autoStart) {
            replicationState.start();
        }
    });
    return replicationState as any;
}

export * from './rx-replication-error';
