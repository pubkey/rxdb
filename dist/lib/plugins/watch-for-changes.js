"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.watchForChanges = watchForChanges;
exports.RxDBWatchForChangesPlugin = exports.prototypes = exports.rxdb = void 0;

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

var _util = require("../util");

var _rxChangeEvent = require("../rx-change-event");

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
 */


function _handleSingleChange(collection, change) {
  if (change.id.charAt(0) === '_') return Promise.resolve(false); // do not handle changes of internal docs

  var startTime = (0, _util.now)();
  var endTime = (0, _util.now)(); // wait 2 ticks and 20 ms to give the internal event-handling time to run

  return (0, _util.promiseWait)(20).then(function () {
    return (0, _util.nextTick)();
  }).then(function () {
    return (0, _util.nextTick)();
  }).then(function () {
    var docData = change.doc; // already handled by internal event-stream

    if (collection._changeEventBuffer.hasChangeWithRevision(docData._rev)) {
      return false;
    }

    var cE = (0, _rxChangeEvent.changeEventfromPouchChange)(docData, collection, startTime, endTime);
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
var RxDBWatchForChangesPlugin = {
  name: 'watch-for-changes',
  rxdb: rxdb,
  prototypes: prototypes
};
exports.RxDBWatchForChangesPlugin = RxDBWatchForChangesPlugin;

//# sourceMappingURL=watch-for-changes.js.map