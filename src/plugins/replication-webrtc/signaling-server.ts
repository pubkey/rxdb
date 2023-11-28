import type {
    Socket
} from 'socket.io';
import { getFromMapOrCreate, randomCouchString } from '../utils/index.ts';
import type {
    SimplePeerJoinMessage,
    SimplePeerJoinedMessage,
    SimplePeerSignalMessage
} from './connection-handler-simple-peer.ts';

export const PEER_ID_LENGTH = 12;
export type ServerPeer = {
    id: string;
    socket: Socket;
    rooms: string[];
};

/**
 * Starts a WebRTC signaling server
 * that can be used in tests.
*/
export async function startSignalingServerSimplePeer(port: number) {
    const socketIO = await import('socket.io');
    const io = new socketIO.Server(
        port,
        {
            cors: {
                origin: '*'
            },

        }
    );

    const peerById = new Map<string, ServerPeer>();
    const peersByRoom = new Map<string, Set<string>>();

    function disconnectSocket(peerId: string, reason: string) {
        console.log('SERVER disconnectSocket(reason: ' + reason + ') ' + peerId);

        const peer = peerById.get(peerId);
        if (peer) {
            peer.socket.disconnect(true);
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

    io.on('connection', function (socket) {


        /**
         * PeerID is created by the server to prevent malicious
         * actors from falsy claiming other peoples ids.
        */
        const peerId = randomCouchString(PEER_ID_LENGTH);
        console.log('SERVER got connection ' + peerId + ' socketid: ' + socket.id);
        const peer: ServerPeer = {
            id: peerId,
            socket,
            rooms: []
        };
        peerById.set(peerId, peer);


        socket.on('disconnect', () => {
            console.log('SERVER(' + peerId + ') got disconnection');

            disconnectSocket(peerId, 'socket disconnected');
        });

        socket.on('join', (message: SimplePeerJoinMessage) => {
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
                    otherPeer.socket.emit('joined', {
                        yourPeerId: peerId,
                        otherPeerIds: Array.from(room)
                    } as SimplePeerJoinedMessage);
                }
            });
        });

        socket.on('signal', (message: SimplePeerSignalMessage) => {
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
                receiver.socket.emit('signal', message);
            }
        });
    });

    return {
        port,
        server: io,
        localUrl: 'ws://localhost:' + port
    };
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
