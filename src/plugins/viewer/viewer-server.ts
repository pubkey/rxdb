import type { Subscription } from 'rxjs';
import type { RxCollection, RxDatabase } from '../../types/index.d.ts';
import {
    ensureNotFalsy,
    randomToken
} from '../../plugins/utils/index.ts';
import type {
    ViewerConnectionParams,
    ViewerRequest,
    ViewerResponse,
    ViewerServerOptions,
    ViewerSignalingMessage,
    ViewerState
} from './viewer-types.ts';

import type {
    SimplePeer as PeerConstructor,
    Instance as SimplePeerInstance,
} from 'simple-peer';
import {
    default as _Peer
    // @ts-ignore
} from 'simple-peer/simplepeer.min.js';

const Peer = _Peer as PeerConstructor;

type ViewerPeer = SimplePeerInstance & { id: string; };

export const VIEWER_DEFAULT_SIGNALING_SERVER = 'wss://signaling.rxdb.info/';
const VIEWER_PING_INTERVAL = 1000 * 60 * 2;

const VIEWER_STATE_BY_DATABASE = new WeakMap<RxDatabase, ViewerState>();

function sendSocketMessage(ws: WebSocket, msg: ViewerSignalingMessage) {
    ws.send(JSON.stringify(msg));
}

function sendToPeer(peer: ViewerPeer, msg: ViewerResponse | { type: string; observeId: string; data: any }) {
    try {
        peer.send(JSON.stringify(msg));
    } catch (_e) {
        // peer might be disconnected
    }
}

async function handleViewerRequest(
    database: RxDatabase,
    peer: ViewerPeer,
    request: ViewerRequest,
    peerSubscriptions: Map<string, Map<string, Subscription>>
): Promise<ViewerResponse> {
    try {
        switch (request.method) {
            case 'getDbInfo': {
                const collections = [];
                for (const [name, col] of Object.entries(database.collections)) {
                    const rxCol = col as RxCollection;
                    const docCount = await rxCol.count().exec();
                    collections.push({
                        name,
                        schema: rxCol.schema.jsonSchema,
                        docCount
                    });
                }
                return { id: request.id, result: { databaseName: database.name, collections } };
            }

            case 'getCollectionInfo': {
                const colName = request.params.collection;
                const col = (database.collections as any)[colName] as RxCollection;
                if (!col) {
                    return { id: request.id, error: 'Collection not found: ' + colName };
                }
                const schema = col.schema.jsonSchema;
                const docCount = await col.count().exec();
                const primaryKey = typeof schema.primaryKey === 'string'
                    ? schema.primaryKey
                    : (schema.primaryKey as any)?.key;
                return {
                    id: request.id,
                    result: { name: colName, schema, docCount, primaryKey }
                };
            }

            case 'query': {
                const { collection, query } = request.params;
                const col = (database.collections as any)[collection] as RxCollection;
                if (!col) {
                    return { id: request.id, error: 'Collection not found: ' + collection };
                }
                const docs = await col.find(query || {}).exec();
                return { id: request.id, result: docs.map((d: any) => d.toJSON(true)) };
            }

            case 'count': {
                const { collection, selector } = request.params;
                const col = (database.collections as any)[collection] as RxCollection;
                if (!col) {
                    return { id: request.id, error: 'Collection not found: ' + collection };
                }
                const count = await col.count(selector ? { selector } : undefined).exec();
                return { id: request.id, result: count };
            }

            case 'exportCollection': {
                const { collection } = request.params;
                const col = (database.collections as any)[collection] as RxCollection;
                if (!col) {
                    return { id: request.id, error: 'Collection not found: ' + collection };
                }
                const docs = await col.find().exec();
                return { id: request.id, result: docs.map((d: any) => d.toJSON(true)) };
            }

            case 'observeQuery': {
                const { observeId, collection, query } = request.params;
                const col = (database.collections as any)[collection] as RxCollection;
                if (!col) {
                    return { id: request.id, error: 'Collection not found: ' + collection };
                }

                if (!peerSubscriptions.has(peer.id)) {
                    peerSubscriptions.set(peer.id, new Map());
                }
                const peerSubs = ensureNotFalsy(peerSubscriptions.get(peer.id));

                // Clean up existing subscription with same id
                const existingSub = peerSubs.get(observeId);
                if (existingSub) {
                    existingSub.unsubscribe();
                }

                const sub = col.find(query || {}).$.subscribe((docs: any[]) => {
                    sendToPeer(peer, {
                        type: 'observeResult',
                        observeId,
                        data: docs.map((d: any) => d.toJSON(true))
                    });
                });
                peerSubs.set(observeId, sub);
                return { id: request.id, result: { observeId, started: true } };
            }

            case 'unobserveQuery': {
                const { observeId } = request.params;
                const peerSubs = peerSubscriptions.get(peer.id);
                if (peerSubs) {
                    const sub = peerSubs.get(observeId);
                    if (sub) {
                        sub.unsubscribe();
                        peerSubs.delete(observeId);
                    }
                }
                return { id: request.id, result: { observeId, stopped: true } };
            }

            case 'writeDocument': {
                const { collection, document } = request.params;
                const col = (database.collections as any)[collection] as RxCollection;
                if (!col) {
                    return { id: request.id, error: 'Collection not found: ' + collection };
                }
                const result = await col.upsert(document);
                return { id: request.id, result: result.toJSON(true) };
            }

            case 'deleteDocument': {
                const { collection, primaryKey } = request.params;
                const col = (database.collections as any)[collection] as RxCollection;
                if (!col) {
                    return { id: request.id, error: 'Collection not found: ' + collection };
                }
                const doc = await col.findOne(primaryKey).exec();
                if (doc) {
                    await doc.remove();
                    return { id: request.id, result: { deleted: true } };
                }
                return { id: request.id, error: 'Document not found' };
            }

            default:
                return { id: request.id, error: 'Unknown method: ' + (request as any).method };
        }
    } catch (err: any) {
        return { id: request.id, error: err.message || String(err) };
    }
}

