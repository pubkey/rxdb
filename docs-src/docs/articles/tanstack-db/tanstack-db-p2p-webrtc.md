---
title: 'Peer-to-Peer Sync for TanStack DB with WebRTC & RxDB'
slug: tanstack-db-p2p-webrtc.html
description: Sync TanStack DB directly between devices with no central server, using RxDB's WebRTC replication. Build peer-to-peer, local-first apps with live queries.
image: /headers/tanstack-db-p2p-webrtc.jpg
---

import {Steps} from '@site/src/components/steps';

# Peer-to-Peer Sync for TanStack DB with WebRTC & RxDB

**TanStack DB** is an in-memory reactive client store with live queries and optimistic mutations. Persistence and networking come from the collection implementation, and the official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath as described in the [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) overview. Because replication is configured on the RxDB side, you can pick any plugin of the [Sync Engine](../../replication.md), including the [WebRTC replication plugin](../../replication-webrtc.md) that syncs data **peer-to-peer** between devices without a central database server. This page explains how P2P sync works under TanStack DB, what it does and does not give you, and walks through a runnable two-peer todo example.

<RxdbLogo alt="TanStack DB peer-to-peer WebRTC sync" />

## How P2P Sync Works Under TanStack DB

The setup forms the same two loops as every other guide in this series, only the sync target changes:

- **RxDB owns storage and replication.** Each peer runs its own [RxDatabase](../../rx-database.md) with a durable [RxStorage](../../rx-storage.md). The [WebRTC replication plugin](../../replication-webrtc.md) connects the peers directly through WebRTC data channels and runs the normal [replication protocol](../../replication.md) over them.
- **TanStack DB owns the reactive UI state.** It mirrors the RxDB collection in memory and serves live queries and optimistic mutations.

There is no master and no slave. Every peer hosts its own full copy of the data, and all peers with the same `topic` string replicate with each other. When a document arrives from another peer, RxDB writes it to the local storage and the change streams into the TanStack DB collection automatically. Your `useLiveQuery` components re-render without any extra wiring.

The plugin was formerly called `replication-p2p` and has been renamed to `replication-webrtc`. Old links redirect to the [current page](../../replication-webrtc.md).

## What P2P Gives You and What It Does Not

Peer-to-peer sync is a strong fit for collaboration between a user's own devices, local network apps, and privacy-sensitive tools where data should never touch a third-party server. But there is no free lunch. Be aware of these tradeoffs before you commit:

- **No central server for data.** Documents travel directly between clients over WebRTC data channels. You do not host a database backend, and the data stays on the users' devices. This aligns well with [local-first](../local-first-future.md) architecture.
- **A signaling server is still needed.** WebRTC peers cannot find each other on their own. A small [signaling server](../../replication-webrtc.md#signaling-server) handles peer discovery and connection setup. It never sees your documents, only connection metadata. RxDB ships a demo signaling server at `wss://signaling.rxdb.info/` for tryouts, but it is not reliable and might be offline at any time. In production you must run your own.
- **No authority for conflicts.** In a client-server setup the server decides which write wins. In a P2P network there is no such authority, so conflicts are detected and resolved on each peer by the [conflict handler](./tanstack-db-conflict-resolution.md). With the default handler, concurrent edits to the same document resolve to one of the states. When you need merges, define a custom handler on the RxCollection.
- **Peers must be online at the same time.** Data only flows while a direct connection exists. When peer A writes while peer B is closed, B receives the change the next time both are connected. There is no server that buffers changes in between. Because every peer keeps a durable local copy, nothing is lost, the exchange is just delayed.
- **Always live.** The WebRTC replication cannot run as a one-time sync because new peers can join the pool at any moment. The `live: false` option of other [replication plugins](../../replication.md) does not exist here.

## Example: Two-Peer Todo Sync

The following example wires a TanStack DB todo collection to RxDB and replicates it peer-to-peer. Open the app on two devices (or two browsers) with the same topic and watch the todos appear on both. The database and collection setup is the same as in the [hub article](./rxdb-collection-for-tanstack-db.md), so the shared parts are kept short.

<Steps>

### Install the Packages

The WebRTC replication plugin ships with the `rxdb` package, no extra install is needed for it.

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the RxDatabase and RxCollection

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'p2ptododb',
    storage: getRxStorageLocalstorage()
});

