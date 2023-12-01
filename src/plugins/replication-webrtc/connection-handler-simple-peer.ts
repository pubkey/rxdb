import { Subject } from 'rxjs';
import {
    ensureNotFalsy,
    getFromMapOrThrow,
    PROMISE_RESOLVE_VOID,
    promiseWait
} from '../../plugins/utils/index.ts';
import type {
    WebRTCConnectionHandler,
    WebRTCConnectionHandlerCreator,
    WebRTCMessage,
    WebRTCPeer,
    PeerWithMessage,
    PeerWithResponse
} from './webrtc-types.ts';

import {
    Instance as SimplePeer,
    Options as SimplePeerOptions,
    default as Peer
} from 'simple-peer';
import type { RxError, RxTypeError } from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';

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
    data: string;
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


function sendMessage(ws: WebSocket, msg: PeerMessage) {
    ws.send(JSON.stringify(msg));
}

const DEFAULT_SIGNALING_SERVER_HOSTNAME = 'signaling.rxdb.info';
export const DEFAULT_SIGNALING_SERVER = 'wss://' + DEFAULT_SIGNALING_SERVER_HOSTNAME + '/';
let defaultServerWarningShown = false;

export type SimplePeerWrtc = SimplePeerOptions['wrtc'];

export type SimplePeerConnectionHandlerOptions = {
    /**
     * If no server is specified, the default signaling server
     * from signaling.rxdb.info is used.
     * This server is not reliable and you should use
     * your own signaling server instead.
     */
    signalingServerUrl?: string;
    wrtc?: SimplePeerWrtc;
    webSocketConstructor?: WebSocket;
};

export const SIMPLE_PEER_PING_INTERVAL = 1000 * 60 * 2;

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export function getConnectionHandlerSimplePeer({
    signalingServerUrl,
    wrtc,
    webSocketConstructor
}: SimplePeerConnectionHandlerOptions): WebRTCConnectionHandlerCreator {

    signalingServerUrl = signalingServerUrl ? signalingServerUrl : DEFAULT_SIGNALING_SERVER;
    webSocketConstructor = webSocketConstructor ? webSocketConstructor as any : WebSocket;

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

    const creator: WebRTCConnectionHandlerCreator = async (options) => {

        const connect$ = new Subject<WebRTCPeer>();
        const disconnect$ = new Subject<WebRTCPeer>();
        const message$ = new Subject<PeerWithMessage>();
        const response$ = new Subject<PeerWithResponse>();
        const error$ = new Subject<RxError | RxTypeError>();

        const peers = new Map<string, SimplePeer>();
        let closed = false;
        let ownPeerId: string;
        let socket: WebSocket | undefined = undefined;
        createSocket();


        /**
         * Send ping signals to the server.
         */
        (async () => {
            while (true) {
                await promiseWait(SIMPLE_PEER_PING_INTERVAL / 2);
                if (closed) {
                    break;
                }
                if (socket) {
                    sendMessage(socket, { type: 'ping' });
                }
            }
        })();


        /**
         * @recursive calls it self on socket disconnects
         * so that when the user goes offline and online
         * again, it will recreate the WebSocket connection.
         */
        function createSocket() {
            if (closed) {
                return;
            }
            socket = new (webSocketConstructor as any)(signalingServerUrl) as WebSocket;
            socket.onclose = () => createSocket();
            socket.onopen = () => {
                ensureNotFalsy(socket).onmessage = (msgEvent: any) => {
                    const msg: PeerMessage = JSON.parse(msgEvent.data as any);
                    switch (msg.type) {
                        case 'init':
                            ownPeerId = msg.yourPeerId;
                            sendMessage(ensureNotFalsy(socket), {
                                type: 'join',
                                room: options.topic
                            });
                            break;
                        case 'joined':
                            /**
                             * PeerId is created by the signaling server
                             * to prevent spoofing it.
                             */
                            msg.otherPeerIds.forEach(remotePeerId => {
                                if (
                                    remotePeerId === ownPeerId ||
                                    peers.has(remotePeerId)
                                ) {
                                    return;
                                }
                                const newPeer: SimplePeer = new Peer({
                                    initiator: remotePeerId > ownPeerId,
                                    wrtc,
                                    trickle: true
                                }) as any;
                                peers.set(remotePeerId, newPeer);

                                newPeer.on('signal', (signal: any) => {
                                    sendMessage(ensureNotFalsy(socket), {
                                        type: 'signal',
                                        senderPeerId: ownPeerId,
                                        receiverPeerId: remotePeerId,
                                        room: options.topic,
                                        data: signal
                                    });
                                });

                                newPeer.on('data', (messageOrResponse: any) => {
                                    messageOrResponse = JSON.parse(messageOrResponse.toString());
                                    if (messageOrResponse.result) {
                                        response$.next({
                                            peer: newPeer as any,
                                            response: messageOrResponse
                                        });
                                    } else {
                                        message$.next({
                                            peer: newPeer as any,
                                            message: messageOrResponse
                                        });
                                    }
                                });

                                newPeer.on('error', (error) => {
                                    console.log('CLIENT(' + ownPeerId + ') peer got error:');
                                    console.dir(error);
                                    error$.next(newRxError('RC_WEBRTC_PEER', {
                                        error
                                    }));
                                });

                                newPeer.on('connect', () => {
                                    connect$.next(newPeer as any);
                                });

                            });
                            break;
                        case 'signal':
                            // console.log('got signal(' + peerId + ') ' + data.from + ' -> ' + data.to);
                            const peer = getFromMapOrThrow(peers, msg.senderPeerId);
                            peer.signal(msg.data);
                            break;
                    }
                }
            }
        };

        const handler: WebRTCConnectionHandler = {
            error$,
            connect$,
            disconnect$,
            message$,
            response$,
            async send(peer: WebRTCPeer, message: WebRTCMessage) {
                await (peer as any).send(JSON.stringify(message));
            },
            destroy() {
                closed = true;
                ensureNotFalsy(socket).close();
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
