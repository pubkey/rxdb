/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */

import PouchReplicationPlugin from 'pouchdb-replication';
import {
    BehaviorSubject,
    Subject,
    fromEvent
} from 'rxjs';
import { skipUntil } from 'rxjs/operators';

import {
    promiseWait,
    clone,
    pouchReplicationFunction
} from '../util';
import Core from '../core';
import RxCollection from '../rx-collection';
import RxError from '../rx-error';
import PouchDB from '../pouch-db';
import RxDBWatchForChangesPlugin from './watch-for-changes';

// add pouchdb-replication-plugin
Core.plugin(PouchReplicationPlugin);

// add the watch-for-changes-plugin
Core.plugin(RxDBWatchForChangesPlugin);

const INTERNAL_POUCHDBS = new WeakSet();

export class RxReplicationState {
    constructor(collection) {
        this._subs = [];
        this.collection = collection;
        this._pouchEventEmitterObject = null;
        this._subjects = {
            change: new Subject(),
            docs: new Subject(),
            denied: new Subject(),
            active: new BehaviorSubject(false),
            complete: new BehaviorSubject(false),
            alive: new BehaviorSubject(false),
            error: new Subject(),
        };

        // create getters
        Object.keys(this._subjects).forEach(key => {
            Object.defineProperty(this, key + '$', {
                get: function() {
                    return this._subjects[key].asObservable();
                }
            });
        });
    }

    cancel() {
        if (this._pouchEventEmitterObject)
            this._pouchEventEmitterObject.cancel();
        this._subs.forEach(sub => sub.unsubscribe());
    }
}

function setPouchEventEmitter(rxRepState, evEmitter) {
    if (rxRepState._pouchEventEmitterObject)
        throw RxError.newRxError('RC1');
    rxRepState._pouchEventEmitterObject = evEmitter;

    // change
    rxRepState._subs.push(
        fromEvent(evEmitter, 'change')
        .subscribe(ev => rxRepState._subjects.change.next(ev))
    );

    // denied
    rxRepState._subs.push(
        fromEvent(evEmitter, 'denied')
        .subscribe(ev => rxRepState._subjects.denied.next(ev))
    );

    // docs
    rxRepState._subs.push(
        fromEvent(evEmitter, 'change')
        .subscribe(ev => {
            if (
                rxRepState._subjects.docs.observers.length === 0 ||
                ev.direction !== 'pull'
            ) return;

            ev.change.docs
                .filter(doc => doc.language !== 'query') // remove internal docs
                .map(doc => rxRepState.collection._handleFromPouch(doc)) // do primary-swap and keycompression
                .forEach(doc => rxRepState._subjects.docs.next(doc));
        }));

    // error
    rxRepState._subs.push(
        fromEvent(evEmitter, 'error')
        .subscribe(ev => rxRepState._subjects.error.next(ev))
    );

    // active
    rxRepState._subs.push(
        fromEvent(evEmitter, 'active')
        .subscribe(() => rxRepState._subjects.active.next(true))
    );
    rxRepState._subs.push(
        fromEvent(evEmitter, 'paused')
        .subscribe(() => rxRepState._subjects.active.next(false))
    );

    // complete
    rxRepState._subs.push(
        fromEvent(evEmitter, 'complete')
        .subscribe(info => {

            /**
             * when complete fires, it might be that not all changeEvents
             * have passed throught, because of the delay of .wachtForChanges()
             * Therefore we have to first ensure that all previous changeEvents have been handled
             */
            const unhandledEvents = Array.from(rxRepState.collection._watchForChangesUnhandled);

            Promise.all(unhandledEvents).then(() => rxRepState._subjects.complete.next(info));
        })
    );

    // alive
    async function getIsAlive(emitter) {
        // "state" will live in emitter.state if single direction replication
        // or in emitter.push.state & emitter.pull.state when syncing for both
        let state = emitter.state;
        if (!state) {
            state = [emitter.pull.state, emitter.push.state]
                .reduce((acc, val) => {
                    if (acc === 'active' || val === 'active') return 'active';
                    return acc === 'stopped' ? acc : val;
                }, '');
        }

        // If it's active, we can't determine whether the connection is active
        // or not yet
        if (state === 'active') {
            await new Promise(resolve => setTimeout(resolve, 15));
            return getIsAlive(emitter);
        }

        const isAlive = state !== 'stopped';
        return isAlive;
    }
    rxRepState._subs.push(
        fromEvent(evEmitter, 'paused')
            .pipe(
                skipUntil(fromEvent(evEmitter, 'active'))
            ).subscribe(async () => {
                const isAlive = await getIsAlive(rxRepState._pouchEventEmitterObject);
                rxRepState._subjects.alive.next(isAlive);
            })
    );
}

export function createRxReplicationState(collection) {
    return new RxReplicationState(collection);
}

export function sync({
    remote,
    waitForLeadership = true,
    direction = {
        pull: true,
        push: true
    },
    options = {
        live: true,
        retry: true
    },
    query
}) {
    options = clone(options);

    // prevent #641 by not allowing internal pouchdbs as remote
    if (
        PouchDB.isInstanceOf(remote) &&
        INTERNAL_POUCHDBS.has(remote)
    ) {
        throw RxError.newRxError('RC3', {
            database: this.database.name,
            collection: this.name
        });
    }

    // if remote is RxCollection, get internal pouchdb
    if (RxCollection.isInstanceOf(remote)) {
        remote.watchForChanges();
        remote = remote.pouch;
    }

    if (query && this !== query.collection) {
        throw RxError.newRxError('RC2', {
            query
        });
    }

    const syncFun = pouchReplicationFunction(this.pouch, direction);
    if (query) options.selector = query.keyCompress().selector;

    const repState = createRxReplicationState(this);

    // run internal so .sync() does not have to be async
    const waitTillRun = waitForLeadership ? this.database.waitForLeadership() : promiseWait(0);
    waitTillRun.then(() => {
        const pouchSync = syncFun(remote, options);
        this.watchForChanges();
        setPouchEventEmitter(repState, pouchSync);
        this._repStates.push(repState);
    });

    return repState;
}

export const rxdb = true;
export const prototypes = {
    RxCollection: (proto) => {
        proto.sync = sync;
    }
};

export const overwritable = {};

export const hooks = {
    createRxCollection: function(collection) {
        INTERNAL_POUCHDBS.add(collection.pouch);
    }
};

export default {
    rxdb,
    prototypes,
    overwritable,
    hooks,
    sync
};
