import type {
    DbViewerChangeRecord,
    DbViewerLiveEvent,
    DbViewerNavigation,
    DbViewerReplicationRecord,
    DbViewerSort
} from '../../src/types/index.d.ts';
import type {
    DbViewerConnectionWire,
    DbViewerSnapshot
} from '../../src/plugins/db-viewer/protocol.ts';

export const METRICS_BUCKET_MS = 2000;
export const METRICS_BUCKET_COUNT = 30;
export const METRICS_WINDOW_MS = METRICS_BUCKET_MS * METRICS_BUCKET_COUNT;

export const CHANGES_BUFFER_SIZE = 500;
export const REPLICATION_BUFFER_SIZE = 500;
export const QUERY_HISTORY_SIZE = 20;

/**
 * A fixed 60 second window of counters, split into 2 second buckets.
 * Old buckets are zeroed when time moves on so that the window
 * never grows and never needs an array copy per event.
 */
export class RollingWindow {
    public buckets: number[] = new Array(METRICS_BUCKET_COUNT).fill(0);
    private headIndex = 0;
    private headStart = 0;

    constructor(now: number) {
        this.headStart = Math.floor(now / METRICS_BUCKET_MS) * METRICS_BUCKET_MS;
    }

    public rotate(now: number): void {
        const steps = Math.floor((now - this.headStart) / METRICS_BUCKET_MS);
        if (steps <= 0) {
            return;
        }
        const toClear = Math.min(steps, METRICS_BUCKET_COUNT);
        for (let offset = 1; offset <= toClear; offset++) {
            this.buckets[(this.headIndex + offset) % METRICS_BUCKET_COUNT] = 0;
        }
        this.headIndex = (this.headIndex + steps) % METRICS_BUCKET_COUNT;
        this.headStart = this.headStart + (steps * METRICS_BUCKET_MS);
    }

    public add(now: number, amount = 1): void {
        this.rotate(now);
        this.buckets[this.headIndex] += amount;
    }

    public total(now: number): number {
        this.rotate(now);
        return this.buckets.reduce((sum, value) => sum + value, 0);
    }

    /**
     * Oldest bucket first, which is the order the sparkline draws in.
     */
    public series(now: number): number[] {
        this.rotate(now);
        const result: number[] = [];
        for (let offset = 1; offset <= METRICS_BUCKET_COUNT; offset++) {
            result.push(this.buckets[(this.headIndex + offset) % METRICS_BUCKET_COUNT]);
        }
        return result;
    }
}

export type CollectionMetrics = {
    writes: RollingWindow;
    reads: RollingWindow;
    pulls: RollingWindow;
    pushes: RollingWindow;
    lastWriteAt: number;
    documentCount: number;
};

export type QueryEntry = {
    selector: string;
    name?: string;
    favourite: boolean;
    usedAt: number;
};

/**
 * Per collection UI state. None of this is known to the host, it only
 * describes what the user has open in front of them.
 */
export type CollectionView = {
    queryInput: string;
    selector: any;
    queryError: { message: string; position: number; } | null;
    view: 'table' | 'json';
    page: number;
    sort: DbViewerSort;
    selection: Set<string>;
    observe: boolean;
    openDocumentId: string | null;
    stagedEdits: { [fieldPath: string]: any; };
    expandedFields: Set<string>;
    editingCell: { documentId: string; field: string; } | null;
    historyOpen: boolean;
};

export function createCollectionView(): CollectionView {
    return {
        queryInput: '{}',
        selector: {},
        queryError: null,
        view: 'table',
        page: 0,
        sort: { field: '_meta.lwt', direction: 'desc' },
        selection: new Set(),
        observe: false,
        openDocumentId: null,
        stagedEdits: {},
        expandedFields: new Set(),
        editingCell: null,
        historyOpen: false
    };
}

/**
 * Owns everything the panels read: the snapshot the host sent, navigation,
 * per collection view state, the recorded feeds and the 60 second counters.
 *
 * It is a plain mutable object that bumps `version` whenever something
 * changed, which React subscribes to with `useSyncExternalStore`.
 */
export class ViewerStore {
    public version = 0;
    public snapshot: DbViewerSnapshot | null = null;
    public connection: DbViewerConnectionWire = { state: 'local' };
    public navigation: DbViewerNavigation = { kind: 'tool', tool: 'live' };
    /**
     * The collection the user looked at last. The tool panels are scoped to
     * it, so opening Schema or Query lab keeps analysing the collection that
     * was on screen instead of jumping to another one.
     */
    public lastCollectionName: string | null = null;
    public counts: { [collectionName: string]: number; } = {};
    public error: string | null = null;

    public readonly views = new Map<string, CollectionView>();
    public readonly metrics = new Map<string, CollectionMetrics>();
    public readonly queryHistory: QueryEntry[] = [];

    public changes: DbViewerChangeRecord[] = [];
    public changesPaused = false;
    public changesFilter = '';
    public selectedChangeIndex = 0;

    public replicationFeed: DbViewerReplicationRecord[] = [];
    public replicationFeedPaused = false;

    public livePaused = false;
    public liveSubPanel: null | { kind: 'instances'; } | { kind: 'queries'; collectionName: string; } = null;
    public viewerWriteCount = 0;
    public sessionWriteCount = 0;