function startViewerServer(
    database: RxDatabase,
    options: ViewerServerOptions = {}
): ViewerState {
    const topic = options.topic || 'rxdb-viewer-' + randomToken(12);
    const signalingServerUrl = options.signalingServerUrl || VIEWER_DEFAULT_SIGNALING_SERVER;
    const WebSocketConstructor = options.webSocketConstructor || WebSocket;

    const peerSubscriptions = new Map<string, Map<string, Subscription>>();
    const peers = new Map<string, ViewerPeer>();
    let closed = false;
    let ownPeerId = '';
    let socket: WebSocket | undefined;

    function createSocket() {
        if (closed) {
            return;
        }
        socket = new WebSocketConstructor(signalingServerUrl);
        socket.onclose = () => createSocket();
        socket.onopen = () => {
            ensureNotFalsy(socket).onmessage = (msgEvent: any) => {
                const msg: ViewerSignalingMessage = JSON.parse(msgEvent.data as any);
                switch (msg.type) {
                    case 'init':
                        ownPeerId = msg.yourPeerId;
                        sendSocketMessage(ensureNotFalsy(socket), {
                            type: 'join',
                            room: topic
                        });
                        break;
                    case 'joined':
                        msg.otherPeerIds.forEach(remotePeerId => {
                            if (remotePeerId === ownPeerId || peers.has(remotePeerId)) {
                                return;
                            }
                            createPeerConnection(remotePeerId);
                        });
                        break;
                    case 'signal': {
                        const peer = peers.get(msg.senderPeerId);
                        if (peer) {
                            peer.signal(msg.data);
                        }
                        break;
                    }
                }
            };
        };
    }

    function createPeerConnection(remotePeerId: string) {
        let disconnected = false;
        const newPeer: ViewerPeer = new (Peer as any)({
            initiator: remotePeerId > ownPeerId,
            trickle: true
        });
        newPeer.id = randomToken(10);
        peers.set(remotePeerId, newPeer);

        newPeer.on('signal', (signal: any) => {
            sendSocketMessage(ensureNotFalsy(socket), {
                type: 'signal',
                senderPeerId: ownPeerId,
                receiverPeerId: remotePeerId,
                room: topic,
                data: signal
            });
        });

        newPeer.on('data', async (data: any) => {
            const request: ViewerRequest = JSON.parse(data.toString());
            const response = await handleViewerRequest(database, newPeer, request, peerSubscriptions);
            sendToPeer(newPeer, response);
        });

        newPeer.on('error', () => {
            if (!disconnected) {
                disconnected = true;
                cleanupPeer(remotePeerId, newPeer);
            }
        });

        newPeer.on('connect', () => {
            // viewer peer connected
        });

        newPeer.on('close', () => {
            if (!disconnected) {
                disconnected = true;
                cleanupPeer(remotePeerId, newPeer);
            }
            createPeerConnection(remotePeerId);
        });
    }

    function cleanupPeer(remotePeerId: string, peer: ViewerPeer) {
        const peerSubs = peerSubscriptions.get(peer.id);
        if (peerSubs) {
            peerSubs.forEach(sub => sub.unsubscribe());
            peerSubscriptions.delete(peer.id);
        }
        peers.delete(remotePeerId);
    }

    createSocket();

    // Send ping to keep the signaling connection alive
    const pingInterval = setInterval(() => {
        if (closed) {
            clearInterval(pingInterval);
            return;
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
            sendSocketMessage(socket, { type: 'ping' });
        }
    }, VIEWER_PING_INTERVAL);

    const connectionParams: ViewerConnectionParams = {
        topic,
        signalingServerUrl,
        databaseName: database.name
    };

    const state: ViewerState = {
        connectionParams,
        async close() {
            closed = true;
            clearInterval(pingInterval);
            peerSubscriptions.forEach(peerSubs => {
                peerSubs.forEach(sub => sub.unsubscribe());
            });
            peerSubscriptions.clear();
            peers.forEach(peer => {
                try { peer.destroy(); } catch (_e) { /* */ }
            });
            peers.clear();
            if (socket) {
                try { socket.close(); } catch (_e) { /* */ }
            }
            VIEWER_STATE_BY_DATABASE.delete(database);
        }
    };

    VIEWER_STATE_BY_DATABASE.set(database, state);

    // Auto-close when the database closes
    database.onClose.push(() => state.close());

    return state;
}

/**
 * Get the connection parameters for a database's viewer server.
 * Lazily starts the viewer server on first call and caches it.
 * The server is automatically closed when the database is closed.
 */
export function getDatabaseConnectionParams(
    database: RxDatabase,
    options?: ViewerServerOptions
): ViewerConnectionParams {
    let state = VIEWER_STATE_BY_DATABASE.get(database);
    if (!state) {
        state = startViewerServer(database, options);
    }
    return state.connectionParams;
}

/**
 * Start the viewer server explicitly.
 * Prefer using getDatabaseConnectionParams() which handles
 * lazy initialization and caching automatically.
 */
export async function startRxDBViewer(
    database: RxDatabase,
    options: ViewerServerOptions = {}
): Promise<ViewerState> {
    let state = VIEWER_STATE_BY_DATABASE.get(database);
    if (state) {
        return state;
    }
    state = startViewerServer(database, options);
    return state;
}
