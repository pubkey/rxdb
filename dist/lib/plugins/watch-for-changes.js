"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.watchForChanges = watchForChanges;
exports["default"] = exports.prototypes = exports.rxdb = void 0;

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _util = require("../util");

var _rxChangeEvent = _interopRequireDefault(require("../rx-change-event"));

/**
 * listens to changes of the internal pouchdb
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 */
function watchForChanges() {
  var _this = this;

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
    var resPromise = _handleSingleChange(_this, change); // add and remove to the Set so RxReplicationState.complete$ can know when all events where handled


    _this._watchForChangesUnhandled.add(resPromise);

    resPromise.then(function () {
      _this._watchForChangesUnhandled["delete"](resPromise);
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

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.watchForChanges = watchForChanges;
  }
};
exports.prototypes = prototypes;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes
};
exports["default"] = _default;
