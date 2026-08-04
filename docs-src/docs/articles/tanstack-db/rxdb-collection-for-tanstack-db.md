---
title: 'TanStack DB + RxDB: Durable, Offline-First Persistence & Sync'
slug: rxdb-collection-for-tanstack-db.html
description: Add durable offline storage and real backend sync to TanStack DB with the official RxDB collection. See how to wire RxDB under TanStack DB's live queries.
image: /headers/rxdb-collection-for-tanstack-db.jpg
---

import {Steps} from '@site/src/components/steps';

# TanStack DB + RxDB: Durable, Offline-First Persistence & Sync

**TanStack DB** is a reactive client store that gives you live queries and optimistic mutations over so called collections. It keeps all data in memory, and it delegates persistence and networking to the collection type you choose. [RxDB](https://rxdb.info/) is a [local-first](../local-first-future.md) NoSQL database with durable [storage engines](../../rx-storage.md) and a mature [Sync Engine](../../replication.md) for replicating with any backend. The official `@tanstack/rxdb-db-collection` package connects the two: RxDB owns storage and sync, TanStack DB sits on top as the in-memory query layer. This page explains how the integration works, walks through a complete setup, and links to guides for every platform and backend.

<RxdbLogo alt="TanStack DB RxDB collection" />

## How the Integration Works

TanStack DB collections are in-memory by design. When you reload the page, the memory is gone, and TanStack DB itself does not talk to your backend. Both jobs belong to the collection implementation. The [RxDB collection](https://tanstack.com/db/latest/docs/collections/rxdb-collection) fills that role with a real database underneath: data is stored durably in [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [SQLite](../../rx-storage-sqlite.md) or any other [RxStorage](../../rx-storage.md), and replication runs through RxDB's [Sync Engine](../../replication.md).

The integration forms two independent loops:

- **A durability and sync loop**, managed by RxDB. It writes documents to disk and replicates them with your backend, including retries, [conflict handling](../../transactions-conflicts-revisions.md) and resuming after being offline.
- **A reactive UI loop**, managed by TanStack DB. It mirrors the current state of the RxDB collection in memory and runs live queries and optimistic mutations against it.

Data exists in both layers on purpose. RxDB stores it durably on disk, TanStack DB holds a copy in memory for fast queries. Writes on the TanStack DB collection are persisted to RxDB, and every change in RxDB, no matter if it came from another browser tab, from replication or from direct RxDB code, streams back into the TanStack DB collection through RxDB's change feed.

## What RxDB Adds Under TanStack DB

### 1. Durable, Storage-Agnostic Persistence

RxDB abstracts the storage layer behind the [RxStorage](../../rx-storage.md) interface. The same application code runs on [localStorage](../../rx-storage-localstorage.md), [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md) in the browser, or [SQLite](../../rx-storage-sqlite.md) on [React Native](./tanstack-db-react-native.md), [Electron](./tanstack-db-electron.md) and [Capacitor](./tanstack-db-capacitor.md). Switching storages is a configuration change, not a rewrite. See [How to Persist TanStack DB to IndexedDB & OPFS](./persist-tanstack-db-indexeddb.md) for the browser setup.

### 2. Replication with Any Backend

RxDB's [Sync Engine](../../replication.md) has been battle-tested for years and ships plugins for [GraphQL](./tanstack-db-graphql.md), [CouchDB](./tanstack-db-couchdb-sync.md), [Supabase](./tanstack-db-supabase-offline.md), [HTTP/REST](../../replication-http.md), [Firestore](../../replication-firestore.md), [MongoDB](../../replication-mongodb.md) and even serverless [peer-to-peer replication over WebRTC](./tanstack-db-p2p-webrtc.md). Replication is configured on the RxDB collection and TanStack DB picks up the results automatically. The general pattern is described in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).

### 3. Offline-First Behavior

Because all reads and writes go against the local database first, the app keeps working without a network connection. Replication resumes from a checkpoint when the client comes back online, and [conflicts](./tanstack-db-conflict-resolution.md) are resolved with a pluggable conflict handler. The full pattern is described in [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).

### 4. Multi-Tab Support

When the user opens your app in multiple browser tabs, RxDB shares one durable store across them and uses [leader election](../../leader-election.md) so that replication runs in exactly one tab. Changes made in one tab stream into the TanStack DB collections of all other tabs. See [Multi-Tab Sync for TanStack DB with RxDB](./tanstack-db-multi-tab.md).

### 5. Encryption, Migrations and Other Database Features

RxDB brings features that a cache or in-memory store does not have: [encryption of local data](./tanstack-db-encryption.md), [schema migrations](../../migration-schema.md) for when your data model changes, [compression](../../key-compression.md), [attachments](../../rx-attachment.md) and [backup](../../backup.md). All of them apply to the data that backs your TanStack DB collections.

## Setup

The following example builds a todo app collection. It runs in the browser with the free [localStorage-based storage](../../rx-storage-localstorage.md); any other [RxStorage](../../rx-storage.md) works the same way.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

TanStack DB also ships bindings for Vue, Solid, Svelte and Angular. The RxDB collection works with all of them because it plugs into the framework-independent `createCollection()`.

### Create an RxDatabase and RxCollection

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// (optional) add dev-mode checks, recommended during development
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
    name: 'mydb',
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

### Wrap the RxCollection in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos,
        startSync: true // start ingesting RxDB data immediately
    })
);
```

`todosCollection` is now a normal TanStack DB collection. It loads its initial state from disk and stays in sync with RxDB from then on.

### Query and Mutate from Your Components

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList() {
    // Live query: re-renders whenever a matching document changes.
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
                        // Optimistic update: instant in the UI, persisted to RxDB.
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

// Inserts and deletes work the same way:
todosCollection.insert({ id: 'todo-1', text: 'buy milk', completed: false });
todosCollection.delete('todo-1');
```

