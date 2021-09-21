/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */

import {
    BehaviorSubject,
    Subject,
    Subscription,
    Observable,
    firstValueFrom
} from 'rxjs';
import {
    filter
} from 'rxjs/operators';
import GraphQLClient from 'graphql-client';
import objectPath from 'object-path';
import {
    promiseWait,
    getHeightOfRevision,
    flatClone
} from '../../util';

import {
    addRxPlugin
} from '../../core';
import {
    hash
} from '../../util';

import {
    DEFAULT_MODIFIER,
    wasRevisionfromPullReplication,
    createRevisionForPulledDocument
} from './helper';
import {
    setLastPushSequence,
    getLastPullDocument,
    setLastPullDocument,
    getChangesSinceLastPushSequence
} from './crawling-checkpoint';

import { RxDBLeaderElectionPlugin } from '../leader-election';
import {
    overwritable
} from '../../overwritable';
import type {
    RxCollection,
    GraphQLSyncPullOptions,
    GraphQLSyncPushOptions,
    RxPlugin,
    RxDocumentData
} from '../../types';
import { getDocumentDataOfRxChangeEvent } from '../../rx-change-event';
import { _handleFromStorageInstance, _handleToStorageInstance } from '../../rx-collection-helper';

addRxPlugin(RxDBLeaderElectionPlugin);


export class RxGraphQLReplicationState<RxDocType> {

    constructor(
        public readonly collection: RxCollection<RxDocType>,
        public readonly url: string,
        public headers: { [k: string]: string },
        public readonly pull: GraphQLSyncPullOptions<RxDocType>,
        public readonly push: GraphQLSyncPushOptions<RxDocType>,
        public readonly deletedFlag: string,
        public readonly live: boolean,
        public liveInterval: number,
        public retryTime: number
    ) {
        this.client = GraphQLClient({
            url,
            headers
        });
        this.endpointHash = hash(url);
        this._prepare();
    }
    public client: any;
    public endpointHash: string;
    public _subjects = {
        received: new Subject(), // all documents that are received from the endpoint
        /**
         * @deprecated use received instead because it is spelled correctly
         */
        recieved: new Subject(), // all documents that are received from the endpoint
        send: new Subject(), // all documents that are send to the endpoint
        error: new Subject(), // all errors that are received from the endpoint, emits new Error() objects
        canceled: new BehaviorSubject(false), // true when the replication was canceled
        active: new BehaviorSubject(false), // true when something is running, false when not
        initialReplicationComplete: new BehaviorSubject(false) // true the initial replication-cycle is over
    };
    public _runningPromise: Promise<void> = Promise.resolve();
    public _subs: Subscription[] = [];

    public _runQueueCount: number = 0;
    public _runCount: number = 0; // used in tests

    public initialReplicationComplete$: Observable<any> = undefined as any;

    public received$: Observable<RxDocumentData<RxDocType>> = undefined as any;
    /**
     * @deprecated use received instead because it is spelled correctly
     */
    public recieved$: Observable<RxDocumentData<RxDocType>> = undefined as any;
    public send$: Observable<any> = undefined as any;
    public error$: Observable<any> = undefined as any;
    public canceled$: Observable<any> = undefined as any;
    public active$: Observable<boolean> = undefined as any;


    /**
     * things that are more complex to not belong into the constructor
     */
    _prepare() {
        // stop sync when collection gets destroyed
        this.collection.onDestroy.then(() => {
            this.cancel();
        });

        // create getters for the observables
        Object.keys(this._subjects).forEach(key => {
            Object.defineProperty(this, key + '$', {
                get: function () {
                    return this._subjects[key].asObservable();
                }
            });
        });
    }

