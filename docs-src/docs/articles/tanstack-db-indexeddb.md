---
title: TanStack DB on IndexedDB with RxDB
slug: tanstack-db-indexeddb.html
description: Run TanStack DB on top of RxDB with IndexedDB persistence. Get live queries, optimistic mutations, offline-first storage and replication in the browser.
image: /headers/tanstack-db-indexeddb.jpg
---

import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_BROWSER, PERFORMANCE_METRICS } from '@site/src/components/performance-data';
import { Steps } from '@site/src/components/steps';

# TanStack DB on IndexedDB with RxDB

[TanStack DB](https://tanstack.com/db) is a reactive client store that holds data in collections and runs live queries against them. It gives you incremental query updates and optimistic mutations, but on its own it keeps data in memory and needs a backing store for persistence and sync. [RxDB](https://rxdb.info/) fills that gap. It stores documents in [IndexedDB](./react-indexeddb.md) inside the browser, exposes reactive queries, handles cross-tab updates and ships replication to many backends.

This article shows how to combine both. TanStack DB sits on top as the query and mutation layer, RxDB sits below as the persistence and sync layer, and IndexedDB holds the data on disk.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB Database" width="220" />
    </a>
</center>

## Why combine TanStack DB and RxDB

TanStack DB and RxDB solve different problems, and they fit together well.

TanStack DB brings:

- **Live queries with differential dataflow**: Queries update incrementally when data changes instead of re-running from scratch. Updates are usually sub-millisecond, even with joins across collections.
- **Optimistic mutations**: `insert`, `update` and `delete` apply to the UI instantly and roll back if the backing write fails.
- **Cross-collection joins and aggregations**: A query language that joins, filters and aggregates across multiple collections on the client.

RxDB brings:

- **IndexedDB persistence**: Data survives page reloads and stays available [offline](../offline-first.md).
- **Swappable storages**: The same code runs on IndexedDB, [OPFS](../rx-storage-opfs.md), [SQLite](../rx-storage-sqlite.md) or [in-memory](../rx-storage-memory.md) by changing one line.
- **Replication**: Sync to [CouchDB](../replication-couchdb.md), [GraphQL](../replication-graphql.md), [Supabase](../replication-supabase.md), [Firestore](../replication-firestore.md) or any [HTTP endpoint](../replication-http.md).
- **Schema, migration and encryption**: A JSON schema per collection, [data migration](../migration-schema.md) on version changes and field [encryption](../encryption.md).
- **Cross-tab reactivity**: A write in one tab updates queries in every other tab.

The result is a stack where the UI binds to TanStack DB live queries, mutations flow down into RxDB, RxDB writes to IndexedDB and replicates to your server, and remote changes flow back up into the live queries.

## How to use TanStack DB on top of RxDB

The `@tanstack/rxdb-db-collection` package connects an RxDB collection to a TanStack DB collection. Writes through TanStack DB persist to RxDB, and changes in RxDB (from local writes or from replication) flow back into TanStack DB through RxDB's change stream.

<Steps>

### Install the packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create an RxDB database with IndexedDB persistence

For side projects and prototypes, use the free [Dexie.js storage](../rx-storage-dexie.md), which wraps IndexedDB. For production, the premium [IndexedDB storage](../rx-storage-indexeddb.md) is faster and smaller.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const db = await createRxDatabase({
    name: 'tasksdb',
    storage: getRxStorageDexie()
});

await db.addCollections({
    todos: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                completed: { type: 'boolean' }
            },
            required: ['id', 'title', 'completed']
        }
    }
});
```

### Wrap the RxDB collection in a TanStack DB collection

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

`rxdbCollectionOptions` accepts:

- `rxCollection`: the RxDB collection instance (required).
- `id`: a unique identifier for the TanStack DB collection.
- `startSync`: begin syncing immediately, defaults to `true`.
- `syncBatchSize`: documents read per batch during the initial sync, defaults to `1000`.
- `onInsert`, `onUpdate`, `onDelete`: custom persistence handlers. By default the integration uses RxDB's `bulkUpsert`, `patch` and `bulkRemove`.

### Read data with live queries

```tsx
import { useLiveQuery } from '@tanstack/react-db';

