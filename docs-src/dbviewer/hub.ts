import type {
    ViewerChangeEntry,
    ViewerLiveQueryCollectionStats,
    ViewerReplicationFeedEntry,
    ViewerReplicationSnapshot
} from '../../src/plugins/dbviewer/dbviewer-types.ts';
import type { ViewerSource } from './source.ts';

export const HUB_FEED_LIMIT = 500;
const WINDOW_MS = 60 * 1000;

/**
 * Minimal replacement for an rxjs Subject so the page
 * does not have to bundle rxjs.
 */
export type PageSignal = {
    next(): void;
    subscribe(listener: () => void): { unsubscribe(): void; };
};

export function createPageSignal(): PageSignal {
    const listeners = new Set<() => void>();
    return {
        next() {
            listeners.forEach(listener => listener());
        },
        subscribe(listener: () => void) {
            listeners.add(listener);
            return {
                unsubscribe() {
                    listeners.delete(listener);
                }
            };
        }
    };
}

/**
 * Page-side mirror of the host event hub. Change and replication
 * feed entries arrive pushed over the bridge, slow-moving state
 * (replication states, read counters, live query counters, leader
 * flag) is polled once per second via stats().
 */
export type PageHub = {
    changes: ViewerChangeEntry[];
    replicationFeed: ViewerReplicationFeedEntry[];
    changed$: PageSignal;
    writeTimesByCollection: Map<string, number[]>;
    lastWriteByCollection: Map<string, number>;
    localWriteTimes: number[];
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
    replications: ViewerReplicationSnapshot[];
    isLeader: boolean | null;
    liveQueryStats: Map<string, ViewerLiveQueryCollectionStats>;
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

function changeKey(entry: ViewerChangeEntry): string {
    return entry.time + '|' + entry.collectionName + '|' + entry.documentId + '|' + (entry.revTo || '');
}

function feedKey(entry: ViewerReplicationFeedEntry): string {
    return entry.time + '|' + entry.direction + '|' + entry.collectionName + '|' + entry.documentId + '|' + (entry.rev || '');
}

export function createPageHub(source: ViewerSource): PageHub {
    const changed$ = createPageSignal();
    const hub: PageHub = {
        changes: [],
        replicationFeed: [],
        changed$,
        writeTimesByCollection: new Map(),
        lastWriteByCollection: new Map(),
        localWriteTimes: [],
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
        isLeader: null,
        liveQueryStats: new Map(),
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
            hub.localWriteTimes.length = 0;
            hub.writeTimesByCollection.forEach(times => times.length = 0);
            changed$.next();
        },
        ratePerSecond(times: number[], windowMs = WINDOW_MS) {
            const now = Date.now();
            const inWindow = times.filter(t => t >= now - windowMs).length;
            return inWindow / (windowMs / 1000);
        },
        destroy() {
            destroyed = true;
            removeListener();
            clearInterval(pollHandle);
        }
    };

    let destroyed = false;
    const seenChanges = new Set<string>();
    const seenFeed = new Set<string>();

    const recordChange = (entry: ViewerChangeEntry): boolean => {
        const key = changeKey(entry);
        if (seenChanges.has(key)) {
            return false;
        }
        seenChanges.add(key);
        if (seenChanges.size > HUB_FEED_LIMIT * 2) {
            seenChanges.clear();
            hub.changes.forEach(existing => seenChanges.add(changeKey(existing)));
        }
        if (hub.firstEventTime === null || entry.time < hub.firstEventTime) {
            hub.firstEventTime = entry.time;
        }
        hub.changes.unshift(entry);
        hub.changes.sort((a, b) => b.time - a.time);
        if (hub.changes.length > HUB_FEED_LIMIT) {
            hub.changes.length = HUB_FEED_LIMIT;
        }
        if (!entry.fromReplication) {
            hub.counters.writes = hub.counters.writes + 1;
            hub.localWriteTimes.push(entry.time);
            hub.localWriteTimes.sort((a, b) => a - b);
            trimWindow(hub.localWriteTimes, Date.now());
        }
        hub.sessionWrites = hub.sessionWrites + 1;
        let times = hub.writeTimesByCollection.get(entry.collectionName);
        if (!times) {
            times = [];
            hub.writeTimesByCollection.set(entry.collectionName, times);
        }
        times.push(entry.time);
        times.sort((a, b) => a - b);
        trimWindow(times, Date.now());
        const lastWrite = hub.lastWriteByCollection.get(entry.collectionName) || 0;
        if (entry.time > lastWrite) {
            hub.lastWriteByCollection.set(entry.collectionName, entry.time);
        }
        return true;
    };

    const recordFeedEntry = (entry: ViewerReplicationFeedEntry): boolean => {
        const key = feedKey(entry);
        if (seenFeed.has(key)) {
            return false;
        }
        seenFeed.add(key);
        if (seenFeed.size > HUB_FEED_LIMIT * 2) {
            seenFeed.clear();
            hub.replicationFeed.forEach(existing => seenFeed.add(feedKey(existing)));
        }
        if (hub.firstEventTime === null || entry.time < hub.firstEventTime) {
            hub.firstEventTime = entry.time;
        }
        hub.replicationFeed.unshift(entry);
        hub.replicationFeed.sort((a, b) => b.time - a.time);
        if (hub.replicationFeed.length > HUB_FEED_LIMIT) {
            hub.replicationFeed.length = HUB_FEED_LIMIT;
        }
        if (entry.direction === 'pull') {
            hub.counters.pulled = hub.counters.pulled + 1;
            hub.pullTimes.push(entry.time);
            hub.pullTimes.sort((a, b) => a - b);
            trimWindow(hub.pullTimes, Date.now());
        } else {
            hub.counters.pushed = hub.counters.pushed + 1;
            hub.pushTimes.push(entry.time);
            hub.pushTimes.sort((a, b) => a - b);
            trimWindow(hub.pushTimes, Date.now());
        }
        return true;
    };

    const removeListener = source.onEvent((name, payload) => {
        if (destroyed) {
            return;
        }
        let recorded = false;
        if (name === 'change') {
            recorded = recordChange(payload as ViewerChangeEntry);
            const collectionName = (payload as ViewerChangeEntry).collectionName;
            if (recorded && !source.listCollections().some(info => info.name === collectionName)) {
                source.refreshCollections().then(() => changed$.next()).catch(() => { });
            }
        } else if (name === 'replication-feed') {
            recorded = recordFeedEntry(payload as ViewerReplicationFeedEntry);
        }
        if (recorded) {
            changed$.next();
        }
    });

    /**
     * Events recorded on the host before this page was ready.
     * Pushed events that raced the backlog request are
     * deduplicated by the seen-sets.
     */
    source.backlog().then(backlog => {
        if (destroyed) {
            return;
        }
        let recorded = false;
        (backlog.changes || []).forEach(entry => {
            recorded = recordChange(entry) || recorded;
        });
        (backlog.replicationFeed || []).forEach(entry => {
            recorded = recordFeedEntry(entry) || recorded;
        });
        if (recorded) {
            changed$.next();
        }
    }).catch(() => { });

    let lastHostReads: number | null = null;
    let lastReplicationsJson = '';
    const poll = () => {
        source.stats().then(snapshot => {
            if (destroyed) {
                return;
            }
            let emit = false;
            hub.isLeader = snapshot.isLeader;
            hub.liveQueryStats = new Map(Object.entries(snapshot.liveQueries || {}));
            if (lastHostReads !== null && snapshot.reads > lastHostReads) {
                const newReads = snapshot.reads - lastHostReads;
                hub.counters.reads = hub.counters.reads + newReads;
                const now = Date.now();
                for (let i = 0; i < Math.min(newReads, 100); i++) {
                    hub.readTimes.push(now);
                }
                trimWindow(hub.readTimes, now);
                emit = true;
            }
            lastHostReads = snapshot.reads;
            const replicationsJson = JSON.stringify(snapshot.replications);
            if (replicationsJson !== lastReplicationsJson) {
                lastReplicationsJson = replicationsJson;
                hub.replications = snapshot.replications;
                emit = true;
            }
            if (emit) {
                changed$.next();
            }
        }).catch(() => { });
    };
    const pollHandle = setInterval(poll, 1000);
    poll();

    return hub;
}
