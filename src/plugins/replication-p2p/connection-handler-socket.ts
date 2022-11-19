import { Subject } from 'rxjs';
import { getFromMapOrThrow, PROMISE_RESOLVE_VOID, randomCouchString } from '../../util';
import type {
    P2PConnectionHandler,
    P2PConnectionHandlerCreator,
    P2PMessage,
    P2PPeer,
    PeerWithMessage,
    PeerWithResponse
} from './p2p-types';


/**
 * Returns a connection handler that uses the Cloudflare worker signaling server
 * @link https://github.com/gfodor/p2pcf
 */
export function getConnectionHandlerSocket(
    serverUrl: string
): P2PConnectionHandlerCreator {

    const Peer = require('simple-peer');
    const wrtc = require('wrtc');
    const io = require('socket.io-client');


    const creator: P2PConnectionHandlerCreator = (options) => {
        const socket = io(serverUrl);

        const peerId = randomCouchString(10);
        socket.emit('join', {
            room: options.topic,
            peerId
        });

        const peersById = new Map();


        socket.on('popup', function (msg) {
            console.log("hello: ", msg)
        });
        socket.on('connect_error', function (err) {
            console.log("client connect_error: ", err);
        });

        socket.on('connect_timeout', function (err) {
            console.log("client connect_timeout: ", err);
        });

        const connect$ = new Subject<P2PPeer>();
        const disconnect$ = new Subject<P2PPeer>();
        const message$ = new Subject<PeerWithMessage>();
        const response$ = new Subject<PeerWithResponse>();

        type Connection = {
            own: P2PPeer;
            remote: {
                peerId: string;
                peer: P2PPeer;
            };
        }
        const peers = new Map<string, Connection>();

        socket.on('joined', roomPeerIds => {
            roomPeerIds.forEach(remotePeerId => {
                if (
                    remotePeerId === peerId ||
                    peers.has(remotePeerId)
                ) {
                    return;
                }
                console.log('other user joined room ' + remotePeerId);
                const newPeer = new Peer({
                    initiator: remotePeerId > peerId,
                    wrtc,
                    trickle: true
                });
                peers.set(remotePeerId, newPeer);


                newPeer.on('data', messageOrResponse => {
                    messageOrResponse = JSON.parse(messageOrResponse.toString());
                    console.log('got a message from peer3: ' + messageOrResponse)
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

                newPeer.on('signal', signal => {
                    console.log('emit signal from ' + peerId + ' to ' + remotePeerId);
                    socket.emit('signal', {
                        from: peerId,
                        to: remotePeerId,
                        room: options.topic,
                        signal
                    });
                });

                newPeer.on('connect', () => {
                    console.log('###################');
                    console.log('################### CONNECTED !!');
                    console.log('###################');
                    console.log('###################');
                    connect$.next(newPeer);
                })
        
            });
        });

        socket.on('signal', (data) => {
            console.log('got signal(' + peerId + ') ' + data.from + ' -> ' + data.to);
            const peer = getFromMapOrThrow(peers, data.from);
            console.dir(data);
            peer.signal(data.signal);
        });

        

        // console.log('Message from client: Asking to join room ' + options.topic);
        // socket.emit('join', options.topic);

        // socket.on('created', function (room, clientId) {
        //     console.log('ROOOM CREATED !! ' + room);
        //     isInitiator = true;
        // });


        const handler: P2PConnectionHandler = {
            connect$,
            disconnect$,
            message$,
            response$,
            async send(peer: P2PPeer, message: P2PMessage) {
                await peer.send(JSON.stringify(message));
            },
            destroy() {
                // socket.close();
                connect$.complete();
                disconnect$.complete();
                message$.complete();
                response$.complete();
                return PROMISE_RESOLVE_VOID;
            }
        }
        return handler;
    }
    return creator;
}
