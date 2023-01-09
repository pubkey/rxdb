/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */

import {
    BehaviorSubject,
    combineLatest,
    mergeMap,
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import type {
    ReplicationOptions,
    ReplicationPullHandlerResult,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxCollection,
    RxDocumentData,
    RxError,
    RxReplicationPullStreamItem,
    RxReplicationWriteToMasterRow,
    RxStorageInstance,
    RxStorageInstanceReplicationState,
    RxStorageReplicationMeta,
    RxTypeError,
    WithDeleted
} from '../../types';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import {
    ensureNotFalsy,
    errorToPlainJson,
    fastUnsecureHash,
    flatClone,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_TRUE,
    toArray
} from '../../plugins/utils';
import {
    awaitRxStorageReplicationFirstInSync,
    awaitRxStorageReplicationInSync,
    cancelRxStorageReplication,
    replicateRxStorageInstance,
    RX_REPLICATION_META_INSTANCE_SCHEMA
} from '../../replication-protocol';
import { newRxError } from '../../rx-error';
import {
    awaitRetry,
    DEFAULT_MODIFIER,
    swapDefaultDeletedTodeletedField,
    handlePulledDocuments
} from './replication-helper';
import {
    addConnectedStorageToCollection
} from '../../rx-database-internal-store';
import { addRxPlugin } from '../../plugin';


export const REPLICATION_STATE_BY_COLLECTION: WeakMap<RxCollection, RxReplicationState<any, any>[]> = new WeakMap();

export class RxReplicationState<RxDocType, CheckpointType> {
    public readonly subs: Subscription[] = [];
    public readonly subjects = {
        received: new Subject<RxDocumentData<RxDocType>>(), // all documents that are received from the endpoint
        send: new Subject<WithDeleted<RxDocType>>(), // all documents that are send to the endpoint
        error: new Subject<RxError | RxTypeError>(), // all errors that are received from the endpoint, emits new Error() objects
        canceled: new BehaviorSubject<boolean>(false), // true when the replication was canceled
        active: new BehaviorSubject<boolean>(false), // true when something is running, false when not
        initialReplicationComplete: new BehaviorSubject<boolean>(false) // true the initial replication-cycle is over
    };

    readonly received$: Observable<RxDocumentData<RxDocType>> = this.subjects.received.asObservable();
    readonly send$: Observable<WithDeleted<RxDocType>> = this.subjects.send.asObservable();
    readonly error$: Observable<RxError | RxTypeError> = this.subjects.error.asObservable();
    readonly canceled$: Observable<any> = this.subjects.canceled.asObservable();
    readonly active$: Observable<boolean> = this.subjects.active.asObservable();

    private startPromise: Promise<void>;
    constructor(
        /**
         * hash of the identifier, used to flag revisions
         * and to identify which documents state came from the remote.
         */
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly deletedField: string,
        public readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live?: boolean,
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
        this.collection.onDestroy.push(() => this.cancel());

        // create getters for the observables
        Object.keys(this.subjects).forEach(key => {
            Object.defineProperty(this, key + '$', {
                get: function () {
                    return this.subjects[key].asObservable();
                }
            });
        });
        const startPromise = new Promise<void>(res => {
            this.callOnStart = res;
        });
        this.startPromise = startPromise;
    }

    private callOnStart: () => void = undefined as any;

    public internalReplicationState?: RxStorageInstanceReplicationState<RxDocType>;
    public metaInstance?: RxStorageInstance<RxStorageReplicationMeta, any, {}, any>;
    public remoteEvents$: Subject<RxReplicationPullStreamItem<RxDocType, CheckpointType>> = new Subject();

    public async start(): Promise<void> {
        if (this.isStopped()) {
            return;
        }

        // fill in defaults for pull & push
        const pullModifier = this.pull && this.pull.modifier ? this.pull.modifier : DEFAULT_MODIFIER;
        const pushModifier = this.push && this.push.modifier ? this.push.modifier : DEFAULT_MODIFIER;

        const database = this.collection.database;
        const metaInstanceCollectionName = this.collection.name + '-rx-replication-' + this.replicationIdentifierHash;
        const [metaInstance] = await Promise.all([
            this.collection.database.storage.createStorageInstance({
                databaseName: database.name,
                collectionName: metaInstanceCollectionName,
                databaseInstanceToken: database.token,
                multiInstance: database.multiInstance, // TODO is this always false?
                options: {},
                schema: RX_REPLICATION_META_INSTANCE_SCHEMA
            }),
            addConnectedStorageToCollection(
                this.collection,
                metaInstanceCollectionName,
                RX_REPLICATION_META_INSTANCE_SCHEMA
            )
        ]);
        this.metaInstance = metaInstance;

        this.internalReplicationState = replicateRxStorageInstance({
            pushBatchSize: this.push && this.push.batchSize ? this.push.batchSize : 100,
            pullBatchSize: this.pull && this.pull.batchSize ? this.pull.batchSize : 100,
            forkInstance: this.collection.storageInstance,
            metaInstance: this.metaInstance,
            hashFunction: database.hashFunction,
            identifier: 'rxdbreplication' + this.replicationIdentifierHash,
            conflictHandler: this.collection.conflictHandler,
            replicationHandler: {
                masterChangeStream$: this.remoteEvents$.asObservable().pipe(
                    mergeMap(async (ev) => {
                        if (ev === 'RESYNC') {
                            return ev;
                        }
                        const useEv = flatClone(ev);
                        useEv.documents = handlePulledDocuments(this.collection, this.deletedField, useEv.documents);
                        useEv.documents = await Promise.all(
                            useEv.documents.map(d => pullModifier(d))
                        );
                        return useEv;
                    })
                ),
                masterChangesSince: async (
                    checkpoint: CheckpointType,
                    batchSize: number
                ) => {
                    if (!this.pull) {
                        return {
                            checkpoint: null,
                            documents: []
                        };
                    }
                    /**
                     * Retries must be done here in the replication primitives plugin,
                     * because the replication protocol itself has no
                     * error handling.
                     */
                    let done = false;
                    let result: ReplicationPullHandlerResult<RxDocType, CheckpointType> = {} as any;
                    while (!done && !this.isStopped()) {
                        try {
                            result = await this.pull.handler(
                                checkpoint,
                                batchSize
                            );
                            done = true;
                        } catch (err: any | Error | Error[]) {
                            const emitError = newRxError('RC_PULL', {
                                checkpoint,
                                errors: toArray(err).map(er => errorToPlainJson(er)),
                                direction: 'pull'
                            });
                            this.subjects.error.next(emitError);
                            await awaitRetry(this.collection, ensureNotFalsy(this.retryTime));
                        }
                    }

                    if (this.isStopped()) {
                        return {
                            checkpoint: null,
                            documents: []
                        };
                    }

                    const useResult = flatClone(result);
                    useResult.documents = handlePulledDocuments(this.collection, this.deletedField, useResult.documents);
                    useResult.documents = await Promise.all(
                        useResult.documents.map(d => pullModifier(d))
                    );
                    return useResult;
                },
                masterWrite: async (
                    rows: RxReplicationWriteToMasterRow<RxDocType>[]
                ) => {
                    if (!this.push) {
                        return [];
                    }
                    let done = false;
                    const useRows = await Promise.all(
                        rows.map(async (row) => {
                            row.newDocumentState = await pushModifier(row.newDocumentState);
                            if (row.assumedMasterState) {
                                row.assumedMasterState = await pushModifier(row.assumedMasterState);
                            }
                            if (this.deletedField !== '_deleted') {
                                row.newDocumentState = swapDefaultDeletedTodeletedField(this.deletedField, row.newDocumentState) as any;
                                if (row.assumedMasterState) {
                                    row.assumedMasterState = swapDefaultDeletedTodeletedField(this.deletedField, row.assumedMasterState) as any;
                                }
                            }
                            return row;
                        })
                    );

                    let result: WithDeleted<RxDocType>[] = null as any;
                    while (!done && !this.isStopped()) {
                        try {
                            result = await this.push.handler(useRows);
                            /**
                             * It is a common problem that people have wrongly behaving backend
                             * that do not return an array with the conflicts on push requests.
                             * So we run this check here to make it easier to debug.
                             * @link https://github.com/pubkey/rxdb/issues/4103
                             */
                            if (!Array.isArray(result)) {
                                throw newRxError(
                                    'RC_PUSH_NO_AR',
                                    {
                                        pushRows: rows,
                                        direction: 'push',
                                        args: { result }
                                    }
                                );
                            }
                            done = true;
                        } catch (err: any | Error | Error[] | RxError) {
                            const emitError = (err as RxError).rxdb ? err : newRxError('RC_PUSH', {
                                pushRows: rows,
                                errors: toArray(err).map(er => errorToPlainJson(er)),
                                direction: 'push'
                            });
                            this.subjects.error.next(emitError);
                            await awaitRetry(this.collection, ensureNotFalsy(this.retryTime));
                        }
                    }
                    if (this.isStopped()) {
                        return [];
                    }
                    const conflicts = handlePulledDocuments(this.collection, this.deletedField, ensureNotFalsy(result));
                    return conflicts;
                }
            }
        });
        this.subs.push(
            this.internalReplicationState.events.error.subscribe(err => {
                this.subjects.error.next(err);
            }),
            this.internalReplicationState.events.processed.down
                .subscribe(row => this.subjects.received.next(row.document as any)),
            this.internalReplicationState.events.processed.up
                .subscribe(writeToMasterRow => {
                    this.subjects.send.next(writeToMasterRow.newDocumentState);
                }),
            combineLatest([
                this.internalReplicationState.events.active.down,
                this.internalReplicationState.events.active.up
            ]).subscribe(([down, up]) => {
                const isActive = down || up;
                this.subjects.active.next(isActive);
            })
        );

        if (
            this.pull &&
            this.pull.stream$ &&
            this.live
        ) {
            this.subs.push(
                this.pull.stream$.subscribe({
                    next: ev => {
                        this.remoteEvents$.next(ev);
                    },
                    error: err => {
                        this.subjects.error.next(err);
                    }
                })
            );
        }

        /**
         * Non-live replications run once
         * and then automatically get canceled.
         */
        if (!this.live) {
            await awaitRxStorageReplicationFirstInSync(this.internalReplicationState);
            await awaitRxStorageReplicationInSync(this.internalReplicationState);
            await this.cancel();
        }
        this.callOnStart();
    }

    isStopped(): boolean {
        if (this.subjects.canceled.getValue()) {
            return true;
        }
        return false;
    }

    async awaitInitialReplication(): Promise<void> {
        await this.startPromise;
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
        await this.startPromise;
        await awaitRxStorageReplicationFirstInSync(ensureNotFalsy(this.internalReplicationState));

        /**
         * Often awaitInSync() is called directly after a document write,
         * like in the unit tests.
         * So we first have to await the idleness to ensure that all RxChangeEvents
         * are processed already.
         */
        await this.collection.database.requestIdlePromise();

        await awaitRxStorageReplicationInSync(ensureNotFalsy(this.internalReplicationState));

        return true;
    }

    reSync() {
        this.remoteEvents$.next('RESYNC');
    }
    emitEvent(ev: RxReplicationPullStreamItem<RxDocType, CheckpointType>) {
        this.remoteEvents$.next(ev);
    }

    cancel(): Promise<any> {
        if (this.isStopped()) {
            return PROMISE_RESOLVE_FALSE;
        }

        const promises: Promise<any>[] = [];

        if (this.internalReplicationState) {
            cancelRxStorageReplication(this.internalReplicationState);
        }
        if (this.metaInstance) {
            promises.push(
                ensureNotFalsy(this.internalReplicationState).checkpointQueue
                    .then(() => ensureNotFalsy(this.metaInstance).close())
            );
        }

        this.subs.forEach(sub => sub.unsubscribe());
        this.subjects.canceled.next(true);

        this.subjects.active.complete();
        this.subjects.canceled.complete();
        this.subjects.error.complete();
        this.subjects.received.complete();
        this.subjects.send.complete();

        return Promise.all(promises);
    }
}


export function replicateRxCollection<RxDocType, CheckpointType>(
    {
        replicationIdentifier,
        collection,
        deletedField = '_deleted',
        pull,
        push,
        live = true,
        retryTime = 1000 * 5,
        waitForLeadership = true,
        autoStart = true,
    }: ReplicationOptions<RxDocType, CheckpointType>
): RxReplicationState<RxDocType, CheckpointType> {
    addRxPlugin(RxDBLeaderElectionPlugin);
    const replicationIdentifierHash = fastUnsecureHash(
        [
            collection.database.name,
            collection.name,
            replicationIdentifier
        ].join('|')
    );
    const replicationState = new RxReplicationState<RxDocType, CheckpointType>(
        replicationIdentifierHash,
        collection,
        deletedField,
        pull,
        push,
        live,
        retryTime,
        autoStart
    );


    startReplicationOnLeaderShip(waitForLeadership, replicationState);
    return replicationState as any;
}


export function startReplicationOnLeaderShip(
    waitForLeadership: boolean,
    replicationState: RxReplicationState<any, any>
) {
    /**
     * Always await this Promise to ensure that the current instance
     * is leader when waitForLeadership=true
     */
    const mustWaitForLeadership = waitForLeadership && replicationState.collection.database.multiInstance;
    const waitTillRun: Promise<any> = mustWaitForLeadership ? replicationState.collection.database.waitForLeadership() : PROMISE_RESOLVE_TRUE;
    return waitTillRun.then(() => {
        if (replicationState.isStopped()) {
            return;
        }
        if (replicationState.autoStart) {
            replicationState.start();
        }
    });
}