    isStopped(): boolean {
        if (this.collection.destroyed) {
            return true;
        }
        if (!this.live && this._subjects.initialReplicationComplete.getValue()) {
            return true;
        }
        if (this._subjects.canceled['_value']) {
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

    // ensures this._run() does not run in parallel
    async run(retryOnFail = true): Promise<void> {
        if (this.isStopped()) {
            return;
        }

        if (this._runQueueCount > 2) {
            return this._runningPromise;
        }

        this._runQueueCount++;
        this._runningPromise = this._runningPromise.then(async () => {
            this._subjects.active.next(true);
            const willRetry = await this._run(retryOnFail);
            this._subjects.active.next(false);
            if (retryOnFail && !willRetry && this._subjects.initialReplicationComplete.getValue() === false) {
                this._subjects.initialReplicationComplete.next(true);
            }
            this._runQueueCount--;
        });
        return this._runningPromise;
    }

    /**
     * returns true if retry must be done
     */
    async _run(retryOnFail = true): Promise<boolean> {
        this._runCount++;

        if (this.push) {
            const ok = await this.runPush();
            if (!ok && retryOnFail) {
                setTimeout(() => this.run(), this.retryTime);
                /*
                    Because we assume that conflicts are solved on the server side,
                    if push failed, do not attempt to pull before push was successful
                    otherwise we do not know how to merge changes with the local state
                */
                return true;
            }
        }

        if (this.pull) {
            const ok = await this.runPull();
            if (!ok && retryOnFail) {
                setTimeout(() => this.run(), this.retryTime);
                return true;
            }
        }

        return false;
    }

    /**
     * Pull all changes from the server,
     * start from the last pulled change.
     * @return true if successfully, false if something errored
     */
    async runPull(): Promise<boolean> {
        if (this.isStopped()) {
            return Promise.resolve(false);
        }

        const latestDocument = await getLastPullDocument(this.collection, this.endpointHash);
        const latestDocumentData = latestDocument ? latestDocument : null;
        const pullGraphQL = await this.pull.queryBuilder(latestDocumentData);

        let result;
        try {
            result = await this.client.query(pullGraphQL.query, pullGraphQL.variables);
            if (result.errors) {
                if (typeof result.errors === 'string') {
                    throw new Error(result.errors);
                } else {
                    const err: any = new Error('unknown errors occurred - see innerErrors for more details');
                    err.innerErrors = result.errors;
                    throw err;
                }
            }
        } catch (err) {
            this._subjects.error.next(err);
            return false;
        }

        const dataPath = (this.pull as any).dataPath || ['data', Object.keys(result.data)[0]];
        const data: any[] = objectPath.get(result, dataPath);

        // optimization shortcut, do not proceed if there are no documents.
        if (data.length === 0) {
            return true;
        }

        const modified: any[] = (await Promise.all(data
            .map(async (doc: any) => await (this.pull as any).modifier(doc))
        )).filter(doc => !!doc);

        /**
         * Run schema validation in dev-mode
         */
        if (overwritable.isDevMode()) {
            try {
                modified.forEach((doc: any) => {
                    const withoutDeleteFlag = flatClone(doc);
                    delete withoutDeleteFlag[this.deletedFlag];
                    this.collection.schema.validate(withoutDeleteFlag);
                });
            } catch (err) {
                this._subjects.error.next(err);
                return false;
            }
        }

        if (this.isStopped()) {
            return true;
        }
        await this.handleDocumentsFromRemote(modified);
        modified.map((doc: any) => this._subjects.received.next(doc));
        /**
         * @deprecated use received instead because it is spelled correctly
         */
        modified.map((doc: any) => this._subjects.recieved.next(doc));


        if (modified.length === 0) {
            if (this.live) {
                // console.log('no more docs, wait for ping');
            } else {
                // console.log('RxGraphQLReplicationState._run(): no more docs and not live; complete = true');
            }
        } else {
            const newLatestDocument = modified[modified.length - 1];
            await setLastPullDocument(
                this.collection,
                this.endpointHash,
                newLatestDocument
            );

            /**
             * we have more docs, re-run
             * TODO we should have a options.pull.batchSize param
             * and only re-run if the previous batch was 'full'
             * this would save many duplicate requests with empty arrays as response.
             */
            await this.runPull();
        }

        return true;
    }

    /**
     * @return true if successfull, false if not
     */
    async runPush(): Promise<boolean> {
        const changesResult = await getChangesSinceLastPushSequence<RxDocType>(
            this.collection,
            this.endpointHash,
            this.push.batchSize,
        );

        const changesWithDocs: { doc: RxDocumentData<RxDocType>; sequence: number; }[] = (
            await Promise.all(
                Array.from(changesResult.changedDocs.values()).map(async (row) => {
                    let changedDoc = row.doc;
                    changedDoc = await (this.push as any).modifier(changedDoc);
                    if (!changedDoc) {
                        return null;
                    }
                    return {
                        doc: changedDoc,
                        sequence: row.sequence
                    };
                })
            )
        ).filter(doc => !!doc) as any;

        let lastSuccessfullChange: {
            doc: RxDocumentData<RxDocType>;
            sequence: number;
        } | null = null;
        try {
            /**
             * we cannot run all queries parallel
             * because then we would not know
             * where to start again on errors
             * so we run through the docs in series
             */
            for (let i = 0; i < changesWithDocs.length; i++) {
                const changeWithDoc = changesWithDocs[i];

                // TODO _deleted should be required on type RxDocumentData
                // so we do not need this check here
                if (!changeWithDoc.doc.hasOwnProperty('_deleted')) {
                    changeWithDoc.doc._deleted = false;
                }

                const pushObj = await this.push.queryBuilder(changeWithDoc.doc);

                const result = await this.client.query(pushObj.query, pushObj.variables);

                if (result.errors) {
                    if (typeof result.errors === 'string') {
                        throw new Error(result.errors);
                    } else {
                        const err: any = new Error('unknown errors occurred - see innerErrors for more details');
                        err.innerErrors = result.errors;
                        throw err;
                    }
                } else {
                    this._subjects.send.next(changeWithDoc.doc);
                    lastSuccessfullChange = changeWithDoc;
                }
            }
        } catch (err) {
            if (lastSuccessfullChange) {
                await setLastPushSequence(
                    this.collection,
                    this.endpointHash,
                    lastSuccessfullChange.sequence
                );
            }
            this._subjects.error.next(err);
            return false;
        }

        // all docs where successfull, so we use the seq of the changes-fetch
        await setLastPushSequence(
            this.collection,
            this.endpointHash,
            changesResult.lastSequence
        );

        if (changesResult.changedDocs.size === 0) {
            if (this.live) {
                // console.log('no more docs to push, wait for ping');
            } else {
                // console.log('RxGraphQLReplicationState._runPull(): no more docs to push and not live; complete = true');
            }
        } else {
            // we have more docs, re-run
            await this.runPush();
        }

        return true;
    }

    async handleDocumentsFromRemote(docs: any[]): Promise<boolean> {
        const toStorageDocs: {
            doc: RxDocumentData<RxDocType>;
            deletedValue: boolean;
        }[] = [];


        const docIds: string[] = docs.map(doc => doc[this.collection.schema.primaryPath]);
        const docsFromLocal = await this.collection.storageInstance.findDocumentsById(docIds, true);

        for (const doc of docs) {
            const documentId = doc[this.collection.schema.primaryPath];
            const deletedValue = doc[this.deletedFlag];

            doc._deleted = deletedValue;
            delete doc[this.deletedFlag];

            const docStateInLocalStorageInstance = docsFromLocal.get(documentId);
            let newRevision = createRevisionForPulledDocument(
                this.endpointHash,
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

            toStorageDocs.push({
                doc: doc,
                deletedValue
            });
        }

        if (toStorageDocs.length > 0) {
            await this.collection.database.lockedRun(
                async () => {
                    await this.collection.storageInstance.bulkAddRevisions(
                        toStorageDocs.map(row => _handleToStorageInstance(this.collection, row.doc))
                    );
                }
            );
        }

        return true;
    }

    cancel(): Promise<any> {
        if (this.isStopped()) {
            return Promise.resolve(false);
        }
        this._subs.forEach(sub => sub.unsubscribe());
        this._subjects.canceled.next(true);
        return Promise.resolve(true);
    }

    setHeaders(headers: { [k: string]: string }): void {
        this.client = GraphQLClient({
            url: this.url,
            headers
        });
    }
}

export function syncGraphQL(
    this: RxCollection,
    {
        url,
        headers = {},
        waitForLeadership = true,
        pull,
        push,
        deletedFlag,
        live = false,
        liveInterval = 1000 * 10, // in ms
        retryTime = 1000 * 5, // in ms
        autoStart = true // if this is false, the replication does nothing at start
    }: any
) {
    const collection = this;

    // fill in defaults for pull & push
    if (pull) {
        if (!pull.modifier) pull.modifier = DEFAULT_MODIFIER;
    }
    if (push) {
        if (!push.modifier) push.modifier = DEFAULT_MODIFIER;
    }

    const replicationState = new RxGraphQLReplicationState(
        collection,
        url,
        headers,
        pull,
        push,
        deletedFlag,
        live,
        liveInterval,
        retryTime
    );

    if (!autoStart) {
        return replicationState;
    }

    // run internal so .sync() does not have to be async
    const waitTillRun: any = (
        waitForLeadership &&
        this.database.multiInstance // do not await leadership if not multiInstance
    ) ? this.database.waitForLeadership() : promiseWait(0);
    waitTillRun.then(() => {
        if (collection.destroyed) {
            return;
        }

        // trigger run once
        replicationState.run();

        // start sync-interval
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
                 * When a document is written to the collection,
                 * we might have to run the replication run() once
                 */
                const changeEventsSub = collection.$.pipe(
                    filter(cE => !cE.isLocal)
                )
                    .subscribe(changeEvent => {
                        if (replicationState.isStopped()) {
                            return;
                        }
                        const doc = getDocumentDataOfRxChangeEvent(changeEvent);
                        const rev = doc._rev;
                        if (
                            rev &&
                            !wasRevisionfromPullReplication(
                                replicationState.endpointHash,
                                rev
                            )
                        ) {
                            replicationState.run();
                        }
                    });
                replicationState._subs.push(changeEventsSub);
            }
        }
    });

    return replicationState;
}

export * from './helper';
export * from './crawling-checkpoint';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';

export const rxdb = true;
export const prototypes = {
    RxCollection: (proto: any) => {
        proto.syncGraphQL = syncGraphQL;
    }
};

export const RxDBReplicationGraphQLPlugin: RxPlugin = {
    name: 'replication-graphql',
    rxdb,
    prototypes
};
