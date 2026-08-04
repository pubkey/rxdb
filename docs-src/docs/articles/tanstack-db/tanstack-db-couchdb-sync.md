---
title: 'Sync TanStack DB with CouchDB & Self-Hosted Backends'
slug: tanstack-db-couchdb-sync.html
description: Sync TanStack DB to CouchDB, a REST API, or your own server with RxDB replication - a backend-agnostic, self-hostable alternative to hosted sync services.
image: /headers/tanstack-db-couchdb-sync.jpg
---

import {Steps} from '@site/src/components/steps';

# Sync TanStack DB with CouchDB & Self-Hosted Backends

**TanStack DB** is an in-memory reactive client store with live queries and optimistic mutations, and it delegates persistence and networking to the collection type you choose. The official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath: RxDB owns durable [storage](../../rx-storage.md) and replication, TanStack DB stays the reactive query layer on top, as described in the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md). This page shows three ways to **sync TanStack DB with CouchDB** and other self-hosted backends: the [CouchDB replication plugin](../../replication-couchdb.md), plain [HTTP replication](../../replication-http.md) against your own REST endpoints, and [RxServer](../../rx-server.md) as a ready-made sync server you host yourself.

<RxdbLogo alt="TanStack DB CouchDB self-hosted sync" />

## Why Self-Host Your Sync Backend

TanStack DB ships collections for hosted sync services like Electric, PowerSync, and TrailBase. These services are a good fit when you want someone else to run the sync layer and you are fine with building your backend around their model. The trouble starts when you already have a backend, when your data must stay on your own servers, or when you do not want your sync protocol tied to one vendor.

RxDB takes the opposite approach. Its [Sync Engine](../../replication.md) is a client-side protocol that works against any backend that can answer a pull request and accept a push request. You run the server, you own the auth, and you can switch backends without rewriting your client. Because replication is configured on the RxDB collection, TanStack DB does not have to know that a backend exists. Documents pulled from the server land in RxDB and stream into your TanStack DB collections automatically.

The three paths below are ordered by how much backend code you have to write: none for CouchDB, a full server for HTTP replication, and a few lines of Node.js for RxServer.

## Path 1: Replicate with CouchDB

