/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */

import PouchReplicationPlugin from 'pouchdb-replication';
import {
    BehaviorSubject,
    Subject,
    fromEvent,
    Subscription,
    Observable
} from 'rxjs';
import { skipUntil, filter, first } from 'rxjs/operators';

import {
    promiseWait,
    flatClone
} from '../util';
import {
    addRxPlugin
} from '../core';
import {
    newRxError
} from '../rx-error';
import {
    pouchReplicationFunction,
    isInstanceOf as isInstanceOfPouchDB
} from '../pouch-db';

import {
    isInstanceOf as isRxCollection
} from '../rx-collection';
import type {
    RxQuery,
    RxCollection,
    PouchSyncHandler,
    PouchReplicationOptions,
    RxPlugin
} from '../types';
import { RxDBWatchForChangesPlugin } from './watch-for-changes';

// add pouchdb-replication-plugin
addRxPlugin(PouchReplicationPlugin);

// add the watch-for-changes-plugin
addRxPlugin(RxDBWatchForChangesPlugin);

const INTERNAL_POUCHDBS = new WeakSet();


export interface SyncOptions {
    remote: string | any;
    waitForLeadership?: boolean;
    direction?: {
        push?: boolean,
        pull?: boolean
    };
    // for options see https://pouchdb.com/api.html#replication
    options?: PouchReplicationOptions;
    query?: RxQuery;
}
export class RxReplicationStateBase {
    public _subs: Subscription[] = [];

    // can be used for debuging or custom event-handling
    // will be set some time after sync() is called
    public _pouchEventEmitterObject?: PouchSyncHandler | null;
    public _subjects = {
        change: new Subject(),
        docs: new Subject(),
        denied: new Subject(),
        active: new BehaviorSubject(false),
        complete: new BehaviorSubject(false),
        alive: new BehaviorSubject(false),
        error: new Subject(),
    };

    constructor(
        public collection: RxCollection,
        private syncOptions: SyncOptions
    ) {
        // create getters
        Object.keys(this._subjects).forEach(key => {
            Object.defineProperty(this, key + '$', {
                get: function () {
                    return this._subjects[key].asObservable();
                }
            });
        });
    }

    awaitInitialReplication(): Promise<void> {
        if (this.syncOptions.options && this.syncOptions.options.live) {
            throw newRxError('RC4', {
                database: this.collection.database.name,
                collection: this.collection.name
            });
        }
        if (this.collection.database.multiInstance && this.syncOptions.waitForLeadership) {
            throw newRxError('RC5', {
                database: this.collection.database.name,
                collection: this.collection.name
            });
        }

        const that: RxReplicationState = this as any;
        return that.complete$.pipe(
            filter(x => !!x),
            first()
        ).toPromise();
    }

    cancel() {
        if (this._pouchEventEmitterObject)
            this._pouchEventEmitterObject.cancel();
        this._subs.forEach(sub => sub.unsubscribe());
    }
}

export type RxReplicationState = RxReplicationStateBase & {
    change$: Observable<any>;
    docs$: Observable<any>;
    denied$: Observable<any>;
    active$: Observable<any>;
    alive$: Observable<boolean>;
    complete$: Observable<any>;
    error$: Observable<any>;
};

export function setPouchEventEmitter(
    rxRepState: RxReplicationState,
    evEmitter: PouchSyncHandler
) {
    if (rxRepState._pouchEventEmitterObject)
        throw newRxError('RC1');
    rxRepState._pouchEventEmitterObject = evEmitter;

    // change
    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'change')
            .subscribe(ev => rxRepState._subjects.change.next(ev))
    );

    // denied
    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'denied')
            .subscribe(ev => rxRepState._subjects.denied.next(ev))
    );

    // docs
    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'change')
            .subscribe(ev => {
                if (
                    rxRepState._subjects.docs.observers.length === 0 ||
                    (ev as any).direction !== 'pull'
                ) return;

                (ev as any).change.docs
                    .filter((doc: any) => doc.language !== 'query') // remove internal docs
                    .map((doc: any) => rxRepState.collection._handleFromPouch(doc)) // do primary-swap and keycompression
                    .forEach((doc: any) => rxRepState._subjects.docs.next(doc));
            }));

    // error
    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'error')
            .subscribe(ev => rxRepState._subjects.error.next(ev))
    );

    // active
    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'active')
            .subscribe(() => rxRepState._subjects.active.next(true))
    );
    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'paused')
            .subscribe(() => rxRepState._subjects.active.next(false))
    );

    // complete
    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'complete')
            .subscribe((info: any) => {
                /**
                 * when complete fires, it might be that not all changeEvents
                 * have passed throught, because of the delay of .wachtForChanges()
                 * Therefore we have to first ensure that all previous changeEvents have been handled
                 */
                const unhandledEvents = Array.from(rxRepState.collection._watchForChangesUnhandled);
                Promise.all(unhandledEvents).then(() => rxRepState._subjects.complete.next(info));
            })
    );


    function getIsAlive(emitter: any): Promise<boolean> {
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
            return promiseWait(15).then(() => getIsAlive(emitter));
        }

        const isAlive = state !== 'stopped';
        return Promise.resolve(isAlive);
    }

    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'paused')
            .pipe(
                skipUntil(fromEvent(evEmitter as any, 'active'))
            ).subscribe(() => {
                getIsAlive(rxRepState._pouchEventEmitterObject)
                    .then(isAlive => rxRepState._subjects.alive.next(isAlive));
            })
    );
}

export function createRxReplicationState(
    collection: RxCollection,
    syncOptions: SyncOptions
): RxReplicationState {
    return new RxReplicationStateBase(
        collection,
        syncOptions
    ) as RxReplicationState;
}

export function sync(
    this: RxCollection,
    {
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
    }: SyncOptions) {
    const useOptions: PouchReplicationOptions & { selector: any } = flatClone(options) as any;

    // prevent #641 by not allowing internal pouchdbs as remote
    if (
        isInstanceOfPouchDB(remote) &&
        INTERNAL_POUCHDBS.has(remote)
    ) {
        throw newRxError('RC3', {
            database: this.database.name,
            collection: this.name
        });
    }

    // if remote is RxCollection, get internal pouchdb
    if (isRxCollection(remote)) {
        remote.watchForChanges();
        remote = remote.pouch;
    }

    if (query && this !== query.collection) {
        throw newRxError('RC2', {
            query
        });
    }

    const syncFun = pouchReplicationFunction(this.pouch, direction);
    if (query) useOptions.selector = (query as any).keyCompress().selector;

    const repState: any = createRxReplicationState(
        this,
        {
            remote,
            waitForLeadership,
            direction,
            options,
            query
        }
    );

    // run internal so .sync() does not have to be async
    const waitTillRun = (
        waitForLeadership &&
        this.database.multiInstance // do not await leadership if not multiInstance
    ) ? this.database.waitForLeadership() : promiseWait(0);
    (waitTillRun as any).then(() => {
        const pouchSync = syncFun(remote, useOptions);
        this.watchForChanges();
        setPouchEventEmitter(repState, pouchSync);
        this._repStates.push(repState);
    });

    return repState;
}

export const rxdb = true;
export const prototypes = {
    RxCollection: (proto: any) => {
        proto.sync = sync;
    }
};

export const hooks = {
    createRxCollection: function (
        collection: RxCollection
    ) {
        INTERNAL_POUCHDBS.add(collection.pouch);
    }
};

export const RxDBReplicationPlugin: RxPlugin = {
    name: 'replication',
    rxdb,
    prototypes,
    hooks
};
