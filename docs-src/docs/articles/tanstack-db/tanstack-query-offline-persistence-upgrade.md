---
title: 'Outgrowing TanStack Query''s Offline Persistence? Use RxDB'
slug: tanstack-query-offline-persistence-upgrade.html
description: persistQueryClient is a cache snapshot, not a database. When you hit the localStorage wall, upgrade to durable offline storage with TanStack DB and RxDB.
image: /headers/tanstack-query-offline-persistence-upgrade.jpg
---

import {Steps} from '@site/src/components/steps';

# Outgrowing TanStack Query's Offline Persistence? Use RxDB

**TanStack Query offline persistence** with `persistQueryClient` saves the dehydrated query cache to a storage like [localStorage](../localstorage.md) and restores it on the next page load. For caching server responses across reloads this is often all you need. But a cache snapshot is not a database, and when local data becomes the source of truth of your app, the snapshot model bites back. TanStack DB is the in-memory reactive client store from the same TanStack family, with live queries and optimistic mutations, and it delegates persistence and sync to the collection type you choose. The official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath it, as described in [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md). This page explains what `persistQueryClient` does well, where the snapshot model ends, and how to upgrade to durable offline storage with TanStack DB and RxDB.

<RxdbLogo alt="TanStack Query offline persistence upgrade" />

## What persistQueryClient Does Well

TanStack Query manages server state. It fetches, caches, deduplicates, and refetches data that lives on your server. The persistence plugin extends this cache across page loads: `persistQueryClient` restores a previously persisted cache on startup, then subscribes to cache changes and saves the dehydrated cache again, throttled to at most once per second by default. On the next reload the user sees the last known server data instantly instead of a spinner, and TanStack Query refetches in the background when the data is stale.

This is the before state that most apps start with:

```tsx
import ReactDOM from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // gcTime must be at least as high as maxAge,
            // otherwise garbage collection discards the restored cache.
            gcTime: 1000 * 60 * 60 * 24 // 24 hours
        }
    }
});

// localStorage also fulfills the AsyncStorage interface.
const persister = createAsyncStoragePersister({
    storage: window.localStorage
});

// Restores the persisted cache on startup, keeps queries idle until
// the restore is done, then saves the cache on every change (throttled).
ReactDOM.createRoot(document.getElementById('root')!).render(
    <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
        <App />
    </PersistQueryClientProvider>
);
```

When your local data is a disposable copy of server data, this setup is enough. A read-mostly dashboard, a product catalog, a news feed: they all profit from a restored cache and lose nothing when it is discarded. There is no reason to add a database to these apps.

## Where the Cache Snapshot Model Ends

`persistQueryClient` is built around one operation: dehydrate the whole query cache, serialize it with `JSON.stringify`, and write it under a single storage key (default: `REACT_QUERY_OFFLINE_CACHE`). Restoring reverses this and hydrates the whole cache back into memory. This design is right for a cache and wrong for a database, for several reasons.

- **It is a snapshot, not a queryable store**. You cannot query the persisted data, index it, or read a subset. Every save serializes the whole cache again, and every restore loads the whole cache into memory. With `10k` documents this write amplification happens on every change, throttled only by the `throttleTime` option (default: `1000` ms).
- **The data is designed to expire**. A persisted cache older than `maxAge` (default: 24 hours) is silently discarded on restore. A changed `buster` string discards it too, which is the intended way to drop the cache on a new deployment. When `gcTime` is lower than `maxAge`, garbage collection removes the data even earlier. For a cache this is correct behavior. For user-created data it is data loss.
- **The localStorage wall**. Browsers limit localStorage to [around 5 MiB per origin](../localstorage.md). When the serialized cache exceeds the quota, persisting fails, and by default there is no retry. The predefined `removeOldestQuery` retry strategy makes room by throwing away the oldest query. The docs also suggest compressing with `lz-string` through the `serialize` and `deserialize` options, which delays the wall but does not remove it.
- **An IndexedDB persister keeps the same model**. The official docs show how to build a custom persister on IndexedDB with `idb-keyval`, which lifts the 5 MiB limit and skips string serialization. Browser quotas for IndexedDB are far higher, from [about 1 GB on iOS Safari to a share of free disk space in Chrome](../indexeddb-max-storage-limit.md). But the persister interface still stores one dehydrated client blob, so reads and writes still move the whole cache, just against a bigger storage.

None of this is a flaw in TanStack Query. It is a server-state cache doing cache things. The trouble starts when your app writes data locally, needs it to survive for months, holds more documents than fit in one serialized blob, or needs to query it while offline. At that point you have outgrown offline persistence and need offline storage.

## TanStack Query and TanStack DB Solve Different Problems

TanStack Query answers the question "what did the server say, and is it still fresh". TanStack DB answers the question "what is the current local state, and which rows match my query". These are different problems, and the two libraries are designed to work together: TanStack DB ships an official Query collection type that loads collection data through TanStack Query. There are also Electric, TrailBase, PowerSync, LocalStorage, LocalOnly, and RxDB collection types, plus TanStack's own SQLite persistence adapters and the `@tanstack/offline-transactions` package for queueing mutations offline.

The RxDB collection is the right choice when local data is the source of truth, the pattern described in [local-first software](../local-first-future.md). RxDB gives the TanStack DB collection what a cache snapshot cannot give:

