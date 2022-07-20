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
    BulkWriteRow,
    PullRunResult,
    ReplicationOptions,
    ReplicationPullHandlerResult,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxCollection,
    RxDocumentData,
    RxDocumentWriteData,
    RxReplicationState,
    WithDeleted
} from '../../types';
import {
    getChangesSinceLastPushCheckpoint,
    getLastPullDocument,
    setLastPullDocument,
    setLastPushCheckpoint
} from './replication-checkpoint';
import {
    createRevision,
    ensureInteger,
    ensureNotFalsy,
    flatClone,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    getHeightOfRevision,
    hash,
    lastOfArray,
    now,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_TRUE,
    PROMISE_RESOLVE_VOID
} from '../../util';
import { overwritable } from '../../overwritable';
import { setLastWritePullReplication, wasLastWriteFromPullReplication } from './revision-flag';
import { newRxError } from '../../rx-error';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event';
import { RxReplicationError, RxReplicationPullError, RxReplicationPushError } from './rx-replication-error';


export const REPLICATION_STATE_BY_COLLECTION: WeakMap<RxCollection, RxReplicationStateBase<any>[]> = new WeakMap();

export class RxReplicationStateBase<RxDocType> {
    public readonly subs: Subscription[] = [];
    public initialReplicationComplete$: Observable<true> = undefined as any;

    public readonly subjects = {
        received: new Subject<RxDocumentData<RxDocType>>(), // all documents that are received from the endpoint
        send: new Subject(), // all documents that are send to the endpoint
        error: new Subject<RxReplicationError<RxDocType>>(), // all errors that are received from the endpoint, emits new Error() objects
        canceled: new BehaviorSubject<boolean>(false), // true when the replication was canceled
        active: new BehaviorSubject<boolean>(false), // true when something is running, false when not
        initialReplicationComplete: new BehaviorSubject<boolean>(false) // true the initial replication-cycle is over
    };

    /**
     * Queue promise to ensure that run()
     * does not run in parallel
     */
    public runningPromise: Promise<void> = PROMISE_RESOLVE_VOID;
    public runQueueCount: number = 0;
    /**
     * Counts how many times the run() method
     * has been called. Used in tests.
     */
    public runCount: number = 0;

    /**
     * Time when the last successfull
     * pull cycle has been started.
     * Not the end time of that cycle!
     * Used to determine if notifyAboutRemoteChange()
     * should trigger a new run() cycle or not.
     */
    public lastPullStart: number = 0;

    /**
     * Amount of pending retries of the run() cycle.
     * Increase when a pull or push fails to retry after retryTime.
     * Decrease when the retry-cycle started to run.
     */
    public pendingRetries = 0;

    public liveInterval: number;

    constructor(
        /**
         * hash of the identifier, used to flag revisions
         * and to identify which documents state came from the remote.
         */
        public readonly replicationIdentifierHash: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType>,
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
    }

