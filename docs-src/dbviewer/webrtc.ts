// @ts-ignore - the standalone build ships no types
import Peer from 'simple-peer/simplepeer.min.js';
import type { ViewerPageTransport } from './source.ts';

/**
 * simple-peer needs process.nextTick, plain browsers
 * do not have it.
 */
const globalAny = globalThis as any;
if (typeof globalAny.process === 'undefined') {
    globalAny.process = { nextTick: (fn: () => void) => Promise.resolve().then(fn) };
} else if (typeof globalAny.process.nextTick !== 'function') {
    globalAny.process.nextTick = (fn: () => void) => Promise.resolve().then(fn);
}

export const DEFAULT_SIGNALING_SERVER_URL = 'wss://signaling.rxdb.info/';

/**
 * Must match SIMPLE_PEER_MAX_MESSAGE_LENGTH of the
 * rxdb replication-webrtc plugin, because the host side
 * chunks its messages with the same limit and format.
 */
const MAX_MESSAGE_LENGTH = 1024 * 16;
const PING_INTERVAL = 1000 * 60;
const DEFAULT_CONNECT_TIMEOUT = 1000 * 25;

export type ViewerWebRTCStatus =
    'signaling-connecting' |
    'signaling-connected' |
    'waiting-for-device' |
    'peer-connecting' |
    'connected';

export type ViewerWebRTCConnectOptions = {
    signalingServerUrl: string;
    roomId: string;
    onStatus?: (status: ViewerWebRTCStatus) => void;
    /**
     * Called when an established connection is lost.
     */
    onDisconnect?: () => void;
    timeoutMs?: number;
};

