/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */

import {
    BehaviorSubject,
    Subject,
    fromEvent
} from 'rxjs';
import {
    skipUntil,
    tap,
    first,
    map,
    filter
} from 'rxjs/operators';
import graphQlClient from 'graphql-client';


import {
    promiseWait,
    clone,
    pouchReplicationFunction
} from '../util';

import Core from '../core';
import RxCollection from '../rx-collection';
import {
    newRxError
} from '../rx-error';
import {
    hash
} from '../util';
import RxDBWatchForChangesPlugin from './watch-for-changes';

/**
 * add the watch-for-changes-plugin
 * so pouchdb will emit events when something gets written to it
 */
Core.plugin(RxDBWatchForChangesPlugin);


export class RxGraphQlReplicationState {
    constructor(
        collection,
        client,
        endpointHash,
        deletedFlag,
        queryBuilder,
        fromRemoteModifier,
        live,
        liveInterval,
        retryTime,
    ) {
        this.collection = collection;
        this.client = client;
        this.endpointHash = endpointHash;
        this.deletedFlag = deletedFlag;
        this.queryBuilder = queryBuilder; // function
        this.fromRemoteModifier = fromRemoteModifier; // function
        this.live = live;
        this.liveInterval = liveInterval;
        this.retryTime = retryTime;
        this._subs = [];
        this._runningPromise = Promise.resolve();
        this._subjects = {
            recieved: new Subject(), // all documents that are recieved from the endpoint
            send: new Subject(), // all documents that are send to the endpoint
            error: new Subject(), // all errors that are revieced from the endpoint, emits new Error() objects
            canceled: new BehaviorSubject(false), // true when the replication was canceled
            active: new BehaviorSubject(false), // true when something is running, false when not
            initialReplicationComplete: new BehaviorSubject(false) // true the initial replication-cycle is over
        };

        this._prepare();
    }

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

        // start sync-interval
        if (this.live) {
            (async () => {
                while (!this.isStopped()) {
                    await promiseWait(this.liveInterval);
                    if (this.isStopped()) return;
                    console.log('run via interval once()');
                    await this.run();
                }
            })();
        }
    }

    isStopped() {
        if (!this.live && this._subjects.initialReplicationComplete._value) return true;
        if (this._subjects.canceled._value) return true;
        else return false;
    }

    awaitInitialReplication() {
        return this.initialReplicationComplete$.pipe(
            filter(v => v === true),
            first()
        ).toPromise();
    }


    // ensures this._run() does not run in parallel
    async run() {
        if (this.isStopped()) {
            console.log('RxGraphQlReplicationState.run(): exit because stopped');
            return;
        }
        this._runningPromise = this._runningPromise.then(async () => {
            this._subjects.active.next(true);
            await this._run();
            this._subjects.active.next(false);
        });
        return this._runningPromise;
    }

    async _run() {
        console.log('RxGraphQlReplicationState._run(): start');
        if (this.isStopped()) return;

        const latestDocument = await getLatestDocument(this.collection, this.endpointHash);
        const latestDocumentData = latestDocument ? latestDocument.doc : null;
        const query = this.queryBuilder(latestDocumentData);

        let result;
        try {
            result = await this.client.query(query);
            if (result.errors) {
                throw new Error(result.errors);
            }
        } catch (err) {
            this._subjects.error.next(err);
            setTimeout(() => this.run(), this.retryTime);
            return;
        }

        // this assumes that there will be always only one property in the response
        // is this correct?
        // console.log('result:');
        // console.dir(result);
        const data = result.data[Object.keys(result.data)[0]];

        const modified = data.map(doc => this.fromRemoteModifier(doc));

        await Promise.all(modified.map(doc => this.handleDocumentFromRemote(doc)));
        modified.map(doc => this._subjects.recieved.next(doc));

        if (modified.length === 0) {
            if (this.live) {
                console.log('no more docs, wait for ping');
            } else {
                console.log('RxGraphQlReplicationState._run(): no more docs and not live; complete = true');
                if (this._subjects.active._value === true) this._subjects.active.next(false);
            }
            this._subjects.initialReplicationComplete.next(true);
        } else {
            const newLatestDocument = modified[modified.length - 1];
            await setLatestDocument(
                this.collection,
                this.endpointHash,
                newLatestDocument
            );

            // we have more docs, re-run
            this.run();
        }
    }

    async runPush() {
        // TODO
    }

    async handleDocumentFromRemote(doc) {
        const deletedValue = doc[this.deletedFlag];
        const toPouch = this.collection._handleToPouch(doc);
        console.log('handleDocumentFromRemote(' + toPouch._id + ') start');
        toPouch._deleted = deletedValue;
        delete toPouch[this.deletedFlag];
        const primaryValue = toPouch._id;

        // TODO use db.allDocs with option.keys

        /*        console.log('primary value: ' + primaryValue);
                const pouchResult = await this.collection.pouch.allDocs({
                    include_docs: false,
                    keys: [primaryValue]
                });
                console.log('pouchResult:');
                console.log(JSON.stringify(pouchResult, null, 2));*/

        const pouchState = await getDocFromPouchOrNull(
            this.collection,
            primaryValue
        );

        if (pouchState) {
            if (pouchState.attachments) toPouch.attachments = pouchState.attachments;
            toPouch._rev = pouchState._rev;
        }

        // console.log('write toPouch:');
        // console.dir(toPouch);
        await this.collection.pouch.put(toPouch);
        toPouch[this.deletedFlag] = deletedValue;
        // console.log('toPouch DONE');

        await this.collection.$.pipe(
            tap(eV => eV.data),
            map(eV => eV.data.doc),
            filter(id => id === toPouch._id),
            first()
        ).toPromise();

        //console.dir(doc);
        console.log('handleDocumentFromRemote(' + toPouch._id + ') done');
    }

    cancel() {
        if (this.isStopped()) return;
        this._subjects.canceled.next(true);
        // TODO
    }
}