Mutations apply to the in-memory state instantly and are persisted to RxDB in the background. When persisting fails, TanStack DB rolls the optimistic state back.

### (Optional) Replicate with Your Backend

Replication is set up on the RxDB collection, not on the TanStack DB collection. This example uses the generic [replication protocol](../../replication.md) with custom pull and push handlers; the [GraphQL](./tanstack-db-graphql.md), [CouchDB](./tanstack-db-couchdb-sync.md) and [Supabase](./tanstack-db-supabase-offline.md) guides show ready-made plugins instead.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-to-https://example.com/api/sync',
    live: true,
    pull: {
        handler: async (checkpoint, batchSize) => {
            const response = await fetch(
                `https://example.com/api/sync/pull?checkpoint=${encodeURIComponent(
                    JSON.stringify(checkpoint)
                )}&limit=${batchSize}`
            );
            return await response.json();
        }
    },
    push: {
        handler: async (rows) => {
            const response = await fetch('https://example.com/api/sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rows)
            });
            return await response.json();
        }
    }
});
```

Documents pulled from the backend land in RxDB and stream into the TanStack DB collection automatically. Local writes are pushed back to the backend by RxDB. TanStack DB does not have to know that replication exists.

</Steps>

## Configuration Options

`rxdbCollectionOptions()` accepts the following options:

- `rxCollection` (required): The [RxCollection](../../rx-collection.md) that backs this TanStack DB collection.
- `id` (optional): Unique identifier for the collection.
- `schema` (optional): A [Standard Schema](https://standardschema.dev/) for validation on the TanStack DB side. RxDB already validates against its [JSON schema](../../rx-schema.md), so this is only useful to unify error handling across your TanStack DB collections.
- `startSync` (optional, default: `true`): Whether the collection starts ingesting RxDB data immediately.
- `syncBatchSize` (optional, default: `1000`): How many documents are fetched per batch during the initial load from RxDB into memory. Larger values mean fewer round trips to the storage but more memory per batch. This only affects the initial load; ongoing changes are streamed one by one through RxDB's change feed.

Writes on the TanStack DB collection are persisted through RxDB's write methods: inserts use `bulkUpsert()`, updates use `incrementalPatch()` and deletes use `bulkRemove()`. When a write fails, for example on a schema validation error, the optimistic state in TanStack DB is rolled back.

## When TanStack DB Alone Is Enough

TanStack DB is not helpless without RxDB, and it would be dishonest to claim otherwise. It ships its own persistence and sync options:

- The `@tanstack/db-sqlite-persistence-core` package with adapters for the browser (wa-sqlite), Node.js, Electron, Expo, React Native and Capacitor persists collections to SQLite.
- The `@tanstack/offline-transactions` package queues mutations while offline.
- The localStorage collection covers small local-only state.
- The Electric, PowerSync and TrailBase collections sync with their respective backends.

When your app only needs to survive a reload on one platform, or when you are already committed to Electric or PowerSync as a sync service, those options are a good fit and you do not need RxDB.

The RxDB collection is the better choice when you want a full database under your store: one storage abstraction across browser, mobile and desktop, replication that works with [any backend](./sync-tanstack-db.md) instead of a specific sync service, [multi-tab](./tanstack-db-multi-tab.md) leader election, [encryption](./tanstack-db-encryption.md), [conflict resolution](./tanstack-db-conflict-resolution.md) and [schema migrations](../../migration-schema.md). You also keep direct access to the underlying RxDB collection for indexed queries and [partial sync](../../partial-sync.md) of large datasets.

## All TanStack DB + RxDB Guides

**Persistence and storage:**

- [How to Persist TanStack DB to IndexedDB & OPFS](./persist-tanstack-db-indexeddb.md)
- [TanStack DB with SQLite: Native & WASM Storage via RxDB](./tanstack-db-sqlite.md)
- [TanStack DB with PGlite: Postgres-in-Browser Storage](./tanstack-db-pglite.md)
- [Encrypting Local Data in TanStack DB with RxDB](./tanstack-db-encryption.md)

**Sync and offline:**

- [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md)
- [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md)
- [TanStack DB + GraphQL: Offline-First Sync with RxDB](./tanstack-db-graphql.md)
- [TanStack DB + Supabase: Adding True Offline Support](./tanstack-db-supabase-offline.md)
- [Sync TanStack DB with CouchDB & Self-Hosted Backends](./tanstack-db-couchdb-sync.md)
- [Peer-to-Peer Sync for TanStack DB with WebRTC & RxDB](./tanstack-db-p2p-webrtc.md)
- [Conflict Resolution in TanStack DB with RxDB](./tanstack-db-conflict-resolution.md)
- [Multi-Tab Sync for TanStack DB with RxDB](./tanstack-db-multi-tab.md)

**Platforms:**

- [TanStack DB in React Native & Expo: Offline Storage Guide](./tanstack-db-react-native.md)
- [TanStack DB in Electron: A Local Database for Desktop Apps](./tanstack-db-electron.md)
- [TanStack DB with Capacitor & Ionic: Offline Storage Guide](./tanstack-db-capacitor.md)
- [Building an Offline PWA with TanStack DB and RxDB](./tanstack-db-pwa.md)

**Background:**

- [What Is TanStack DB? A Beginner's Guide with Persistence](./what-is-tanstack-db.md)
- [Outgrowing TanStack Query's Offline Persistence? Use RxDB](./tanstack-query-offline-persistence-upgrade.md)

## FAQ

<details>
    <summary>Does TanStack DB persist data on its own?</summary>

No. TanStack DB keeps collection data in memory and delegates persistence to the collection implementation. TanStack ships SQLite persistence adapters for some platforms, and the **[RxDB collection](https://tanstack.com/db/latest/docs/collections/rxdb-collection)** persists data through any [RxStorage](../../rx-storage.md) like IndexedDB, OPFS or SQLite.

</details>

<details>
    <summary>Is data duplicated between RxDB and TanStack DB?</summary>

Yes, intentionally. RxDB stores the data durably on disk while TanStack DB holds an in-memory copy for fast live queries. This duplication is what makes UI queries instant while keeping **[local-first](../local-first-future.md)** persistence and sync.

</details>

<details>
    <summary>Do I still need RxDB indexes when I only query through TanStack DB?</summary>

Usually not. TanStack DB queries run entirely in memory, so RxDB indexes do not affect them. Indexes still matter when you query the **[RxCollection](../../rx-collection.md)** directly, when replication uses filtered selectors, or when you load only a subset of the data into memory.

</details>

<details>
    <summary>Does the RxDB collection work with Vue, Solid, Svelte or Angular?</summary>

Yes. The `rxdbCollectionOptions()` function targets the framework-independent collection API of TanStack DB, so it works with every official framework binding. Only the `useLiveQuery` import changes, for example to `@tanstack/vue-db`. **[RxDB](../../rx-database.md)** itself is framework-agnostic as well.

</details>

<details>
    <summary>Which RxDB version do I need?</summary>

The `@tanstack/rxdb-db-collection` package requires `rxdb` version `16.17.2` or later as a peer dependency. No extra RxDB plugin is needed; the integration builds on the public **[RxCollection](../../rx-collection.md)** API.

</details>

## Follow Up

- Read the official [RxDB collection documentation](https://tanstack.com/db/latest/docs/collections/rxdb-collection) at TanStack.
- Start with the [RxDB Quickstart](../../quickstart.md).
- Learn how the [RxDB Sync Engine](../../replication.md) replicates with any backend.
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
