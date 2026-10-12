import type {
    RxDatabase
} from '../../index.d.ts';
import { newRxError } from '../../rx-error.ts';
import { getConnectionHandlerSimplePeer } from '../replication-webrtc/index.ts';
import {
    randomToken,
    RXDB_VERSION
} from '../utils/index.ts';
import { DBVIEWER_DEFAULT_URL } from './dbviewer.ts';
import { createLiveDataSource } from './dbviewer-data.ts';
import { createViewerEventHub } from './dbviewer-events.ts';
import { attachViewerBridge } from './dbviewer-remote.ts';
import type {
    ViewerBridgeTransport,
    ViewerInfo
} from './dbviewer-types.ts';

export type RxDBViewerConnectOptions = {
    /**
     * The live database to expose.
     */
    database: RxDatabase;
    /**
     * The pairing room id. Everyone who knows the room id
     * and can reach the signaling server gets FULL read and
     * write access to the database, so treat it like a password.
     * Must have at least 6 characters.
     * [default=a random 18 character token]
     */
    roomId?: string;
    /**
     * Url of the WebRTC signaling server.
     * [default='wss://signaling.rxdb.info/']
     */
    signalingServerUrl?: string;
    /**
     * Url of the hosted viewer page that the returned url
     * points to.
     * [default='https://rxdb.info/dbviewer/index.html']
     */
    viewerUrl?: string;
    /**
     * Rows per page in grids and results.
     * [default=100]
     */
    pageSize?: number;
};

export type RxDBViewerConnectHandle = {
    /**
     * Full url of the viewer page with the pairing data in the
     * hash. Open it in any browser and the viewer connects to
     * this database over WebRTC.
     */
    url: string;
    roomId: string;
    close: () => Promise<void>;
};

/**
 * Builds the viewer page url with the pairing data in the hash.
 */
export function buildViewerConnectUrl(
    viewerUrl: string,
    roomId: string,
    signalingServerUrl?: string
): string {
    let url = viewerUrl + '#room=' + encodeURIComponent(roomId);
    if (signalingServerUrl) {
        url = url + '&signaling=' + encodeURIComponent(signalingServerUrl);
    }
    return url;
}

/**
 * Exposes the database to the hosted viewer page over WebRTC
 * and returns the full url to open the viewer with.
 * The page reads the room id and the signaling server from the
 * url hash and connects through a WebRTC data channel. The
 * bridge protocol is the same as in the iframe mount, only the
 * transport differs.
 */
export async function connectRxDBViewer(
    options: RxDBViewerConnectOptions
): Promise<RxDBViewerConnectHandle> {
    if (typeof options.roomId === 'string' && options.roomId.length < 6) {
        throw newRxError('DVW3', { args: { roomId: options.roomId } });
    }
    const roomId = options.roomId || randomToken(18);
    const viewerUrl = options.viewerUrl || DBVIEWER_DEFAULT_URL;
    const url = buildViewerConnectUrl(viewerUrl, roomId, options.signalingServerUrl);
    const database = options.database;

    /**
     * simple-peer needs process.nextTick which plain browsers
     * do not have. The replication-webrtc plugin expects the app
     * to polyfill it, the viewer sets a minimal shim instead.
     */
    const processAny = (globalThis as any).process;
    if (typeof processAny === 'undefined') {
        (globalThis as any).process = { nextTick: (fn: () => void) => Promise.resolve().then(fn) };
    } else if (typeof processAny.nextTick !== 'function') {
        processAny.nextTick = (fn: () => void) => Promise.resolve().then(fn);
    }

    const source = createLiveDataSource(database);
    const hub = createViewerEventHub(database);
    const info: ViewerInfo = {
        databaseName: database.name,
        storageName: database.storage.name,
        rxdbVersion: RXDB_VERSION,
        readOnly: false,
        pageSize: options.pageSize || 0,
        showCloseButton: false
    };

    const handlerCreator = getConnectionHandlerSimplePeer({
        signalingServerUrl: options.signalingServerUrl
    });
    const handler = await handlerCreator({ topic: roomId } as any);

    type PeerState = {
        transportListeners: Set<(message: any) => void>;
        bridge: { destroy: () => void; } | null;
    };
    const peerStates = new Map<any, PeerState>();

    const dispatchToPeer = (peer: any, data: any) => {
        const state = peerStates.get(peer);
        if (!state || !data || typeof data.type !== 'string') {
            return;
        }
        if (data.type === 'rxdbv-ready') {
            handler.send(peer, { type: 'rxdbv-init', info } as any);
            if (!state.bridge) {
                const transport: ViewerBridgeTransport = {
                    send(message: any) {
                        handler.send(peer, message).catch(() => { });
                    },
                    onMessage(listener: (message: any) => void) {
                        state.transportListeners.add(listener);
                        return () => state.transportListeners.delete(listener);
                    },
                    destroy() {
                        state.transportListeners.clear();
                    }
                };
                state.bridge = attachViewerBridge({
                    database,
                    source,
                    hub,
                    info,
                    transport
                });
            }
            return;
        }
        state.transportListeners.forEach(listener => listener(data));
    };

    const endPeer = (peer: any) => {
        const state = peerStates.get(peer);
        if (!state) {
            return;
        }
        peerStates.delete(peer);
        if (state.bridge) {
            state.bridge.destroy();
            state.bridge = null;
        }
        state.transportListeners.clear();
    };

    const connectSub = handler.connect$.subscribe((peer: any) => {
        peerStates.set(peer, {
            transportListeners: new Set(),
            bridge: null
        });
    });
    const disconnectSub = handler.disconnect$.subscribe((peer: any) => endPeer(peer));
    /**
     * Viewer requests carry a method property and are routed to
     * message$, the handshake messages without one to response$.
     */
    const messageSub = handler.message$.subscribe(({ peer, message }: any) => dispatchToPeer(peer, message));
    const responseSub = handler.response$.subscribe(({ peer, response }: any) => dispatchToPeer(peer, response));

    return {
        url,
        roomId,
        async close() {
            connectSub.unsubscribe();
            disconnectSub.unsubscribe();
            messageSub.unsubscribe();
            responseSub.unsubscribe();
            Array.from(peerStates.keys()).forEach(peer => endPeer(peer));
            hub.destroy();
            await handler.close();
        }
    };
}
