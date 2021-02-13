/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */

import {
    BehaviorSubject,
    Subject,
    Subscription,
    Observable
} from 'rxjs';
import {
    first,
    filter
} from 'rxjs/operators';
import GraphQLClient from 'graphql-client';


import {
    promiseWait,
    flatClone,
    now
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
    createRevisionForPulledDocument,
    getDocsWithRevisionsFromPouch
} from './helper';
import {
    setLastPushSequence,
    getLastPullDocument,
    setLastPullDocument,
    getChangesSinceLastPushSequence
} from './crawling-checkpoint';

import { RxDBWatchForChangesPlugin } from '../watch-for-changes';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import {
    changeEventfromPouchChange
} from '../../rx-change-event';
import {
    overwritable
} from '../../overwritable';
import type {
    RxCollection,
    GraphQLSyncPullOptions,
    GraphQLSyncPushOptions,
    RxPlugin
} from '../../types';

addRxPlugin(RxDBLeaderElectionPlugin);

/**
 * add the watch-for-changes-plugin
 * so pouchdb will emit events when something gets written to it
 */
addRxPlugin(RxDBWatchForChangesPlugin);


export class RxGraphQLReplicationState {

    constructor(
        public readonly collection: RxCollection,
        public readonly url: string,
        public headers: { [k: string]: string },
        public readonly pull: GraphQLSyncPullOptions,
        public readonly push: GraphQLSyncPushOptions,
        public readonly deletedFlag: string,
        public readonly lastPulledRevField: string,
        public readonly live: boolean,
        public liveInterval: number,
        public retryTime: number,
        public readonly syncRevisions: boolean
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
        recieved: new Subject(), // all documents that are recieved from the endpoint
        send: new Subject(), // all documents that are send to the endpoint
        error: new Subject(), // all errors that are revieced from the endpoint, emits new Error() objects
        canceled: new BehaviorSubject(false), // true when the replication was canceled
        active: new BehaviorSubject(false), // true when something is running, false when not
        initialReplicationComplete: new BehaviorSubject(false) // true the initial replication-cycle is over
    };
    public _runningPromise: Promise<void> = Promise.resolve();
    public _subs: Subscription[] = [];

    public _runQueueCount: number = 0;
    public _runCount: number = 0; // used in tests

    public initialReplicationComplete$: Observable<any> = undefined as any;

