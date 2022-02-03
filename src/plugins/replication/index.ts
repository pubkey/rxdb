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
    DeepReadonlyObject,
    PullRunResult,
    ReplicationOptions,
    ReplicationPullHandlerResult,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxCollection,
    RxDocumentData,
    RxReplicationState,
    WithDeleted
} from '../../types';
import {
    getChangesSinceLastPushSequence,
    getLastPullDocument,
    setLastPullDocument,
    setLastPushSequence
} from './replication-checkpoint';
import {
    flatClone,
    getHeightOfRevision,
    hash,
    lastOfArray,
    promiseWait,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_TRUE,
    PROMISE_RESOLVE_VOID
} from '../../util';
import { overwritable } from '../../overwritable';
import {
    createRevisionForPulledDocument,
    wasRevisionfromPullReplication
} from './revision-flag';
import { _handleToStorageInstance } from '../../rx-collection-helper';
import { newRxError } from '../../rx-error';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event';
import { RxReplicationError, RxReplicationPullError, RxReplicationPushError } from './rx-replication-error';

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

    private runningPromise: Promise<void> = PROMISE_RESOLVE_VOID;
    public runQueueCount: number = 0;
    /**
     * Counts how many times the run() method
     * has been called. Used in tests.
     */
    public runCount: number = 0;

    /**
     * Amount of pending retries of the run() cycle.
     * Increase when a pull or push fails to retry after retryTime.
     * Decrease when the retry-cycle started to run.
     */
    public pendingRetries = 0;

    /**
     * hash of the identifier, used to flag revisions
     * and to identify which documents state came from the remote.
     */
    public replicationIdentifierHash: string;

    constructor(
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType>,
        public readonly pull?: ReplicationPullOptions<RxDocType>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live?: boolean,
        public liveInterval?: number,
        public retryTime?: number,
    ) {
        this.replicationIdentifierHash = hash(this.replicationIdentifier);

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
    async run(retryOnFail = true): Promise<void> {
        if (this.isStopped()) {
            return;
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
        return this.runningPromise;
    }

    /**
     * Runs the whole cycle once,
     * first pushes the local changes to the remote,
     * then pulls the remote changes to the local.
     * Returns true if a retry must be done
     */
    async _run(retryOnFail = true): Promise<boolean> {
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
                setTimeout(() => {
                    this.pendingRetries = this.pendingRetries - 1;
                    this.run();
                }, this.retryTime);
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
            const pullResult = await this.runPull();
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
        const latestDocument = await getLastPullDocument(this.collection, this.replicationIdentifier);
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
         * If a local write has happened while the remote changes where fetched,
         * we have to drop the document and first run a push-sequence.
         * This will ensure that no local writes are missed out and are not pushed to the remote.
         */
        if (this.push) {
            const localWritesInBetween = await getChangesSinceLastPushSequence<RxDocType>(
                this.collection,
                this.replicationIdentifier,
                this.replicationIdentifierHash,
                1
            );
            if (localWritesInBetween.changedDocs.size > 0) {
                return Promise.resolve('drop');
            }
        }

        /**
         * Run the schema validation for pulled documents
         * in dev-mode.
         */
        if (overwritable.isDevMode()) {
            try {
                pulledDocuments.forEach((doc: any) => {
                    const withoutDeleteFlag = flatClone(doc);
                    delete withoutDeleteFlag._deleted;
                    this.collection.schema.validate(withoutDeleteFlag);
                });
            } catch (err: any) {
                this.subjects.error.next(err);
                return Promise.resolve('error');
            }
        }

        if (this.isStopped()) {
            return Promise.resolve('ok');
        }
        await this.handleDocumentsFromRemote(pulledDocuments as any);
        pulledDocuments.map((doc: any) => this.subjects.received.next(doc));


        if (pulledDocuments.length === 0) {
            if (this.live) {
                // console.log('no more docs, wait for ping');
            } else {
                // console.log('RxGraphQLReplicationState._run(): no more docs and not live; complete = true');
            }
        } else {
            const newLatestDocument = lastOfArray(pulledDocuments);
            await setLastPullDocument(
                this.collection,
                this.replicationIdentifier,
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

    async handleDocumentsFromRemote(
        docs: (WithDeleted<RxDocType> | DeepReadonlyObject<WithDeleted<RxDocType>>)[]
    ): Promise<boolean> {
        const toStorageDocs: RxDocumentData<RxDocType>[] = [];
        const docIds: string[] = docs.map(doc => doc[this.collection.schema.primaryPath]) as any;
        const docsFromLocal = await this.collection.storageInstance.findDocumentsById(docIds, true);

        for (const originalDoc of docs) {
            const doc: any = flatClone(originalDoc);
            const documentId: string = doc[this.collection.schema.primaryPath];

            const docStateInLocalStorageInstance = docsFromLocal[documentId];
            let newRevision = createRevisionForPulledDocument(
                this.replicationIdentifierHash,
                doc
            );
            if (docStateInLocalStorageInstance) {
                const hasHeight = getHeightOfRevision(docStateInLocalStorageInstance._rev);
                const newRevisionHeight = hasHeight + 1;
                newRevision = newRevisionHeight + '-' + newRevision;
            } else {
                newRevision = '1-' + newRevision;
            }
            doc._rev = newRevision;

            toStorageDocs.push(doc);
        }

        if (toStorageDocs.length > 0) {
            await this.collection.database.lockedRun(
                () => this.collection.storageInstance.bulkAddRevisions(
                    toStorageDocs.map(doc => _handleToStorageInstance(this.collection, doc))
                )
            );
        }

        return true;
    }

    /**
     * Pushes unreplicated local changes to the remote.
     * @return true if successfull, false if not
     */
    async runPush(): Promise<boolean> {
        if (!this.push) {
            throw newRxError('SNH');
        }

        const batchSize = this.push.batchSize ? this.push.batchSize : 5;
        const changesResult = await getChangesSinceLastPushSequence<RxDocType>(
            this.collection,
            this.replicationIdentifier,
            this.replicationIdentifierHash,
            batchSize,
        );

        if (changesResult.changedDocs.size === 0) {
            return true;
        }

        const changeRows = Array.from(changesResult.changedDocs.values());
        const pushDocs: WithDeleted<RxDocType>[] = changeRows
            .map(row => {
                const doc: WithDeleted<RxDocType> = flatClone(row.doc) as any;
                // TODO _deleted should be required on type RxDocumentData
                // so we do not need this check here
                if (!doc.hasOwnProperty('_deleted')) {
                    doc._deleted = false;
                }

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
        if (changesResult.hasChangesSinceLastSequence) {
            await setLastPushSequence(
                this.collection,
                this.replicationIdentifier,
                changesResult.lastSequence
            );
        }

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
        waitForLeadership
    }: ReplicationOptions<RxDocType>
): RxReplicationState<RxDocType> {
    const replicationState = new RxReplicationStateBase<RxDocType>(
        replicationIdentifier,
        collection,
        pull,
        push,
        live,
        liveInterval,
        retryTime,
    );

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

        // trigger run() once
        replicationState.run();

        /**
         * Start sync-interval and listeners
         * if it is a live replication.
         */
        if (replicationState.live) {
            if (pull) {
                (async () => {
                    while (!replicationState.isStopped()) {
                        await promiseWait(replicationState.liveInterval);
                        if (replicationState.isStopped()) {
                            return;
                        }
                        await replicationState.run(
                            // do not retry on liveInterval-runs because they might stack up
                            // when failing
                            false
                        );
                    }
                })();
            }
            if (push) {
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
                    const rev = doc._rev;
                    if (
                        rev &&
                        /**
                         * Do not run() if the change
                         * was from a pull-replication cycle.
                         */
                        !wasRevisionfromPullReplication(
                            replicationState.replicationIdentifierHash,
                            rev
                        )
                    ) {
                        replicationState.run();
                    }
                });
                replicationState.subs.push(changeEventsSub);
            }
        }
    });
    return replicationState as any;
}

export * from './replication-checkpoint';
export * from './revision-flag';
export * from './rx-replication-error';
