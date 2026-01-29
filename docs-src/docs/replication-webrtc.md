---
title: WebRTC P2P Replication with RxDB - Sync Browsers and Devices
slug: replication-webrtc.html
description: Learn to set up peer-to-peer WebRTC replication with RxDB. Bypass central servers and enjoy secure, low-latency data sync across all clients.
image: /headers/replication-webrtc.jpg
---

import {Steps} from '@site/src/components/steps';

# P2P WebRTC Replication with RxDB - Sync Data between Browsers and Devices in JavaScript

WebRTC P2P data connections are revolutionizing real-time web and mobile development by **eliminating central servers** in scenarios where clients can communicate directly. With the **RxDB** [Sync Engine](./replication.md), you can sync your local database state across multiple browsers or devices via **WebRTC P2P (Peer-to-Peer)** connections, ensuring scalable, secure, and **low-latency** data flows without traditional server bottlenecks.


## What is WebRTC?

[WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) stands for Web [Real-Time](./articles/realtime-database.md) Communication. It is an open standard that enables browsers and native apps to exchange audio, video, or **arbitrary data** directly between peers, bypassing a central server after the initial connection is established. WebRTC uses NAT traversal techniques like [ICE](https://developer.liveswitch.io/liveswitch-server/guides/what-are-stun-turn-and-ice.html) (Interactive Connectivity Establishment) to punch through firewalls and establish direct links. This peer-to-peer nature drastically reduces latency while maintaining **high security** and **end-to-end encryption** capabilities.

For a deeper look at comparing WebRTC with **WebSockets** and **WebTransport**, you can read our [comprehensive overview](./articles/websockets-sse-polling-webrtc-webtransport.md). While WebSockets or WebTransport often work in client-server contexts, WebRTC offers direct peer-to-peer connections ideal for fully decentralized data flows.

<center>
    <a href="https://webrtc.org/" target="_blank">
        <img src="/files/icons/webrtc.svg" alt="WebRTC" width="80" />
    </a>
</center>

## Benefits of P2P Sync with WebRTC Compared to Client-Server Architecture

1. **Reduced Latency** - By skipping a central server hop, data travels directly from one client to another, minimizing round-trip times and improving responsiveness.
2. **Scalability** - New peers can join without overloading a central infrastructure. The sync overhead increases linearly with the number of connections rather than requiring a massive server cluster.
3. **Privacy & Ownership** - Data stays within the user’s devices, avoiding risks tied to storing data on third-party servers. This design aligns well with [local-first](./articles/local-first-future.md) or "[zero-latency](./articles/zero-latency-local-first.md)" apps.
4. **Resilience** - In some scenarios, if the central server is unreachable, P2P connections remain operational (assuming a functioning signaling path). Apps can still replicate data among local networks like when they are in the same Wifi or LAN.
5. **Cost Savings** - Reducing the reliance on a high-bandwidth server can cut hosting and bandwidth expenses, particularly in high-traffic or IoT-style use cases.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Embedded Database" width="220" />
    </a>
</center>

## Peer-to-Peer (P2P) WebRTC Replication with the RxDB JavaScript Database

Traditionally, real-time data synchronization depends on **centralized servers** to manage and distribute updates. In contrast, RxDB’s WebRTC P2P replication allows data to flow **directly** among clients, removing the server as a data store. This approach is **live** and **fully decentralized**, requiring only a [signaling server](#signaling-server) for initial discovery:

- **No master-slave** concept - each peer hosts its own local RxDB.
- Clients ([browsers](./articles/browser-database.md), devices) connect to each other via WebRTC data channels.
- The [RxDB replication protocol](./replication.md) then handles pushing/pulling document changes across peers.

Because RxDB is a NoSQL database and the replication protocol is straightforward, setting up robust P2P sync is far **easier** than orchestrating a complex client-server database architecture.

## Using RxDB with the WebRTC Replication Plugin

Before you use this plugin, make sure that you understand how [WebRTC works](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API). Here we build a todo-app that replicates todo-entries between clients:

<center>
    <a href="https://rxdb.info/">
        <img src="https://github.com/pubkey/rxdb-quickstart/raw/master/files/p2p-todo-demo.gif" alt="JavaScript Embedded Database" width="500" />
    </a>
</center>

You can find a fully build example of this at the [RxDB Quickstart Repository](https://github.com/pubkey/rxdb-quickstart) which you can also [try out online](https://pubkey.github.io/rxdb-quickstart/).

Four you create the [database](./rx-database.md) and then you can configure the replication:

<Steps>

### Create the Database and Collection

Here we create a database with the [localstorage](./rx-storage-localstorage.md) based storage that stores data inside of the [LocalStorage API](./articles/localstorage.md) in a browser. RxDB has a wide [range of storages](./rx-storage.md) for other JavaScript runtimes.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
const db = await createRxDatabase({
  name: 'myTodoDB',
  storage: getRxStorageLocalstorage()
});

await db.addCollections({
  todos: {
    schema: {
      title: 'todo schema',
      version: 0,
      type: 'object',
      primaryKey: 'id',
      properties: {
        id:      { type: 'string', maxLength: 100 },
        title:   { type: 'string' },
        done:    { type: 'boolean', default: false },
        created: { type: 'string', format: 'date-time' }
      },
      required: ['id', 'title', 'done']
    }
  }
});

// insert an example document
await db.todos.insert({
  id: 'todo-1',
  title: 'P2P demo task',
  done: false,
  created: new Date().toISOString()
});
```

### Import the WebRTC replication plugin

```ts
import {
  replicateWebRTC,
  getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-webrtc';
```

### Start the P2P replication

To start the replication you have to call `replicateWebRTC` on the [collection](./rx-collection.md).

As options you have to provide a `topic` and a connection handler function that implements the `P2PConnectionHandlerCreator` interface. As default you should start with the `getConnectionHandlerSimplePeer` method which uses the [simple-peer](https://github.com/feross/simple-peer) library and comes shipped with RxDB.

```ts
const replicationPool = await replicateWebRTC(
    {
        // Start the replication for a single collection
        collection: db.todos,

        // The topic is like a 'room-name'. All clients with the same topic
        // will replicate with each other. In most cases you want to use
        // a different topic string per user. Also you should prefix the topic with
        // a unique identifier for your app, to ensure you do not let your users connect
        // with other apps that also use the RxDB P2P Replication.
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
```

Notice that in difference to the other [replication plugins](./replication.md), the WebRTC replication returns a `replicationPool` instead of a single `RxReplicationState`. The `replicationPool` contains all replication states of the connected peers in the P2P network.

### Observe Errors

To ensure we log out potential errors, observe the `error$` observable of the pool.

```ts
replicationPool.error$.subscribe(err => console.error('WebRTC Error:', err));
```

### Stop the Replication

You can also dynamically stop the replication.
```ts
replicationPool.cancel();
```
</Steps>

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


## Known problems

### SimplePeer requires to have `process.nextTick()`

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

### Polyfill the WebSocket and WebRTC API in Node.js

While all modern browsers support the WebRTC and WebSocket APIs, they is missing in Node.js which will throw the error `No WebRTC support: Specify opts.wrtc option in this environment`. Therefore you have to polyfill it with a compatible WebRTC and WebSocket polyfill. It is recommended to use the [node-datachannel package](https://github.com/murat-dogan/node-datachannel/tree/master/src/polyfill) for WebRTC which **does not** come with RxDB but has to be installed before via `npm install node-datachannel --save`.
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


## Storing replicated data encrypted on client device

Storing replicated data encrypted on client devices using the RxDB Encryption Plugin is a pivotal step towards bolstering **data security** and **user privacy**.
The WebRTC replication plugin seamlessly integrates with the [RxDB encryption plugins](./encryption.md), providing a robust solution for encrypting sensitive information before it's stored locally. By doing so, it ensures that even if unauthorized access to the device occurs, the data remains protected and unintelligible without the encryption key (or password). This approach is particularly vital in scenarios where user-generated content or confidential data is replicated across devices, as it empowers users with control over their own data while adhering to stringent security standards. [Read more about the encryption plugins here](./encryption.md).


## Follow Up

- **Check out the [RxDB Quickstart](./quickstart.md)** to see how to set up your first RxDB database.
- **Explore advanced features** like [Custom Conflict Handling](./transactions-conflicts-revisions.md) or [Offline-First Performance](./rx-storage-performance.md).
- **Try an example** at [RxDB Quickstart GitHub](https://github.com/pubkey/rxdb-quickstart) to see a working P2P Sync setup.
- **Join the RxDB Community** on [GitHub](/code/) or [Discord](/chat/) if you have questions or want to share your P2P WebRTC experiences.
