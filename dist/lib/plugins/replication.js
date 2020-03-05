"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setPouchEventEmitter = setPouchEventEmitter;
exports.createRxReplicationState = createRxReplicationState;
exports.sync = sync;
exports["default"] = exports.hooks = exports.prototypes = exports.rxdb = exports.RxReplicationStateBase = void 0;

var _pouchdbReplication = _interopRequireDefault(require("pouchdb-replication"));

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _util = require("../util");

var _core = _interopRequireDefault(require("../core"));

var _rxError = require("../rx-error");

var _pouchDb = require("../pouch-db");

var _watchForChanges = _interopRequireDefault(require("./watch-for-changes"));

var _rxCollection = require("../rx-collection");

/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */
// add pouchdb-replication-plugin
_core["default"].plugin(_pouchdbReplication["default"]); // add the watch-for-changes-plugin


_core["default"].plugin(_watchForChanges["default"]);

var INTERNAL_POUCHDBS = new WeakSet();

var RxReplicationStateBase = /*#__PURE__*/function () {
  function RxReplicationStateBase(collection) {
    var _this = this;

    this._subs = [];
    this._subjects = {
      change: new _rxjs.Subject(),
      docs: new _rxjs.Subject(),
      denied: new _rxjs.Subject(),
      active: new _rxjs.BehaviorSubject(false),
      complete: new _rxjs.BehaviorSubject(false),
      alive: new _rxjs.BehaviorSubject(false),
      error: new _rxjs.Subject()
    };
    this.collection = collection;
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

  _proto.cancel = function cancel() {
    if (this._pouchEventEmitterObject) this._pouchEventEmitterObject.cancel();

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
  };

  return RxReplicationStateBase;
}();

exports.RxReplicationStateBase = RxReplicationStateBase;

function setPouchEventEmitter(rxRepState, evEmitter) {
  if (rxRepState._pouchEventEmitterObject) throw (0, _rxError.newRxError)('RC1');
  rxRepState._pouchEventEmitterObject = evEmitter; // change

  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'change').subscribe(function (ev) {
    return rxRepState._subjects.change.next(ev);
  })); // denied


  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'denied').subscribe(function (ev) {
    return rxRepState._subjects.denied.next(ev);
  })); // docs


  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'change').subscribe(function (ev) {
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


  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'error').subscribe(function (ev) {
    return rxRepState._subjects.error.next(ev);
  })); // active


  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'active').subscribe(function () {
    return rxRepState._subjects.active.next(true);
  }));

  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'paused').subscribe(function () {
    return rxRepState._subjects.active.next(false);
  })); // complete


  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'complete').subscribe(function (info) {
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
      return (0, _util.promiseWait)(15).then(function () {
        return getIsAlive(emitter);
      });
    }

    var isAlive = state !== 'stopped';
    return Promise.resolve(isAlive);
  }

  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'paused').pipe((0, _operators.skipUntil)((0, _rxjs.fromEvent)(evEmitter, 'active'))).subscribe(function () {
    getIsAlive(rxRepState._pouchEventEmitterObject).then(function (isAlive) {
      return rxRepState._subjects.alive.next(isAlive);
    });
  }));
}

function createRxReplicationState(collection) {
  return new RxReplicationStateBase(collection);
}

function sync(_ref) {
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
  var useOptions = (0, _util.flatClone)(options); // prevent #641 by not allowing internal pouchdbs as remote

  if ((0, _pouchDb.isInstanceOf)(remote) && INTERNAL_POUCHDBS.has(remote)) {
    throw (0, _rxError.newRxError)('RC3', {
      database: this.database.name,
      collection: this.name
    });
  } // if remote is RxCollection, get internal pouchdb


  if ((0, _rxCollection.isInstanceOf)(remote)) {
    remote.watchForChanges();
    remote = remote.pouch;
  }

  if (query && this !== query.collection) {
    throw (0, _rxError.newRxError)('RC2', {
      query: query
    });
  }

  var syncFun = (0, _pouchDb.pouchReplicationFunction)(this.pouch, direction);
  if (query) useOptions.selector = query.keyCompress().selector;
  var repState = createRxReplicationState(this); // run internal so .sync() does not have to be async

  var waitTillRun = waitForLeadership ? this.database.waitForLeadership() : (0, _util.promiseWait)(0);
  waitTillRun.then(function () {
    var pouchSync = syncFun(remote, useOptions);

    _this2.watchForChanges();

    setPouchEventEmitter(repState, pouchSync);

    _this2._repStates.push(repState);
  });
  return repState;
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.sync = sync;
  }
};
exports.prototypes = prototypes;
var hooks = {
  createRxCollection: function createRxCollection(collection) {
    INTERNAL_POUCHDBS.add(collection.pouch);
  }
};
exports.hooks = hooks;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: hooks,
  sync: sync
};
exports["default"] = _default;

//# sourceMappingURL=replication.js.map