import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */

import PouchReplicationPlugin from 'pouchdb-replication';
import { BehaviorSubject, Subject, fromEvent } from 'rxjs';
import { filter, map, delay } from 'rxjs/operators';

import { promiseWait, clone, pouchReplicationFunction } from '../util';
import Core from '../core';
import RxCollection from '../rx-collection';
import RxChangeEvent from '../rx-change-event';
import RxError from '../rx-error';
import PouchDB from '../pouch-db';

// add pouchdb-replication-plugin
Core.plugin(PouchReplicationPlugin);

var INTERNAL_POUCHDBS = new WeakSet();

export var RxReplicationState = function () {
    function RxReplicationState(collection) {
        var _this = this;

        _classCallCheck(this, RxReplicationState);

        this._subs = [];
        this.collection = collection;
        this._pouchEventEmitterObject = null;
        this._subjects = {
            change: new Subject(),
            docs: new Subject(),
            active: new BehaviorSubject(false),
            complete: new BehaviorSubject(false),
            error: new Subject()
        };

        // create getters
        Object.keys(this._subjects).forEach(function (key) {
            Object.defineProperty(_this, key + '$', {
                get: function get() {
                    return this._subjects[key].asObservable();
                }
            });
        });
    }

    RxReplicationState.prototype.setPouchEventEmitter = function setPouchEventEmitter(evEmitter) {
        var _this2 = this;

        if (this._pouchEventEmitterObject) throw RxError.newRxError('RC1');
        this._pouchEventEmitterObject = evEmitter;

        // change
        this._subs.push(fromEvent(evEmitter, 'change').subscribe(function (ev) {
            return _this2._subjects.change.next(ev);
        }));

        // docs
        this._subs.push(fromEvent(evEmitter, 'change').subscribe(function (ev) {
            if (_this2._subjects.docs.observers.length === 0 || ev.direction !== 'pull') return;

            ev.change.docs.filter(function (doc) {
                return doc.language !== 'query';
            }) // remove internal docs
            .map(function (doc) {
                return _this2.collection._handleFromPouch(doc);
            }) // do primary-swap and keycompression
            .forEach(function (doc) {
                return _this2._subjects.docs.next(doc);
            });
        }));

        // error
        this._subs.push(fromEvent(evEmitter, 'error').subscribe(function (ev) {
            return _this2._subjects.error.next(ev);
        }));

        // active
        this._subs.push(fromEvent(evEmitter, 'active').subscribe(function () {
            return _this2._subjects.active.next(true);
        }));
        this._subs.push(fromEvent(evEmitter, 'paused').subscribe(function () {
            return _this2._subjects.active.next(false);
        }));

        // complete
        this._subs.push(fromEvent(evEmitter, 'complete').subscribe(function (info) {
            return _this2._subjects.complete.next(info);
        }));
    };

    RxReplicationState.prototype.cancel = function cancel() {
        if (this._pouchEventEmitterObject) this._pouchEventEmitterObject.cancel();
        this._subs.forEach(function (sub) {
            return sub.unsubscribe();
        });
    };

    return RxReplicationState;
}();

export function createRxReplicationState(collection) {
    return new RxReplicationState(collection);
}

/**
 * waits for external changes to the database
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
 */
export function watchForChanges() {
    var _this3 = this;

    if (this.synced) return;

    /**
     * this will grap the changes and publish them to the rx-stream
     * this is to ensure that changes from 'synced' dbs will be published
     */
    var sendChanges = {};
    var pouch$ = fromEvent(this.pouch.changes({
        since: 'now',
        live: true,
        include_docs: true
    }), 'change').pipe(map(function (ar) {
        return ar[0];
    }), // rxjs6.x fires an array for whatever reason
    filter(function (c) {
        return c.id.charAt(0) !== '_';
    }), map(function (c) {
        return c.doc;
    }), filter(function (doc) {
        return !_this3._changeEventBuffer.buffer.map(function (cE) {
            return cE.data.v._rev;
        }).includes(doc._rev);
    }), filter(function (doc) {
        return sendChanges[doc._rev] = 'YES';
    }),
    // w8 2 ticks because pouchdb might also stream this event again from another process when multiInstance
    delay(0), delay(0), map(function (doc) {
        var ret = null;
        if (sendChanges[doc._rev] === 'YES') ret = doc;
        delete sendChanges[doc._rev];
        return ret;
    }), filter(function (doc) {
        return doc !== null;
    })).subscribe(function (doc) {
        _this3.$emit(RxChangeEvent.fromPouchChange(doc, _this3));
    });

    this._subs.push(pouch$);

    var ob2 = this.$.pipe(map(function (cE) {
        return cE.data.v;
    }), map(function (doc) {
        if (doc && sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
    })).subscribe();
    this._subs.push(ob2);

    this.synced = true;
}

export function sync(_ref) {
    var _this4 = this;

    var remote = _ref.remote,
        _ref$waitForLeadershi = _ref.waitForLeadership,
        waitForLeadership = _ref$waitForLeadershi === undefined ? true : _ref$waitForLeadershi,
        _ref$direction = _ref.direction,
        direction = _ref$direction === undefined ? {
        pull: true,
        push: true
    } : _ref$direction,
        _ref$options = _ref.options,
        options = _ref$options === undefined ? {
        live: true,
        retry: true
    } : _ref$options,
        query = _ref.query;

    options = clone(options);

    // prevent #641 by not allowing internal pouchdbs as remote
    if (PouchDB.isInstanceOf(remote) && INTERNAL_POUCHDBS.has(remote)) {
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
            query: query
        });
    }

    var syncFun = pouchReplicationFunction(this.pouch, direction);
    if (query) options.selector = query.keyCompress().selector;

    var repState = createRxReplicationState(this);

    // run internal so .sync() does not have to be async
    var waitTillRun = waitForLeadership ? this.database.waitForLeadership() : promiseWait(0);
    waitTillRun.then(function () {
        var pouchSync = syncFun(remote, options);
        _this4.watchForChanges();
        repState.setPouchEventEmitter(pouchSync);
        _this4._repStates.push(repState);
    });

    return repState;
}

export var rxdb = true;
export var prototypes = {
    RxCollection: function RxCollection(proto) {
        proto.watchForChanges = watchForChanges;
        proto.sync = sync;
    }
};

export var overwritable = {};

export var hooks = {
    createRxCollection: function createRxCollection(collection) {
        INTERNAL_POUCHDBS.add(collection.pouch);
    }
};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable,
    hooks: hooks,
    watchForChanges: watchForChanges,
    sync: sync
};