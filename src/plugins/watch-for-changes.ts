import {
    fromEvent
} from 'rxjs';
import {
    map,
} from 'rxjs/operators';

import {
    promiseWait,
    nextTick,
    now
} from '../util';
import {
    changeEventfromPouchChange
} from '../rx-change-event';
import type {
    RxPlugin,
    RxCollection
} from '../types';

/**
 * listens to changes of the internal pouchdb
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 */
export function watchForChanges(this: RxCollection) {
    // do not call twice on same collection
    if (this.synced) return;
    this.synced = true;

    this._watchForChangesUnhandled = new Set();

    /**
     * this will grap the changes and publish them to the rx-stream
     * this is to ensure that changes from 'synced' dbs will be published
     */
    const pouch$ =
        fromEvent(
            this.pouch.changes({
                since: 'now',
                live: true,
                include_docs: true
            }),
            'change'
        ).pipe(
            map((ar: any) => ar[0]), // rxjs6.x fires an array for whatever reason
        ).subscribe(change => {
            const resPromise = _handleSingleChange(this, change);

            // add and remove to the Set so RxReplicationState.complete$ can know when all events where handled
            this._watchForChangesUnhandled.add(resPromise);
            resPromise.then(() => {
                this._watchForChangesUnhandled.delete(resPromise);
            });
        });
    this._subs.push(pouch$);
}

/**
 * handles a single change-event
 * and ensures that it is not already handled
 */
function _handleSingleChange(
    collection: RxCollection,
    change: any
): Promise<boolean> {
    if (change.id.charAt(0) === '_') return Promise.resolve(false); // do not handle changes of internal docs

    const startTime = now();
    const endTime = now();
    // wait 2 ticks and 20 ms to give the internal event-handling time to run
    return promiseWait(20)
        .then(() => nextTick())
        .then(() => nextTick())
        .then(() => {
            const docData = change.doc;
            // already handled by internal event-stream
            if ((collection._changeEventBuffer as any).hasChangeWithRevision(docData._rev)) {
                return false;
            }

            const cE = changeEventfromPouchChange(
                docData,
                collection,
                startTime,
                endTime
            );

            collection.$emit(cE);
            return true;
        });
}

export const rxdb = true;
export const prototypes = {
    RxCollection: (proto: any) => {
        proto.watchForChanges = watchForChanges;
    }
};

export const RxDBWatchForChangesPlugin: RxPlugin = {
    name: 'watch-for-changes',
    rxdb,
    prototypes
};
