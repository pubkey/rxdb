import { Subject, Subscription } from 'rxjs';
import type { RxCollection, RxDatabase, RxQuery } from '../../types/index.d.ts';
import { countRxQuerySubscribers } from '../../query-cache.ts';
import { REPLICATION_STATE_BY_COLLECTION } from '../replication/index.ts';
import type { RxReplicationState } from '../replication/index.ts';
import type {
    DbViewerChangeRecord,
    DbViewerCollectionView,
    DbViewerConnection,
    DbViewerDumpInfo,
    DbViewerLiveEvent,
    DbViewerNavigation,
    DbViewerQueryEntry,
    DbViewerReplicationRecord,
    DbViewerSurface
} from '../../types/index.d.ts';

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
    migration: { done: number; total: number; fromVersion: number; toVersion: number; } | null;
};

export type LiveQueryInfo = {
    query: RxQuery;
    subscribers: number;
    stringRepresentation: string;
    resultCount: number;
    emitCount: number;
    lastEmitAt: number;
};

export function createCollectionView(): DbViewerCollectionView {
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
 * Owns everything the panels read: navigation, per collection view state,
 * the recorded feeds and the 60 second activity counters.
 */
export class DbViewerStore {
    public navigation: DbViewerNavigation;
    /**
     * The collection the user looked at last. The tool panels are scoped
     * to it, so opening Schema or Query lab keeps analysing the collection
     * that was on screen instead of jumping to another one.
     */
    public lastCollectionName: string | null = null;
    public connection: DbViewerConnection;
    public readonly surface: DbViewerSurface;
    public readonly dump: DbViewerDumpInfo | null;
    public readonly pageSize: number;

    public readonly views = new Map<string, DbViewerCollectionView>();
    public readonly metrics = new Map<string, CollectionMetrics>();
    public readonly queryHistory: DbViewerQueryEntry[] = [];

    public changes: DbViewerChangeRecord[] = [];
    public changesPaused = false;
    public changesFilter = '';
    public selectedChangeIndex = 0;

    public replicationFeed: DbViewerReplicationRecord[] = [];
    public replicationFeedPaused = false;
    public replicationErrors = new Map<string, { message: string; time: number; attempts: number; }>();

    public livePaused = false;
    public liveSubPanel: null | { kind: 'instances'; } | { kind: 'queries'; collectionName: string; } = null;
    public viewerWriteCount = 0;
    public sessionWriteCount = 0;
    /**
     * Ids of documents the database viewer itself wrote, so that the Live map
     * can separate them from the writes the app makes.
     */
    private viewerWrites = new Set<string>();

    public readonly liveEvents$ = new Subject<DbViewerLiveEvent>();
    public readonly changed$ = new Subject<void>();

    private subscriptions: Subscription[] = [];
    private intervals: ReturnType<typeof setInterval>[] = [];
    private lastQueryExecCounts = new Map<number, number>();
    private queryEmitState = new Map<number, { result: unknown; count: number; lastEmitAt: number; }>();
    private trackedReplications = new WeakSet<RxReplicationState<any, any>>();

    constructor(
        public readonly database: RxDatabase,
        options: {
            surface: DbViewerSurface;
            dump: DbViewerDumpInfo | null;
            pageSize: number;
            connection: DbViewerConnection;
            navigation: DbViewerNavigation;
        }
    ) {
        this.surface = options.surface;
        this.dump = options.dump;
        this.pageSize = options.pageSize;
        this.connection = options.connection;
        this.navigation = options.navigation;
        if (options.navigation.kind === 'collection') {
            this.lastCollectionName = options.navigation.name;
        }
    }

    public get readOnly(): boolean {
        if (this.dump) {
            return true;
        }
        return this.connection.state === 'connected' && !this.connection.writeable;
    }

    public get collectionNames(): string[] {
        return Object.keys(this.database.collections).sort();
    }

    public getView(collectionName: string): DbViewerCollectionView {
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
                documentCount: 0,
                migration: null
            };
            this.metrics.set(collectionName, metrics);
        }
        return metrics;
    }

    public markDbViewerWrite(collectionName: string, documentId: string): void {
        this.viewerWrites.add(collectionName + '|' + documentId);
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
        this.changed$.next();
    }

    public getReplicationStates(collectionName: string): RxReplicationState<any, any>[] {
        const collection = this.database.collections[collectionName];
        if (!collection) {
            return [];
        }
        return REPLICATION_STATE_BY_COLLECTION.get(collection as RxCollection) ?? [];
    }

    public getLiveQueries(collectionName: string): LiveQueryInfo[] {
        const collection = this.database.collections[collectionName];
        if (!collection) {
            return [];
        }
        const result: LiveQueryInfo[] = [];
        collection._queryCache._map.forEach((query, stringRepresentation) => {
            const emitState = this.queryEmitState.get(query.id);
            result.push({
                query,
                subscribers: countRxQuerySubscribers(query),
                stringRepresentation,
                resultCount: getQueryResultCount(query),
                emitCount: emitState ? emitState.count : 0,
                lastEmitAt: emitState ? emitState.lastEmitAt : 0
            });
        });
        return result.sort((a, b) => b.subscribers - a.subscribers);
    }

    public start(): void {
        this.subscriptions.push(
            this.database.$.subscribe(changeEvent => {
                if (changeEvent.isLocal || !changeEvent.collectionName) {
                    return;
                }
                this.recordChange(changeEvent);
            })
        );
        this.attachReplications();
        this.intervals.push(setInterval(() => {
            this.attachReplications();
            this.pollQueryActivity();
            this.pollDocumentCounts();
            this.changed$.next();
        }, 1000));
    }

    private recordChange(changeEvent: any): void {
        const now = Date.now();
        const collectionName: string = changeEvent.collectionName;
        const metrics = this.getMetrics(collectionName);
        metrics.writes.add(now);
        metrics.lastWriteAt = now;
        this.sessionWriteCount++;

        const key = collectionName + '|' + changeEvent.documentId;
        const fromDbViewer = this.viewerWrites.delete(key);
        if (fromDbViewer) {
            this.viewerWriteCount++;
        }

        this.liveEvents$.next({
            kind: changeEvent.operation.toLowerCase() as 'insert' | 'update' | 'delete',
            collectionName,
            fromDbViewer
        });

        if (!this.changesPaused) {
            this.changes.unshift({
                time: now,
                operation: changeEvent.operation,
                collectionName,
                documentId: changeEvent.documentId,
                previousRevision: changeEvent.previousDocumentData
                    ? changeEvent.previousDocumentData._rev
                    : undefined,
                revision: changeEvent.documentData ? changeEvent.documentData._rev : '',
                documentData: changeEvent.documentData,
                previousDocumentData: changeEvent.previousDocumentData,
                source: fromDbViewer ? 'db-viewer' : 'local'
            });
            if (this.changes.length > CHANGES_BUFFER_SIZE) {
                this.changes.length = CHANGES_BUFFER_SIZE;
            }
            if (this.selectedChangeIndex > 0) {
                this.selectedChangeIndex++;
            }
        }
    }

    /**
     * Replications can be started at any time, so the set is re-checked
     * on every tick and newly seen states get their feeds attached once.
     */
    private attachReplications(): void {
        this.collectionNames.forEach(collectionName => {
            this.getReplicationStates(collectionName).forEach(replicationState => {
                if (this.trackedReplications.has(replicationState)) {
                    return;
                }
                this.trackedReplications.add(replicationState);
                this.subscriptions.push(
                    replicationState.received$.subscribe(document => {
                        this.recordReplication('pull', collectionName, document);
                    }),
                    replicationState.sent$.subscribe(document => {
                        this.recordReplication('push', collectionName, document);
                    }),
                    replicationState.error$.subscribe(error => {
                        const previous = this.replicationErrors.get(collectionName);
                        this.replicationErrors.set(collectionName, {
                            message: (error as Error).message ?? String(error),
                            time: Date.now(),
                            attempts: previous ? previous.attempts + 1 : 1
                        });
                        this.changed$.next();
                    })
                );
            });
        });
    }

    private recordReplication(direction: 'pull' | 'push', collectionName: string, document: any): void {
        const now = Date.now();
        const metrics = this.getMetrics(collectionName);
        if (direction === 'pull') {
            metrics.pulls.add(now);
        } else {
            metrics.pushes.add(now);
        }
        this.liveEvents$.next({ kind: direction, collectionName });
        if (this.replicationFeedPaused) {
            return;
        }
        const primaryPath = this.database.collections[collectionName]
            ? this.database.collections[collectionName].schema.primaryPath
            : 'id';
        this.replicationFeed.unshift({
            time: now,
            direction,
            collectionName,
            documentId: String(document[primaryPath] ?? ''),
            revision: document._rev ?? '',
            bytes: estimateBytes(document)
        });
        if (this.replicationFeed.length > REPLICATION_BUFFER_SIZE) {
            this.replicationFeed.length = REPLICATION_BUFFER_SIZE;
        }
    }

    /**
     * RxDB does not emit read events, so reads and live-query emits are
     * derived from the query cache: every execution against the storage
     * increases `_execOverDatabaseCount`, and a new result object on a
     * cached query means that query re-emitted.
     */
    private pollQueryActivity(): void {
        const now = Date.now();
        const seenQueryIds = new Set<number>();
        this.collectionNames.forEach(collectionName => {
            const collection = this.database.collections[collectionName];
            const metrics = this.getMetrics(collectionName);
            collection._queryCache._map.forEach(query => {
                seenQueryIds.add(query.id);
                const previousExecutions = this.lastQueryExecCounts.get(query.id) ?? 0;
                const executions = query._execOverDatabaseCount;
                if (executions > previousExecutions) {
                    metrics.reads.add(now, executions - previousExecutions);
                    this.liveEvents$.next({ kind: 'query', collectionName });
                }
                this.lastQueryExecCounts.set(query.id, executions);

                const emitState = this.queryEmitState.get(query.id);
                const result = query._result;
                if (!emitState) {
                    this.queryEmitState.set(query.id, { result, count: 0, lastEmitAt: 0 });
                } else if (result && result !== emitState.result) {
                    emitState.result = result;
                    emitState.count++;
                    emitState.lastEmitAt = now;
                    if (countRxQuerySubscribers(query) > 0) {
                        this.liveEvents$.next({ kind: 'emit', collectionName });
                    }
                }
            });
        });
        this.lastQueryExecCounts.forEach((_value, queryId) => {
            if (!seenQueryIds.has(queryId)) {
                this.lastQueryExecCounts.delete(queryId);
                this.queryEmitState.delete(queryId);
            }
        });
    }

    private pollDocumentCounts(): void {
        this.collectionNames.forEach(collectionName => {
            const metrics = this.getMetrics(collectionName);
            this.database.collections[collectionName].count().exec().then(count => {
                if (metrics.documentCount !== count) {
                    metrics.documentCount = count;
                }
            }).catch(() => {
                // a closed collection simply keeps its last known count
            });
        });
    }

    public destroy(): void {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        this.subscriptions = [];
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.liveEvents$.complete();
        this.changed$.complete();
    }
}

function getQueryResultCount(query: RxQuery): number {
    const result: any = query._result;
    if (!result) {
        return 0;
    }
    if (Array.isArray(result.docsData)) {
        return result.docsData.length;
    }
    return 0;
}

export function estimateBytes(document: any): number {
    try {
        return JSON.stringify(document).length;
    } catch (error) {
        return 0;
    }
}
