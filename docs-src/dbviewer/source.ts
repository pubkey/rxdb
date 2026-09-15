import {
    createDumpDataSource
} from '../../src/plugins/dbviewer/dbviewer-data.ts';
import type {
    ViewerCollectionInfo,
    ViewerQueryResult
} from '../../src/plugins/dbviewer/dbviewer-data.ts';
import type {
    RxDBViewerDump,
    ViewerAttachmentInfo,
    ViewerBacklog,
    ViewerExplainResult,
    ViewerInfo,
    ViewerLiveQuerySnapshot,
    ViewerStatsSnapshot,
    ViewerStorageStats
} from '../../src/plugins/dbviewer/dbviewer-types.ts';

export type ViewerRemoteError = Error & {
    code?: string;
    parameters?: any;
};

export type ViewerEventListener = (name: 'change' | 'replication-feed', payload: any) => void;

/**
 * The data access surface of the viewer page. Backed either
 * by the postMessage bridge of the embedding host (live mode)
 * or by an in-page dump (standalone or dump mode).
 * listCollections() is synchronous from a cache so the screens
 * can render without awaiting the collection list everywhere.
 */
export type ViewerSource = {
    kind: 'live' | 'dump';
    readOnly: boolean;
    databaseName: string;
    storageName: string;
    rxdbVersion: string;
    dumpFilename?: string;
    dumpTime?: number;
    listCollections(): ViewerCollectionInfo[];
    refreshCollections(): Promise<void>;
    count(collectionName: string, selector?: any): Promise<number | null>;
    query(collectionName: string, selector: any, skip: number, limit: number): Promise<ViewerQueryResult>;
    getById(collectionName: string, id: string): Promise<any | null>;
    insert(collectionName: string, doc: any): Promise<void>;
    update(collectionName: string, id: string, changedFields: any): Promise<void>;
    removeByIds(collectionName: string, ids: string[]): Promise<void>;
    exportCollection(collectionName: string): Promise<any>;
    explain(collectionName: string, selector: any): Promise<ViewerExplainResult>;
    storageStats(): Promise<ViewerStorageStats>;
    cleanup(): Promise<void>;
    stats(): Promise<ViewerStatsSnapshot>;
    backlog(): Promise<ViewerBacklog>;
    liveQueries(collectionName: string): Promise<ViewerLiveQuerySnapshot[]>;
    getAttachments(collectionName: string, id: string): Promise<ViewerAttachmentInfo[]>;
    getAttachmentData(collectionName: string, id: string, attachmentId: string): Promise<{ base64: string; type: string; } | null>;
    onEvent(listener: ViewerEventListener): () => void;
    destroy(): void;
};

/**
 * RPC client over postMessage against the bridge that the
 * rxdb plugin attaches in the embedding host window.
 * Resolves once the collection list cache is filled.
 */
