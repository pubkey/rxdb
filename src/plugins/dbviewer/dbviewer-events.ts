import { Subject } from 'rxjs';
import type {
    RxCollection,
    RxDatabase
} from '../../index.d.ts';
import { REPLICATION_STATE_BY_COLLECTION } from '../replication/index.ts';
import {
    changeEntryFromEvent,
    documentByteSize
} from './dbviewer-helpers.ts';
import type {
    ViewerChangeEntry,
    ViewerReplicationFeedEntry
} from './dbviewer-types.ts';

export const VIEWER_FEED_LIMIT = 500;
const WINDOW_MS = 60 * 1000;

export type ViewerReplicationInfo = {
    collectionName: string;
    identifier: string;
    active: boolean;
    stopped: boolean;
    lastError: string | null;
    lastErrorTime: number | null;
    state: any;
};

/**
 * Central event recorder of the viewer. Subscribes once to the
 * database change stream and to every replication state and keeps
 * ring buffers that the Changes, Replication and Live panels render from.
 */
export type ViewerEventHub = {
    changes: ViewerChangeEntry[];
    replicationFeed: ViewerReplicationFeedEntry[];
    changed$: Subject<void>;
    writeTimesByCollection: Map<string, number[]>;
    lastWriteByCollection: Map<string, number>;
    pullTimes: number[];
    pushTimes: number[];
    readTimes: number[];
    counters: {
        writes: number;
        reads: number;
        pulled: number;
        pushed: number;
    };
    sessionWrites: number;
    firstEventTime: number | null;
    replications: ViewerReplicationInfo[];
    resetCounters(): void;
    ratePerSecond(times: number[], windowMs?: number): number;
    destroy(): void;
};

function trimWindow(times: number[], now: number) {
    const cutoff = now - WINDOW_MS - 10 * 1000;
    while (times.length > 0 && times[0] < cutoff) {
        times.shift();
    }
}