    async continuePolling() {
        await this.collection.promiseWait(this.liveInterval);
        await this.run(
            // do not retry on liveInterval-runs because they might stack up
            // when failing
            false
        );
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

    awaitInitialReplication(): Promise<true> {
        return firstValueFrom(
            this.initialReplicationComplete$.pipe(
                filter(v => v === true),
            )
        );
    }

    /**
     * Returns a promise that resolves when:
     * - All local data is replicated with the remote
     * - No replication cycle is running or in retry-state
     */
    async awaitInSync(): Promise<true> {
        await this.awaitInitialReplication();
        while (this.runQueueCount > 0) {
            await this.runningPromise;
        }
        return true;
    }

    cancel(): Promise<any> {
        if (this.isStopped()) {
            return PROMISE_RESOLVE_FALSE;
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

    /**
     * Ensures that this._run() does not run in parallel
     */
    run(retryOnFail = true): Promise<void> {
        if (this.isStopped()) {
            return PROMISE_RESOLVE_VOID;
        }

        if (this.runQueueCount > 2) {
            return this.runningPromise;
        }

        this.runQueueCount++;
        this.runningPromise = this.runningPromise
            .then(() => {
                this.subjects.active.next(true);
                return this._run(retryOnFail);
            })
            .then(willRetry => {
                this.subjects.active.next(false);
                if (
                    retryOnFail &&
                    !willRetry &&
                    this.subjects.initialReplicationComplete.getValue() === false
                ) {
                    this.subjects.initialReplicationComplete.next(true);
                }
                this.runQueueCount--;
            });
        if (this.live && this.pull && this.liveInterval > 0 && this.pendingRetries < 1) {
            this.runningPromise.then(() => this.continuePolling());
        }
        return this.runningPromise;
    }


    /**
     * Must be called when the remote tells the client
     * that something has been changed on the remote side.
     * Might or might not trigger a new run() cycle,
     * depending on when it is called and if another run() cycle is already
     * running.
     */
    notifyAboutRemoteChange() {
        const callTime = now();
        return new Promise<void>(res => {
            this.runningPromise = this.runningPromise.then(() => {
                if (this.lastPullStart < callTime) {
                    this.run().then(() => res());
                } else {
                    res();
                }
            });
        });
    }


    /**
     * Runs the whole cycle once,
     * first pushes the local changes to the remote,
     * then pulls the remote changes to the local.
     * Returns true if a retry must be done
     */
    async _run(retryOnFail = true): Promise<boolean> {
        if (this.isStopped()) {
            return false;
        }

        this.runCount++;

        /**
         * The replication happens in the background anyways
         * so we have to ensure that we do not slow down primary tasks.
         * But not if it is the initial replication, because that might happen
         * on the first inital loading where it is critical to get the data
         * as fast as possible to decrease initial page load time.
         */
        if (this.subjects.initialReplicationComplete.getValue()) {
            await this.collection.database.requestIdlePromise();
        }


        const addRetry = () => {
            if (this.pendingRetries < 1) {
                this.pendingRetries = this.pendingRetries + 1;
                this.collection
                    .promiseWait(ensureNotFalsy(this.retryTime))
                    .then(() => {
                        this.pendingRetries = this.pendingRetries - 1;
                        this.run();
                    });
            }
        };

        if (this.push) {
            const ok = await this.runPush();
            if (!ok && retryOnFail) {
                addRetry();
                /*
                    Because we assume that conflicts are solved on the server side,
                    if push failed, do not attempt to pull before push was successful
                    otherwise we do not know how to merge changes with the local state
                */
                return true;
            }
        }

        if (this.pull) {
            const lastPullStartTime = now();
            const pullResult = await this.runPull();
            this.lastPullStart = lastPullStartTime;
            if (pullResult === 'error' && retryOnFail) {
                addRetry();
                return true;
            }
            if (pullResult === 'drop') {
                return this._run();
            }
        }

        return false;
    }

    /**
     * Pull all changes from the server,
     * start from the last pulled change.
     * @return true if successfully, false if something errored
     */
    async runPull(): Promise<PullRunResult> {
        if (!this.pull) {
            throw newRxError('SNH');
        }
        if (this.isStopped()) {
            return Promise.resolve('ok');
        }
        const latestDocument = await getLastPullDocument(this.collection, this.replicationIdentifierHash);
        let result: ReplicationPullHandlerResult<RxDocType>;
        try {
            result = await this.pull.handler(latestDocument);
        } catch (err: any | Error | RxReplicationError<RxDocType>) {
            if (err instanceof RxReplicationPullError) {
                this.subjects.error.next(err);
            } else {
                const emitError: RxReplicationError<RxDocType> = new RxReplicationPullError(
                    err.message,
                    latestDocument,
                    err
                );
                this.subjects.error.next(emitError);
            }
            return Promise.resolve('error');
        }

        const pulledDocuments = result.documents;

        // optimization shortcut, do not proceed if there are no documents.
        if (pulledDocuments.length === 0) {
            return Promise.resolve('ok');
        }

        /**
         * Many people forgot sending the _deleted flag
         * so we check if it exists and throw if not.
         */
        if (overwritable.isDevMode()) {
            pulledDocuments.forEach(doc => {
                if (!doc.hasOwnProperty('_deleted')) {
                    throw newRxError('REP1', {
                        document: doc
                    });
                }
            });
        }

        const pulledDocIds: string[] = pulledDocuments.map(doc => (doc as any)[this.collection.schema.primaryPath]) as any;
        if (this.isStopped()) {
            return Promise.resolve('ok');
        }
        const docsFromLocal = await this.collection.storageInstance.findDocumentsById(pulledDocIds, true);

        /**
         * If a local write has happened while the remote changes where fetched,
         * we have to drop the document and first run a push-sequence.
         * This will ensure that no local writes are missed out and are not pushed to the remote.
         */
        if (this.push) {
            if (this.isStopped()) {
                return Promise.resolve('ok');
            }
            const localWritesInBetween = await getChangesSinceLastPushCheckpoint<RxDocType>(
                this.collection,
                this.replicationIdentifierHash,
                () => this.isStopped(),
                1
            );

            /**
             * If any of the pulled documents
             * was changed locally in between,
             * we drop.
             * If other documents where changed locally,
             * we do not care.
             */
            const primaryPath = this.collection.schema.primaryPath;
            for (const pulledDoc of pulledDocuments) {
                const id = pulledDoc[primaryPath] as any;
                if (localWritesInBetween.changedDocIds.has(id)) {
                    return Promise.resolve('drop');
                }
            }
        }

        if (this.isStopped()) {
            return Promise.resolve('ok');
        }

        const bulkWriteData: BulkWriteRow<RxDocType>[] = [];
        for (const pulledDocument of pulledDocuments) {
            const docId: string = pulledDocument[this.collection.schema.primaryPath] as any;
            const docStateInLocalStorageInstance = docsFromLocal[docId];
            let nextRevisionHeight: number = 1;
            if (docStateInLocalStorageInstance) {
                const hasHeight = getHeightOfRevision(docStateInLocalStorageInstance._rev);
                nextRevisionHeight = hasHeight + 1;
            }

            const writeDoc: RxDocumentWriteData<RxDocType> = Object.assign(
                {},
                pulledDocument as WithDeleted<RxDocType>,
                {
                    _attachments: {},
                    _meta: Object.assign(
                        getDefaultRxDocumentMeta(),
                        docStateInLocalStorageInstance ? docStateInLocalStorageInstance._meta : {}
                    ),
                    _rev: getDefaultRevision()
                }
            );

            writeDoc._rev = createRevision(writeDoc, docStateInLocalStorageInstance);
            setLastWritePullReplication(
                this.replicationIdentifierHash,
                writeDoc,
                nextRevisionHeight
            );
            bulkWriteData.push({
                previous: docStateInLocalStorageInstance,
                document: writeDoc
            });
        }
        if (bulkWriteData.length > 0) {
            /**
             * TODO only do a write to a document
             * if the relevant data has been changed.
             * Otherwise we can ignore the pulled document data.
             */
            const bulkWriteResponse = await this.collection.storageInstance.bulkWrite(
                bulkWriteData,
                'replication-write-pulled'
            );
            /**
             * If writing the pulled documents caused an conflict error,
             * it means that a local write happened while we tried to write data from remote.
             * Then we have to drop the current pulled batch
             * and run pushing again.
             */
            const hasConflict = Object.values(bulkWriteResponse.error).find(err => err.status === 409);
            if (hasConflict) {
                return Promise.resolve('drop');
            }
        }

        pulledDocuments.map((doc: any) => this.subjects.received.next(doc));

        if (this.isStopped()) {
            return Promise.resolve('ok');
        }

        if (pulledDocuments.length === 0) {
            if (this.live) {
                // console.log('no more docs, wait for ping');
            } else {
                // console.log('RxGraphQLReplicationState._run(): no more docs and not live; complete = true');
            }
        } else {
            const newLatestDocument: RxDocumentData<RxDocType> = lastOfArray(pulledDocuments) as any;
            await setLastPullDocument<RxDocType>(
                this.collection,
                this.replicationIdentifierHash,
                newLatestDocument
            );

            /**
             * We have more documents on the remote,
             * So re-run the pulling.
             */
            if (result.hasMoreDocuments) {
                await this.runPull();
            }
        }

        return Promise.resolve('ok');
    }

    /**
     * Pushes unreplicated local changes to the remote.
     * @return true if successfull, false if not
     */
    async runPush(): Promise<boolean> {
        if (!this.push) {
            throw newRxError('SNH');
        }
        if (this.isStopped()) {
            return true;
        }

        const batchSize = this.push.batchSize ? this.push.batchSize : 5;
        const changesResult = await getChangesSinceLastPushCheckpoint<RxDocType>(
            this.collection,
            this.replicationIdentifierHash,
            () => this.isStopped(),
            batchSize,
        );

        if (
            changesResult.changedDocs.size === 0 ||
            this.isStopped()
        ) {
            return true;
        }

        const changeRows = Array.from(changesResult.changedDocs.values());
        const pushDocs: WithDeleted<RxDocType>[] = changeRows
            .map(row => {
                const doc: WithDeleted<RxDocType> = flatClone(row.doc) as any;
                delete (doc as any)._rev;
                delete (doc as any)._attachments;

                return doc;
            });

        try {
            await this.push.handler(pushDocs as any);
        } catch (err: any | Error | RxReplicationError<RxDocType>) {
            if (err instanceof RxReplicationPushError) {
                this.subjects.error.next(err);
            } else {
                const documentsData = changeRows.map(row => row.doc);
                const emitError: RxReplicationPushError<RxDocType> = new RxReplicationPushError(
                    err.message,
                    documentsData,
                    err
                );
                this.subjects.error.next(emitError);
            }
            return false;
        }
        pushDocs.forEach(pushDoc => this.subjects.send.next(pushDoc));


        if (this.isStopped()) {
            return true;
        }

        await setLastPushCheckpoint(
            this.collection,
            this.replicationIdentifierHash,
            changesResult.checkpoint
        );

        // batch had documents so there might be more changes to replicate
        if (changesResult.changedDocs.size !== 0) {
            return this.runPush();
        }
        return true;
    }
}


export function replicateRxCollection<RxDocType>(
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
    }: ReplicationOptions<RxDocType>
): RxReplicationState<RxDocType> {
    const replicationIdentifierHash = hash(
        [
            collection.database.name,
            collection.name,
            replicationIdentifier
        ].join('|')
    );

    const replicationState = new RxReplicationStateBase<RxDocType>(
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
            replicationState.run();
        }
        if (replicationState.live && push) {
            /**
             * When a non-local document is written to the collection,
             * we have to run the replication run() once to ensure
             * that the change is pushed to the remote.
             */
            const changeEventsSub = collection.$.pipe(
                filter(cE => !cE.isLocal)
            ).subscribe(changeEvent => {
                if (replicationState.isStopped()) {
                    return;
                }
                const doc = getDocumentDataOfRxChangeEvent(changeEvent);

                if (
                    /**
                     * Do not run() if the change
                     * was from a pull-replication cycle.
                     */
                    !wasLastWriteFromPullReplication(
                        replicationState.replicationIdentifierHash,
                        doc
                    ) ||
                    /**
                     * If the event is a delete, we still have to run the replication
                     * because wasLastWriteFromPullReplication() will give the wrong answer.
                     */
                    changeEvent.operation === 'DELETE'
                ) {
                    replicationState.run();
                }
            });
            replicationState.subs.push(changeEventsSub);
        }
    });
    return replicationState as any;
}

export * from './replication-checkpoint';
export * from './revision-flag';
export * from './rx-replication-error';
