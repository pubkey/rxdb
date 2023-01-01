# Peer-to-Peer Replication (beta)

This plugin allows you to replicate data between your clients devices fully P2P, **without a backend server**.
It uses [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) to create a connection between the devices and then establishes a replication with the normal [RxDB replication protocol](./replication.md).



## Usage

Before you use this plugin, make sure that you understand how [WebRTC works](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API).

First you have to add the plugin, then you can call `RxCollection.syncP2P()` to start the replication.
As options you have to provide a `topic` and a connection handler function that implements the `P2PConnectionHandlerCreator` interface. As default you should start with the `getConnectionHandlerSimplePeer` method which uses the [simple-peer](https://github.com/feross/simple-peer) library.

In difference to the other replication plugins, the P2P replication returns a `replicationPool` instead of a single replication state. The `replicationPool` contains all replication states of the connected peers in the network.


```ts
import {
    replicateP2P,
    getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-p2p';


const replicationPool = await replicateP2P(
    {
        collection: myRxCollection,
        // The topic is like a 'room-name'. All clients with the same topic
        // will replicate with each other. In most cases you want to use
        // a different topic string per user.
        topic: 'my-users-pool',
        /**
         * You need a collection handler to be able to create WebRTC connections.
         * Here we use the simple peer handler which uses the 'simple-peer' npm library.
         * To learn how to create a custom connection handler, read the source code,
         * it is pretty simple.
         */
        connectionHandlerCreator: getConnectionHandlerSimplePeer(
            'wss://example.com:8080',
            // only in Node.js, we need the wrtc library
            // because Node.js does not contain the WebRTC API.
            require('wrtc')
        ),
        pull: {},
        push: {}
    }
);
replicationPool.error$.subscribe(err => { /* ... */ });
replicationPool.cancel();

```


## Live replications

P2P replication is always live because there can not be a one-time sync when it is always possible to have new Peers that join  the pool. Therefore you cannot set the `live` option like in the other replication plugins.


## Signaling Server

The simple-peer connection handler needs a [signaling server](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling). Creating a signaling server is pretty easy and can be done in a few lines of code, like in the following example:

```ts
export async function startSignalingServer(port: number): Promise<string> {
    const server = require('http').createServer();
    const io = require('socket.io')(server);
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
```

In production you might not want to use that and instead create your custom signaling server with authentication and a different logic.
