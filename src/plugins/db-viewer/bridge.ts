import { Subscription } from 'rxjs';
import type { RxDatabase } from '../../types/index.d.ts';
import type {
    DbViewerConnection,
    DbViewerDumpInfo,
    DbViewerNavigation,
    DbViewerSurface
} from '../../types/index.d.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';
import {
    DB_VIEWER_CHANNEL,
    DB_VIEWER_PROTOCOL_VERSION,
    isDbViewerMessage
} from './protocol.ts';
import type {
    DbViewerConnectionWire,
    DbViewerHostMessage,
    DbViewerMethodName,
    DbViewerPushChannel,
    DbViewerPushes,
    DbViewerRequestMessage,
    DbViewerSnapshot
} from './protocol.ts';
import {
    buildSchemaReport,
    buildStorageReport,
    collectCollectionInfo,
    collectCounts,
    collectDocuments,
    collectLiveQueries,
    explainQuery,
    getReplicationStates,
    hasCleanupPlugin,
    readLeadership
} from './collect.ts';
import type { RxReplicationState } from '../replication/index.ts';

const CHANGES_POLL_MS = 1000;

export type BridgeOptions = {
    surface: DbViewerSurface;
    pageSize: number;
    storageName: string;
    dump: DbViewerDumpInfo | null;
    connection: DbViewerConnection;
    navigation: DbViewerNavigation;
    onOpenDumpFile?: () => void;
    onClose: () => void;
};

/**
 * Answers the viewer that runs in the iframe.
 *
 * The viewer is a cross origin page, so every message is checked against the
 * window of the iframe and the origin the page was loaded from before it is
 * read, and every reply names that origin instead of `*`.
 */
export class DbViewerBridge {
    private subscriptions: Subscription[] = [];
    private intervals: ReturnType<typeof setInterval>[] = [];
    private trackedReplications = new WeakSet<RxReplicationState<any, any>>();
    private replicationErrors = new Map<string, { message: string; time: number; attempts: number; }>();
    private viewerWrites = new Set<string>();
    private lastQueryExecCounts = new Map<number, number>();
    private queryEmitState = new Map<number, { result: unknown; count: number; lastEmitAt: number; }>();
    private lastCounts: { [collectionName: string]: number; } = {};
    private connected = false;
    private destroyed = false;
    private readonly onMessage = (event: MessageEvent) => this.receive(event);

    constructor(
        public readonly database: RxDatabase,
        private readonly iframe: HTMLIFrameElement,
        private readonly viewerOrigin: string,
        private options: BridgeOptions
    ) { }

