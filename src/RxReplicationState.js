/**
 * This is the replication-state which you get back from calling RxCollection.sync()
 * It wraps the object of events which gets back from pouchdb.sync() or pouchdb.replicate()
 * Reason:
 * 1. Get rxjs-observables instead of event-emitters
 * 2. Create RxChangeEvents from the pull-changes and emit them to the local change-stream
 */

import * as util from './util';

export class RxReplicationState {
    constructor(collection) {
        this._subs = [];
        this.collection = collection;
        this._pouchEventEmitterObject = null;
        this._subjects = {
            change: new util.Rx.Subject(),
            docs: new util.Rx.Subject(),
            active: new util.Rx.BehaviorSubject(false),
            complete: new util.Rx.BehaviorSubject(false),
            error: new util.Rx.Subject(),
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
            throw new Error('already added');
        this._pouchEventEmitterObject = evEmitter;

        // change
        this._subs.push(
            util.Rx.Observable
            .fromEvent(evEmitter, 'change')
            .subscribe(ev => this._subjects.change.next(ev))
        );

        // docs
        this._subs.push(
            util.Rx.Observable
            .fromEvent(evEmitter, 'change')
            .subscribe(ev => {
                if (
                    this._subjects.docs.observers.length === 0 ||
                    ev.direction !== 'pull'
                ) return;

                const docs = ev.change.docs
                    .filter(doc => doc.language !== 'query') // remove internal docs
                    .map(doc => this.collection._handleFromPouch(doc)) // do primary-swap and keycompression
                    .forEach(doc => this._subjects.docs.next(doc));
            }));

        // error
        this._subs.push(
            util.Rx.Observable
            .fromEvent(evEmitter, 'error')
            .subscribe(ev => this._subjects.error.next(ev))
        );

        // active
        this._subs.push(
            util.Rx.Observable
            .fromEvent(evEmitter, 'active')
            .subscribe(ev => this._subjects.active.next(true))
        );
        this._subs.push(
            util.Rx.Observable
            .fromEvent(evEmitter, 'paused')
            .subscribe(ev => this._subjects.active.next(false))
        );

        // complete
        this._subs.push(
            util.Rx.Observable
            .fromEvent(evEmitter, 'complete')
            .subscribe(info => this._subjects.complete.next(info))
        );

    }

    async cancel() {
        if (this._pouchEventEmitterObject)
            this._pouchEventEmitterObject.cancel();
        this._subs.forEach(sub => sub.unsubscribe());
    }
}

export function create(collection) {
    return new RxReplicationState(collection);
}

export default {
    create
};
