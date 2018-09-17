"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxReplicationState = createRxReplicationState;
exports.sync = sync;
exports["default"] = exports.hooks = exports.overwritable = exports.prototypes = exports.rxdb = exports.RxReplicationState = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _pouchdbReplication = _interopRequireDefault(require("pouchdb-replication"));

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _util = require("../util");

var _core = _interopRequireDefault(require("../core"));

var _rxCollection = _interopRequireDefault(require("../rx-collection"));

var _rxError = _interopRequireDefault(require("../rx-error"));

var _pouchDb = _interopRequireDefault(require("../pouch-db"));

var _watchForChanges = _interopRequireDefault(require("./watch-for-changes"));

/**
 * this plugin adds the RxCollection.sync()-function to rxdb
 * you can use it to sync collections with remote or local couchdb-instances
 */
// add pouchdb-replication-plugin
_core["default"].plugin(_pouchdbReplication["default"]); // add the watch-for-changes-plugin


_core["default"].plugin(_watchForChanges["default"]);

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
      alive: new _rxjs.BehaviorSubject(false),
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

  _proto.cancel = function cancel() {
    if (this._pouchEventEmitterObject) this._pouchEventEmitterObject.cancel();

    this._subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
  };

  return RxReplicationState;
}();

exports.RxReplicationState = RxReplicationState;

function setPouchEventEmitter(rxRepState, evEmitter) {
  if (rxRepState._pouchEventEmitterObject) throw _rxError["default"].newRxError('RC1');
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
  })); // alive


  function getIsAlive(_x) {
    return _getIsAlive.apply(this, arguments);
  }

  function _getIsAlive() {
    _getIsAlive = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee2(emitter) {
      var state, isAlive;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              // "state" will live in emitter.state if single direction replication
              // or in emitter.push.state & emitter.pull.state when syncing for both
              state = emitter.state;

              if (!state) {
                state = [emitter.pull.state, emitter.push.state].reduce(function (acc, val) {
                  if (acc === 'active' || val === 'active') return 'active';
                  return acc === 'stopped' ? acc : val;
                }, '');
              } // If it's active, we can't determine whether the connection is active
              // or not yet


              if (!(state === 'active')) {
                _context2.next = 6;
                break;
              }

              _context2.next = 5;
              return new Promise(function (resolve) {
                return setTimeout(resolve, 15);
              });

            case 5:
              return _context2.abrupt("return", getIsAlive(emitter));

            case 6:
              isAlive = state !== 'stopped';
              return _context2.abrupt("return", isAlive);

            case 8:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));
    return _getIsAlive.apply(this, arguments);
  }

  rxRepState._subs.push((0, _rxjs.fromEvent)(evEmitter, 'paused').pipe((0, _operators.skipUntil)((0, _rxjs.fromEvent)(evEmitter, 'active'))).subscribe(
  /*#__PURE__*/
  (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee() {
    var isAlive;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return getIsAlive(rxRepState._pouchEventEmitterObject);

          case 2:
            isAlive = _context.sent;

            rxRepState._subjects.alive.next(isAlive);

          case 4:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }))));
}

function createRxReplicationState(collection) {
  return new RxReplicationState(collection);
}

function sync(_ref2) {
  var _this2 = this;

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
  sync: sync
};
exports["default"] = _default;
