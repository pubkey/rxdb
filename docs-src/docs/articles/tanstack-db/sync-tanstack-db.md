---
title: 'How to Sync TanStack DB with Your Backend'
slug: sync-tanstack-db.html
description: TanStack DB delegates sync to its collection. Learn how to sync local data to and from any backend using RxDB's mature replication protocol under TanStack DB.
image: /headers/sync-tanstack-db.jpg
---

import {Steps} from '@site/src/components/steps';

# How to Sync TanStack DB with Your Backend

**TanStack DB** is an in-memory reactive client store with live queries and optimistic mutations. It does not talk to your backend on its own, because persistence and networking are the job of the collection implementation you choose. The official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath, and with it the RxDB [Sync Engine](../../replication.md) that replicates local data with **any backend**. The basics of the integration are described in the [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) overview. This page explains how to **sync TanStack DB** with your backend: how the two layers split the work, how RxDB's replication protocol works, a runnable HTTP example, and the list of ready-made replication plugins.

<RxdbLogo alt="sync TanStack DB with your backend" />

## The Two Loops: Who Talks to the Backend

The integration runs two independent loops:

- **The sync loop**, managed by RxDB. The [Sync Engine](../../replication.md) pulls remote changes into the local [RxCollection](../../rx-collection.md), pushes local writes to the backend, retries failed requests, and resumes from a checkpoint after the client was [offline](../../offline-first.md).
- **The UI loop**, managed by TanStack DB. It mirrors the current state of the RxCollection in memory and runs live queries and optimistic mutations against it.

TanStack DB never talks to the backend. When replication pulls a document from the server, it lands in RxDB first and then streams into the TanStack DB collection through RxDB's change feed. When you insert or update through the TanStack DB collection, the write is persisted to RxDB and the Sync Engine pushes it to the backend in the background. Your components only see the in-memory collection. The network is invisible to them.

This split has a practical benefit: sync is configured in exactly one place, on the RxCollection. You can swap the backend, change the transport, or turn replication off without touching a single component.

## How the RxDB Sync Engine Works

The RxDB [Sync Engine](../../replication.md) works in a simple "git-like" way. The client holds a fork of the server state, and the backend only has to implement three endpoints:

- **Pull handler**: gets the last checkpoint (or `null`) and returns all documents written after that checkpoint, plus a new checkpoint.
- **Push handler**: gets an array of client-side writes and returns the conflicting documents. When there are no conflicts, it returns an empty array.
- **Pull stream** (optional): an observable of ongoing server writes, used for realtime sync.

A checkpoint is a small subset of the last pulled document, most often an `updatedAt` timestamp plus the document id. Because the checkpoint is defined by your backend and not by RxDB, the protocol fits on top of almost any infrastructure: PostgreSQL, MongoDB, a REST API, or a serverless function.

The replication runs in two modes. On the first start, or after being offline, it iterates checkpoints via the pull handler until the backend returns a non-full batch. Then it switches to **event observation** and listens to the `pull.stream$` for live changes. When the stream reconnects after a connection loss, it emits a `RESYNC` flag and the replication catches up through checkpoint iteration again.

Other properties worth knowing:

- **Live mode**: with `live: true` (the default) the replication keeps running and syncs continuously. With `live: false` it runs once until the local state matches the remote state and then cancels itself.
- **Retries**: failed requests are retried after `retryTime` (default 5 seconds). The wait is skipped when an offline-to-online switch is detected.
- **Conflicts are resolved on the client** by the [conflict handler](../../transactions-conflicts-revisions.md) of the RxCollection. The backend stays "dumb" and only reports which writes conflicted.
- **Multi-tab support**: when the app runs in multiple browser tabs, [leader election](../../leader-election.md) makes sure that only one tab runs the replication. All other tabs receive the results through the shared storage. See [Multi-Tab Sync for TanStack DB](./tanstack-db-multi-tab.md).

## Example: HTTP Sync Under a TanStack DB Collection

The following example replicates a todo collection with a REST-style HTTP backend and streams the result into TanStack DB. The server side of these endpoints is shown in the [HTTP replication tutorial](../../replication-http.md).

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the RxDB and TanStack DB Collections

The setup is the same as in the [hub article](./rxdb-collection-for-tanstack-db.md), with one addition: the schema contains an `updatedAt` field so that documents are sortable by their last write time. This is required by the replication [data layout](../../replication.md#data-layout-on-the-server).

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const db = await createRxDatabase({
    name: 'tododb',
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
                completed: { type: 'boolean' },
                // last write time, used as part of the replication checkpoint
                updatedAt: { type: 'number' }
            },
            required: ['id', 'text', 'completed', 'updatedAt']
        }
    }
});

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos
    })
);
```

### Create the Pull Stream for Realtime Sync

For realtime updates, the client observes ongoing server writes. Here we use Server-Sent Events, but WebSockets or long polling work the same way. When the connection drops, we emit `RESYNC` so that the replication catches up via checkpoint iteration.

```ts
import { Subject } from 'rxjs';

