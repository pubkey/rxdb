---
title: P2P WebRTC Replication with RxDB
slug: replication-webrtc.html
description: Learn to set up peer-to-peer WebRTC replication with RxDB. Bypass central servers and enjoy secure, low-latency data sync across all clients.
---

# Peer-to-Peer (P2P) WebRTC Replication with the RxDB JavaScript Database

In the world of web and mobile development, data synchronization between clients and servers has always been a critical aspect of building real-time JavaScript applications.
Traditionally, the synchronization process relies on **centralized servers** to manage and distribute data. However, Peer-to-Peer (P2P) replication with [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) is changing the game by allowing data to flow **directly between clients**, eliminating the need for a central server.

With the **RxDB WebRTC replication plugin** you can replicate the database state between your clients devices fully peer2peer over WebRTC.
There is no need for a centralized server to store any of the users data like in a **master-slave** replication.
Only a WebRTC signaling server is required to initially exchange the connection data between clients so that they can establish a WebRTC connection.
The replication itself then runs with the [RxDB replication protocol](./replication.md). Because RxDB is a NoSQL database and because of the simplicity of its replication protocol, setting up a robust P2P replication is way easier compared to SQL server- or client databases.

## Understanding P2P Replication

P2P replication is a paradigm shift in data synchronization. Instead of relying on a central server to manage data transfers between clients, it leverages the power of direct peer-to-peer connections. This approach offers several advantages:

- **Reduced Latency:** With no intermediary server, data can move directly between clients, significantly reducing latency and improving real-time interactions.
- **Improved Scalability:** P2P networks can easily scale as more clients join, without putting additional load on a central server.
- **Enhanced Privacy:** Data remains within the client devices, reducing privacy concerns associated with centralized data storage.

## Using the RxDB WebRTC Replication Plugin

Before you use this plugin, make sure that you understand how [WebRTC works](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API).

First you have to add the plugin, then you can call `RxCollection.syncWebRTC()` to start the replication.
As options you have to provide a `topic` and a connection handler function that implements the `P2PConnectionHandlerCreator` interface. As default you should start with the `getConnectionHandlerSimplePeer` method which uses the [simple-peer](https://github.com/feross/simple-peer) library.

In difference to the other replication plugins, the WebRTC replication returns a `replicationPool` instead of a single `RxReplicationState`. The `replicationPool` contains all replication states of the connected peers in the P2P network.

```ts
import {
    replicateWebRTC,
    getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-webrtc';

const replicationPool = await replicateWebRTC(
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
        connectionHandlerCreator: getConnectionHandlerSimplePeer({
            // Set the signaling server url.
            // You can use the server provided by RxDB for tryouts,
            // but in production you should use your own server instead.
            signalingServerUrl: 'wss://signaling.rxdb.info/',

            // only in Node.js, we need the wrtc library
            // because Node.js does not contain the WebRTC API.
            wrtc: require('node-datachannel/polyfill'),
            // only in Node.js, we need the WebSocket library
            // because Node.js does not contain the WebSocket API.
            webSocketConstructor: require('ws').WebSocket
        }),
        pull: {},
        push: {}
    }
);
replicationPool.error$.subscribe(err => { /* ... */ });
replicationPool.cancel();
```

### Polyfill the WebSocket and WebRTC API in Node.js

While all modern browsers support the WebRTC and WebSocket APIs, they is missing in Node.js which will throw the error `No WebRTC support: Specify opts.wrtc option in this environment`. Therefore you have to polyfill it with a compatible WebRTC and WebSocket polyfill. It is recommended to use the [node-datachannel package](https://github.com/murat-dogan/node-datachannel/tree/master/polyfill) for WebRTC which **does not** come with RxDB but has to be installed before via `npm install node-datachannel --save`.
For the Websocket API use the `ws` package that is included into RxDB.

```ts
import nodeDatachannelPolyfill from 'node-datachannel/polyfill';
import { WebSocket } from 'ws';
const replicationPool = await replicateWebRTC(
    {
        /* ... */
        connectionHandlerCreator: getConnectionHandlerSimplePeer({
            signalingServerUrl: 'wss://example.com:8080',
            wrtc: nodeDatachannelPolyfill,
            webSocketConstructor: WebSocket
        }),
        pull: {},
        push: {}
        /* ... */
    }
);
```

## Live replications

The WebRTC replication is **always live** because there can not be a one-time sync when it is always possible to have new Peers that join the connection pool. Therefore you cannot set the `live: false` option like in the other replication plugins.


## Signaling Server


For P2P replication to work with the RxDB WebRTC Replication Plugin, a [signaling server](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling) is required. The signaling server helps peers discover each other and establish connections.

RxDB ships with a default signaling server that can be used with the simple-peer connection handler. This server is made for demonstration purposes and tryouts. It is not reliable and might be offline at any time.
In production you must always use your own signaling server instead!

Creating a basic signaling server is straightforward. The provided example uses 'socket.io' for WebSocket communication. However, in production, you'd want to create a more robust signaling server with authentication and additional logic to suit your application's needs.

Here is a quick example implementation of a signaling server that can be used with the connection handler from `getConnectionHandlerSimplePeer()`:

```ts
import {
    startSignalingServerSimplePeer
} from 'rxdb/plugins/replication-webrtc';

const serverState = await startSignalingServerSimplePeer({
    port: 8080 // <- port
});
```

For custom signaling servers with more complex logic, you can check the [source code of the default one](https://github.com/pubkey/rxdb/blob/master/src/plugins/replication-webrtc/signaling-server.ts).


## Peer Validation

By default the replication will replicate with every peer the signaling server tells them about.
You can prevent invalid peers from replication by passing a custom `isPeerValid()` function that either returns `true` on valid peers and `false` on invalid peers.

```ts
const replicationPool = await replicateWebRTC(
    {
        /* ... */
        isPeerValid: async (peer) => {
            return true;
        }
        pull: {},
        push: {}
        /* ... */
    }
);
```

## Conflict detection in WebRTC replication

RxDB's conflict handling works by detecting and resolving conflicts that may arise when multiple clients in a decentralized database system attempt to modify the same data concurrently.
A **custom conflict handler** can be set up, which is a plain JavaScript function. The conflict handler is run on each replicated document write and resolves the conflict if required. [Find out more about RxDB conflict handling here](https://rxdb.info/transactions-conflicts-revisions.html)

## SimplePeer requires to have `process.nextTick()`

In the browser you might not have a process variable or process.nextTick() method. But the [simple peer](https://github.com/feross/simple-peer) uses that so you have to polyfill it.

In webpack you can use the `process/browser` package to polyfill it:

```js
const plugins = [
    /* ... */
    new webpack.ProvidePlugin({
        process: 'process/browser',
    })
    /* ... */
];
```

In angular or other libraries you can add the polyfill manually:

```js
window.process = {
    nextTick: (fn, ...args) => setTimeout(() => fn(...args)),
};

```

## Storing replicated data encrypted on client device

Storing replicated data encrypted on client devices using the RxDB Encryption Plugin is a pivotal step towards bolstering **data security** and **user privacy**.
The WebRTC replication plugin seamlessly integrates with the [RxDB encryption plugins](./encryption.md), providing a robust solution for encrypting sensitive information before it's stored locally. By doing so, it ensures that even if unauthorized access to the device occurs, the data remains protected and unintelligible without the encryption key (or password). This approach is particularly vital in scenarios where user-generated content or confidential data is replicated across devices, as it empowers users with control over their own data while adhering to stringent security standards. [Read more about the encryption plugins here](./encryption.md).
