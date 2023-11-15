/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */

import {
    BehaviorSubject,
    combineLatest,
    filter,
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
} from '../../types/index.d.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import {
    arrayFilterNotEmpty,
    ensureNotFalsy,
    errorToPlainJson,
    flatClone,
    getFromMapOrCreate,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_TRUE,
    toArray
} from '../../plugins/utils/index.ts';
import {
    awaitRxStorageReplicationFirstInSync,
    awaitRxStorageReplicationInSync,
    cancelRxStorageReplication,
    getRxReplicationMetaInstanceSchema,
    replicateRxStorageInstance
} from '../../replication-protocol/index.ts';
import { newRxError } from '../../rx-error.ts';
import {
    awaitRetry,
    DEFAULT_MODIFIER,
    swapDefaultDeletedTodeletedField,
    handlePulledDocuments
} from './replication-helper.ts';
import {
    addConnectedStorageToCollection
} from '../../rx-database-internal-store.ts';
import { addRxPlugin } from '../../plugin.ts';
import { hasEncryption } from '../../rx-storage-helper.ts';
import { overwritable } from '../../overwritable.ts';
import {
    runAsyncPluginHooks
} from '../../hooks.ts';


export const REPLICATION_STATE_BY_COLLECTION: WeakMap<RxCollection, RxReplicationState<any, any>[]> = new WeakMap();

export class RxReplicationState<RxDocType, CheckpointType> {
    public readonly subs: Subscription[] = [];
    public readonly subjects = {
        received: new Subject<RxDocumentData<RxDocType>>(), // all documents that are received from the endpoint
        sent: new Subject<WithDeleted<RxDocType>>(), // all documents that are send to the endpoint
        error: new Subject<RxError | RxTypeError>(), // all errors that are received from the endpoint, emits new Error() objects
        canceled: new BehaviorSubject<boolean>(false), // true when the replication was canceled
        active: new BehaviorSubject<boolean>(false) // true when something is running, false when not
    };

    readonly received$: Observable<RxDocumentData<RxDocType>> = this.subjects.received.asObservable();
    readonly sent$: Observable<WithDeleted<RxDocType>> = this.subjects.sent.asObservable();
    readonly error$: Observable<RxError | RxTypeError> = this.subjects.error.asObservable();
    readonly canceled$: Observable<any> = this.subjects.canceled.asObservable();
    readonly active$: Observable<boolean> = this.subjects.active.asObservable();

    public startPromise: Promise<void>;
    constructor(
        /**
         * The identifier, used to flag revisions
         * and to identify which documents state came from the remote.
         */
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly deletedField: string,
        public readonly pull?: ReplicationPullOptions<RxDocType, CheckpointType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live?: boolean,
        public retryTime?: number,
        public autoStart?: boolean,
    ) {
        const replicationStates = getFromMapOrCreate(
            REPLICATION_STATE_BY_COLLECTION,
            collection,
            () => []
        );
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
    public metaInstance?: RxStorageInstance<RxStorageReplicationMeta<RxDocType, CheckpointType>, any, {}, any>;
    public remoteEvents$: Subject<RxReplicationPullStreamItem<RxDocType, CheckpointType>> = new Subject();

    public async start(): Promise<void> {
        if (this.isStopped()) {
            return;
        }

        // fill in defaults for pull & push
        const pullModifier = this.pull && this.pull.modifier ? this.pull.modifier : DEFAULT_MODIFIER;
        const pushModifier = this.push && this.push.modifier ? this.push.modifier : DEFAULT_MODIFIER;

        const database = this.collection.database;
        const metaInstanceCollectionName = 'rx-replication-meta-' + await database.hashFunction([
            this.collection.name,
            this.replicationIdentifier
        ].join('-'));
        const metaInstanceSchema = getRxReplicationMetaInstanceSchema(
            this.collection.schema.jsonSchema,
            hasEncryption(this.collection.schema.jsonSchema)
        );

        const [metaInstance] = await Promise.all([
            this.collection.database.storage.createStorageInstance<RxStorageReplicationMeta<RxDocType, CheckpointType>>({
                databaseName: database.name,
                collectionName: metaInstanceCollectionName,
                databaseInstanceToken: database.token,
                multiInstance: database.multiInstance, // TODO is this always false?
                options: {},
                schema: metaInstanceSchema,
                password: database.password,
                devMode: overwritable.isDevMode()
            }),
            addConnectedStorageToCollection(
                this.collection,
                metaInstanceCollectionName,
                metaInstanceSchema
            )
        ]);
        this.metaInstance = metaInstance;

        this.internalReplicationState = replicateRxStorageInstance({
            pushBatchSize: this.push && this.push.batchSize ? this.push.batchSize : 100,
            pullBatchSize: this.pull && this.pull.batchSize ? this.pull.batchSize : 100,
            initialCheckpoint: {
                upstream: this.push ? this.push.initialCheckpoint : undefined,
                downstream: this.pull ? this.pull.initialCheckpoint : undefined
            },
            forkInstance: this.collection.storageInstance,
            metaInstance: this.metaInstance,
            hashFunction: database.hashFunction,
            identifier: 'rxdbreplication' + this.replicationIdentifier,
            conflictHandler: this.collection.conflictHandler,
            replicationHandler: {
                masterChangeStream$: this.remoteEvents$.asObservable().pipe(
                    filter(_v => !!this.pull),
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
                    checkpoint: CheckpointType | undefined,
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

                    await runAsyncPluginHooks('preReplicationMasterWrite', {
                        rows,
                        collection: this.collection
                    });

                    const useRowsOrNull = await Promise.all(
                        rows.map(async (row) => {
                            row.newDocumentState = await pushModifier(row.newDocumentState);
                            if (row.newDocumentState === null) {
                                return null;
                            }
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
                    const useRows = useRowsOrNull.filter(arrayFilterNotEmpty);

                    let result: WithDeleted<RxDocType>[] = null as any;

                    // In case all the rows have been filtered and nothing has to be sent
                    if (useRows.length === 0) {
                        done = true;
                        result = [];
                    }

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

                    await runAsyncPluginHooks('preReplicationMasterWriteDocumentsHandle', {
                        result,
                        collection: this.collection
                    });

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
                    this.subjects.sent.next(writeToMasterRow.newDocumentState);
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

    async cancel(): Promise<any> {
        if (this.isStopped()) {
            return PROMISE_RESOLVE_FALSE;
        }

        const promises: Promise<any>[] = [];

        if (this.internalReplicationState) {
            await cancelRxStorageReplication(this.internalReplicationState);
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
        this.subjects.sent.complete();

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
    const replicationState = new RxReplicationState<RxDocType, CheckpointType>(
        replicationIdentifier,
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
