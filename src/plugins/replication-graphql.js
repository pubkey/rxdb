/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */

import {
    BehaviorSubject,
    Subject,
    fromEvent
} from 'rxjs';
import { skipUntil } from 'rxjs/operators';
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
import {
    LOCAL_PREFIX
} from './local-documents';
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
        fromRemoteModifier
    ) {
        this.collection = collection;
        this.endpointHash = endpointHash;
        this.queryBuilder = queryBuilder; // function
        this.fromRemoteModifier = fromRemoteModifier; // function
        this._subs = [];
        this._runningPromise = Promise.resolve();
        this._subjects = {
            recieved: new Subject(), // all documents that are recieved from the endpoint
            send: new Subject(), // all documents that are send to the endpoint
            error: new Subject(), // all errors that are revieced from the endpoint
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


    // ensures this._run() does not run in parallel
    async run() {
        this._runningPromise = this._runningPromise.then(() => this._run());
    }

    async _run() {
        const latestDocument = getLatestDocument(this.collection, this.endpointHash);
        const query = this.queryBuilder(latestDocument);
        const result = await this.client.query(query);

        // this assumes that there will be always only one property in the response
        // is this correct?
        const data = result.data[Object.keys(result.data)[0]];

        const modified = data.map(doc => this.fromRemoteModifier(doc));

        await Promise.all(modified.map(doc => this.handleDocumentFromRemote(doc)));

        if (modified.length === 0) {
            // no more docs, wait for ping
        } else {
            const newLatestDocument = modified[modified.length - 1];
            setLatestDocument(
                this.collection,
                this.endpointHash,
                newLatestDocument
            );

            // we have more docs, re-run
            this.run();
        }
    }

    cancel() {
        // TODO
        this._subjects.canceled.next(true);
    }
}

export async function getLatestDocument(collection, endpointHash) {
    const id = LOCAL_PREFIX + 'rxdb-replication-graphql-latest-document-' + endpointHash;
    return collection.pouch.get(id)
        .then(docData => {
            return docData.doc;
        })
        .catch(() => null);
}

export async function setLatestDocument(collection, endpointHash, doc) {
    const id = LOCAL_PREFIX + 'rxdb-replication-graphql-latest-document-' + endpointHash;
    const data = {
        _id: id,
        doc
    }
    return collection.pouch.put(data);
}

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
    fromRemoteModifier,
    toRemoteModifier
}) {
    const collection = this;

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
        fromRemoteModifier
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