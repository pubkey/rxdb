import { Subject } from 'rxjs';
import { getFromMapOrThrow, PROMISE_RESOLVE_VOID, randomCouchString } from '../../plugins/utils';
import type {
    WebRTCConnectionHandler,
    WebRTCConnectionHandlerCreator,
    WebRTCMessage,
    WebRTCPeer,
    PeerWithMessage,
    PeerWithResponse
} from './webrtc-types';

import {
    Instance as SimplePeer,
    default as Peer
} from 'simple-peer';
import { RxError, RxTypeError } from '../../types';
import { newRxError } from '../../rx-error';

/**
 * Returns a connection handler that uses simple-peer and the signaling server.
 */
export function getConnectionHandlerSimplePeer(
    serverUrl: string,
    wrtc?: any
): WebRTCConnectionHandlerCreator {
    const { io } = require('socket.io-client');


    const creator: WebRTCConnectionHandlerCreator = (options) => {
        const socket = io(serverUrl);

        const peerId = randomCouchString(10);
        socket.emit('join', {
            room: options.topic,
            peerId
        });

        const connect$ = new Subject<WebRTCPeer>();
        const disconnect$ = new Subject<WebRTCPeer>();
        const message$ = new Subject<PeerWithMessage>();
        const response$ = new Subject<PeerWithResponse>();
        const error$ = new Subject<RxError | RxTypeError>();

        const peers = new Map<string, SimplePeer>();

        socket.on('joined', (roomPeerIds: string[]) => {
            roomPeerIds.forEach(remotePeerId => {
                if (
                    remotePeerId === peerId ||
                    peers.has(remotePeerId)
                ) {
                    return;
                }
                // console.log('other user joined room ' + remotePeerId);
                const newPeer: SimplePeer = new Peer({
                    initiator: remotePeerId > peerId,
                    wrtc,
                    trickle: true
                }) as any;
                peers.set(remotePeerId, newPeer);


                newPeer.on('data', (messageOrResponse: any) => {
                    messageOrResponse = JSON.parse(messageOrResponse.toString());
                    // console.log('got a message from peer3: ' + messageOrResponse)
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

                newPeer.on('signal', (signal: any) => {
                    // console.log('emit signal from ' + peerId + ' to ' + remotePeerId);
                    socket.emit('signal', {
                        from: peerId,
                        to: remotePeerId,
                        room: options.topic,
                        signal
                    });
                });

                newPeer.on('error', (error) => {
                    error$.next(newRxError('RC_WEBRTC_PEER', {
                        error
                    }));
                });

                newPeer.on('connect', () => {
                    connect$.next(newPeer as any);
                });

            });
        });

        socket.on('signal', (data: any) => {
            // console.log('got signal(' + peerId + ') ' + data.from + ' -> ' + data.to);
            const peer = getFromMapOrThrow(peers, data.from);
            peer.signal(data.signal);
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
