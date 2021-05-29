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
    RxCollection,
    ChangeStreamEvent,
    WithRevision
} from '../types';

/**
 * listens to changes of the internal pouchdb
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 */
export function watchForChanges<RxDocType>(this: RxCollection<RxDocType>) {
    // do not call twice on same collection
    if (this.synced) {
        return;
    }
    this.synced = true;

    this._watchForChangesUnhandled = new Set();

    /**
     * this will grap the changes and publish them to the rx-stream
     * this is to ensure that changes from 'synced' dbs will be published
     */
    const pouchSub = this.storageInstance.changeStream({})
        .subscribe(change => {
            const resPromise = _handleSingleChange(this, change);

            // add and remove to the Set so RxReplicationState.complete$ can know when all events where handled
            this._watchForChangesUnhandled.add(resPromise);
            resPromise.then(() => {
                this._watchForChangesUnhandled.delete(resPromise);
            });
        });

    this._subs.push(pouchSub);
}

/**
 * handles a single change-event
 * and ensures that it is not already handled
 */
function _handleSingleChange<RxDocType>(
    collection: RxCollection<RxDocType>,
    change: ChangeStreamEvent<RxDocType>
): Promise<boolean> {
    if (change.id.charAt(0) === '_') {
        // do not handle changes of internal docs
        return Promise.resolve(false);
    }

    const startTime = now();
    const endTime = now();
    // wait 2 ticks and 20 ms to give the internal event-handling time to run
    return promiseWait(20)
        .then(() => nextTick())
        .then(() => nextTick())
        .then(() => {
            let docData: WithRevision<any> = change.doc;
            if (!docData) {
                docData = change.previous;
            }
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

/**
 * After a collection is destroyed,
 * we must await all promises of collection._watchForChangesUnhandled
 * to ensure nothing is running anymore.
 */
function postDestroyRxCollection(collection: RxCollection): Promise<any> {
    const unhandled: Set<Promise<any>> = collection._watchForChangesUnhandled;
    if (!unhandled) {
        return Promise.resolve();
    }

    return Promise.all(
        Array.from(unhandled)
    );
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
    prototypes,
    hooks: {
        postDestroyRxCollection
    }
};
