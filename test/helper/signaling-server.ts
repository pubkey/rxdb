import { nextPort } from './port-manager.ts';

import * as http from 'node:http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Starts a WebRTC signaling server
 * that can be used in tests.
 */
export async function startSignalingServer(port?: number): Promise<string> {
    if (!port) {
        port = await nextPort();
    }
    const server = http.createServer();
    const io = require('socket.io')(server, {
        cors: {
            origin: '*'
        }
    });

    const socketByPeerId = new Map();
    const socketsByRoom = new Map();

    io.on('connection', function (socket: any) {
        socket.on('signal', (message: any) => {
            socketByPeerId.get(message.to).emit('signal', message);
        });

        socket.on('join', (message: any) => {
            if (!socketsByRoom.has(message.room)) {
                console.log('START NEW ROOM: ' + message.room);
                socketsByRoom.set(message.room, []);
            }
            socketsByRoom.get(message.room).push({
                socket,
                peerId: message.peerId
            });
            socketByPeerId.set(message.peerId, socket);

            // tell everyone about room state
            const roomPeerIds = socketsByRoom.get(message.room).map((row: any) => row.peerId);
            socketsByRoom.get(message.room).forEach((row: any) => {
                row.socket.emit('joined', roomPeerIds);
            });
        });
    });

    return new Promise(res => {
        server.listen(port, () => {
            res('ws://localhost:' + port);
        });
    });
}