1. **Durable storage** through the [RxStorage](../../rx-storage.md) interface: localStorage for small apps, IndexedDB, OPFS, or SQLite for large datasets. There is no `maxAge`, data stays until you delete it.
2. **Realtime cross-tab behavior**: all browser tabs share one durable store, changes in one tab stream into the TanStack DB collections of all other tabs, and [leader election](../../leader-election.md) makes sure background work runs in exactly one tab.
3. **Replication with any backend** through the [Sync Engine](../../replication.md), with retries, checkpoints, and [conflict handling](./tanstack-db-conflict-resolution.md) instead of refetch-on-focus.

Your components keep the developer experience they had with TanStack Query: hooks that return live data. Only now the data comes out of a database instead of a cache.

## The Upgrade Path in Code

The following example is the canonical chain from the [hub article](./rxdb-collection-for-tanstack-db.md): an RxDatabase with a durable storage, wrapped into a TanStack DB collection, queried with `useLiveQuery`. It uses the free [localStorage-based storage](../../rx-storage-localstorage.md) for a minimal setup. When your dataset grows past a few MiB, switch to [IndexedDB or OPFS](./persist-tanstack-db-indexeddb.md). Switching storages is a configuration change, not a rewrite.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Create the RxDB Database and Collection

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'appdb',
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
                title: { type: 'string' },
                done: { type: 'boolean' }
            },
            required: ['id', 'title', 'done']
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

The collection loads its initial state from disk and stays in sync with RxDB from then on. There is no restore step to wait for at every startup and no snapshot to expire.

### Query and Mutate

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function OpenTodos() {
    // Live query: re-renders whenever a matching document changes,
    // no matter if the change came from this tab, another tab, or sync.
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.done, false))
    );

    return (
        <ul>
            {openTodos.map((todo) => (
                <li key={todo.id}>{todo.title}</li>
            ))}
        </ul>
    );
}

// Writes are optimistic in memory and persisted to RxDB.
todosCollection.insert({ id: 'todo-1', title: 'buy milk', done: false });
todosCollection.update('todo-1', (draft) => {
    draft.done = true;
});
```

### (Optional) Replicate with Your Backend

Replication is configured on the RxDB collection. TanStack DB does not talk to the backend and picks up pulled documents automatically through RxDB's change feed.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
    collection: db.todos,
    replicationIdentifier: 'todos-api-sync',
    live: true,
    pull: {
        handler: async (checkpoint, batchSize) => {
            // fetch documents changed since the last checkpoint
            const response = await fetch(
                `/api/pull?checkpoint=${encodeURIComponent(
                    JSON.stringify(checkpoint)
                )}&limit=${batchSize}`
            );
            return await response.json();
        }
    },
    push: {
        handler: async (rows) => {
            // send local writes to the backend
            const response = await fetch('/api/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rows)
            });
            return await response.json();
        }
    }
});
```

The general pattern, including ready-made plugins for GraphQL, CouchDB, and Supabase, is described in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).

</Steps>

## When persistQueryClient Is Still Enough

Keep `persistQueryClient` when all of the following are true: the server is the source of truth, the persisted data is small enough for one serialized blob, losing the persisted cache costs nothing but a loading spinner, and offline usage means "show the last response", not "keep working". Many apps live comfortably inside these bounds. You can also run both patterns in one app: TanStack Query with persistence for server-owned reference data, and TanStack DB with RxDB for the documents your users create and edit offline. The full offline pattern is described in [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).

## FAQ

<details>
    <summary>Can TanStack Query persist its cache to IndexedDB?</summary>

Yes. The official docs show how to build a custom persister on IndexedDB with `idb-keyval`, which lifts the localStorage size limit. The persister still stores the whole dehydrated cache as one entry, so it does not become a queryable database. For queryable durable storage, use an **[RxStorage](../../rx-storage.md)** under TanStack DB instead.

</details>

<details>
    <summary>Is persistQueryClient a database?</summary>

No. It saves a dehydrated snapshot of the query cache and restores it on startup, with a default `maxAge` of 24 hours after which the snapshot is silently discarded. A database like **[RxDB](../../rx-database.md)** stores documents durably, queries them with indexes, and replicates them with a backend.

</details>

<details>
    <summary>Do I have to replace TanStack Query when I adopt TanStack DB and RxDB?</summary>

No. TanStack Query and TanStack DB solve different problems, and TanStack DB even ships a Query collection type that loads data through TanStack Query. You can keep TanStack Query for server-owned data and back the collections that hold **[local-first](../local-first-future.md)** user data with RxDB.

</details>

<details>
    <summary>Does the localStorage limit affect TanStack Query offline persistence?</summary>

Yes. Browsers limit localStorage to about 5 MiB per origin, and when the serialized cache exceeds the quota, persisting fails. By default there is no retry, and the `removeOldestQuery` strategy makes room by dropping data. RxDB avoids this wall by writing single documents to storages like **[IndexedDB](../indexeddb-max-storage-limit.md)**, which allow far larger quotas.

</details>

<details>
    <summary>Does data in RxDB expire like a persisted query cache?</summary>

No. RxDB is a database, so documents stay on disk until your code deletes them. There is no `maxAge` and no cache busting. The **[Sync Engine](../../replication.md)** keeps local documents and your backend consistent instead of discarding and refetching them.

</details>

## Follow Up

- Read the hub article [TanStack DB + RxDB: Durable, Offline-First Persistence & Sync](./rxdb-collection-for-tanstack-db.md).
- Get the basics in [What Is TanStack DB? A Beginner's Guide with Persistence](./what-is-tanstack-db.md).
- Learn how to [persist TanStack DB to IndexedDB and OPFS](./persist-tanstack-db-indexeddb.md).
- Follow the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.
