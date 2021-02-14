/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */
import PouchReplicationPlugin from 'pouchdb-replication';
import { BehaviorSubject, Subject, fromEvent } from 'rxjs';
import { skipUntil, filter, first } from 'rxjs/operators';
import { promiseWait, flatClone } from '../util';
import { addRxPlugin } from '../core';
import { newRxError } from '../rx-error';
import { pouchReplicationFunction, isInstanceOf as isInstanceOfPouchDB } from '../pouch-db';
import { isInstanceOf as isRxCollection } from '../rx-collection';
import { RxDBWatchForChangesPlugin } from './watch-for-changes'; // add pouchdb-replication-plugin

addRxPlugin(PouchReplicationPlugin); // add the watch-for-changes-plugin

addRxPlugin(RxDBWatchForChangesPlugin);
var INTERNAL_POUCHDBS = new WeakSet();
export var RxReplicationStateBase = /*#__PURE__*/function () {
  function RxReplicationStateBase(collection, syncOptions) {
    var _this = this;

    this._subs = [];
    this._subjects = {
      change: new Subject(),
      docs: new Subject(),
      denied: new Subject(),
      active: new BehaviorSubject(false),
      complete: new BehaviorSubject(false),
      alive: new BehaviorSubject(false),
      error: new Subject()
    };
    this.collection = collection;
    this.syncOptions = syncOptions;
    // create getters
    Object.keys(this._subjects).forEach(function (key) {
      Object.defineProperty(_this, key + '$', {
        get: function get() {
          return this._subjects[key].asObservable();
        }
      });
    });
  }

  var _proto = RxReplicationStateBase.prototype;

  _proto.awaitInitialReplication = function awaitInitialReplication() {
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

    var that = this;
    return that.complete$.pipe(filter(function (x) {
      return !!x;
    }), first()).toPromise();
  };

  _proto.cancel = function cancel() {
    if (this._pouchEventEmitterObject) this._pouchEventEmitterObject.cancel();

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
  };

  return RxReplicationStateBase;
}();
export function setPouchEventEmitter(rxRepState, evEmitter) {
  if (rxRepState._pouchEventEmitterObject) throw newRxError('RC1');
  rxRepState._pouchEventEmitterObject = evEmitter; // change

  rxRepState._subs.push(fromEvent(evEmitter, 'change').subscribe(function (ev) {
    return rxRepState._subjects.change.next(ev);
  })); // denied


  rxRepState._subs.push(fromEvent(evEmitter, 'denied').subscribe(function (ev) {
    return rxRepState._subjects.denied.next(ev);
  })); // docs


  rxRepState._subs.push(fromEvent(evEmitter, 'change').subscribe(function (ev) {
    if (rxRepState._subjects.docs.observers.length === 0 || ev.direction !== 'pull') return;
    ev.change.docs.filter(function (doc) {
      return doc.language !== 'query';
    }) // remove internal docs
    .map(function (doc) {
      return rxRepState.collection._handleFromPouch(doc);
    }) // do primary-swap and keycompression
    .forEach(function (doc) {
      return rxRepState._subjects.docs.next(doc);
    });
  })); // error


  rxRepState._subs.push(fromEvent(evEmitter, 'error').subscribe(function (ev) {
    return rxRepState._subjects.error.next(ev);
  })); // active


  rxRepState._subs.push(fromEvent(evEmitter, 'active').subscribe(function () {
    return rxRepState._subjects.active.next(true);
  }));

  rxRepState._subs.push(fromEvent(evEmitter, 'paused').subscribe(function () {
    return rxRepState._subjects.active.next(false);
  })); // complete


  rxRepState._subs.push(fromEvent(evEmitter, 'complete').subscribe(function (info) {
    /**
     * when complete fires, it might be that not all changeEvents
     * have passed throught, because of the delay of .wachtForChanges()
     * Therefore we have to first ensure that all previous changeEvents have been handled
     */
    var unhandledEvents = Array.from(rxRepState.collection._watchForChangesUnhandled);
    Promise.all(unhandledEvents).then(function () {
      return rxRepState._subjects.complete.next(info);
    });
  }));

  function getIsAlive(emitter) {
    // "state" will live in emitter.state if single direction replication
    // or in emitter.push.state & emitter.pull.state when syncing for both
    var state = emitter.state;

    if (!state) {
      state = [emitter.pull.state, emitter.push.state].reduce(function (acc, val) {
        if (acc === 'active' || val === 'active') return 'active';
        return acc === 'stopped' ? acc : val;
      }, '');
    } // If it's active, we can't determine whether the connection is active
    // or not yet


    if (state === 'active') {
      return promiseWait(15).then(function () {
        return getIsAlive(emitter);
      });
    }

    var isAlive = state !== 'stopped';
    return Promise.resolve(isAlive);
  }

  rxRepState._subs.push(fromEvent(evEmitter, 'paused').pipe(skipUntil(fromEvent(evEmitter, 'active'))).subscribe(function () {
    getIsAlive(rxRepState._pouchEventEmitterObject).then(function (isAlive) {
      return rxRepState._subjects.alive.next(isAlive);
    });
  }));
}
export function createRxReplicationState(collection, syncOptions) {
  return new RxReplicationStateBase(collection, syncOptions);
}
export function sync(_ref) {
  var _this2 = this;

  var remote = _ref.remote,
      _ref$waitForLeadershi = _ref.waitForLeadership,
      waitForLeadership = _ref$waitForLeadershi === void 0 ? true : _ref$waitForLeadershi,
      _ref$direction = _ref.direction,
      direction = _ref$direction === void 0 ? {
    pull: true,
    push: true
  } : _ref$direction,
      _ref$options = _ref.options,
      options = _ref$options === void 0 ? {
    live: true,
    retry: true
  } : _ref$options,
      query = _ref.query;
  var useOptions = flatClone(options); // prevent #641 by not allowing internal pouchdbs as remote

  if (isInstanceOfPouchDB(remote) && INTERNAL_POUCHDBS.has(remote)) {
    throw newRxError('RC3', {
      database: this.database.name,
      collection: this.name
    });
  } // if remote is RxCollection, get internal pouchdb


  if (isRxCollection(remote)) {
    remote.watchForChanges();
    remote = remote.pouch;
  }

  if (query && this !== query.collection) {
    throw newRxError('RC2', {
      query: query
    });
  }

  var syncFun = pouchReplicationFunction(this.pouch, direction);
  if (query) useOptions.selector = query.keyCompress().selector;
  var repState = createRxReplicationState(this, {
    remote: remote,
    waitForLeadership: waitForLeadership,
    direction: direction,
    options: options,
    query: query
  }); // run internal so .sync() does not have to be async

  var waitTillRun = waitForLeadership && this.database.multiInstance // do not await leadership if not multiInstance
  ? this.database.waitForLeadership() : promiseWait(0);
  waitTillRun.then(function () {
    var pouchSync = syncFun(remote, useOptions);

    _this2.watchForChanges();

    setPouchEventEmitter(repState, pouchSync);

    _this2._repStates.push(repState);
  });
  return repState;
}
export var rxdb = true;
export var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.sync = sync;
  }
};
export var hooks = {
  createRxCollection: function createRxCollection(collection) {
    INTERNAL_POUCHDBS.add(collection.pouch);
  }
};
export var RxDBReplicationPlugin = {
  name: 'replication',
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks
};
//# sourceMappingURL=replication.js.map