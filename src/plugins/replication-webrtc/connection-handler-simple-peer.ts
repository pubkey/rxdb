import { Subject } from 'rxjs';
import {
    ensureNotFalsy,
    errorToPlainJson,
    PROMISE_RESOLVE_VOID,
    randomToken
} from '../../plugins/utils/index.ts';
import type {
    WebRTCConnectionHandler,
    WebRTCConnectionHandlerCreator,
    WebRTCMessage,
    PeerWithMessage,
    PeerWithResponse,
    SyncOptionsWebRTC
} from './webrtc-types.ts';

import type {
    SimplePeer as Peer,
    Instance as SimplePeerInstance,
    Options as SimplePeerOptions
} from 'simple-peer';
import {
    default as _Peer
    // @ts-ignore
} from 'simple-peer/simplepeer.min.js';

const Peer = _Peer as Peer

import type { RxError, RxTypeError } from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';

export type SimplePeer = SimplePeerInstance & {
    // add id to make debugging easier
    id: string;
};

export type SimplePeerInitMessage = {
    type: 'init';
    yourPeerId: string;
};
export type SimplePeerJoinMessage = {
    type: 'join';
    room: string;
};
export type SimplePeerJoinedMessage = {
    type: 'joined';
    otherPeerIds: string[];
};
export type SimplePeerSignalMessage = {
    type: 'signal';
    room: string;
    senderPeerId: string;
    receiverPeerId: string;
    data: any;
    /**
     * Identifies the connection attempt so that signals
     * of outdated attempts are not mixed up with the current one.
     * Optional because older RxDB versions do not send it.
     */
    connectionId?: string;
};
export type SimplePeerPingMessage = {
    type: 'ping';
};

export type PeerMessage =
    SimplePeerInitMessage |
    SimplePeerJoinMessage |
    SimplePeerJoinedMessage |
    SimplePeerSignalMessage |
    SimplePeerPingMessage;


const WEBSOCKET_STATE_OPEN = 1;
function sendMessage(ws: WebSocket | undefined, msg: PeerMessage): boolean {
    if (!ws || ws.readyState !== WEBSOCKET_STATE_OPEN) {
        return false;
    }
    try {
        ws.send(JSON.stringify(msg));
        return true;
    } catch (err) {
        return false;
    }
}

const DEFAULT_SIGNALING_SERVER_HOSTNAME = 'signaling.rxdb.info';
export const DEFAULT_SIGNALING_SERVER = 'wss://' + DEFAULT_SIGNALING_SERVER_HOSTNAME + '/';
let defaultServerWarningShown = false;

export type SimplePeerWrtc = SimplePeerOptions['wrtc'];
export type SimplePeerConfig = SimplePeerOptions['config'];
export type SimplePeerWebSocketConstructor = { new(url: string): WebSocket; };

/**
 * Creates a simple-peer compatible wrtc object from a WebRTC polyfill
 * like node-datachannel/polyfill. This is needed because some polyfills
 * return RTCSessionDescription objects with read-only properties
 * that simple-peer tries to mutate.
 */
export function createSimplePeerWrtc(polyfill: {
    RTCPeerConnection: any;
    RTCSessionDescription: any;
    RTCIceCandidate: any;
}): SimplePeerWrtc {
    const OrigRTCPeerConnection = polyfill.RTCPeerConnection;
    class SimplePeerCompatRTCPeerConnection extends OrigRTCPeerConnection {
        async createOffer(): Promise<{ type: string; sdp: string }> {
            const offer = await super.createOffer();
            return { type: offer.type, sdp: offer.sdp };
        }
        async createAnswer(): Promise<{ type: string; sdp: string }> {
            const answer = await super.createAnswer();
            return { type: answer.type, sdp: answer.sdp };
        }
    }
    return {
        RTCPeerConnection: SimplePeerCompatRTCPeerConnection as any,
        RTCSessionDescription: polyfill.RTCSessionDescription,
        RTCIceCandidate: polyfill.RTCIceCandidate
    };
}

