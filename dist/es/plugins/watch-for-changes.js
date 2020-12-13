import { fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { promiseWait, nextTick, now } from '../util';
import { changeEventfromPouchChange } from '../rx-change-event';

/**
 * listens to changes of the internal pouchdb
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 */
export function watchForChanges() {
  var _this = this;

  // do not call twice on same collection
  if (this.synced) return;
  this.synced = true;
  this._watchForChangesUnhandled = new Set();
  /**
   * this will grap the changes and publish them to the rx-stream
   * this is to ensure that changes from 'synced' dbs will be published
   */

  var pouch$ = fromEvent(this.pouch.changes({
    since: 'now',
    live: true,
    include_docs: true
  }), 'change').pipe(map(function (ar) {
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

  var startTime = now();
  var endTime = now(); // wait 2 ticks and 20 ms to give the internal event-handling time to run

  return promiseWait(20).then(function () {
    return nextTick();
  }).then(function () {
    return nextTick();
  }).then(function () {
    var docData = change.doc; // already handled by internal event-stream

    if (collection._changeEventBuffer.hasChangeWithRevision(docData._rev)) {
      return false;
    }

    var cE = changeEventfromPouchChange(docData, collection, startTime, endTime);
    collection.$emit(cE);
    return true;
  });
}

export var rxdb = true;
export var prototypes = {
  RxCollection: function RxCollection(proto) {
    proto.watchForChanges = watchForChanges;
  }
};
export var RxDBWatchForChangesPlugin = {
  name: 'watch-for-changes',
  rxdb: rxdb,
  prototypes: prototypes
};
//# sourceMappingURL=watch-for-changes.js.map