[CouchDB](https://couchdb.apache.org/) is a battle-tested, open-source document database that you can self-host on any server. RxDB ships a [CouchDB replication plugin](../../replication-couchdb.md) that syncs an RxCollection with a CouchDB endpoint. Notice that it does not use the official CouchDB replication protocol because that protocol was optimized for server-to-server replication and is slow on clients. Instead the plugin talks to the CouchDB HTTP API through the RxDB Sync Engine, which makes the initial replication faster and does not require storing the whole revision tree on the client.

Start the replication with `replicateCouchDB()`:

```ts
import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

const replicationState = replicateCouchDB({
    replicationIdentifier: 'todos-to-my-couchdb',
    collection: db.todos,
    // url to the CouchDB endpoint (required)
    url: 'http://localhost:5984/todos/',
    // true for live replication, false for one-time [default=true]
    live: true,
    pull: {
        // documents per HTTP request (optional)
        batchSize: 60
    },
    push: {
        batchSize: 60
    }
});
```

For authentication you provide a custom `fetch` method that adds your headers, or you use the `getFetchWithCouchDBAuthorization()` helper for basic auth:

```ts
import {
    replicateCouchDB,
    getFetchWithCouchDBAuthorization
} from 'rxdb/plugins/replication-couchdb';

const replicationState = replicateCouchDB({
    replicationIdentifier: 'todos-to-my-couchdb',
    collection: db.todos,
    url: 'http://localhost:5984/todos/',
    fetch: getFetchWithCouchDBAuthorization('myUsername', 'myPassword'),
    pull: {},
    push: {}
});
```

Keep these limitations in mind:

- **Create the database yourself**: The plugin does not create missing CouchDB databases. Run a `PUT` request to the database url once before the first sync.
- **No attachment replication**: The plugin does not replicate [attachments](../../rx-attachment.md).
- **6 parallel collections**: CouchDB syncs over HTTP/1.1 long polling, and browsers limit the number of parallel connections per domain. Replicate at most 6 collections, or put an HTTP/2 proxy like nginx in front of CouchDB. The [plugin docs](../../replication-couchdb.md#limitations) show a working nginx config.

### A Note for PouchDB Users

When you search for "TanStack DB PouchDB", the answer is that you do not need PouchDB. In the past, RxDB used [PouchDB as a storage engine](../../rx-storage-pouchdb.md) to get CouchDB replication for free, but that storage was deprecated and removed because of its performance overhead. The CouchDB replication plugin replaced it. It replicates directly with any CouchDB-compatible endpoint and works with every [RxStorage](../../rx-storage.md), so your TanStack DB collections can sync with a CouchDB server while the local data sits in fast IndexedDB or SQLite storage.

## Path 2: HTTP Replication with Your Own REST API

When you already have a backend, you do not need a replication plugin at all. The [replication protocol](../../replication.md) is simple enough to implement over plain HTTP: a pull endpoint that returns documents after a given checkpoint, a push endpoint that accepts change rows and returns conflicts, and a [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) stream for ongoing changes. The [HTTP replication tutorial](../../replication-http.md) walks through a complete Express server. On the client, the setup looks like this:

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { Subject } from 'rxjs';

// Server-Sent Events stream for ongoing server-side changes.
const myPullStream$ = new Subject();
const eventSource = new EventSource('https://example.com/pullStream', {
    withCredentials: true
});
eventSource.onmessage = (event) => myPullStream$.next(JSON.parse(event.data));
// After a reconnect, tell the replication to catch up.
eventSource.onerror = () => myPullStream$.next('RESYNC');

const replicationState = await replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-to-my-rest-api',
    live: true,
    pull: {
        async handler(checkpointOrNull, batchSize) {
            const updatedAt = checkpointOrNull ? checkpointOrNull.updatedAt : 0;
            const id = checkpointOrNull ? checkpointOrNull.id : '';
            const params = `updatedAt=${updatedAt}&id=${id}&limit=${batchSize}`;
            const response = await fetch(
                `https://example.com/pull?${params}`
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
            const response = await fetch('https://example.com/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changeRows)
            });
            // The server returns the conflicting documents.
            return await response.json();
        }
    }
});
```

The checkpoint format is not determined by RxDB. Your server can use any value that lets it iterate over document writes, and a `{ updatedAt, id }` pair is the most common choice. Because the transport is plain HTTP, the server side can be Node.js, Go, Java, or anything else that speaks JSON. This path means the most backend work, but it also means full control: your database, your auth, your hosting.

## Path 3: RxServer, a Self-Hostable Sync Server

When you want a ready-made server instead of writing endpoints yourself, the [RxServer](../../rx-server.md) plugin spawns an HTTP server on top of a server-side RxDatabase. It runs in Node.js, Deno, Bun, or the Electron main process, either standalone or on top of an existing Express app. The server side takes a few lines:

```ts
// > server.ts
import { createRxServer } from 'rxdb-server/plugins/server';
import { RxServerAdapterExpress } from 'rxdb-server/plugins/adapter-express';

const myServer = await createRxServer({
    database: myRxDatabase,
    adapter: RxServerAdapterExpress,
    port: 443
});

// One replication endpoint per collection.
const endpoint = myServer.addReplicationEndpoint({
    name: 'todos',
    collection: myServerCollection
});

await myServer.start();
```

On the client, the [Server Replication plugin](../../replication-server.md) connects to that endpoint. The url ends with the server-side schema version:

```ts
// > client.ts
import { replicateServer } from 'rxdb-server/plugins/replication-server';

const replicationState = await replicateServer({
    collection: db.todos,
    replicationIdentifier: 'todos-to-my-rxserver',
    url: 'http://localhost:443/todos/0',
    headers: {
        Authorization: 'Bearer S0VLU0UhI...'
    },
    push: {},
    pull: {},
    live: true
});
```

RxServer covers the parts that are tedious to build yourself: an `authHandler` parses the request headers into auth data, a `queryModifier` restricts which documents each user can replicate, and a `changeValidator` restricts which writes are accepted. The client-side replication state emits `unauthorized$` when auth headers must be refreshed and `outdatedClient$` when the app runs against a newer server schema. The Express adapter ships with the free `rxdb-server` package. The Fastify and Koa adapters are part of [RxDB Premium 👑](/premium/).

## Example: TanStack DB with CouchDB Sync

The following example wires the CouchDB path end to end. The basics of the RxDB collection setup are explained in the [hub article](./rxdb-collection-for-tanstack-db.md).

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the Database and Collection

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

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
                completed: { type: 'boolean' }
            },
            required: ['id', 'text', 'completed']
        }
    }
});
```

