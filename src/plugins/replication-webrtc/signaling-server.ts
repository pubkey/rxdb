import {
    getFromMapOrCreate,
    randomCouchString
} from '../utils/index.ts';
import type {
    PeerMessage,
    SimplePeerJoinMessage,
    SimplePeerJoinedMessage,
    SimplePeerSignalMessage
} from './connection-handler-simple-peer.ts';
import type {
    WebSocket
} from 'ws';

export const PEER_ID_LENGTH = 12;
export type ServerPeer = {
    id: string;
    socket: WebSocket;
    rooms: string[];
};


/**
 * Starts a WebRTC signaling server
 * that can be used in tests.
*/
export async function startSignalingServerSimplePeer(port: number) {
    const { WebSocketServer } = await import('ws');
    const wss = new WebSocketServer({
        port,
    });

    const peerById = new Map<string, ServerPeer>();
    const peersByRoom = new Map<string, Set<string>>();

    function disconnectSocket(peerId: string, reason: string) {
        console.log('SERVER disconnectSocket(reason: ' + reason + ') ' + peerId);

        const peer = peerById.get(peerId);
        if (peer) {
            peer.socket.close(undefined, reason);
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
        const peerId = randomCouchString(PEER_ID_LENGTH);
        console.log('SERVER got connection ' + peerId);
        const peer: ServerPeer = {
            id: peerId,
            socket: ws,
            rooms: []
        };
        peerById.set(peerId, peer);

        sendMessage(ws, { type: 'init', yourPeerId: peerId });


        ws.on('error', err => {
            console.log('SERVER ERROR:');
            console.dir(err);
            disconnectSocket(peerId, 'socket errored');
        });
        ws.on('close', () => {
            console.log('SERVER(' + peerId + ') got disconnection');
            disconnectSocket(peerId, 'socket disconnected');
        });

        ws.on('message', msgEvent => {
            console.log('SERVER received: %s', msgEvent.toString());


            const message = JSON.parse(msgEvent.toString());
            const type = message.type;
            switch (type) {
                case 'join':
                    const roomId = message.room;
                    console.log('SERVER(' + peerId + ') join room ' + roomId);
                    if (
                        !validateIdString(roomId) ||
                        !validateIdString(peerId)
                    ) {
                        disconnectSocket(peerId, 'invalid ids');
                        return;
                    }

                    if (peer.rooms.includes(peerId)) {
                        return;
                    }


                    const room = getFromMapOrCreate(
                        peersByRoom,
                        message.room,
                        () => {
                            console.log('SERVER(' + peerId + ') START NEW ROOM: ' + roomId);
                            return new Set();
                        }
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
                    console.log('SERVER(' + peerId + ') got signal from ' + peerId + ':');
                    console.dir(message);

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
                default:
                    disconnectSocket(peerId, 'unknown message type ' + type);
            }

        });
    });

    return {
        port,
        server: wss,
        localUrl: 'ws://localhost:' + port
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
