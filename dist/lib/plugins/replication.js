"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxReplicationState = createRxReplicationState;
exports.watchForChanges = watchForChanges;
exports.sync = sync;
exports["default"] = exports.hooks = exports.overwritable = exports.prototypes = exports.rxdb = exports.RxReplicationState = void 0;

var _pouchdbReplication = _interopRequireDefault(require("pouchdb-replication"));

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _util = require("../util");

var _core = _interopRequireDefault(require("../core"));

var _rxCollection = _interopRequireDefault(require("../rx-collection"));

var _rxChangeEvent = _interopRequireDefault(require("../rx-change-event"));

var _rxError = _interopRequireDefault(require("../rx-error"));

var _pouchDb = _interopRequireDefault(require("../pouch-db"));

/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */
// add pouchdb-replication-plugin
_core["default"].plugin(_pouchdbReplication["default"]);

var INTERNAL_POUCHDBS = new WeakSet();

var RxReplicationState =
/*#__PURE__*/
function () {
  function RxReplicationState(collection) {
    var _this = this;

    this._subs = [];
    this.collection = collection;
    this._pouchEventEmitterObject = null;
    this._subjects = {
      change: new _rxjs.Subject(),
      docs: new _rxjs.Subject(),
      denied: new _rxjs.Subject(),
      active: new _rxjs.BehaviorSubject(false),
      complete: new _rxjs.BehaviorSubject(false),
      error: new _rxjs.Subject()
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

  _proto.setPouchEventEmitter = function setPouchEventEmitter(evEmitter) {
    var _this2 = this;

    if (this._pouchEventEmitterObject) throw _rxError["default"].newRxError('RC1');
    this._pouchEventEmitterObject = evEmitter; // change

    this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'change').subscribe(function (ev) {
      return _this2._subjects.change.next(ev);
    })); // denied


    this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'denied').subscribe(function (ev) {
      return _this2._subjects.denied.next(ev);
    })); // docs


    this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'change').subscribe(function (ev) {
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
    })); // error


    this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'error').subscribe(function (ev) {
      return _this2._subjects.error.next(ev);
    })); // active


    this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'active').subscribe(function () {
      return _this2._subjects.active.next(true);
    }));

    this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'paused').subscribe(function () {
      return _this2._subjects.active.next(false);
    })); // complete


    this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'complete').subscribe(function (info) {
      /**
       * when complete fires, it might be that not all changeEvents
       * have passed throught, because of the delay of .wachtForChanges()
       * Therefore we have to first ensure that all previous changeEvents have been handled
       */
      var unhandledEvents = Array.from(_this2.collection._watchForChangesUnhandled);
      Promise.all(unhandledEvents).then(function () {
        return _this2._subjects.complete.next(info);
      });
    }));
  };

  _proto.cancel = function cancel() {
    if (this._pouchEventEmitterObject) this._pouchEventEmitterObject.cancel();

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
  };

  return RxReplicationState;
}();

exports.RxReplicationState = RxReplicationState;

function createRxReplicationState(collection) {
  return new RxReplicationState(collection);
}
/**
 * waits for external changes to the database
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 */


function watchForChanges() {
  var _this3 = this;

  // do not call twice on same collection
  if (this.synced) return;
  this.synced = true;
  this._watchForChangesUnhandled = new Set();
  /**
   * this will grap the changes and publish them to the rx-stream
   * this is to ensure that changes from 'synced' dbs will be published
   */

  var pouch$ = (0, _rxjs.fromEvent)(this.pouch.changes({
    since: 'now',
    live: true,
    include_docs: true
  }), 'change').pipe((0, _operators.map)(function (ar) {
    return ar[0];
  }) // rxjs6.x fires an array for whatever reason
  ).subscribe(function (change) {
    var resPromise = _handleSingleChange(_this3, change); // add and remove to the Set so RxReplicationState.complete$ can know when all events where handled


    _this3._watchForChangesUnhandled.add(resPromise);

    resPromise.then(function () {
      _this3._watchForChangesUnhandled["delete"](resPromise);
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

  return (0, _util.promiseWait)(20).then(function () {
    return (0, _util.nextTick)();
  }).then(function () {
    return (0, _util.nextTick)();
  }).then(function () {
    var docData = change.doc; // already handled by internal event-stream

    if (collection._changeEventBuffer.hasChangeWithRevision(docData._rev)) return Promise.resolve(false);

    var cE = _rxChangeEvent["default"].fromPouchChange(docData, collection);

    collection.$emit(cE);
    return true;
  });
}

function sync(_ref) {
  var _this4 = this;

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
  options = (0, _util.clone)(options); // prevent #641 by not allowing internal pouchdbs as remote

  if (_pouchDb["default"].isInstanceOf(remote) && INTERNAL_POUCHDBS.has(remote)) {
    throw _rxError["default"].newRxError('RC3', {
      database: this.database.name,
      collection: this.name
    });
  } // if remote is RxCollection, get internal pouchdb


  if (_rxCollection["default"].isInstanceOf(remote)) {
    remote.watchForChanges();
    remote = remote.pouch;
  }

  if (query && this !== query.collection) {
    throw _rxError["default"].newRxError('RC2', {
      query: query
    });
  }

  var syncFun = (0, _util.pouchReplicationFunction)(this.pouch, direction);
  if (query) options.selector = query.keyCompress().selector;
  var repState = createRxReplicationState(this); // run internal so .sync() does not have to be async

  var waitTillRun = waitForLeadership ? this.database.waitForLeadership() : (0, _util.promiseWait)(0);
  waitTillRun.then(function () {
    var pouchSync = syncFun(remote, options);

    _this4.watchForChanges();

    repState.setPouchEventEmitter(pouchSync);

    _this4._repStates.push(repState);
  });
  return repState;
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.watchForChanges = watchForChanges;
    proto.sync = sync;
  }
};
exports.prototypes = prototypes;
var overwritable = {};
exports.overwritable = overwritable;
var hooks = {
  createRxCollection: function createRxCollection(collection) {
    INTERNAL_POUCHDBS.add(collection.pouch);
  }
};
exports.hooks = hooks;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: hooks,
  watchForChanges: watchForChanges,
  sync: sync
};
exports["default"] = _default;
