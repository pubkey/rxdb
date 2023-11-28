import { Subject } from 'rxjs';
import {
    getFromMapOrThrow,
    PROMISE_RESOLVE_VOID,
    randomCouchString
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
    default as Peer
} from 'simple-peer';
import type { RxError, RxTypeError } from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';

export type SimplePeerJoinMessage = {
    room: string;
};
export type SimplePeerJoinedMessage = {
    yourPeerId: string;
    otherPeerIds: string[];
};
export type SimplePeerSignalMessage = {
    room: string;
    senderPeerId: string;
    receiverPeerId: string;
    data: string;
};


const sockets = new Set();

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export function getConnectionHandlerSimplePeer(
    serverUrl: string,
    wrtc?: any
): WebRTCConnectionHandlerCreator {
    const creator: WebRTCConnectionHandlerCreator = async (options) => {

        console.log('getConnectionHandlerSimplePeer.creator()');

        const io = await import('socket.io-client');
       const manager = new io.Manager();
        const socket = io.connect(serverUrl + '?rand=' + randomCouchString(10), {
            transports: ["websocket"],
            forceNew: true,
            multiplex: false,
            rememberUpgrade: true
        });

        sockets.add(socket);
        console.log('socketid ' + socket.id);
        console.log('total client sockets ' + sockets.size);

        socket.emit('join', {
            room: options.topic
        } as SimplePeerJoinMessage);

        const connect$ = new Subject<WebRTCPeer>();
        const disconnect$ = new Subject<WebRTCPeer>();
        const message$ = new Subject<PeerWithMessage>();
        const response$ = new Subject<PeerWithResponse>();
        const error$ = new Subject<RxError | RxTypeError>();

        const peers = new Map<string, SimplePeer>();

        socket.on('joined', (message: SimplePeerJoinedMessage) => {

            /**
             * PeerId is created by the signaling server
             * to prevent spoofing it.
            */
            const ownPeerId = message.yourPeerId;
            console.log('CLIENT(' + ownPeerId + ') got joined ' + JSON.stringify(message));

            message.otherPeerIds.forEach(remotePeerId => {
                if (
                    remotePeerId === ownPeerId ||
                    peers.has(remotePeerId)
                ) {
                    return;
                }
                console.log('CLIENT(' + ownPeerId + ') other user joined room remotePeerId: ' + remotePeerId + ' ownPeerId: ' + ownPeerId);
                console.log('CLIENT(' + ownPeerId + ') is initiator: ' + (remotePeerId > ownPeerId));
                const newPeer: SimplePeer = new Peer({
                    initiator: remotePeerId > ownPeerId,
                    wrtc,
                    trickle: true
                }) as any;
                peers.set(remotePeerId, newPeer);

                newPeer.on('signal', (signal: any) => {
                    console.log('CLIENT(' + ownPeerId + ') emit signal from ' + ownPeerId + ' to ' + remotePeerId);
                    socket.emit('signal', {
                        senderPeerId: ownPeerId,
                        receiverPeerId: remotePeerId,
                        room: options.topic,
                        data: signal
                    } as SimplePeerSignalMessage);
                });

                newPeer.on('data', (messageOrResponse: any) => {
                    messageOrResponse = JSON.parse(messageOrResponse.toString());
                    console.log('CLIENT(' + ownPeerId + ') got a message from peer3: ' + messageOrResponse)
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
        });

        socket.on('signal', (message: SimplePeerSignalMessage) => {
            // console.log('got signal(' + peerId + ') ' + data.from + ' -> ' + data.to);
            const peer = getFromMapOrThrow(peers, message.senderPeerId);
            peer.signal(message.data);
        });

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
                socket.close();
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
