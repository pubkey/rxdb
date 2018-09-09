/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */
import PouchReplicationPlugin from 'pouchdb-replication';
import { BehaviorSubject, Subject, fromEvent } from 'rxjs';
import { promiseWait, clone, pouchReplicationFunction } from '../util';
import Core from '../core';
import RxCollection from '../rx-collection';
import RxError from '../rx-error';
import PouchDB from '../pouch-db';
import RxDBWatchForChangesPlugin from './watch-for-changes'; // add pouchdb-replication-plugin

Core.plugin(PouchReplicationPlugin); // add the watch-for-changes-plugin

Core.plugin(RxDBWatchForChangesPlugin);
var INTERNAL_POUCHDBS = new WeakSet();
export var RxReplicationState =
/*#__PURE__*/
function () {
  function RxReplicationState(collection) {
    var _this = this;

    this._subs = [];
    this.collection = collection;
    this._pouchEventEmitterObject = null;
    this._subjects = {
      change: new Subject(),
      docs: new Subject(),
      denied: new Subject(),
      active: new BehaviorSubject(false),
      complete: new BehaviorSubject(false),
      error: new Subject()
    }; // create getters

    Object.keys(this._subjects).forEach(function (key) {
      Object.defineProperty(_this, key + '$', {
        get: function get() {
          return this._subjects[key].asObservable();
        }
      });
    });
  }

  var _proto = RxReplicationState.prototype;

  _proto.cancel = function cancel() {
    if (this._pouchEventEmitterObject) this._pouchEventEmitterObject.cancel();

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
  };

  return RxReplicationState;
}();

function setPouchEventEmitter(rxRepState, evEmitter) {
  if (rxRepState._pouchEventEmitterObject) throw RxError.newRxError('RC1');
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
}

export function createRxReplicationState(collection) {
  return new RxReplicationState(collection);
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
  options = clone(options); // prevent #641 by not allowing internal pouchdbs as remote

  if (PouchDB.isInstanceOf(remote) && INTERNAL_POUCHDBS.has(remote)) {
    throw RxError.newRxError('RC3', {
      database: this.database.name,
      collection: this.name
    });
  } // if remote is RxCollection, get internal pouchdb


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
  var repState = createRxReplicationState(this); // run internal so .sync() does not have to be async

  var waitTillRun = waitForLeadership ? this.database.waitForLeadership() : promiseWait(0);
  waitTillRun.then(function () {
    var pouchSync = syncFun(remote, options);

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
  sync: sync
};