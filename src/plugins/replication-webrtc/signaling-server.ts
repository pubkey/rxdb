import {
    getFromMapOrCreate,
    promiseWait,
    randomToken
} from '../utils/index.ts';
import {
    SIMPLE_PEER_PING_INTERVAL,
    type PeerMessage
} from './connection-handler-simple-peer.ts';
import type {
    WebSocket,
    ServerOptions
} from 'ws';

export const PEER_ID_LENGTH = 12;
export type ServerPeer = {
    id: string;
    socket: WebSocket;
    rooms: Set<string>;
    lastPing: number;
};


/**
 * Starts a WebRTC signaling server
 * that can be used in tests.
*/
export async function startSignalingServerSimplePeer(
    serverOptions: ServerOptions
) {
    const { WebSocketServer } = await import('ws');
    const wss = new WebSocketServer(serverOptions);

    const peerById = new Map<string, ServerPeer>();
    const peersByRoom = new Map<string, Set<string>>();

    let serverClosed = false;
    wss.on('close', () => {
        serverClosed = true
        peerById.clear();
        peersByRoom.clear();
    });

    /**
     * Clients can disconnect without telling that to the
     * server. Therefore we have to automatically disconnect clients that
     * have not send a ping message in the last 2 minutes.
     */
    (async () => {
        while (!serverClosed) {
            await promiseWait(1000 * 5);
            const minTime = Date.now() - SIMPLE_PEER_PING_INTERVAL;
            Array.from(peerById.values()).forEach(peer => {
                if (peer.lastPing < minTime) {
                    disconnectSocket(peer.id, 'no ping for 2 minutes');
                }
            });
        }
    })();

    function disconnectSocket(peerId: string, reason: string) {
        console.log('# disconnect peer ' + peerId + ' reason: ' + reason);
        const peer = peerById.get(peerId);
        if (peer) {
            peer.socket.close && peer.socket.close(undefined, reason);
            peer.rooms.forEach(roomId => {
                const room = peersByRoom.get(roomId);
                room?.delete(peerId);
                if (room && room.size === 0) {
                    peersByRoom.delete(roomId);
                }
            });
        }
        peerById.delete(peerId);
    }

    wss.on('connection', function (ws) {
        /**
         * PeerID is created by the server to prevent malicious
         * actors from falsy claiming other peoples ids.
         */
        const peerId = randomToken(PEER_ID_LENGTH);
        const peer: ServerPeer = {
            id: peerId,
            socket: ws,
            rooms: new Set(),
            lastPing: Date.now()
        };
        peerById.set(peerId, peer);

        sendMessage(ws, { type: 'init', yourPeerId: peerId });


        ws.on('error', err => {
            console.error('SERVER ERROR:');
            console.dir(err);
            disconnectSocket(peerId, 'socket errored');
        });
        ws.on('close', () => {
            disconnectSocket(peerId, 'socket disconnected');
        });

        ws.on('message', msgEvent => {
            peer.lastPing = Date.now();
            const message = JSON.parse(msgEvent.toString());
            const type = message.type;
            switch (type) {
                case 'join':
                    const roomId = message.room;
                    if (
                        !validateIdString(roomId) ||
                        !validateIdString(peerId)
                    ) {
                        disconnectSocket(peerId, 'invalid ids');
                        return;
                    }

                    if (peer.rooms.has(peerId)) {
                        return;
                    }
                    peer.rooms.add(roomId);


                    const room = getFromMapOrCreate(
                        peersByRoom,
                        message.room,
                        () => new Set()
                    );

                    room.add(peerId);

                    // tell everyone about new room state
                    room.forEach(otherPeerId => {
                        const otherPeer = peerById.get(otherPeerId);
                        if (otherPeer) {
                            sendMessage(
                                otherPeer.socket,
                                {
                                    type: 'joined',
                                    otherPeerIds: Array.from(room)
                                }
                            );
                        }
                    });
                    break;
                case 'signal':
                    if (
                        message.senderPeerId !== peerId
                    ) {
                        disconnectSocket(peerId, 'spoofed sender');
                        return;
                    }
                    const receiver = peerById.get(message.receiverPeerId);
                    if (receiver) {
                        sendMessage(
                            receiver.socket,
                            message
                        );
                    }
                    break;
                case 'ping':
                    break;
                default:
                    disconnectSocket(peerId, 'unknown message type ' + type);
            }

        });
    });

    return {
        port: serverOptions.port,
        server: wss,
        localUrl: 'ws://localhost:' + serverOptions.port
    };
}


function sendMessage(ws: WebSocket, message: PeerMessage) {
    const msgString = JSON.stringify(message);
    ws.send(msgString);
}

function validateIdString(roomId: string): boolean {
    if (
        typeof roomId === 'string' &&
        roomId.length > 5 &&
        roomId.length < 100
    ) {
        return true;
    } else {
        return false;
    }
}