    private listeners = new Set<() => void>();

    public subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    public getVersion = (): number => this.version;

    public emit(): void {
        this.version++;
        this.listeners.forEach(listener => listener());
    }

    public get collectionNames(): string[] {
        return this.snapshot ? this.snapshot.collections.map(collection => collection.name) : [];
    }

    public get readOnly(): boolean {
        if (this.snapshot && this.snapshot.dump) {
            return true;
        }
        return this.connection.state === 'connected' && !this.connection.writeable;
    }

    public getCollection(collectionName: string) {
        return this.snapshot
            ? this.snapshot.collections.find(collection => collection.name === collectionName)
            : undefined;
    }

    /**
     * The collection the tool panels analyse: whatever is navigated to, and
     * otherwise the one that was open last.
     */
    public get scopedCollectionName(): string {
        if (this.navigation.kind === 'collection' || this.navigation.kind === 'replication') {
            return this.navigation.name;
        }
        return this.lastCollectionName ?? this.collectionNames[0] ?? '';
    }

    public getView(collectionName: string): CollectionView {
        let view = this.views.get(collectionName);
        if (!view) {
            view = createCollectionView();
            this.views.set(collectionName, view);
        }
        return view;
    }

    public getMetrics(collectionName: string): CollectionMetrics {
        let metrics = this.metrics.get(collectionName);
        if (!metrics) {
            const now = Date.now();
            metrics = {
                writes: new RollingWindow(now),
                reads: new RollingWindow(now),
                pulls: new RollingWindow(now),
                pushes: new RollingWindow(now),
                lastWriteAt: 0,
                documentCount: 0
            };
            this.metrics.set(collectionName, metrics);
        }
        return metrics;
    }

    public navigate(navigation: DbViewerNavigation): void {
        this.navigation = navigation;
        if (navigation.kind === 'collection' || navigation.kind === 'replication') {
            this.lastCollectionName = navigation.name;
        }
        this.emit();
    }

    public applySnapshot(snapshot: DbViewerSnapshot): void {
        this.snapshot = snapshot;
        this.connection = snapshot.connection;
        this.navigation = snapshot.navigation;
        if (snapshot.navigation.kind === 'collection') {
            this.lastCollectionName = snapshot.navigation.name;
        }
        snapshot.collections.forEach(collection => {
            this.counts[collection.name] = collection.documentCount;
            this.getMetrics(collection.name).documentCount = collection.documentCount;
        });
        this.emit();
    }

    public applyCounts(counts: { [collectionName: string]: number; }): void {
        this.counts = counts;
        Object.keys(counts).forEach(name => {
            this.getMetrics(name).documentCount = counts[name];
        });
        this.emit();
    }

    public recordLive(event: DbViewerLiveEvent): void {
        const now = Date.now();
        const metrics = this.getMetrics(event.collectionName);
        if (event.kind === 'insert' || event.kind === 'update' || event.kind === 'delete') {
            metrics.writes.add(now);
            metrics.lastWriteAt = now;
            this.sessionWriteCount++;
            if (event.fromDbViewer) {
                this.viewerWriteCount++;
            }
        } else if (event.kind === 'query' || event.kind === 'emit') {
            metrics.reads.add(now);
        } else if (event.kind === 'pull') {
            metrics.pulls.add(now);
        } else if (event.kind === 'push') {
            metrics.pushes.add(now);
        }
    }

    public recordChange(record: DbViewerChangeRecord): void {
        if (this.changesPaused) {
            return;
        }
        this.changes.unshift(record);
        if (this.changes.length > CHANGES_BUFFER_SIZE) {
            this.changes.length = CHANGES_BUFFER_SIZE;
        }
        if (this.selectedChangeIndex > 0) {
            this.selectedChangeIndex++;
        }
    }

    public recordReplication(record: DbViewerReplicationRecord): void {
        if (this.replicationFeedPaused) {
            return;
        }
        this.replicationFeed.unshift(record);
        if (this.replicationFeed.length > REPLICATION_BUFFER_SIZE) {
            this.replicationFeed.length = REPLICATION_BUFFER_SIZE;
        }
    }

    public rememberQuery(selector: string): void {
        const existingIndex = this.queryHistory.findIndex(
            entry => entry.selector === selector && !entry.favourite
        );
        if (existingIndex >= 0) {
            this.queryHistory[existingIndex].usedAt = Date.now();
        } else {
            this.queryHistory.unshift({ selector, favourite: false, usedAt: Date.now() });
        }
        const recent = this.queryHistory.filter(entry => !entry.favourite);
        if (recent.length > QUERY_HISTORY_SIZE) {
            const drop = new Set(recent.slice(QUERY_HISTORY_SIZE));
            this.queryHistory.splice(
                0,
                this.queryHistory.length,
                ...this.queryHistory.filter(entry => !drop.has(entry))
            );
        }
    }

    public toggleFavourite(selector: string, name?: string): void {
        const entry = this.queryHistory.find(candidate => candidate.selector === selector);
        if (entry) {
            entry.favourite = !entry.favourite;
            entry.name = entry.favourite ? (name ?? entry.name ?? selector) : undefined;
        } else {
            this.queryHistory.unshift({
                selector,
                favourite: true,
                name: name ?? selector,
                usedAt: Date.now()
            });
        }
        this.emit();
    }
}