export function getDocFromPouchOrNull(collection, id) {
    return collection.pouch.get(id)
        .then(docData => {
            return docData;
        })
        .catch(() => null);
}

const LOCAL_PREFIX = '_local/';
const localDocId = endpointHash => LOCAL_PREFIX + 'rxdb-replication-graphql-latest-document-' + endpointHash;

export async function getLatestDocument(collection, endpointHash) {
    const got = await getDocFromPouchOrNull(collection, localDocId(endpointHash));
    return got;
}

export async function setLatestDocument(collection, endpointHash, doc) {
    const id = localDocId(endpointHash);
    const before = await getLatestDocument(collection, endpointHash);
    const data = {
        _id: id,
        doc
    };
    if (before) {
        data._rev = before._rev;
    }
    return collection.pouch.put(data);
}

// does nothing
const DEFAULT_MODIFIER = d => d;

export function syncGraphQl({
    endpoint,
    headers = {},
    waitForLeadership = true,
    direction = {
        pull: true,
        push: true
    },
    live = false,
    deletedFlag = 'deleted',
    queryBuilder,
    fromRemoteModifier = DEFAULT_MODIFIER,
    toRemoteModifier = DEFAULT_MODIFIER,
    liveInterval = 1000 * 5, // in ms
    retryTime = 1000 * 5 // in ms
}) {
    const collection = this;

    // ensure the collection is listening to plain-pouchdb writes
    collection.watchForChanges();

    const endpointHash = hash(endpoint);
    const client = graphQlClient({
        url: endpoint,
        headers
    });

    const replicationState = new RxGraphQlReplicationState(
        collection,
        client,
        endpointHash,
        deletedFlag,
        queryBuilder,
        fromRemoteModifier,
        live,
        liveInterval,
        retryTime
    );

    // run internal so .sync() does not have to be async
    const waitTillRun = waitForLeadership ? this.database.waitForLeadership() : promiseWait(0);
    waitTillRun.then(() => {
        this.watchForChanges();
        replicationState.run();
    });

    return replicationState;
}

export const rxdb = true;
export const prototypes = {
    RxCollection: proto => {
        proto.syncGraphQl = syncGraphQl;
    }
};

export default {
    rxdb,
    prototypes
};