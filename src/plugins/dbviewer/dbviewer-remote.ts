import type {
    RxDatabase
} from '../../index.d.ts';
import {
    collectViewerStorageStats,
    explainViewerQuery,
    runViewerCleanup
} from './dbviewer-analyze.ts';
import type { ViewerDataSource } from './dbviewer-data.ts';
import {
    readQueryCache,
    type ViewerEventHub
} from './dbviewer-events.ts';
import { sanitizeViewerValue } from './dbviewer-helpers.ts';
import type {
    ViewerBridgeResponseMessage,
    ViewerInfo,
    ViewerStatsSnapshot
} from './dbviewer-types.ts';

export type ViewerBridgeOptions = {
    database: RxDatabase;
    source: ViewerDataSource;
    hub: ViewerEventHub;
    info: ViewerInfo;
    targetWindow: Window;
    targetOrigin: string;
};

export type ViewerBridgeHandle = {
    destroy: () => void;
};

/**
 * Serves the viewer page inside the iframe over postMessage:
 * request/response calls for data access and pushed events for
 * the live feeds. Everything that touches rxdb internals runs
 * here on the host side, the page itself stays plain UI.
 */
export function attachViewerBridge(options: ViewerBridgeOptions): ViewerBridgeHandle {
    const {
        database,
        source,
        hub,
        info,
        targetWindow,
        targetOrigin
    } = options;
    let destroyed = false;

    const post = (message: any) => {
        if (!destroyed) {
            targetWindow.postMessage(message, targetOrigin);
        }
    };

    const methods: { [method: string]: (...params: any[]) => Promise<any>; } = {
        info: () => Promise.resolve(info),
        listCollections: () => Promise.resolve(source.listCollections()),
        count: (collectionName: string, selector?: any) => source.count(collectionName, selector),
        query: (collectionName: string, selector: any, skip: number, limit: number) =>
            source.query(collectionName, selector, skip, limit),
        getById: (collectionName: string, id: string) => source.getById(collectionName, id),
        insert: (collectionName: string, doc: any) => source.insert(collectionName, doc),
        update: (collectionName: string, id: string, changedFields: any) =>
            source.update(collectionName, id, changedFields),
        removeByIds: (collectionName: string, ids: string[]) => source.removeByIds(collectionName, ids),
        exportCollection: (collectionName: string) => source.exportCollection(collectionName),
        explain: (collectionName: string, selector: any) =>
            explainViewerQuery(database, collectionName, selector),
        storageStats: () => collectViewerStorageStats(database),
        cleanup: () => runViewerCleanup(database),
        backlog: () => Promise.resolve({
            changes: hub.changes.slice(),
            replicationFeed: hub.replicationFeed.slice()
        }),
        stats: () => {
            const liveQueries: { [collectionName: string]: { count: number; execCount: number; }; } = {};
            Object.entries(database.collections).forEach(([name, collection]) => {
                if (!name.startsWith('_')) {
                    const cached = readQueryCache(collection as any);
                    liveQueries[name] = {
                        count: cached.length,
                        execCount: cached.reduce((sum, query) => sum + query.execCount, 0)
                    };
                }
            });
            let isLeader: boolean | null = null;
            if (typeof (database as any).isLeader === 'function') {
                try {
                    isLeader = (database as any).isLeader();
                } catch (err) {
                    isLeader = null;
                }
            }
            const snapshot: ViewerStatsSnapshot = {
                replications: hub.replications.map(replication => ({
                    collectionName: replication.collectionName,
                    identifier: replication.identifier,
                    active: replication.active,
                    stopped: replication.stopped,
                    lastError: replication.lastError,
                    lastErrorTime: replication.lastErrorTime
                })),
                isLeader,
                reads: hub.counters.reads,
                liveQueries
            };
            return Promise.resolve(snapshot);
        },
        liveQueries: (collectionName: string) => {
            const collection = (database.collections as any)[collectionName];
            return Promise.resolve(collection ? readQueryCache(collection) : []);
        },
        getAttachments: async (collectionName: string, id: string) => {
            const collection = (database.collections as any)[collectionName];
            if (!collection) {
                return [];
            }
            const rxDocument = await collection.findOne(id).exec();
            if (!rxDocument || typeof rxDocument.allAttachments !== 'function') {
                return [];
            }
            try {
                return rxDocument.allAttachments().map((attachment: any) => ({
                    id: attachment.id,
                    type: attachment.type || '',
                    length: attachment.length || 0
                }));
            } catch (err) {
                return [];
            }
        },
        getAttachmentData: async (collectionName: string, id: string, attachmentId: string) => {
            const collection = (database.collections as any)[collectionName];
            const rxDocument = collection ? await collection.findOne(id).exec() : null;
            const attachment = rxDocument ? rxDocument.getAttachment(attachmentId) : null;
            if (!attachment) {
                return null;
            }
            const blobData: Blob = await attachment.getData();
            const buffer = await blobData.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.length; i++) {
                binary = binary + String.fromCharCode(bytes[i]);
            }
            return {
                base64: btoa(binary),
                type: attachment.type || ''
            };
        }
    };

    const onMessage = (event: MessageEvent) => {
        if (destroyed || event.source !== targetWindow) {
            return;
        }
        const data = event.data;
        if (!data || data.type !== 'rxdbv-request') {
            return;
        }
        const method = methods[data.method];
        const respond = (response: Partial<ViewerBridgeResponseMessage>) => {
            post(Object.assign({
                type: 'rxdbv-response',
                requestId: data.requestId
            }, response));
        };
        if (!method) {
            respond({ error: { message: 'unknown method ' + data.method } });
            return;
        }
        Promise.resolve()
            .then(() => method(...(data.params || [])))
            .then(result => respond({ result }))
            .catch(error => respond({
                error: {
                    message: String(error && error.message ? error.message : error),
                    code: error && error.code ? String(error.code) : undefined,
                    parameters: error && error.parameters ? sanitizeViewerValue(error.parameters) : undefined
                }
            }));
    };
    window.addEventListener('message', onMessage);

    /**
     * Change and replication feed entries are pushed to the page
     * as they happen, everything else the page polls via stats().
     */
    let lastChangeTime = hub.changes[0] ? hub.changes[0].time : 0;
    let lastFeedTime = hub.replicationFeed[0] ? hub.replicationFeed[0].time : 0;
    const hubSub = hub.changed$.subscribe(() => {
        const newChanges = hub.changes.filter(entry => entry.time > lastChangeTime);
        if (newChanges.length > 0) {
            lastChangeTime = hub.changes[0].time;
            newChanges.reverse().forEach(entry => post({
                type: 'rxdbv-event',
                name: 'change',
                payload: entry
            }));
        }
        const newFeed = hub.replicationFeed.filter(entry => entry.time > lastFeedTime);
        if (newFeed.length > 0) {
            lastFeedTime = hub.replicationFeed[0].time;
            newFeed.reverse().forEach(entry => post({
                type: 'rxdbv-event',
                name: 'replication-feed',
                payload: entry
            }));
        }
    });

    return {
        destroy() {
            destroyed = true;
            window.removeEventListener('message', onMessage);
            hubSub.unsubscribe();
        }
    };
}
