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
import {
    map,
} from 'rxjs/operators';

import {
    promiseWait,
    clone,
    pouchReplicationFunction,
    nextTick
} from '../util';
import Core from '../core';
import RxCollection from '../rx-collection';
import RxChangeEvent from '../rx-change-event';
import RxError from '../rx-error';
import PouchDB from '../pouch-db';

// add pouchdb-replication-plugin
Core.plugin(PouchReplicationPlugin);

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
    setPouchEventEmitter(evEmitter) {
        if (this._pouchEventEmitterObject)
            throw RxError.newRxError('RC1');
        this._pouchEventEmitterObject = evEmitter;

        // change
        this._subs.push(
            fromEvent(evEmitter, 'change')
            .subscribe(ev => this._subjects.change.next(ev))
        );

        // denied
        this._subs.push(
            fromEvent(evEmitter, 'denied')
            .subscribe(ev => this._subjects.denied.next(ev))
        );

        // docs
        this._subs.push(
            fromEvent(evEmitter, 'change')
            .subscribe(ev => {
                if (
                    this._subjects.docs.observers.length === 0 ||
                    ev.direction !== 'pull'
                ) return;

                ev.change.docs
                    .filter(doc => doc.language !== 'query') // remove internal docs
                    .map(doc => this.collection._handleFromPouch(doc)) // do primary-swap and keycompression
                    .forEach(doc => this._subjects.docs.next(doc));
            }));

        // error
        this._subs.push(
            fromEvent(evEmitter, 'error')
            .subscribe(ev => this._subjects.error.next(ev))
        );

        // active
        this._subs.push(
            fromEvent(evEmitter, 'active')
            .subscribe(() => this._subjects.active.next(true))
        );
        this._subs.push(
            fromEvent(evEmitter, 'paused')
            .subscribe(() => this._subjects.active.next(false))
        );

        // complete
        this._subs.push(
            fromEvent(evEmitter, 'complete')
            .subscribe(info => {

                /**
                 * when complete fires, it might be that not all changeEvents
                 * have passed throught, because of the delay of .wachtForChanges()
                 * Therefore we have to first ensure that all previous changeEvents have been handled
                 */
                const unhandledEvents = Array.from(this.collection._watchForChangesUnhandled);

                Promise.all(unhandledEvents).then(() => this._subjects.complete.next(info));
            })
        );
    }

    cancel() {
        if (this._pouchEventEmitterObject)
            this._pouchEventEmitterObject.cancel();
        this._subs.forEach(sub => sub.unsubscribe());
    }
}

export function createRxReplicationState(collection) {
    return new RxReplicationState(collection);
}


/**
 * waits for external changes to the database
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 */
export function watchForChanges() {
    // do not call twice on same collection
    if (this.synced) return;
    this.synced = true;

    this._watchForChangesUnhandled = new Set();

    /**
     * this will grap the changes and publish them to the rx-stream
     * this is to ensure that changes from 'synced' dbs will be published
     */
    const pouch$ =
        fromEvent(
            this.pouch.changes({
                since: 'now',
                live: true,
                include_docs: true
            }),
            'change'
        ).pipe(
            map(ar => ar[0]), // rxjs6.x fires an array for whatever reason
        ).subscribe(change => {
            const resPromise = _handleSingleChange(this, change);

            // add and remove to the Set so RxReplicationState.complete$ can know when all events where handled
            this._watchForChangesUnhandled.add(resPromise);
            resPromise.then(() => {
                this._watchForChangesUnhandled.delete(resPromise);
            });
        });
    this._subs.push(pouch$);
}

/**
 * handles a single change-event
 * and ensures that it is not already handled
 * @param {RxCollection} collection
 * @param {*} change
 * @return {Promise<boolean>}
 */
function _handleSingleChange(collection, change) {
    if (change.id.charAt(0) === '_') return Promise.resolve(false); // do not handle changes of internal docs

    // wait 2 ticks and 20 ms to give the internal event-handling time to run
    return promiseWait(20)
        .then(() => nextTick())
        .then(() => nextTick())
        .then(() => {
            const docData = change.doc;
            // already handled by internal event-stream
            if (collection._changeEventBuffer.hasChangeWithRevision(docData._rev)) return Promise.resolve(false);

            const cE = RxChangeEvent.fromPouchChange(docData, collection);

            collection.$emit(cE);
            return true;
        });
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
        repState.setPouchEventEmitter(pouchSync);
        this._repStates.push(repState);
    });

    return repState;
}

export const rxdb = true;
export const prototypes = {
    RxCollection: (proto) => {
        proto.watchForChanges = watchForChanges;
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
    watchForChanges,
    sync
};
