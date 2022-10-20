/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */

import PouchReplicationPlugin from 'pouchdb-replication';
import { BehaviorSubject, Subject, fromEvent, firstValueFrom } from 'rxjs';
import { skipUntil, filter, first, mergeMap } from 'rxjs/operators';
import { promiseWait, flatClone, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_TRUE, ensureNotFalsy } from '../util';
import { newRxError } from '../rx-error';
import { isInstanceOf as isInstanceOfPouchDB, addPouchPlugin, getPouchDBOfRxCollection } from '../plugins/pouchdb';
import { isRxCollection } from '../rx-collection';
/**
 * Contains all pouchdb instances that
 * are used inside of RxDB by collections or databases.
 * Used to ensure the remote of a replication cannot be an internal pouchdb.
 */
var INTERNAL_POUCHDBS = new WeakSet();
export var RxCouchDBReplicationStateBase = /*#__PURE__*/function () {
  function RxCouchDBReplicationStateBase(collection, syncOptions) {
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
    this.canceled = false;
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
  var _proto = RxCouchDBReplicationStateBase.prototype;
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
    return firstValueFrom(that.complete$.pipe(filter(function (x) {
      return !!x;
    })));
  }

  /**
   * Returns false when the replication has already been canceled
   */;
  _proto.cancel = function cancel() {
    var _this2 = this;
    if (this.canceled) {
      return PROMISE_RESOLVE_FALSE;
    }
    this.canceled = true;
    var ret = PROMISE_RESOLVE_TRUE;
    if (this._pouchEventEmitterObject) {
      /**
       * Calling cancel() does not return a promise,
       * so we have to await the complete event
       * to know that everything is cleaned up properly.
       */
      ret = new Promise(function (res) {
        ensureNotFalsy(_this2._pouchEventEmitterObject).on('complete', function () {
          res(true);
        });
      });
      this._pouchEventEmitterObject.cancel();
    }
    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    return ret;
  };
  return RxCouchDBReplicationStateBase;
}();
export function setPouchEventEmitter(rxRepState, evEmitter) {
  if (rxRepState._pouchEventEmitterObject) {
    throw newRxError('RC1');
  }
  rxRepState._pouchEventEmitterObject = evEmitter;

  // change
  rxRepState._subs.push(fromEvent(evEmitter, 'change').subscribe(function (ev) {
    rxRepState._subjects.change.next(ev);
  }));

  // denied
  rxRepState._subs.push(fromEvent(evEmitter, 'denied').subscribe(function (ev) {
    return rxRepState._subjects.denied.next(ev);
  }));

  // docs
  rxRepState._subs.push(fromEvent(evEmitter, 'change').subscribe(function (ev) {
    if (rxRepState._subjects.docs.observers.length === 0 || ev.direction !== 'pull') return;
    ev.change.docs.filter(function (doc) {
      return doc.language !== 'query';
    }) // remove internal docs
    // do primary-swap and keycompression
    .forEach(function (doc) {
      return rxRepState._subjects.docs.next(doc);
    });
  }));

  // error
  rxRepState._subs.push(fromEvent(evEmitter, 'error').subscribe(function (ev) {
    return rxRepState._subjects.error.next(ev);
  }));

  // active
  rxRepState._subs.push(fromEvent(evEmitter, 'active').subscribe(function () {
    return rxRepState._subjects.active.next(true);
  }));
  rxRepState._subs.push(fromEvent(evEmitter, 'paused').subscribe(function () {
    return rxRepState._subjects.active.next(false);
  }));

  // complete
  rxRepState._subs.push(fromEvent(evEmitter, 'complete').subscribe(function (info) {
    try {
      /**
       * when complete fires, it might be that not all changeEvents
       * have passed throught, because of the delay of .wachtForChanges()
       * Therefore we have to first ensure that all previous changeEvents have been handled
       */
      return Promise.resolve(promiseWait(100)).then(function () {
        rxRepState._subjects.complete.next(info);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }));
  // auto-cancel one-time replications on complelete to not cause memory leak
  if (!rxRepState.syncOptions.options || !rxRepState.syncOptions.options.live) {
    rxRepState._subs.push(rxRepState.complete$.pipe(filter(function (x) {
      return !!x;
    }), first(), mergeMap(function () {
      return rxRepState.collection.database.requestIdlePromise().then(function () {
        return rxRepState.cancel();
      });
    })).subscribe());
  }
  function getIsAlive(emitter) {
    // "state" will live in emitter.state if single direction replication
    // or in emitter.push.state & emitter.pull.state when syncing for both
    var state = emitter.state;
    if (!state) {
      state = [emitter.pull.state, emitter.push.state].reduce(function (acc, val) {
        if (acc === 'active' || val === 'active') return 'active';
        return acc === 'stopped' ? acc : val;
      }, '');
    }

    // If it's active, we can't determine whether the connection is active
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
export function createRxCouchDBReplicationState(collection, syncOptions) {
  return new RxCouchDBReplicationStateBase(collection, syncOptions);
}

/**
 * get the correct function-name for pouchdb-replication
 */
export function pouchReplicationFunction(pouch, _ref) {
  var _ref$pull = _ref.pull,
    pull = _ref$pull === void 0 ? true : _ref$pull,
    _ref$push = _ref.push,
    push = _ref$push === void 0 ? true : _ref$push;
  if (pull && push) {
    return pouch.sync.bind(pouch);
  }
  if (!pull && push) {
    return pouch.replicate.to.bind(pouch);
  }
  if (pull && !push) {
    return pouch.replicate.from.bind(pouch);
  }
  if (!pull && !push) {
    throw newRxError('UT3', {
      pull: pull,
      push: push
    });
  }
}
export function syncCouchDB(_ref2) {
  var _this3 = this;
  var remote = _ref2.remote,
    _ref2$waitForLeadersh = _ref2.waitForLeadership,
    waitForLeadership = _ref2$waitForLeadersh === void 0 ? true : _ref2$waitForLeadersh,
    _ref2$direction = _ref2.direction,
    direction = _ref2$direction === void 0 ? {
      pull: true,
      push: true
    } : _ref2$direction,
    _ref2$options = _ref2.options,
    options = _ref2$options === void 0 ? {
      live: true,
      retry: true
    } : _ref2$options,
    query = _ref2.query;
  var useOptions = flatClone(options);

  // prevent #641 by not allowing internal pouchdbs as remote
  if (isInstanceOfPouchDB(remote) && INTERNAL_POUCHDBS.has(remote)) {
    throw newRxError('RC3', {
      database: this.database.name,
      collection: this.name
    });
  }

  // if remote is RxCollection, get internal pouchdb
  if (isRxCollection(remote)) {
    remote = remote.storageInstance.internals.pouch;
  }
  if (query && this !== query.collection) {
    throw newRxError('RC2', {
      query: query
    });
  }
  var pouch = getPouchDBOfRxCollection(this);
  var syncFun = pouchReplicationFunction(pouch, direction);
  if (query) {
    useOptions.selector = query.getPreparedQuery().selector;
  }
  var repState = createRxCouchDBReplicationState(this, {
    remote: remote,
    waitForLeadership: waitForLeadership,
    direction: direction,
    options: options,
    query: query
  });

  // run internal so .sync() does not have to be async
  var waitTillRun = waitForLeadership && this.database.multiInstance // do not await leadership if not multiInstance
  ? this.database.waitForLeadership() : promiseWait(0);
  waitTillRun.then(function () {
    if (_this3.destroyed || repState.canceled) {
      return;
    }
    var pouchSync = syncFun(remote, useOptions);
    setPouchEventEmitter(repState, pouchSync);
    _this3.onDestroy.push(function () {
      return repState.cancel();
    });
  });
  return repState;
}
export var RxDBReplicationCouchDBPlugin = {
  name: 'replication-couchdb',
  rxdb: true,
  init: function init() {
    // add pouchdb-replication-plugin
    addPouchPlugin(PouchReplicationPlugin);
  },
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.syncCouchDB = syncCouchDB;
    }
  },
  hooks: {
    createRxCollection: {
      after: function after(args) {
        var collection = args.collection;
        var pouch = collection.storageInstance.internals.pouch;
        if (pouch) {
          INTERNAL_POUCHDBS.add(collection.storageInstance.internals.pouch);
        }
      }
    }
  }
};
//# sourceMappingURL=replication-couchdb.js.map