export type SimplePeerConnectionHandlerOptions = {
    /**
     * If no server is specified, the default signaling server
     * from signaling.rxdb.info is used.
     * This server is not reliable and you should use
     * your own signaling server instead.
     */
    signalingServerUrl?: string;
    wrtc?: SimplePeerWrtc;
    config?: SimplePeerConfig;
    webSocketConstructor?: SimplePeerWebSocketConstructor;
};

export const SIMPLE_PEER_PING_INTERVAL = 1000 * 60 * 2;

/**
 * If a peer connection is not established in this time,
 * it is destroyed and a new connection attempt is started.
 */
export const SIMPLE_PEER_CONNECT_TIMEOUT = 1000 * 15;

/**
 * Min and max delay between reconnection attempts
 * to the signaling server and to other peers.
 * The delay doubles on each failed attempt.
 */
export const SIMPLE_PEER_RECONNECT_DELAY_MIN = 500;
export const SIMPLE_PEER_RECONNECT_DELAY_MAX = 1000 * 15;

/**
 * Messages bigger than this are split into chunks
 * because WebRTC data channels have a message size limit
 * which can be as low as 64 KiB depending on the browser.
 * The size is measured in string length and one character can
 * be up to 3 bytes in UTF-8.
 */
export const SIMPLE_PEER_MAX_MESSAGE_LENGTH = 1024 * 16;