function randomId(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result = result + chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

/**
 * Connects to the pairing room on the signaling server and
 * establishes a WebRTC data channel to the device that runs
 * connectRxDBViewer(). Resolves with the transport once
 * the channel is open. The protocol mirrors the simple-peer
 * connection handler of the rxdb replication-webrtc plugin.
 */
export function connectViewerWebRTC(options: ViewerWebRTCConnectOptions): Promise<ViewerPageTransport> {
    const onStatus = options.onStatus || (() => { });
    const timeoutMs = options.timeoutMs || DEFAULT_CONNECT_TIMEOUT;

    return new Promise<ViewerPageTransport>((resolve, reject) => {
        let settled = false;
        let destroyed = false;
        let ownPeerId: string | undefined;
        let connectedPeer: any = null;
        const peersById = new Map<string, any>();
        const listeners = new Set<(message: any) => void>();
        const chunks = new Map<string, string[]>();

        let socket: WebSocket;
        try {
            socket = new WebSocket(options.signalingServerUrl);
        } catch (err) {
            reject(new Error('cannot reach the signaling server ' + options.signalingServerUrl));
            return;
        }
        onStatus('signaling-connecting');

        const pingInterval = setInterval(() => {
            sendSocketMessage({ type: 'ping' });
        }, PING_INTERVAL);

        const timeoutHandle = setTimeout(() => {
            if (!settled) {
                fail(new Error('no device connected within ' + Math.round(timeoutMs / 1000) + ' seconds. Check that connectRxDBViewer() runs in the app and uses the same signaling server and room id.'));
            }
        }, timeoutMs);

        function cleanupAll() {
            destroyed = true;
            clearInterval(pingInterval);
            clearTimeout(timeoutHandle);
            peersById.forEach(peer => {
                try {
                    peer.destroy();
                } catch (err) { }
            });
            peersById.clear();
            listeners.clear();
            chunks.clear();
            try {
                socket.close();
            } catch (err) { }
        }

        function fail(error: Error) {
            if (settled) {
                return;
            }
            settled = true;
            cleanupAll();
            reject(error);
        }

        function sendSocketMessage(message: any) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.send(JSON.stringify(message));
                } catch (err) { }
            }
        }

        function sendOverChannel(peer: any, message: any) {
            const messageString = JSON.stringify(message);
            if (messageString.length <= MAX_MESSAGE_LENGTH) {
                peer.send(messageString);
                return;
            }
            const chunkId = randomId(10);
            const total = Math.ceil(messageString.length / MAX_MESSAGE_LENGTH);
            for (let index = 0; index < total; index++) {
                peer.send(JSON.stringify({
                    chunk: {
                        id: chunkId,
                        index,
                        total,
                        data: messageString.slice(index * MAX_MESSAGE_LENGTH, (index + 1) * MAX_MESSAGE_LENGTH)
                    }
                }));
            }
        }

        function onChannelData(raw: any) {
            let parsed: any;
            try {
                parsed = JSON.parse(raw.toString());
            } catch (err) {
                return;
            }
            if (!parsed || typeof parsed !== 'object') {
                return;
            }
            if (parsed.chunk) {
                const chunk = parsed.chunk;
                let parts = chunks.get(chunk.id);
                if (!parts) {
                    parts = [];
                    chunks.set(chunk.id, parts);
                }
                parts[chunk.index] = chunk.data;
                if (parts.filter(part => typeof part === 'string').length < chunk.total) {
                    return;
                }
                chunks.delete(chunk.id);
                try {
                    parsed = JSON.parse(parts.join(''));
                } catch (err) {
                    return;
                }
            }
            listeners.forEach(listener => listener(parsed));
        }

        function createPeer(remotePeerId: string, initiator: boolean) {
            if (peersById.has(remotePeerId) || connectedPeer) {
                return;
            }
            onStatus('peer-connecting');
            const peer = new (Peer as any)({ initiator, trickle: true });
            peersById.set(remotePeerId, peer);
            peer.on('signal', (data: any) => {
                if (destroyed || !ownPeerId) {
                    return;
                }
                sendSocketMessage({
                    type: 'signal',
                    senderPeerId: ownPeerId,
                    receiverPeerId: remotePeerId,
                    room: options.roomId,
                    data
                });
            });
            peer.on('data', (data: any) => {
                if (connectedPeer === peer) {
                    onChannelData(data);
                }
            });
            peer.on('connect', () => {
                if (settled || connectedPeer) {
                    return;
                }
                connectedPeer = peer;
                settled = true;
                clearTimeout(timeoutHandle);
                onStatus('connected');
                // other pending connection attempts are not needed anymore
                peersById.forEach((otherPeer, otherId) => {
                    if (otherPeer !== peer) {
                        peersById.delete(otherId);
                        try {
                            otherPeer.destroy();
                        } catch (err) { }
                    }
                });
                resolve({
                    send(message: any) {
                        if (!destroyed && connectedPeer) {
                            try {
                                sendOverChannel(connectedPeer, message);
                            } catch (err) { }
                        }
                    },
                    onMessage(listener: (message: any) => void) {
                        listeners.add(listener);
                        return () => listeners.delete(listener);
                    },
                    destroy() {
                        cleanupAll();
                    }
                });
            });
            const onPeerGone = () => {
                peersById.delete(remotePeerId);
                if (connectedPeer === peer) {
                    connectedPeer = null;
                    if (!destroyed && options.onDisconnect) {
                        options.onDisconnect();
                    }
                    cleanupAll();
                } else if (!settled && peersById.size === 0) {
                    onStatus('waiting-for-device');
                }
            };
            peer.on('close', onPeerGone);
            peer.on('error', onPeerGone);
        }

        socket.onopen = () => {
            onStatus('signaling-connected');
        };
        socket.onerror = () => {
            if (!settled) {
                fail(new Error('cannot reach the signaling server ' + options.signalingServerUrl));
            }
        };
        socket.onclose = () => {
            if (!settled) {
                fail(new Error('the signaling server closed the connection'));
            }
        };
        socket.onmessage = (event: MessageEvent) => {
            if (destroyed) {
                return;
            }
            let message: any;
            try {
                message = JSON.parse(event.data.toString());
            } catch (err) {
                return;
            }
            switch (message.type) {
                case 'init':
                    ownPeerId = message.yourPeerId;
                    sendSocketMessage({ type: 'join', room: options.roomId });
                    onStatus('waiting-for-device');
                    break;
                case 'joined': {
                    const others = (message.otherPeerIds || []).filter((id: string) => id !== ownPeerId);
                    others.forEach((remotePeerId: string) => {
                        /**
                         * Same deterministic initiator rule as the
                         * rxdb connection handler: each side initiates
                         * toward peers whose id is greater than its own,
                         * so exactly one side creates the offer.
                         */
                        if (ownPeerId && remotePeerId > ownPeerId) {
                            createPeer(remotePeerId, true);
                        }
                    });
                    if (!settled && others.length === 0) {
                        onStatus('waiting-for-device');
                    }
                    break;
                }
                case 'signal': {
                    if (!ownPeerId || message.receiverPeerId !== ownPeerId) {
                        return;
                    }
                    const remotePeerId = message.senderPeerId;
                    if (!peersById.has(remotePeerId)) {
                        const isOffer = message.data && message.data.type === 'offer';
                        if (!isOffer || connectedPeer) {
                            return;
                        }
                        createPeer(remotePeerId, false);
                    }
                    const peer = peersById.get(remotePeerId);
                    if (peer) {
                        try {
                            peer.signal(message.data);
                        } catch (err) { }
                    }
                    break;
                }
            }
        };
    });
}