    public start(): void {
        /**
         * There is no window while server rendering, and none in the tests
         * that drive `receive()` directly. Everything below still works,
         * only the messages of a real iframe cannot arrive.
         */
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.onMessage);
        }
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
        }, CHANGES_POLL_MS));
    }

    public setConnection(connection: DbViewerConnection): void {
        this.options.connection = connection;
        this.push('connection', toWireConnection(connection));
    }

    public navigate(navigation: DbViewerNavigation): void {
        this.options.navigation = navigation;
        this.push('navigate', navigation);
    }

    public refresh(): void {
        this.push('refresh', null);
    }

    public destroy(): void {
        this.destroyed = true;
        if (typeof window !== 'undefined') {
            window.removeEventListener('message', this.onMessage);
        }
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        this.subscriptions = [];
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
    }

    private get readOnly(): boolean {
        if (this.options.dump) {
            return true;
        }
        const connection = this.options.connection;
        return connection.state === 'connected' && !connection.writeable;
    }

    /**
     * A message is only read when it comes out of the window of our own
     * iframe and carries the origin the viewer page was loaded from.
     * Anything else on the page can post to us and must be ignored.
     */
    private receive(event: MessageEvent): void {
        if (this.destroyed) {
            return;
        }
        if (event.source !== this.iframe.contentWindow) {
            return;
        }
        if (event.origin !== this.viewerOrigin) {
            return;
        }
        if (!isDbViewerMessage(event.data)) {
            return;
        }
        if (event.data.kind === 'hello') {
            this.connected = true;
            this.post({
                channel: DB_VIEWER_CHANNEL,
                version: DB_VIEWER_PROTOCOL_VERSION,
                kind: 'welcome'
            });
            return;
        }
        if (event.data.kind === 'request') {
            void this.answer(event.data as DbViewerRequestMessage);
        }
    }

    private async answer(request: DbViewerRequestMessage): Promise<void> {
        let message: DbViewerHostMessage;
        try {
            const result = await this.dispatch(request.method, request.params as any);
            message = {
                channel: DB_VIEWER_CHANNEL,
                version: DB_VIEWER_PROTOCOL_VERSION,
                kind: 'response',
                id: request.id,
                ok: true,
                result
            } as DbViewerHostMessage;
        } catch (error) {
            message = {
                channel: DB_VIEWER_CHANNEL,
                version: DB_VIEWER_PROTOCOL_VERSION,
                kind: 'response',
                id: request.id,
                ok: false,
                error: (error as Error).message ?? String(error)
            } as DbViewerHostMessage;
        }
        this.post(message);
    }

    private assertWriteable(): void {
        if (this.readOnly) {
            throw new Error('the database viewer is read-only in this mode');
        }
    }

    private async dispatch(method: DbViewerMethodName, params: any): Promise<any> {
        switch (method) {
            case 'snapshot':
                return this.buildSnapshot();
            case 'documents':
                return collectDocuments(this.database, params);
            case 'counts':
                return collectCounts(this.database);
            case 'countMatching': {
                const collection = this.database.collections[params.collectionName];
                return { total: await collection.count({ selector: params.selector }).exec() };
            }
            case 'upsert': {
                this.assertWriteable();
                const collection = this.database.collections[params.collectionName];
                const primaryPath = collection.schema.primaryPath as string;
                const documentId = String(params.document[primaryPath]);
                this.viewerWrites.add(params.collectionName + '|' + documentId);
                await collection.upsert(params.document);
                return { documentId };
            }
            case 'patch': {
                this.assertWriteable();
                const collection = this.database.collections[params.collectionName];
                const rxDocument = await collection.findOne(params.documentId).exec();
                if (!rxDocument) {
                    throw new Error('document ' + params.documentId + ' no longer exists');
                }
                this.viewerWrites.add(params.collectionName + '|' + params.documentId);
                await rxDocument.incrementalPatch(params.patch);
                return { documentId: params.documentId };
            }
            case 'remove': {
                this.assertWriteable();
                const collection = this.database.collections[params.collectionName];
                params.documentIds.forEach((documentId: string) => {
                    this.viewerWrites.add(params.collectionName + '|' + documentId);
                });
                const result = await collection.bulkRemove(params.documentIds);
                return { removed: result.success.length };
            }
            case 'explain':
                return explainQuery(this.database, params);
            case 'schemaReport':
                return buildSchemaReport(this.database, params);
            case 'storageReport':
                return buildStorageReport(this.database, params);
            case 'cleanup': {
                this.assertWriteable();
                const collection: any = this.database.collections[params.collectionName];
                if (typeof collection.cleanup !== 'function') {
                    return { ran: false };
                }
                await collection.cleanup();
                return { ran: true };
            }
            case 'liveQueries':
                return collectLiveQueries(this.database, params.collectionName, this.queryEmitState);
            case 'exportJson': {
                const database: any = this.database;
                if (typeof database.exportJSON !== 'function') {
                    throw new Error('the json-dump plugin is not added');
                }
                return { json: await database.exportJSON() };
            }
            case 'disconnect': {
                const connection: any = this.options.connection;
                if (connection.state === 'connected' && typeof connection.onDisconnect === 'function') {
                    connection.onDisconnect();
                    return { ok: true };
                }
                return { ok: false };
            }
            case 'openDumpFile': {
                if (typeof this.options.onOpenDumpFile === 'function') {
                    this.options.onOpenDumpFile();
                    return { ok: true };
                }
                return { ok: false };
            }
            case 'close':
                this.options.onClose();
                return { ok: true };
            default:
                throw new Error('unknown method ' + method);
        }
    }

    private async buildSnapshot(): Promise<DbViewerSnapshot> {
        const names = Object.keys(this.database.collections).sort();
        const collections = await Promise.all(
            names.map(name => collectCollectionInfo(this.database, name, this.replicationErrors))
        );
        collections.forEach(collection => {
            this.lastCounts[collection.name] = collection.documentCount;
        });
        return {
            protocolVersion: DB_VIEWER_PROTOCOL_VERSION,
            databaseName: this.database.name,
            storageName: this.options.storageName,
            rxdbVersion: RXDB_VERSION,
            surface: this.options.surface,
            pageSize: this.options.pageSize,
            readOnly: this.readOnly,
            dump: this.options.dump,
            connection: toWireConnection(this.options.connection),
            navigation: this.options.navigation,
            collections,
            canOpenDumpFile: typeof this.options.onOpenDumpFile === 'function',
            hasCleanupPlugin: hasCleanupPlugin(this.database),
            isLeader: readLeadership(this.database)
        };
    }

    private push<C extends DbViewerPushChannel>(stream: C, payload: DbViewerPushes[C]): void {
        if (!this.connected) {
            return;
        }
        this.post({
            channel: DB_VIEWER_CHANNEL,
            version: DB_VIEWER_PROTOCOL_VERSION,
            kind: 'push',
            stream,
            payload
        } as DbViewerHostMessage);
    }

    private post(message: DbViewerHostMessage): void {
        const target = this.iframe.contentWindow;
        if (!target || this.destroyed) {
            return;
        }
        target.postMessage(message, this.viewerOrigin);
    }

    private recordChange(changeEvent: any): void {
        const collectionName: string = changeEvent.collectionName;
        const key = collectionName + '|' + changeEvent.documentId;
        const fromDbViewer = this.viewerWrites.delete(key);

        this.push('live', {
            kind: changeEvent.operation.toLowerCase() as 'insert' | 'update' | 'delete',
            collectionName,
            fromDbViewer
        });
        this.push('change', {
            time: Date.now(),
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
    }

    /**
     * Replications can be started at any time, so the set is re-checked on
     * every tick and newly seen states get their feeds attached once.
     */
    private attachReplications(): void {
        Object.keys(this.database.collections).forEach(collectionName => {
            getReplicationStates(this.database, collectionName).forEach(replicationState => {
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
                    })
                );
            });
        });
    }

    private recordReplication(direction: 'pull' | 'push', collectionName: string, document: any): void {
        this.push('live', { kind: direction, collectionName });
        const collection = this.database.collections[collectionName];
        const primaryPath = collection ? collection.schema.primaryPath : 'id';
        this.push('replication', {
            time: Date.now(),
            direction,
            collectionName,
            documentId: String(document[primaryPath] ?? ''),
            revision: document._rev ?? '',
            bytes: estimateBytes(document)
        });
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
        Object.keys(this.database.collections).forEach(collectionName => {
            const collection: any = this.database.collections[collectionName];
            collection._queryCache._map.forEach((query: any) => {
                seenQueryIds.add(query.id);
                const previousExecutions = this.lastQueryExecCounts.get(query.id) ?? 0;
                const executions = query._execOverDatabaseCount;
                if (executions > previousExecutions) {
                    this.push('live', { kind: 'query', collectionName });
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
                    this.push('live', { kind: 'emit', collectionName });
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
        collectCounts(this.database).then(counts => {
            const changed = Object.keys(counts).some(
                name => this.lastCounts[name] !== counts[name]
            );
            if (changed) {
                this.lastCounts = counts;
                this.push('counts', counts);
            }
        }).catch(() => {
            // a closed collection simply keeps its last known count
        });
    }
}

/**
 * `onDisconnect` is a function and cannot be cloned into the iframe,
 * so it is replaced by a flag and reached with the `disconnect` method.
 */
export function toWireConnection(connection: DbViewerConnection): DbViewerConnectionWire {
    if (connection.state === 'connected') {
        return {
            state: 'connected',
            device: connection.device,
            transport: connection.transport,
            writeable: connection.writeable,
            roundTripMs: connection.roundTripMs,
            canDisconnect: typeof connection.onDisconnect === 'function'
        };
    }
    return connection;
}

export function estimateBytes(document: any): number {
    try {
        return JSON.stringify(document).length;
    } catch (error) {
        return 0;
    }
}