type SimplePeerChunk = {
    chunk: {
        id: string;
        index: number;
        total: number;
        data: string;
    };
};

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export function getConnectionHandlerSimplePeer({
    signalingServerUrl = DEFAULT_SIGNALING_SERVER,
    wrtc,
    config,
    webSocketConstructor = WebSocket
}: SimplePeerConnectionHandlerOptions): WebRTCConnectionHandlerCreator<SimplePeer> {
    ensureProcessNextTickIsSet();

    if (
        signalingServerUrl.includes(DEFAULT_SIGNALING_SERVER_HOSTNAME) &&
        !defaultServerWarningShown
    ) {
        defaultServerWarningShown = true;
        console.warn(
            [
                'RxDB Warning: You are using the RxDB WebRTC replication plugin',
                'but you did not specify your own signaling server url.',
                'By default it will use a signaling server provided by RxDB at ' + DEFAULT_SIGNALING_SERVER,
                'This server is made for demonstration purposes and tryouts. It is not reliable and might be offline at any time.',
                'In production you must always use your own signaling server instead.',
                'Learn how to run your own server at https://rxdb.info/replication-webrtc.html',
                'Also leave a ⭐ at the RxDB github repo 🙏 https://github.com/pubkey/rxdb 🙏'
            ].join(' ')
        );
    }

    const creator: WebRTCConnectionHandlerCreator<SimplePeer> = async (options: SyncOptionsWebRTC<any, SimplePeer>) => {

        const connect$ = new Subject<SimplePeer>();
        const disconnect$ = new Subject<SimplePeer>();
        const message$ = new Subject<PeerWithMessage<SimplePeer>>();
        const response$ = new Subject<PeerWithResponse<SimplePeer>>();
        const error$ = new Subject<RxError | RxTypeError>();

        /**
         * The current peer connection by remote peer id.
         */
        const peers = new Map<string, SimplePeerState>();
        /**
         * The ids of the other peers that are in the room,
         * as reported by the signaling server.
         */
        let roomPeerIds = new Set<string>();
        const peerReconnectDelay = new Map<string, number>();
        const peerReconnectTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

        let closed = false;
        let ownPeerId: string | undefined;
        let socket: WebSocket | undefined = undefined;
        let socketReconnectDelay = SIMPLE_PEER_RECONNECT_DELAY_MIN;
        let socketReconnectTimeout: ReturnType<typeof setTimeout> | undefined;

        /**
         * Send ping signals to the server.
         */
        const pingInterval = setInterval(() => {
            sendMessage(socket, { type: 'ping' });
        }, SIMPLE_PEER_PING_INTERVAL / 2);

        type SimplePeerState = {
            remotePeerId: string;
            connectionId?: string;
            initiator: boolean;
            peer: SimplePeer;
            connected: boolean;
            ended: boolean;
            connectTimeout?: ReturnType<typeof setTimeout>;
            chunks: Map<string, string[]>;
        };

        function isInitiator(remotePeerId: string) {
            return remotePeerId > ensureNotFalsy(ownPeerId);
        }

        function endPeer(state: SimplePeerState) {
            if (state.ended) {
                return;
            }
            state.ended = true;
            if (state.connectTimeout) {
                clearTimeout(state.connectTimeout);
            }
            if (peers.get(state.remotePeerId) === state) {
                peers.delete(state.remotePeerId);
            }
            state.chunks.clear();
            try {
                state.peer.destroy();
            } catch (err) { }
            if (state.connected && !closed) {
                disconnect$.next(state.peer);
            }
            if (state.initiator) {
                scheduleReconnect(state.remotePeerId);
            }
        }

        /**
         * Only the initiator side actively reconnects.
         * The other side creates its peer when the offer arrives.
         */
        function scheduleReconnect(remotePeerId: string) {
            if (
                closed ||
                !roomPeerIds.has(remotePeerId) ||
                peers.has(remotePeerId) ||
                peerReconnectTimeouts.has(remotePeerId)
            ) {
                return;
            }
            const delay = peerReconnectDelay.get(remotePeerId) || SIMPLE_PEER_RECONNECT_DELAY_MIN;
            peerReconnectDelay.set(remotePeerId, Math.min(delay * 2, SIMPLE_PEER_RECONNECT_DELAY_MAX));
            peerReconnectTimeouts.set(remotePeerId, setTimeout(() => {
                peerReconnectTimeouts.delete(remotePeerId);
                if (
                    !closed &&
                    ownPeerId &&
                    roomPeerIds.has(remotePeerId) &&
                    !peers.has(remotePeerId) &&
                    isInitiator(remotePeerId)
                ) {
                    createPeerConnection(remotePeerId, true, randomToken(10));
                }
            }, delay));
        }

        function processIncomingData(state: SimplePeerState, messageOrResponse: any) {
            if (messageOrResponse.chunk) {
                const chunk = (messageOrResponse as SimplePeerChunk).chunk;
                let parts = state.chunks.get(chunk.id);
                if (!parts) {
                    parts = [];
                    state.chunks.set(chunk.id, parts);
                }
                parts[chunk.index] = chunk.data;
                if (parts.filter(p => typeof p === 'string').length < chunk.total) {
                    return;
                }
                state.chunks.delete(chunk.id);
                messageOrResponse = JSON.parse(parts.join(''));
            }
            if (typeof messageOrResponse.method === 'string') {
                message$.next({
                    peer: state.peer,
                    message: messageOrResponse
                });
            } else {
                response$.next({
                    peer: state.peer,
                    response: messageOrResponse
                });
            }
        }

        function createPeerConnection(
            remotePeerId: string,
            initiator: boolean,
            connectionId?: string
        ): SimplePeerState {
            const previous = peers.get(remotePeerId);
            if (previous) {
                endPeer(previous);
            }
            const newSimplePeer: SimplePeer = new Peer({
                initiator,
                wrtc,
                config,
                trickle: true
            }) as any;
            newSimplePeer.id = randomToken(10);
            const state: SimplePeerState = {
                remotePeerId,
                connectionId,
                initiator,
                peer: newSimplePeer,
                connected: false,
                ended: false,
                chunks: new Map()
            };
            peers.set(remotePeerId, state);
            state.connectTimeout = setTimeout(() => {
                if (!state.connected) {
                    endPeer(state);
                }
            }, SIMPLE_PEER_CONNECT_TIMEOUT);

            newSimplePeer.on('signal', (signal: any) => {
                if (state.ended || !ownPeerId) {
                    return;
                }
                const signalMessage: SimplePeerSignalMessage = {
                    type: 'signal',
                    senderPeerId: ownPeerId,
                    receiverPeerId: remotePeerId,
                    room: options.topic,
                    data: signal
                };
                if (connectionId) {
                    signalMessage.connectionId = connectionId;
                }
                sendMessage(socket, signalMessage);
            });

            newSimplePeer.on('data', (data: any) => {
                if (state.ended) {
                    return;
                }
                let parsed: any;
                try {
                    parsed = JSON.parse(data.toString());
                } catch (err) {
                    return;
                }
                if (parsed && typeof parsed === 'object') {
                    processIncomingData(state, parsed);
                }
            });

            newSimplePeer.on('error', (error: Error) => {
                if (state.ended) {
                    return;
                }
                if (!closed) {
                    error$.next(newRxError('RC_WEBRTC_PEER', {
                        error: errorToPlainJson(error)
                    }));
                }
                endPeer(state);
            });

            newSimplePeer.on('connect', () => {
                if (state.ended) {
                    return;
                }
                state.connected = true;
                if (state.connectTimeout) {
                    clearTimeout(state.connectTimeout);
                }
                peerReconnectDelay.delete(remotePeerId);
                connect$.next(newSimplePeer);
            });

            newSimplePeer.on('close', () => endPeer(state));
            return state;
        }

        function onSignal(msg: SimplePeerSignalMessage) {
            if (!ownPeerId || msg.receiverPeerId !== ownPeerId) {
                return;
            }
            const remotePeerId = msg.senderPeerId;
            let state = peers.get(remotePeerId);
            if (isInitiator(remotePeerId)) {
                /**
                 * Older RxDB versions do not send the connectionId,
                 * so a missing one must be accepted.
                 */
                if (
                    !state ||
                    state.ended ||
                    (msg.connectionId && msg.connectionId !== state.connectionId)
                ) {
                    return;
                }
            } else {
                const isOffer = msg.data && msg.data.type === 'offer';
                const isOutdated = !state || state.ended || state.connectionId !== msg.connectionId;
                if (isOutdated) {
                    if (!isOffer) {
                        return;
                    }
                    state = createPeerConnection(remotePeerId, false, msg.connectionId);
                }
            }
            try {
                ensureNotFalsy(state).peer.signal(msg.data);
            } catch (err: any) {
                endPeer(ensureNotFalsy(state));
            }
        }

        function onJoined(msg: SimplePeerJoinedMessage) {
            if (!ownPeerId) {
                return;
            }
            roomPeerIds = new Set(msg.otherPeerIds.filter(id => id !== ownPeerId));

            /**
             * Peers that left the room and never got connected
             * can be removed. Connected peers are kept because the
             * WebRTC connection can still work when only the connection
             * to the signaling server was lost.
             */
            Array.from(peers.values()).forEach(state => {
                if (!roomPeerIds.has(state.remotePeerId) && !state.connected) {
                    endPeer(state);
                }
            });
            Array.from(peerReconnectTimeouts.entries()).forEach(([remotePeerId, timeout]) => {
                if (!roomPeerIds.has(remotePeerId)) {
                    clearTimeout(timeout);
                    peerReconnectTimeouts.delete(remotePeerId);
                    peerReconnectDelay.delete(remotePeerId);
                }
            });

            roomPeerIds.forEach(remotePeerId => {
                if (
                    !peers.has(remotePeerId) &&
                    !peerReconnectTimeouts.has(remotePeerId) &&
                    isInitiator(remotePeerId)
                ) {
                    createPeerConnection(remotePeerId, true, randomToken(10));
                }
            });
        }

        function onSocketMessage(msgEvent: any) {
            let msg: PeerMessage;
            try {
                msg = JSON.parse(msgEvent.data.toString());
            } catch (err) {
                return;
            }
            switch (msg.type) {
                case 'init':
                    ownPeerId = msg.yourPeerId;
                    sendMessage(socket, {
                        type: 'join',
                        room: options.topic
                    });
                    break;
                case 'joined':
                    onJoined(msg);
                    break;
                case 'signal':
                    onSignal(msg);
                    break;
            }
        }

        /**
         * Creates the WebSocket connection to the signaling server.
         * On disconnects it reconnects with an increasing delay
         * so that it does not spin when the server is not reachable.
         */
        function createSocket() {
            if (closed) {
                return;
            }
            const ws = new webSocketConstructor(signalingServerUrl);
            socket = ws;
            ws.onopen = () => {
                socketReconnectDelay = SIMPLE_PEER_RECONNECT_DELAY_MIN;
            };
            ws.onmessage = (msgEvent: any) => {
                if (socket === ws && !closed) {
                    onSocketMessage(msgEvent);
                }
            };
            ws.onerror = () => {
                /**
                 * Errors are followed by a close event
                 * which handles the reconnect.
                 */
            };
            ws.onclose = () => {
                if (socket !== ws) {
                    return;
                }
                socket = undefined;
                ownPeerId = undefined;
                if (closed) {
                    return;
                }
                const delay = socketReconnectDelay;
                socketReconnectDelay = Math.min(delay * 2, SIMPLE_PEER_RECONNECT_DELAY_MAX);
                socketReconnectTimeout = setTimeout(() => {
                    socketReconnectTimeout = undefined;
                    createSocket();
                }, delay);
            };
        }
        createSocket();

        const handler: WebRTCConnectionHandler<SimplePeer> = {
            error$,
            connect$,
            disconnect$,
            message$,
            response$,
            async send(peer: SimplePeer, message: WebRTCMessage) {
                if ((peer as any).destroyed) {
                    throw newRxError('RC_WEBRTC_PEER', {
                        errorText: 'peer is destroyed'
                    });
                }
                const messageString = JSON.stringify(message);
                if (messageString.length <= SIMPLE_PEER_MAX_MESSAGE_LENGTH) {
                    peer.send(messageString);
                    return;
                }
                const chunkId = randomToken(10);
                const total = Math.ceil(messageString.length / SIMPLE_PEER_MAX_MESSAGE_LENGTH);
                for (let index = 0; index < total; index++) {
                    const chunk: SimplePeerChunk = {
                        chunk: {
                            id: chunkId,
                            index,
                            total,
                            data: messageString.slice(
                                index * SIMPLE_PEER_MAX_MESSAGE_LENGTH,
                                (index + 1) * SIMPLE_PEER_MAX_MESSAGE_LENGTH
                            )
                        }
                    };
                    peer.send(JSON.stringify(chunk));
                }
            },
            close() {
                if (closed) {
                    return PROMISE_RESOLVE_VOID;
                }
                closed = true;
                clearInterval(pingInterval);
                if (socketReconnectTimeout) {
                    clearTimeout(socketReconnectTimeout);
                }
                peerReconnectTimeouts.forEach(timeout => clearTimeout(timeout));
                peerReconnectTimeouts.clear();
                Array.from(peers.values()).forEach(state => endPeer(state));
                if (socket) {
                    const ws = socket;
                    socket = undefined;
                    try {
                        ws.close();
                    } catch (err) { }
                }
                error$.complete();
                connect$.complete();
                disconnect$.complete();
                message$.complete();
                response$.complete();
                return PROMISE_RESOLVE_VOID;
            }
        };
        return handler;
    };
    return creator;
}


/**
 * Multiple people had problems because it requires to have
 * the nextTick() method in the runtime. So we check here and
 * throw a helpful error.
 */
export function ensureProcessNextTickIsSet() {
    if (
        typeof process === 'undefined' ||
        typeof process.nextTick !== 'function'
    ) {
        throw newRxError('RC7');
    }
}