    public recieved$: Observable<any> = undefined as any;
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
        if (!this.live && this._subjects.initialReplicationComplete['_value']) return true;
        if (this._subjects.canceled['_value']) return true;
        else return false;
    }

    awaitInitialReplication(): Promise<true> {
        return this.initialReplicationComplete$.pipe(
            filter(v => v === true),
            first()
        ).toPromise();
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
            if (retryOnFail && !willRetry && this._subjects.initialReplicationComplete['_value'] === false) {
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
     * @return true if sucessfull
     */
    async runPull(): Promise<boolean> {
        // console.log('RxGraphQLReplicationState.runPull(): start');
        if (this.isStopped()) return Promise.resolve(false);

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
                    const err: any = new Error('unknown errors occured - see innerErrors for more details');
                    err.innerErrors = result.errors;
                    throw err;
                }
            }
        } catch (err) {
            this._subjects.error.next(err);
            return false;
        }

        // this assumes that there will be always only one property in the response
        // is this correct?
        const data: any[] = result.data[Object.keys(result.data)[0]];
        const modified: any[] = (await Promise.all(data
            .map(async (doc: any) => await (this.pull as any).modifier(doc))
        )).filter(doc => !!doc);

        /**
         * Run schema validation in dev-mode
         */
        if (overwritable.isDevMode()) {
            try {
                modified.forEach((doc: any) => {
                    const withoutDeleteFlag = Object.assign({}, doc);
                    delete withoutDeleteFlag[this.deletedFlag];
                    delete withoutDeleteFlag._revisions;
                    this.collection.schema.validate(withoutDeleteFlag);
                });
            } catch (err) {
                this._subjects.error.next(err);
                return false;
            }
        }

        const docIds = modified.map((doc: any) => doc[this.collection.schema.primaryPath]);
        const docsWithRevisions = await getDocsWithRevisionsFromPouch(
            this.collection,
            docIds
        );
        await this.handleDocumentsFromRemote(modified, docsWithRevisions as any);
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

            // we have more docs, re-run
            await this.runPull();
        }

        return true;
    }

    /**
     * @return true if successfull, false if not
     */
    async runPush(): Promise<boolean> {
        // console.log('RxGraphQLReplicationState.runPush(): start');

        const changes = await getChangesSinceLastPushSequence(
            this.collection,
            this.endpointHash,
            this.lastPulledRevField,
            this.push.batchSize,
            this.syncRevisions
        );

        const changesWithDocs: any = (await Promise.all(changes.results.map(async (change: any) => {
            let doc = change['doc'];

            doc[this.deletedFlag] = !!change['deleted'];
            delete doc._deleted;
            delete doc._attachments;
            delete doc[this.lastPulledRevField];

            if (!this.syncRevisions) {
                delete doc._rev;
            }

            doc = await (this.push as any).modifier(doc);
            if (!doc) {
                return null;
            }

            const seq = change.seq;
            return {
                doc,
                seq
            };
        }))).filter(doc => doc);

        let lastSuccessfullChange = null;
        try {
            /**
             * we cannot run all queries parallel
             * because then we would not know
             * where to start again on errors
             * so we run through the docs in series
             */
            for (let i = 0; i < changesWithDocs.length; i++) {
                const changeWithDoc = changesWithDocs[i];
                const pushObj = await this.push.queryBuilder(changeWithDoc.doc);
                const result = await this.client.query(pushObj.query, pushObj.variables);
                if (result.errors) {
                    if (typeof result.errors === 'string') {
                        throw new Error(result.errors);
                    } else {
                        const err: any = new Error('unknown errors occured - see innerErrors for more details');
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
                    lastSuccessfullChange.seq
                );
            }
            this._subjects.error.next(err);
            return false;
        }

        // all docs where successfull, so we use the seq of the changes-fetch
        await setLastPushSequence(
            this.collection,
            this.endpointHash,
            changes.last_seq
        );

        if (changes.results.length === 0) {
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

    async handleDocumentsFromRemote(docs: any[], docsWithRevisions: any[]) {
        const toPouchDocs = [];
        for (const doc of docs) {
            const deletedValue = doc[this.deletedFlag];
            const toPouch = this.collection._handleToPouch(doc);
            toPouch._deleted = deletedValue;
            delete toPouch[this.deletedFlag];

            if (!this.syncRevisions) {
                const primaryValue = toPouch._id;

                const pouchState = docsWithRevisions[primaryValue];
                let newRevision = createRevisionForPulledDocument(
                    this.endpointHash,
                    toPouch
                );
                if (pouchState) {
                    const newRevisionHeight = pouchState.revisions.start + 1;
                    const revisionId = newRevision;
                    newRevision = newRevisionHeight + '-' + newRevision;
                    toPouch._revisions = {
                        start: newRevisionHeight,
                        ids: pouchState.revisions.ids
                    };
                    toPouch._revisions.ids.unshift(revisionId);
                } else {
                    newRevision = '1-' + newRevision;
                }

                toPouch._rev = newRevision;
            } else {
                toPouch[this.lastPulledRevField] = toPouch._rev;
            }

            toPouchDocs.push({
                doc: toPouch,
                deletedValue
            });
        }
        const startTime = now();
        await this.collection.pouch.bulkDocs(
            toPouchDocs.map(tpd => tpd.doc), {
            new_edits: false
        });
        const endTime = now();

        /**
         * because bulkDocs with new_edits: false
         * does not stream changes to the pouchdb,
         * we create the event and emit it,
         * so other instances get informed about it
         */
        for (const tpd of toPouchDocs) {
            const originalDoc = flatClone(tpd.doc);

            if (tpd.deletedValue) {
                originalDoc._deleted = tpd.deletedValue;
            } else {
                delete originalDoc._deleted;
            }
            delete originalDoc[this.deletedFlag];
            delete originalDoc._revisions;

            const cE = changeEventfromPouchChange(
                originalDoc,
                this.collection,
                startTime,
                endTime
            );
            this.collection.$emit(cE);
        }
    }

    cancel(): Promise<any> {
        if (this.isStopped()) return Promise.resolve(false);
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
        lastPulledRevField = 'last_pulled_rev',
        live = false,
        liveInterval = 1000 * 10, // in ms
        retryTime = 1000 * 5, // in ms
        autoStart = true, // if this is false, the replication does nothing at start
        syncRevisions = false,
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

    // ensure the collection is listening to plain-pouchdb writes
    collection.watchForChanges();

    const replicationState = new RxGraphQLReplicationState(
        collection,
        url,
        headers,
        pull,
        push,
        deletedFlag,
        lastPulledRevField,
        live,
        liveInterval,
        retryTime,
        syncRevisions
    );

    if (!autoStart) return replicationState;

    // run internal so .sync() does not have to be async
    const waitTillRun: any = (
        waitForLeadership &&
        this.database.multiInstance // do not await leadership if not multiInstance
    ) ? this.database.waitForLeadership() : promiseWait(0);
    waitTillRun.then(() => {

        // trigger run once
        replicationState.run();

        // start sync-interval
        if (replicationState.live) {

            if (pull) {
                (async () => {
                    while (!replicationState.isStopped()) {
                        await promiseWait(replicationState.liveInterval);
                        if (replicationState.isStopped()) return;
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
                 * we have to use the rxdb changestream
                 * because the pouchdb.changes stream sometimes
                 * does not emit events or stucks
                 */
                const changeEventsSub = collection.$.subscribe(changeEvent => {
                    if (replicationState.isStopped()) return;
                    const rev = changeEvent.documentData._rev;
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