function TodoList() {
    const { data: todos } = useLiveQuery((q) =>
        q.from({ todo: todosCollection })
         .where(({ todo }) => !todo.completed)
    );

    return (
        <ul>
            {todos.map((todo) => (
                <li key={todo.id}>{todo.title}</li>
            ))}
        </ul>
    );
}
```

### Write data with optimistic mutations

```ts
// insert
todosCollection.insert({ id: 't1', title: 'Buy milk', completed: false });

// update
todosCollection.update('t1', (draft) => {
    draft.completed = true;
});

// delete
todosCollection.delete('t1');
```

</Steps>

Each write applies to the live query result instantly, then persists to RxDB and into IndexedDB. Because RxDB drives the change stream, a write in another browser tab or a document arriving through replication also updates the same live query.

## Adding replication

The reason to put RxDB underneath is persistence plus sync. Once the data lives in an RxDB collection, you can replicate it to a backend without touching the TanStack DB layer.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-http-replication',
    pull: { /* your pull handler */ },
    push: { /* your push handler */ }
});
```

Documents that arrive through replication are written into the RxDB collection, the change stream picks them up, and the TanStack DB live queries update. The mutation path and the replication path share the same store, so there is no separate cache to reconcile.

## IndexedDB storage plugins for RxDB

RxDB talks to storage through the [RxStorage](../rx-storage.md) interface, so you choose how IndexedDB is accessed. Several browser storages are available, and the ones backed by or compared against IndexedDB are listed below.

