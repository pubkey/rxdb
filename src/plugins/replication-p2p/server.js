/**
 * @link https://developers.google.com/codelabs/webrtc-web#5
 */
'use strict';

const server = require('http').createServer();
const io = require('socket.io')(server);
server.listen(8080);


const socketByPeerId = new Map();
const socketsByRoom = new Map();

io.on('connection', function (socket) {

    console.log('GOT connection');

    socket.on('message', function (message) {
        console.log('Client said: ', message);
        // For a real app, would be room-only (not broadcast)
        socket.broadcast.emit('message', message);
    });

    socket.on('signal', function (message) {
        console.log('GOT SIGNAL FROM CLIENT: ', message.from + ' -> ' + message.to);
        socketByPeerId.get(message.to).emit('signal', message);
    });

    socket.on('join', message => {
        if (!socketsByRoom.has(message.room)) {
            console.log('START NEW ROOM: ' + message.room);
            socketsByRoom.set(message.room, []);
        }
        console.log('PEER (' + message.peerId + ') JOINED ROOM ' + message.room);

        socketsByRoom.get(message.room).push({
            socket,
            peerId: message.peerId
        });
        socketByPeerId.set(message.peerId, socket);

        // tell everyone about room state
        const roomPeerIds = socketsByRoom.get(message.room).map(row => row.peerId);
        socketsByRoom.get(message.room).forEach(row => {
            row.socket.emit('joined', roomPeerIds);
        });
    });


    // socket.on('join', function (room) {
    //     console.log('Received request to create or join room ' + room);

    //     var clientsInRoom = io.sockets.adapter.rooms[room];
    //     var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

    //     console.log('Room ' + room + ' now has ' + numClients + ' client(s)');

    //     if (numClients === 0) {
    //         socket.join(room);
    //         console.log('Client ID ' + socket.id + ' created room ' + room);
    //         socket.emit('created', room, socket.id);

    //     } else if (numClients === 1) {
    //         console.log('Client ID ' + socket.id + ' joined room ' + room);
    //         io.sockets.in(room).emit('join', room);
    //         socket.join(room);
    //         socket.emit('joined', room, socket.id);
    //         io.sockets.in(room).emit('ready');
    //     } else { // max two clients
    //         socket.emit('full', room);
    //     }
    // });


});