### Start the CouchDB Replication

```ts
import {
    replicateCouchDB,
    getFetchWithCouchDBAuthorization
} from 'rxdb/plugins/replication-couchdb';

// The plugin does not create missing databases,
// create it once on the server:
await fetch('http://localhost:5984/todos', { method: 'PUT' });

const replicationState = replicateCouchDB({
    replicationIdentifier: 'todos-to-my-couchdb',
    collection: db.todos,
    url: 'http://localhost:5984/todos/',
    live: true,
    fetch: getFetchWithCouchDBAuthorization('myUsername', 'myPassword'),
    pull: {},
    push: {}
});
```

### Wrap the RxCollection in a TanStack DB Collection

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

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList() {
    // Re-renders when local writes OR documents pulled
    // from CouchDB change the result set.
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
```

Local mutations are persisted to RxDB and pushed to CouchDB in the background. Changes written to CouchDB by other clients are pulled into RxDB and appear in the live query without any extra code. When conflicts appear during replication, the [conflict handler](../../transactions-conflicts-revisions.md) of the RxCollection resolves them.

</Steps>

## Which Path to Pick

- **CouchDB** when you want a proven, self-hosted database with zero custom sync code. You install CouchDB, create the databases, and the plugin does the rest.
- **HTTP replication** when you already have a backend and want sync to run through your existing API, auth, and database.
- **RxServer** when your backend is JavaScript anyway and you want replication endpoints with auth, per-user filtering, and write validation out of the box.

All three keep the client code identical above the replication layer. The TanStack DB collection, the live queries, and the mutations do not change when you switch from CouchDB to a REST API or to RxServer. The offline behavior also stays the same: writes go to the local database first, and replication resumes from a checkpoint when the client comes back online, as described in [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).

## FAQ

<details>
    <summary>Can TanStack DB sync with CouchDB?</summary>

Yes. TanStack DB itself does not talk to backends, but with the official RxDB collection underneath, the **[CouchDB replication plugin](../../replication-couchdb.md)** syncs the backing RxCollection with any CouchDB server. All pulled documents stream into the TanStack DB collection automatically.

</details>

<details>
    <summary>Does TanStack DB work with PouchDB?</summary>

No, and it does not have to. The **[PouchDB RxStorage](../../rx-storage-pouchdb.md)** was removed from RxDB because of its performance overhead. Instead RxDB replicates directly with CouchDB-compatible endpoints through the CouchDB replication plugin, so you get CouchDB sync while using a fast local storage like IndexedDB or SQLite.

</details>

<details>
    <summary>Can I sync TanStack DB with my own REST API?</summary>

Yes. The RxDB **[Sync Engine](../../replication.md)** only needs a pull endpoint, a push endpoint, and optionally a Server-Sent Events stream for ongoing changes. The [HTTP replication tutorial](../../replication-http.md) shows a complete Express implementation that you can port to any server language.

</details>

<details>
    <summary>Is RxServer free to self-host?</summary>

Yes. The `rxdb-server` package with the Express adapter is free and open source, including replication endpoints, auth handlers, query modifiers, and change validators. Only the Fastify and Koa adapters are part of **[RxDB Premium 👑](/premium/)**. See the [RxServer docs](../../rx-server.md) for details.

</details>

<details>
    <summary>Do I need a hosted sync service for TanStack DB offline sync?</summary>

No. Hosted services like Electric or PowerSync are one option, but the **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** replicates with backends you host yourself: CouchDB, your own REST API, or RxServer. Your data stays on your infrastructure and your auth stays under your control.

</details>

## Follow Up

- Read the hub article [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) for the full integration setup.
- Learn the general backend pattern in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- See [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md) and [Conflict Resolution in TanStack DB with RxDB](./tanstack-db-conflict-resolution.md).
- Start with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
