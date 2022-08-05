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
    Observable,
    firstValueFrom
} from 'rxjs';
import {
    skipUntil,
    filter,
    first,
    mergeMap
} from 'rxjs/operators';

import {
    promiseWait,
    flatClone,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_TRUE
} from '../util';
import {
    newRxError
} from '../rx-error';
import {
    isInstanceOf as isInstanceOfPouchDB,
    addPouchPlugin,
    getPouchDBOfRxCollection
} from '../plugins/pouchdb';

import {
    isRxCollection
} from '../rx-collection';
import type {
    RxCollection,
    PouchSyncHandler,
    PouchReplicationOptions,
    RxPlugin,
    SyncOptions,
    PouchDBInstance
} from '../types';

/**
 * Contains all pouchdb instances that
 * are used inside of RxDB by collections or databases.
 * Used to ensure the remote of a replication cannot be an internal pouchdb.
 */
const INTERNAL_POUCHDBS = new WeakSet();

export class RxCouchDBReplicationStateBase {
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

    public canceled: boolean = false;

    constructor(
        public readonly collection: RxCollection,
        public readonly syncOptions: SyncOptions
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

        const that: RxCouchDBReplicationState = this as any;
        return firstValueFrom(
            that.complete$.pipe(
                filter(x => !!x)
            )
        );
    }

    /**
     * Returns false when the replication has already been canceled
     */
    cancel(): Promise<boolean> {
        if (this.canceled) {
            return PROMISE_RESOLVE_FALSE;
        }
        this.canceled = true;
        if (this._pouchEventEmitterObject) {
            this._pouchEventEmitterObject.cancel();
        }
        this._subs.forEach(sub => sub.unsubscribe());

        return PROMISE_RESOLVE_TRUE;
    }
}

export type RxCouchDBReplicationState = RxCouchDBReplicationStateBase & {
    change$: Observable<any>;
    docs$: Observable<any>;
    denied$: Observable<any>;
    active$: Observable<any>;
    alive$: Observable<boolean>;
    complete$: Observable<any>;
    error$: Observable<any>;
};

export function setPouchEventEmitter(
    rxRepState: RxCouchDBReplicationState,
    evEmitter: PouchSyncHandler
) {
    if (rxRepState._pouchEventEmitterObject) {
        throw newRxError('RC1');
    }
    rxRepState._pouchEventEmitterObject = evEmitter;

    // change
    rxRepState._subs.push(
        fromEvent(evEmitter as any, 'change')
            .subscribe(ev => {
                rxRepState._subjects.change.next(ev);
            })
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
                    // do primary-swap and keycompression
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
            .subscribe(async (info: any) => {
                /**
                 * when complete fires, it might be that not all changeEvents
                 * have passed throught, because of the delay of .wachtForChanges()
                 * Therefore we have to first ensure that all previous changeEvents have been handled
                 */
                await promiseWait(100);
                rxRepState._subjects.complete.next(info);
            })
    );
    // auto-cancel one-time replications on complelete to not cause memory leak
    if (
        !rxRepState.syncOptions.options ||
        !rxRepState.syncOptions.options.live
    ) {
        rxRepState._subs.push(
            rxRepState.complete$.pipe(
                filter(x => !!x),
                first(),
                mergeMap(() => {
                    return rxRepState.collection.database
                        .requestIdlePromise()
                        .then(() => rxRepState.cancel());
                })
            ).subscribe()
        );
    }

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

export function createRxCouchDBReplicationState(
    collection: RxCollection,
    syncOptions: SyncOptions
): RxCouchDBReplicationState {
    return new RxCouchDBReplicationStateBase(
        collection,
        syncOptions
    ) as RxCouchDBReplicationState;
}

/**
 * get the correct function-name for pouchdb-replication
 */
export function pouchReplicationFunction(
    pouch: PouchDBInstance,
    {
        pull = true,
        push = true
    }
): any {
    if (pull && push) {
        return pouch.sync.bind(pouch);
    }
    if (!pull && push) {
        return (pouch.replicate as any).to.bind(pouch);
    }
    if (pull && !push) {
        return (pouch.replicate as any).from.bind(pouch);
    }
    if (!pull && !push) {
        throw newRxError('UT3', {
            pull,
            push
        });
    }
}

export function syncCouchDB(
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
        remote = (remote as RxCollection).storageInstance.internals.pouch;
    }

    if (query && this !== query.collection) {
        throw newRxError('RC2', {
            query
        });
    }

    const pouch = getPouchDBOfRxCollection(this);
    const syncFun = pouchReplicationFunction(pouch, direction);
    if (query) {
        useOptions.selector = query.getPreparedQuery().selector;
    }

    const repState: any = createRxCouchDBReplicationState(
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
        if (this.destroyed || repState.canceled) {
            return;
        }
        const pouchSync = syncFun(remote, useOptions);
        setPouchEventEmitter(repState, pouchSync);

        this.onDestroy.push(() => repState.cancel());
    });

    return repState;
}



export const RxDBReplicationCouchDBPlugin: RxPlugin = {
    name: 'replication-couchdb',
    rxdb: true,
    init() {
        // add pouchdb-replication-plugin
        addPouchPlugin(PouchReplicationPlugin);
    },
    prototypes: {
        RxCollection: (proto: any) => {
            proto.syncCouchDB = syncCouchDB;
        }
    },
    hooks: {
        createRxCollection: {
            after: args => {
                const collection = args.collection;
                const pouch: PouchDBInstance | undefined = collection.storageInstance.internals.pouch;
                if (pouch) {
                    INTERNAL_POUCHDBS.add(collection.storageInstance.internals.pouch);
                }
            }
        }
    }
};