export function createViewerEventHub(database: RxDatabase): ViewerEventHub {
    const changed$ = new Subject<void>();
    const hub: ViewerEventHub = {
        changes: [],
        replicationFeed: [],
        changed$,
        writeTimesByCollection: new Map(),
        lastWriteByCollection: new Map(),
        pullTimes: [],
        pushTimes: [],
        readTimes: [],
        counters: {
            writes: 0,
            reads: 0,
            pulled: 0,
            pushed: 0
        },
        sessionWrites: 0,
        firstEventTime: null,
        replications: [],
        resetCounters() {
            hub.counters = {
                writes: 0,
                reads: 0,
                pulled: 0,
                pushed: 0
            };
            hub.pullTimes.length = 0;
            hub.pushTimes.length = 0;
            hub.readTimes.length = 0;
            hub.writeTimesByCollection.forEach(times => times.length = 0);
            changed$.next();
        },
        ratePerSecond(times: number[], windowMs = WINDOW_MS) {
            const now = Date.now();
            const inWindow = times.filter(t => t >= now - windowMs).length;
            return inWindow / (windowMs / 1000);
        },
        destroy() {
            subscriptions.forEach(unsubscribe => unsubscribe());
            subscriptions.length = 0;
            clearInterval(pollHandle);
        }
    };

    const subscriptions: (() => void)[] = [];

    const changeSub = database.$.subscribe((event: any) => {
        const entry = changeEntryFromEvent(event);
        if (hub.firstEventTime === null) {
            hub.firstEventTime = entry.time;
        }
        hub.changes.unshift(entry);
        if (hub.changes.length > VIEWER_FEED_LIMIT) {
            hub.changes.length = VIEWER_FEED_LIMIT;
        }
        hub.counters.writes = hub.counters.writes + 1;
        hub.sessionWrites = hub.sessionWrites + 1;
        const collectionName = entry.collectionName;
        let times = hub.writeTimesByCollection.get(collectionName);
        if (!times) {
            times = [];
            hub.writeTimesByCollection.set(collectionName, times);
        }
        times.push(entry.time);
        trimWindow(times, entry.time);
        hub.lastWriteByCollection.set(collectionName, entry.time);
        changed$.next();
    });
    subscriptions.push(() => changeSub.unsubscribe());

    /**
     * Replication states can be created at any time,
     * so newly appearing states are picked up by polling.
     */
    const knownStates = new WeakSet<any>();
    const attachReplication = (collectionName: string, state: any) => {
        if (knownStates.has(state)) {
            return;
        }
        knownStates.add(state);
        const info: ViewerReplicationInfo = {
            collectionName,
            identifier: String(state.replicationIdentifier || ''),
            active: false,
            stopped: false,
            lastError: null,
            lastErrorTime: null,
            state
        };
        hub.replications.push(info);
        const onFeedEvent = (direction: 'pull' | 'push', doc: any) => {
            const primaryPath = state.collection ? state.collection.schema.primaryPath : 'id';
            const entry: ViewerReplicationFeedEntry = {
                time: Date.now(),
                direction,
                collectionName,
                documentId: doc ? String(doc[primaryPath]) : '?',
                rev: doc ? doc._rev : undefined,
                byteSize: documentByteSize(doc)
            };
            hub.replicationFeed.unshift(entry);
            if (hub.replicationFeed.length > VIEWER_FEED_LIMIT) {
                hub.replicationFeed.length = VIEWER_FEED_LIMIT;
            }
            if (direction === 'pull') {
                hub.counters.pulled = hub.counters.pulled + 1;
                hub.pullTimes.push(entry.time);
                trimWindow(hub.pullTimes, entry.time);
            } else {
                hub.counters.pushed = hub.counters.pushed + 1;
                hub.pushTimes.push(entry.time);
                trimWindow(hub.pushTimes, entry.time);
            }
            changed$.next();
        };
        const receivedSub = state.received$.subscribe((doc: any) => onFeedEvent('pull', doc));
        const sentSub = state.sent$.subscribe((doc: any) => onFeedEvent('push', doc));
        const activeSub = state.active$.subscribe((active: boolean) => {
            info.active = active;
            changed$.next();
        });
        const errorSub = state.error$.subscribe((error: any) => {
            info.lastError = error && error.message ? String(error.message) : String(error);
            info.lastErrorTime = Date.now();
            changed$.next();
        });
        subscriptions.push(() => {
            receivedSub.unsubscribe();
            sentSub.unsubscribe();
            activeSub.unsubscribe();
            errorSub.unsubscribe();
        });
    };

    /**
     * Reads cannot be observed from the outside, so they are
     * derived by polling the per-query execution counters of
     * the query caches.
     */
    let lastExecCountTotal: number | null = null;
    const pollQueryCaches = () => {
        let execCountTotal = 0;
        Object.entries(database.collections).forEach(([, collection]) => {
            const cache = (collection as any)._queryCache;
            if (!cache || !cache._map) {
                return;
            }
            cache._map.forEach((query: any) => {
                execCountTotal = execCountTotal + (query._execOverDatabaseCount || 0);
            });
        });
        if (lastExecCountTotal !== null && execCountTotal > lastExecCountTotal) {
            const newReads = execCountTotal - lastExecCountTotal;
            hub.counters.reads = hub.counters.reads + newReads;
            const now = Date.now();
            for (let i = 0; i < Math.min(newReads, 100); i++) {
                hub.readTimes.push(now);
            }
            trimWindow(hub.readTimes, now);
            changed$.next();
        }
        lastExecCountTotal = execCountTotal;
    };

    const pollReplications = () => {
        Object.entries(database.collections).forEach(([name, collection]) => {
            const states = REPLICATION_STATE_BY_COLLECTION.get(collection as RxCollection<any>);
            if (states) {
                states.forEach(state => attachReplication(name, state));
            }
        });
        hub.replications.forEach(info => {
            const stopped = typeof info.state.isStopped === 'function' ? info.state.isStopped() : false;
            if (stopped !== info.stopped) {
                info.stopped = stopped;
                changed$.next();
            }
        });
    };

    const pollHandle = setInterval(() => {
        pollQueryCaches();
        pollReplications();
    }, 1000);
    pollReplications();

    return hub;
}

/**
 * Snapshot of the cached queries of one collection,
 * rendered in the Live queries sub-panel.
 */
export type ViewerLiveQueryInfo = {
    queryString: string;
    resultCount: number | null;
    execCount: number;
    lastEmitTime: number | null;
};

export function readQueryCache(collection: RxCollection<any>): ViewerLiveQueryInfo[] {
    const cache = (collection as any)._queryCache;
    if (!cache || !cache._map) {
        return [];
    }
    const result: ViewerLiveQueryInfo[] = [];
    cache._map.forEach((query: any) => {
        let queryString = '';
        try {
            queryString = JSON.stringify(query.mangoQuery && query.mangoQuery.selector ? query.mangoQuery.selector : query.mangoQuery);
        } catch (err) {
            queryString = String(query.id);
        }
        result.push({
            queryString,
            resultCount: query._result && typeof query._result.count === 'number' ? query._result.count : null,
            execCount: query._execOverDatabaseCount || 0,
            lastEmitTime: query._result && query._result.time ? query._result.time : null
        });
    });
    return result;
}