export async function createRemoteSource(
    info: ViewerInfo,
    hostWindow: Window,
    hostOrigin: string
): Promise<ViewerSource> {
    let requestIdCounter = 0;
    const pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void; }>();
    const listeners = new Set<ViewerEventListener>();
    let collectionsCache: ViewerCollectionInfo[] = [];

    const onMessage = (event: MessageEvent) => {
        if (event.source !== hostWindow) {
            return;
        }
        const data = event.data;
        if (!data || typeof data.type !== 'string') {
            return;
        }
        if (data.type === 'rxdbv-response') {
            const entry = pending.get(data.requestId);
            if (!entry) {
                return;
            }
            pending.delete(data.requestId);
            if (data.error) {
                const error: ViewerRemoteError = new Error(data.error.message);
                error.code = data.error.code;
                error.parameters = data.error.parameters;
                entry.reject(error);
            } else {
                entry.resolve(data.result);
            }
        } else if (data.type === 'rxdbv-event') {
            listeners.forEach(listener => listener(data.name, data.payload));
        }
    };
    window.addEventListener('message', onMessage);

    const call = (method: string, ...params: any[]): Promise<any> => {
        requestIdCounter = requestIdCounter + 1;
        const requestId = requestIdCounter;
        return new Promise((resolve, reject) => {
            pending.set(requestId, { resolve, reject });
            hostWindow.postMessage({
                type: 'rxdbv-request',
                requestId,
                method,
                params
            }, hostOrigin);
        });
    };

    const refreshCollections = async () => {
        collectionsCache = await call('listCollections');
    };
    await refreshCollections();

    return {
        kind: 'live',
        readOnly: !!info.readOnly,
        databaseName: info.databaseName,
        storageName: info.storageName,
        rxdbVersion: info.rxdbVersion,
        listCollections: () => collectionsCache,
        refreshCollections,
        count: (collectionName, selector) => call('count', collectionName, selector),
        query: (collectionName, selector, skip, limit) => call('query', collectionName, selector, skip, limit),
        getById: (collectionName, id) => call('getById', collectionName, id),
        insert: (collectionName, doc) => call('insert', collectionName, doc),
        update: (collectionName, id, changedFields) => call('update', collectionName, id, changedFields),
        removeByIds: (collectionName, ids) => call('removeByIds', collectionName, ids),
        exportCollection: (collectionName) => call('exportCollection', collectionName),
        explain: (collectionName, selector) => call('explain', collectionName, selector),
        storageStats: () => call('storageStats'),
        cleanup: () => call('cleanup'),
        stats: () => call('stats'),
        backlog: () => call('backlog'),
        liveQueries: (collectionName) => call('liveQueries', collectionName),
        getAttachments: (collectionName, id) => call('getAttachments', collectionName, id),
        getAttachmentData: (collectionName, id, attachmentId) => call('getAttachmentData', collectionName, id, attachmentId),
        onEvent(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        destroy() {
            window.removeEventListener('message', onMessage);
            listeners.clear();
            pending.clear();
        }
    };
}

/**
 * In-page source over a static dump. Everything runs locally,
 * writes and live features are not available.
 */
export function createDumpSource(
    dump: RxDBViewerDump,
    dumpFilename?: string,
    rxdbVersion = ''
): ViewerSource {
    const dataSource = createDumpDataSource(dump, dumpFilename);
    return {
        kind: 'dump',
        readOnly: true,
        databaseName: dataSource.databaseName,
        storageName: 'dump',
        rxdbVersion,
        dumpFilename: dataSource.dumpFilename,
        dumpTime: dataSource.dumpTime,
        listCollections: () => dataSource.listCollections(),
        refreshCollections: () => Promise.resolve(),
        count: (collectionName, selector) => dataSource.count(collectionName, selector),
        query: (collectionName, selector, skip, limit) => dataSource.query(collectionName, selector, skip, limit),
        getById: (collectionName, id) => dataSource.getById(collectionName, id),
        insert: (collectionName, doc) => dataSource.insert(collectionName, doc),
        update: (collectionName, id, changedFields) => dataSource.update(collectionName, id, changedFields),
        removeByIds: (collectionName, ids) => dataSource.removeByIds(collectionName, ids),
        exportCollection: (collectionName) => dataSource.exportCollection(collectionName),
        explain: async (collectionName) => {
            const examined = await dataSource.count(collectionName);
            return {
                index: null,
                bounds: [],
                selectorSatisfiedByIndex: false,
                sortSatisfiedByIndex: false,
                unindexedFields: [],
                hasRegex: false,
                examined
            };
        },
        storageStats: async () => {
            const collections = dataSource.listCollections();
            const rows = await Promise.all(collections.map(async collection => ({
                name: collection.name,
                documents: await dataSource.count(collection.name),
                tombstones: 0,
                attachmentBytes: 0,
                attachmentCount: 0
            })));
            return { rows, cleanupSupported: false };
        },
        cleanup: () => Promise.reject(new Error('not available on a dump')),
        stats: () => Promise.resolve({
            replications: [],
            isLeader: null,
            reads: 0,
            liveQueries: {}
        }),
        backlog: () => Promise.resolve({ changes: [], replicationFeed: [] }),
        liveQueries: () => Promise.resolve([]),
        getAttachments: () => Promise.resolve([]),
        getAttachmentData: () => Promise.resolve(null),
        onEvent() {
            return () => undefined;
        },
        destroy() { }
    };
}