await db.addCollections({
    todos: {
        schema: {
            title: 'todos',
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                text: { type: 'string' },
                completed: { type: 'boolean' }
            },
            required: ['id', 'text', 'completed']
        }
    }
});
```

### Start the WebRTC Replication

Call `replicateWebRTC()` on the RxCollection. The `topic` works like a room name: all clients with the same topic replicate with each other. In most cases you want one topic per user, prefixed with an identifier for your app so your users do not connect with other apps that also use the RxDB P2P replication.

```ts
import {
    replicateWebRTC,
    getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-webrtc';

const replicationPool = await replicateWebRTC({
    collection: db.todos,
    // Room name: same topic = same replication pool.
    topic: 'my-todo-app|user-123',
    connectionHandlerCreator: getConnectionHandlerSimplePeer({
        // Demo server for tryouts only.
        // In production, run your own signaling server.
        signalingServerUrl: 'wss://signaling.rxdb.info/'
    }),
    pull: {},
    push: {}
});

// Log errors from any peer connection.
replicationPool.error$.subscribe(err => console.error('WebRTC error:', err));
```

Notice that `replicateWebRTC()` returns a `replicationPool` instead of a single replication state. The pool contains the replication states of all connected peers, and you can stop everything with `replicationPool.cancel()`.

### Wrap the RxCollection for TanStack DB

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos,
        startSync: true
    })
);
```

### Query and Mutate from React

Every mutation persists to the local RxDB storage first and is then pushed to all connected peers. Documents arriving from other peers stream into the live query automatically.

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList() {
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    return (
        <ul>
            {openTodos.map((todo) => (
                <li
                    key={todo.id}
                    onClick={() =>
                        todosCollection.update(todo.id, (draft) => {
                            draft.completed = true;
                        })
                    }
                >
                    {todo.text}
                </li>
            ))}
        </ul>
    );
}

// Insert on peer A, and the todo shows up on peer B.
todosCollection.insert({
    id: 'todo-' + Date.now(),
    text: 'sync me over WebRTC',
    completed: false
});
```

</Steps>

## Running Your Own Signaling Server

For production you host your own signaling server. A basic one that works with `getConnectionHandlerSimplePeer()` takes a few lines:

```ts
import {
    startSignalingServerSimplePeer
} from 'rxdb/plugins/replication-webrtc';

const serverState = await startSignalingServerSimplePeer({
    port: 8080
});
```

For real deployments you want to add authentication and your own logic on top. To keep unwanted clients out of a replication pool, pass a custom `isPeerValid()` function to `replicateWebRTC()` that returns `true` for valid peers and `false` for invalid ones. Details are on the [WebRTC replication page](../../replication-webrtc.md#signaling-server).

Peers do not have to be browsers. Node.js lacks the WebRTC and WebSocket APIs, so a Node.js peer needs polyfills: wrap the `node-datachannel/polyfill` package with `createSimplePeerWrtc()` and pass the `ws` WebSocket as `webSocketConstructor`, as shown in the [known problems section](../../replication-webrtc.md#known-problems).

## Protecting the Local Copy

P2P sync means every peer stores a full copy of the shared data on its device. When that data is sensitive, combine the WebRTC replication with the [RxDB encryption plugins](../../encryption.md) so documents are encrypted before they are written to disk. The setup for TanStack DB is described in [Encrypting Local Data in TanStack DB with RxDB](./tanstack-db-encryption.md).

## FAQ

<details>
    <summary>Can TanStack DB sync peer-to-peer without a server?</summary>

Yes, for the data itself. With the **[RxDB WebRTC replication](../../replication-webrtc.md)** underneath, documents travel directly between peers and no server stores them. You still need a small signaling server for peer discovery, because WebRTC clients cannot find each other without one.

</details>

<details>
    <summary>Do peers have to be online at the same time to sync?</summary>

Yes. WebRTC data channels only transfer data while both peers are connected, and there is no server that buffers changes for absent peers. Each peer keeps a durable local copy in **[RxDB](../../rx-database.md)**, so the missing changes are exchanged the next time both peers are online together.

</details>

<details>
    <summary>What happens when two peers edit the same document in TanStack DB?</summary>

No peer has authority, so the conflict is detected and resolved locally by the RxDB conflict handler. The default handler resolves to one of the conflicting states. For field-level merges you set a custom `conflictHandler` on the RxCollection, as described in **[Conflict Resolution in TanStack DB with RxDB](./tanstack-db-conflict-resolution.md)**.

</details>

<details>
    <summary>Can I use the public RxDB signaling server in production?</summary>

No. The server at `wss://signaling.rxdb.info/` exists for demonstration purposes and tryouts, it is not reliable and might be offline at any time. In production you run your own signaling server, for example with `startSignalingServerSimplePeer()` from the **[WebRTC replication plugin](../../replication-webrtc.md)**.

</details>

<details>
    <summary>Does TanStack DB WebRTC sync work in Node.js?</summary>

Yes. Node.js does not ship the WebRTC and WebSocket APIs, so you install `node-datachannel`, wrap its polyfill with `createSimplePeerWrtc()`, and pass a WebSocket constructor from the `ws` package. The exact setup is shown on the **[WebRTC replication page](../../replication-webrtc.md)**.

</details>

## Follow Up

- Read the full [WebRTC replication plugin documentation](../../replication-webrtc.md).
- Start with the [TanStack DB + RxDB integration guide](./rxdb-collection-for-tanstack-db.md) and the [RxDB Quickstart](../../quickstart.md).
- Learn how conflicts are handled in [Conflict Resolution in TanStack DB with RxDB](./tanstack-db-conflict-resolution.md).
- Compare P2P with server-based sync in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md) and [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to share your P2P setup.
