# Peer-to-Peer (P2P) Replication with the RxDB JavaScript Database (beta)


In the world of web and mobile development, data synchronization between clients and servers has always been a critical aspect of building real-time JavaScript applications.
Traditionally, the synchronization process relies on **centralized servers** to manage and distribute data. However, Peer-to-Peer (P2P) replication with [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) is changing the game by allowing data to flow **directly between clients**, eliminating the need for a central server.

With the **RxDB P2P replication plugin** you can replicate the database state between your clients devices fully peer2peer over WebRTC.
There is no need for a centralized server to store any of the users data like in a **master-slave** replication.
Only a WebRTC signaling server is required to initially exchange the connection data between clients so that they can establish a WebRTC connection.
The replication itself then runs with the [RxDB replication protocol](./replication.md). Because RxDB is a NoSQL database and because of the simplicity of its replication protocol, setting up a robust P2P replication is way easier compared to SQL server- or client databases.



## Understanding P2P Replication

P2P replication is a paradigm shift in data synchronization. Instead of relying on a central server to manage data transfers between clients, it leverages the power of direct peer-to-peer connections. This approach offers several advantages:

- **Reduced Latency:** With no intermediary server, data can move directly between clients, significantly reducing latency and improving real-time interactions.
- **Improved Scalability:** P2P networks can easily scale as more clients join, without putting additional load on a central server.
- **Enhanced Privacy:** Data remains within the client devices, reducing privacy concerns associated with centralized data storage.



## Usaging the RxDB P2P Replication Plugin

Before you use this plugin, make sure that you understand how [WebRTC works](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API).

First you have to add the plugin, then you can call `RxCollection.syncP2P()` to start the replication.
As options you have to provide a `topic` and a connection handler function that implements the `P2PConnectionHandlerCreator` interface. As default you should start with the `getConnectionHandlerSimplePeer` method which uses the [simple-peer](https://github.com/feross/simple-peer) library.

In difference to the other replication plugins, the P2P replication returns a `replicationPool` instead of a single `RxReplicationState`. The `replicationPool` contains all replication states of the connected peers in the network.

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

P2P replication is **always live** because there can not be a one-time sync when it is always possible to have new Peers that join  the pool. Therefore you cannot set the `live: false` option like in the other replication plugins.


## Signaling Server


For P2P replication to work with the RxDB P2P Replication Plugin, a [signaling server](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling) is required. The signaling server helps peers discover each other and establish connections.

Creating a basic signaling server is straightforward. The provided example uses 'socket.io' for WebSocket communication. However, in production, you'd want to create a more robust signaling server with authentication and additional logic to suit your application's needs.

Here is a quick example implementation of a signaling server that can be used with the connection handler from `getConnectionHandlerSimplePeer()`:

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

## Conflict detection in P2P replication

RxDB's conflict handling works by detecting and resolving conflicts that may arise when multiple clients in a decentralized database system attempt to modify the same data concurrently.
A **custom conflict handler** can be set up, which is a plain JavaScript function. The conflict handler is run on each replicated document write and resolves the conflict if required. [Find out more about RxDB conflict handling here](https://rxdb.info/transactions-conflicts-revisions.html)



## Storing replicated data encrypted on client device

Storing replicated data encrypted on client devices using the RxDB Encryption Plugin is a pivotal step towards bolstering **data security** and **user privacy**.
The P2P replication plugin seamlessly integrates with the [RxDB encryption plugins](./encryption.md), providing a robust solution for encrypting sensitive information before it's stored locally. By doing so, it ensures that even if unauthorized access to the device occurs, the data remains protected and unintelligible without the encryption key (or password). This approach is particularly vital in scenarios where user-generated content or confidential data is replicated across devices, as it empowers users with control over their own data while adhering to stringent security standards. [Read more about the encryption plugins here](./encryption.md).