const myPullStream$ = new Subject();
const eventSource = new EventSource('https://example.com/api/sync/pullStream', {
    withCredentials: true
});
eventSource.onmessage = event => {
    const eventData = JSON.parse(event.data);
    myPullStream$.next({
        documents: eventData.documents,
        checkpoint: eventData.checkpoint
    });
};
// after a reconnect, events might have been missed -> trigger a RESYNC
eventSource.onerror = () => myPullStream$.next('RESYNC');
```

### Start the Replication

Replication is configured on the RxCollection, not on the TanStack DB collection. The `replicationIdentifier` lets RxDB resume the replication from its checkpoint after an app reload.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = await replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-to-https://example.com/api/sync',
    live: true,           // keep syncing continuously (default)
    retryTime: 5 * 1000,  // retry failed requests after 5 seconds (default)
    pull: {
        async handler(checkpointOrNull, batchSize) {
            const updatedAt = checkpointOrNull ? checkpointOrNull.updatedAt : 0;
            const id = checkpointOrNull ? checkpointOrNull.id : '';
            const response = await fetch(
                `https://example.com/api/sync/pull` +
                `?updatedAt=${updatedAt}&id=${id}&limit=${batchSize}`
            );
            const data = await response.json();
            return {
                documents: data.documents,
                checkpoint: data.checkpoint
            };
        },
        stream$: myPullStream$.asObservable()
    },
    push: {
        async handler(changeRows) {
            const rawResponse = await fetch('https://example.com/api/sync/push', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(changeRows)
            });
            // the server responds with an array of conflicts (empty if none)
            const conflictsArray = await rawResponse.json();
            return conflictsArray;
        }
    }
});

// (optional) observe replication errors
replicationState.error$.subscribe(error => console.error(error));
```

### Use the Synced Data in Your Components

Nothing changes on the TanStack DB side. Pulled documents stream into the collection, and local mutations are pushed to the backend automatically.

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList() {
    // updates in realtime when the server, another tab,
    // or the local user changes a document
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    return <ul>{openTodos.map(todo => <li key={todo.id}>{todo.text}</li>)}</ul>;
}

// this write is persisted to RxDB and pushed to the backend
todosCollection.insert({
    id: 'todo-1',
    text: 'buy milk',
    completed: false,
    updatedAt: Date.now()
});
```

</Steps>

Notice that client-side clocks can never be trusted. The backend should overwrite the `updatedAt` timestamp when it receives a change from a client.

## Ready-Made Replication Plugins

When your backend matches one of RxDB's replication plugins, you do not have to write pull and push handlers yourself. All of them plug into the same Sync Engine, so the TanStack DB side stays identical:

- **[GraphQL](./tanstack-db-graphql.md)**: replicate through GraphQL queries, mutations, and subscriptions.
- **[CouchDB](./tanstack-db-couchdb-sync.md)**: sync with CouchDB and self-hosted CouchDB-compatible backends.
- **[Supabase](./tanstack-db-supabase-offline.md)**: sync with a Supabase Postgres table, including realtime changes.
- **[WebRTC P2P](./tanstack-db-p2p-webrtc.md)**: serverless peer-to-peer replication between devices.
- **[Firestore](../../replication-firestore.md)**: two-way sync with Google Firestore.
- **[MongoDB](../../replication-mongodb.md)**: replicate with a MongoDB server via change streams.
- **[NATS](../../replication-nats.md)**: sync through a NATS message broker.
- **[Appwrite](../../replication-appwrite.md)**: sync with an Appwrite backend.
- **[HTTP/REST](../../replication-http.md)**: the full tutorial for the custom handler pattern shown above, including the Node.js server side.
- **[WebSocket](../../replication-websocket.md)**: spawn a replication server from a Node.js RxDB database and connect clients over WebSockets.

To be fair: TanStack DB also has official collection types for [Electric](https://electric-sql.com/), [PowerSync](https://www.powersync.com/), and TrailBase. When you commit to one of these services as your backend, their collections sync without RxDB and are a good fit. The RxDB approach differs in that it is backend-agnostic. The same client code replicates with your existing REST API, your own Postgres, CouchDB, Firestore, or a peer device, and you can switch backends without changing your components or your storage layer.

## FAQ

<details>
    <summary>Does TanStack DB have built-in backend sync?</summary>

No. TanStack DB delegates sync to the collection implementation. The Electric, PowerSync, and TrailBase collections sync with those specific services, while the **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** brings a backend-agnostic replication protocol that works with any infrastructure.

</details>

<details>
    <summary>Can TanStack DB sync in realtime?</summary>

Yes. When the backend provides an event stream via `pull.stream$`, for example over Server-Sent Events or WebSockets, changes reach the client the moment they happen. The **[Sync Engine](../../replication.md)** writes them to RxDB and they stream into the TanStack DB collection automatically.

</details>

<details>
    <summary>Does the sync keep working when the app goes offline?</summary>

Yes. Reads and writes go against the local RxDB database first, so the app keeps working without a connection. When the client comes back online, the replication resumes from its last checkpoint and pushes the queued local writes. The full pattern is described in **[Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md)**.

</details>

<details>
    <summary>Do I have to change my backend to sync with TanStack DB and RxDB?</summary>

No. Your backend only has to expose a pull endpoint, a push endpoint, and optionally an event stream. The complex parts like retries, checkpoints, and **[conflict resolution](./tanstack-db-conflict-resolution.md)** run inside of RxDB on the client, so the backend can stay simple.

</details>

<details>
    <summary>Does the sync handle conflicts when two clients change the same document?</summary>

Yes. The push handler reports the write as a conflict, and RxDB resolves it on the client with the conflict handler of the collection. By default the server state wins. You can set a custom **[conflict handler](../../transactions-conflicts-revisions.md)** to merge the states instead.

</details>

## Follow Up

- Read the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md) for the full integration setup.
- Learn the details of the [RxDB Sync Engine](../../replication.md).
- Build the server side with the [HTTP replication tutorial](../../replication-http.md).
- Handle concurrent writes with [Conflict Resolution in TanStack DB](./tanstack-db-conflict-resolution.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
