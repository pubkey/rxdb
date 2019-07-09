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
    first,
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
        retryTime
    ) {
        this.collection = collection;
        this.client = client;
        this.endpointHash = endpointHash;
        this.deletedFlag = deletedFlag;
        this.queryBuilder = queryBuilder; // function
        this.fromRemoteModifier = fromRemoteModifier; // function
        this.live = live;
        this.retryTime = retryTime;
        this._subs = [];
        this._runningPromise = Promise.resolve();
        this._subjects = {
            recieved: new Subject(), // all documents that are recieved from the endpoint
            send: new Subject(), // all documents that are send to the endpoint
            error: new Subject(), // all errors that are revieced from the endpoint, emits new Error() objects
            complete: new BehaviorSubject(false), // true when a non-live replication has finished
            canceled: new BehaviorSubject(false), // true when the replication was canceled
            active: new BehaviorSubject(false) // true when something is running, false when not
        };

        // create getters
        Object.keys(this._subjects).forEach(key => {
            Object.defineProperty(this, key + '$', {
                get: function () {
                    return this._subjects[key].asObservable();
                }
            });
        });
    }

    isStopped() {
        return this._subjects.complete._value || this._subjects.canceled._value;
    }

    awaitCompletion() {
        return this.complete$.pipe(
            filter(v => v === true),
            first()
        ).toPromise();
    }


    // ensures this._run() does not run in parallel
    async run() {
        if (this.isStopped()) return;
        this._runningPromise = this._runningPromise.then(async () => {
            this._subjects.active.next(true);
            this._run();
            this._subjects.active.next(false);
        });
    }

    async _run() {
        const latestDocument = await getLatestDocument(this.collection, this.endpointHash);
        const latestDocumentData = latestDocument ? latestDocument.doc : null;
        const query = this.queryBuilder(latestDocumentData);

        let result;
        try {
            result = await this.client.query(query);
        } catch (err) {
            this._subjects.error.next(err);
            setTimeout(() => this.run(), this.retryTime);
            // TODO retry after some time
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
                this._subjects.complete.next(true);
            }
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
        toPouch._deleted = deletedValue;
        const primaryValue = toPouch._id;

        // TODO use db.allDocs with option.keys
        const pouchState = await getDocFromPouchOrNull(
            this.collection,
            primaryValue
        );

        if (pouchState) {
            if (pouchState.attachments) toPouch.attachments = pouchState.attachments;
            toPouch._rev = pouchState._rev;
        }

        //console.log('toPouch');
        //console.dir(doc);
        await this.collection.pouch.put(toPouch);
        toPouch[this.deletedFlag] = deletedValue;
        //console.log('toPouch DONE');
        //console.dir(doc);
    }

    cancel() {
        // TODO
        this._subjects.canceled.next(true);
    }
}


export function getDocFromPouchOrNull(collection, id) {
    return collection.pouch.get(id)
        .then(docData => {
            console.log('docData:');
            console.dir(docData);
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
    retryTime = 1000 * 5 // in seconds
}) {
    const collection = this;

    const endpointHash = hash(endpoint);
    const client = graphQlClient({
        url: endpoint,
        headers
    });

    console.dir(client);

    const replicationState = new RxGraphQlReplicationState(
        collection,
        client,
        endpointHash,
        deletedFlag,
        queryBuilder,
        fromRemoteModifier,
        live,
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