- **[Dexie.js storage](../rx-storage-dexie.md)** (`getRxStorageDexie`): Free. Uses [Dexie.js](https://github.com/dexie/Dexie.js), a small wrapper around IndexedDB. A good default for prototypes and side projects. You can pass Dexie addons for extra behavior.
- **[IndexedDB storage](../rx-storage-indexeddb.md)** (`getRxStorageIndexedDB`): Premium. Built directly on plain IndexedDB with [custom index strings](../slow-indexeddb.md#custom-indexes), [batched cursors](../slow-indexeddb.md#batched-cursor) and a [write-ahead-logging](https://en.wikipedia.org/wiki/Write-ahead_logging) mode. It has the smallest write and read latency, the fastest initial page load and the smallest build size among the persistent browser storages. It reduces build size by up to 36% compared to Dexie and stores attachments as binary instead of base64.
- **[LocalStorage storage](../rx-storage-localstorage.md)** (`getRxStorageLocalstorage`): Free. Stores data in the synchronous `localStorage` API rather than IndexedDB. Useful for small datasets and a fast first paint, but `localStorage` is capped at around 5 MiB.
- **[LocalStorage Meta Optimizer](../rx-storage-localstorage-meta-optimizer.md)**: Wraps an IndexedDB based storage and keeps small metadata in `localStorage` to speed up the initial page load, while documents stay in IndexedDB.
- **[OPFS storage](../rx-storage-opfs.md)** (`getRxStorageOPFS`): Premium. Not IndexedDB. It uses the Origin Private File System and runs inside a [Web Worker](../rx-storage-worker.md). It is the fastest browser storage for large datasets (more than 10k documents).

For the TanStack DB integration the storage choice is invisible to the application code. You swap the storage in `createRxDatabase` and the TanStack DB collection keeps working unchanged.

```ts
// switch from Dexie to the premium IndexedDB storage
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'tasksdb',
    storage: getRxStorageIndexedDB()
});
```

## Performance of IndexedDB compared to other methods

IndexedDB is the right default for browser persistence, but it is not the fastest option for every workload. A rough ordering of browser storage methods by latency:

- **In-memory** ([memory](../rx-storage-memory.md), [memory-mapped](../rx-storage-memory-mapped.md)): Lowest read and write latency because nothing touches disk during queries. Memory-mapped persists occasionally to a backing store. Use these only when the dataset fits in memory (under about 2k documents).
- **LocalStorage**: Synchronous and fast for tiny datasets, but it blocks the main thread and is capped near 5 MiB, so it does not scale to large data.
- **IndexedDB**: Asynchronous and non-blocking. The raw API can be [slow](../slow-indexeddb.md), but the RxDB IndexedDB storage applies custom indexes, batched cursors and a WAL-like write mode to reach the smallest write and read latency among persistent browser storages, plus the fastest first page load.
- **OPFS**: Faster than IndexedDB for queries over large datasets (more than 10k documents), at the cost of running in a worker and a larger build size.

For most apps, including those built with TanStack DB on top, the IndexedDB storage is the recommended starting point. Move to OPFS only after measuring that your dataset is large enough to benefit. The live query layer of TanStack DB runs in memory either way, so the storage choice mainly affects initial load, write persistence latency and how much data you can hold.

Here is a performance comparison of the browser based RxDB storages:

<PerformanceChart title="Browser Storages" data={PERFORMANCE_DATA_BROWSER} metrics={PERFORMANCE_METRICS} />

See the full [storage performance comparison](../rx-storage-performance.md) for measurements across all storages.

## FAQ

<details>
<summary>Does TanStack DB replace RxDB or work alongside it?</summary>

They work alongside each other and cover different layers. TanStack DB is a reactive in-memory store with live queries and optimistic mutations. It does not persist data to IndexedDB or sync to a backend by itself. RxDB provides the IndexedDB persistence, the change stream and the [replication](../replication.md). The `@tanstack/rxdb-db-collection` package binds an RxDB collection to a TanStack DB collection so writes flow down into RxDB and remote changes flow back up into the live queries.
</details>

<details>
<summary>Where is the data actually stored?</summary>

The persistent copy lives in the RxDB storage you pick, which is IndexedDB when you use the [Dexie](../rx-storage-dexie.md) or [IndexedDB](../rx-storage-indexeddb.md) storage. TanStack DB keeps a working copy in memory to run its live queries. The two stay in sync through RxDB's change stream.
</details>

<details>
<summary>Do optimistic mutations survive a page reload?</summary>

Yes. A mutation through `todosCollection.insert/update/delete` applies to the UI immediately and persists to RxDB, which writes to IndexedDB. After a reload the data is read back from IndexedDB during the initial sync, so confirmed writes are still there. An optimistic change that failed to persist is rolled back rather than kept.
</details>

<details>
<summary>Can I switch the IndexedDB storage without changing my TanStack DB code?</summary>

Yes. The storage is configured only in `createRxDatabase`. Swapping `getRxStorageDexie()` for `getRxStorageIndexedDB()` or `getRxStorageOPFS()` does not change the `rxdbCollectionOptions` call or any live query, because TanStack DB talks to the RxDB collection, not to the storage directly.
</details>

<details>
<summary>How do remote changes from replication reach the UI?</summary>

[RxDB replication](../replication.md) writes incoming documents into the RxDB collection. The integration subscribes to RxDB's change stream, so those writes are pushed into the TanStack DB collection, and any live query that matches them re-renders. The mutation path and the replication path share one store, so there is no extra cache to invalidate.
</details>

## Follow Up

- Start with the [RxDB Quickstart](../quickstart.md) to set up the database layer.
- Read the [IndexedDB storage](../rx-storage-indexeddb.md) and [Dexie storage](../rx-storage-dexie.md) pages to pick a storage.
- Check the [TanStack DB RxDB collection docs](https://tanstack.com/db/latest/docs/collections/rxdb-collection) for the latest integration options.
- Star the [RxDB GitHub repository](https://github.com/pubkey/rxdb) if you find it useful.
</content>
</invoke>
