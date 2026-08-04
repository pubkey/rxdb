---
title: 'How to Persist TanStack DB to IndexedDB & OPFS'
slug: persist-tanstack-db-indexeddb.html
description: TanStack DB is in-memory by default. Persist it to durable browser storage, IndexedDB or OPFS, using RxDB as a storage-agnostic collection backend.
image: /headers/persist-tanstack-db-indexeddb.jpg
---

import {Steps} from '@site/src/components/steps';

# How to Persist TanStack DB to IndexedDB & OPFS

**TanStack DB** keeps all collection data in memory. When the user reloads the page, that memory is gone and the store starts empty. Persistence belongs to the collection implementation you choose, and the official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/), a local-first NoSQL database with swappable [storage engines](../../rx-storage.md), underneath your collections. With RxDB in place, the question "how to **persist TanStack DB**" turns into a configuration choice between localStorage, IndexedDB, and OPFS. The integration itself is described in the [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) overview. This page explains the browser storage options, walks through a runnable setup on the free localStorage-based storage, and shows that moving to IndexedDB or OPFS only swaps the `storage:` line.

<RxdbLogo alt="Persist TanStack DB to IndexedDB and OPFS" />

## Why TanStack DB Needs a Storage Layer

TanStack DB is an in-memory reactive client store. Live queries and optimistic mutations run against data that lives in JavaScript memory, which is what makes them instant. Durability is delegated to the collection type. The [RxDB collection](https://tanstack.com/db/latest/docs/collections/rxdb-collection) fills that role with a real database: every write on the TanStack DB collection is persisted to an [RxCollection](../../rx-collection.md), and on the next page load the collection restores its state from disk.

RxDB itself does not care where that disk is. All data goes through the [RxStorage](../../rx-storage.md) interface, and you pick the implementation when you create the database. Your TanStack DB code never touches the storage directly, which is why switching storages is a configuration change, not a rewrite.

## TanStack DB Storage Options in the Browser

Four storages matter for browser apps. Two are free, two are part of [RxDB Premium 👑](/premium/).

| Storage | Price | Based on | Best for |
|---|---|---|---|
| [LocalStorage](../../rx-storage-localstorage.md) | free | localStorage API | small and medium datasets, simplest setup |
| [Dexie.js](../../rx-storage-dexie.md) | free | IndexedDB | bigger datasets without premium access |
| [IndexedDB](../../rx-storage-indexeddb.md) 👑 | premium | IndexedDB | production apps, lowest latency, smallest build |
| [OPFS](../../rx-storage-opfs.md) 👑 | premium | Origin Private File System | big datasets, fastest queries |

### LocalStorage Storage (Free)

The [localStorage-based storage](../../rx-storage-localstorage.md) is the recommended default when you start out. It has no dependencies, a small build size, and writing and reading small datasets is fast, as shown in [these benchmarks](../localstorage-indexeddb-cookies-opfs-sqlite-wasm.md#performance-comparison). The tradeoffs: browsers limit localStorage to around 5 MB per domain, and access is synchronous on the main thread. For a todo app, a settings store, or a prototype this is fine. The trouble starts when your dataset grows past a few thousand documents.

### Dexie.js Storage (Free)

The [Dexie.js storage](../../rx-storage-dexie.md) stores data in IndexedDB through the [Dexie.js](https://github.com/dexie/Dexie.js) wrapper library. IndexedDB has no fixed 5 MB cap, so this is the free choice for **TanStack DB IndexedDB** persistence with larger datasets. It also lets you use Dexie.js addons. It prints a console message pointing to the premium storages, and its query performance is behind the premium IndexedDB storage.

### IndexedDB Storage 👑

The premium [IndexedDB storage](../../rx-storage-indexeddb.md) is built on plain IndexedDB without a wrapper library. Compared to the Dexie.js storage it is faster on reads and writes, reduces the build size by up to **36%**, and runs in a WAL-like mode similar to SQLite for faster writes. Among the browser storages it has the smallest write and read latency and the fastest initial page load. For most production apps this is the storage to use.

### OPFS Storage 👑

The premium [OPFS storage](../../rx-storage-opfs.md) writes to the **Origin Private File System** (OPFS), a browser API that gives web apps a sandboxed, origin-specific virtual filesystem with byte-level file access. Because it works on binary files instead of an object store, reads are up to 4x faster compared to IndexedDB, even with complex queries. The fast synchronous OPFS methods are only available inside a WebWorker, so the storage runs in a worker by default, which also keeps database work off the main thread. When your TanStack DB collections hold more than `10k` documents, OPFS is the better fit. The full numbers are on the [storage performance page](../../rx-storage-performance.md).

## Persist a TanStack DB Collection: Runnable Example

The following example uses the free localStorage-based storage. The basics of the integration are covered in the [hub article](./rxdb-collection-for-tanstack-db.md), so the shared parts stay short.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create a Persistent RxDatabase

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'todosdb',
    // This line decides where your TanStack DB data is persisted.
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

### Wrap It in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos
    })
);
```

### Query, Mutate, and Reload

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function OpenTodos() {
    const { data } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );
    return <div>{data.length} open todos</div>;
}

// Writes are applied in memory instantly and persisted to RxDB.
todosCollection.insert({ id: 'todo-1', text: 'buy milk', completed: false });
```

