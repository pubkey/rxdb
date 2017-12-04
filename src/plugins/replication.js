/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */

import clone from 'clone';
import PouchReplicationPlugin from 'pouchdb-replication';
import {
    Subject
} from 'rxjs/Subject';
import {
    BehaviorSubject
} from 'rxjs/BehaviorSubject';
import {
    fromEvent
} from 'rxjs/observable/fromEvent';
import {
    filter
} from 'rxjs/operators/filter';
import {
    map
} from 'rxjs/operators/map';
import {
    delay
} from 'rxjs/operators/delay';

import * as util from '../util';
import Core from '../core';
import RxCollection from '../rx-collection';
import RxChangeEvent from '../rx-change-event';
import RxError from '../rx-error';

// add pouchdb-replication-plugin
Core.plugin(PouchReplicationPlugin);

export class RxReplicationState {
    constructor(collection) {
        this._subs = [];
        this.collection = collection;
        this._pouchEventEmitterObject = null;
        this._subjects = {
            change: new Subject(),
            docs: new Subject(),
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
            .subscribe(info => this._subjects.complete.next(info))
        );
    }

    async cancel() {
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
 * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
 */
export function watchForChanges() {
    if (this.synced) return;

    /**
     * this will grap the changes and publish them to the rx-stream
     * this is to ensure that changes from 'synced' dbs will be published
     */
    const sendChanges = {};
    const pouch$ =
        fromEvent(
            this.pouch.changes({
                since: 'now',
                live: true,
                include_docs: true
            }),
            'change'
        )
        .pipe(
            filter(c => c.id.charAt(0) !== '_'),
            map(c => c.doc),
            filter(doc => !this._changeEventBuffer.buffer.map(cE => cE.data.v._rev).includes(doc._rev)),
            filter(doc => sendChanges[doc._rev] = 'YES'),
            delay(10),
            map(doc => {
                let ret = null;
                if (sendChanges[doc._rev] === 'YES') ret = doc;
                delete sendChanges[doc._rev];
                return ret;
            }),
            filter(doc => doc !== null)
        )
        .subscribe(doc => {
            this.$emit(RxChangeEvent.fromPouchChange(doc, this));
        });

    this._subs.push(pouch$);

    const ob2 = this.$
        .pipe(
            map(cE => cE.data.v),
            map(doc => {
                if (doc && sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
            })
        )
        .subscribe();
    this._subs.push(ob2);

    this.synced = true;
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
    // if remote is RxCollection, get internal pouchdb
    if (RxCollection.isInstanceOf(remote))
        remote = remote.pouch;

    if (query && this !== query.collection) {
        throw RxError.newRxError('RC2', {
            query
        });
    }

    const syncFun = util.pouchReplicationFunction(this.pouch, direction);
    if (query) options.selector = query.keyCompress().selector;

    const repState = createRxReplicationState(this);

    // run internal so .sync() does not have to be async
    (async () => {
        if (waitForLeadership)
            await this.database.waitForLeadership();
        else // ensure next-tick
            await util.promiseWait(0);
        const pouchSync = syncFun(remote, options);
        this.watchForChanges();
        repState.setPouchEventEmitter(pouchSync);
        this._repStates.push(repState);
    })();
    return repState;
};

export const rxdb = true;
export const prototypes = {
    RxCollection: (proto) => {
        proto.watchForChanges = watchForChanges;
        proto.sync = sync;
    }
};

export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable,
    watchForChanges,
    sync
};