Now reload the page. The collection loads its state back from the storage and `todo-1` is still there. This is the whole point of **TanStack DB persistence**: the in-memory store survives reloads because RxDB owns a durable copy on disk.

</Steps>

## Switching to IndexedDB or OPFS

The application code above does not change. Only the import and the `storage:` line of `createRxDatabase()` swap.

For the free Dexie.js storage on IndexedDB:

```ts
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const db = await createRxDatabase({
    name: 'todosdb',
    storage: getRxStorageDexie()
});
```

For the premium [IndexedDB storage](../../rx-storage-indexeddb.md) 👑:

```ts
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

const db = await createRxDatabase({
    name: 'todosdb',
    storage: getRxStorageIndexedDB()
});
```

For the premium [OPFS storage](../../rx-storage-opfs.md) 👑, which runs inside a WebWorker through the worker storage:

```ts
import { getRxStorageWorker } from 'rxdb-premium/plugins/storage-worker';

const db = await createRxDatabase({
    name: 'todosdb',
    storage: getRxStorageWorker({
        // This file must be statically served by your webserver.
        workerInput: 'node_modules/rxdb-premium/dist/workers/opfs.worker.js'
    })
});
```

When you want to avoid the worker setup, `getRxStorageOPFSMainThread()` from `rxdb-premium/plugins/storage-opfs` runs OPFS on the main thread with the asynchronous OPFS APIs. Both variants are compared on the [OPFS storage page](../../rx-storage-opfs.md#using-opfs-in-the-main-thread-instead-of-a-worker).

Notice that a new storage starts empty. When you switch storages in an app that already has user data, use the [storage migration plugin](../../migration-storage.md) to move the existing documents over.

## TanStack DB's Own Persistence Option

TanStack DB ships its own browser persistence: the `@tanstack/browser-db-sqlite-persistence` adapter, which persists collections to SQLite compiled to WebAssembly via wa-sqlite. When you only need collections to survive a reload in the browser, that adapter is a valid choice and you do not need RxDB.

The RxDB collection is the better fit when persistence is only the first step:

- **Multiple storages**: one code path across localStorage, IndexedDB, OPFS, and [SQLite on native platforms](./tanstack-db-sqlite.md), selected per environment.
- **Replication**: the [Sync Engine](../../replication.md) syncs the persisted data [with any backend](./sync-tanstack-db.md), including [offline-first](./tanstack-db-offline-first.md) behavior.
- **Encryption**: [encrypt the local data](./tanstack-db-encryption.md) before it hits the storage.
- **Multi-tab**: all tabs share one durable store with [leader election](./tanstack-db-multi-tab.md), instead of each tab holding its own state.

## FAQ

<details>
    <summary>Does TanStack DB persist data to IndexedDB by default?</summary>

No. TanStack DB collections are in-memory and lose their state on a page reload. Persistence comes from the collection implementation, and with the **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** you can persist to localStorage, IndexedDB, or OPFS by configuring the matching RxStorage.

</details>

<details>
    <summary>Can I persist TanStack DB to IndexedDB for free?</summary>

Yes. The **[Dexie.js storage](../../rx-storage-dexie.md)** is free and stores your TanStack DB data in IndexedDB. The premium IndexedDB storage 👑 is faster and has a smaller build size, but it is not required to get durable IndexedDB persistence.

</details>

<details>
    <summary>Is OPFS faster than IndexedDB for TanStack DB storage?</summary>

Yes, for reads on big datasets. The **[OPFS storage](../../rx-storage-opfs.md)** reads up to 4x faster than IndexedDB because it works on binary files. The IndexedDB storage has the faster initial page load and the smaller build size, so OPFS pays off when collections grow past `10k` documents.

</details>

<details>
    <summary>Do I lose data when I switch the RxDB storage?</summary>

No, but the data does not move by itself. The old storage keeps the documents and the new storage starts empty. Run the **[storage migration plugin](../../migration-storage.md)** once to copy the existing documents into the new storage, then ship the new configuration.

</details>

<details>
    <summary>Does the storage choice change my TanStack DB code?</summary>

No. TanStack DB talks to the RxCollection, and the RxCollection talks to whatever **[RxStorage](../../rx-storage.md)** you configured. Queries, mutations, and live updates work the same on every storage. Switching storages is a configuration change, not a rewrite.

</details>

## Follow Up

- Read the [TanStack DB + RxDB overview](./rxdb-collection-for-tanstack-db.md) for the full integration guide.
- Start with the [RxDB Quickstart](../../quickstart.md).
- Compare all storages on the [RxStorage overview](../../rx-storage.md) and the [performance page](../../rx-storage-performance.md).
- Use [SQLite storage on native platforms](./tanstack-db-sqlite.md) with the same code.
- Add [backend sync](./sync-tanstack-db.md) on top of the persisted data.
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
