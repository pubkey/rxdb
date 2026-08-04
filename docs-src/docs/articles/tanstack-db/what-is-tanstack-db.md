---
title: 'What Is TanStack DB? A Beginner''s Guide with Persistence'
slug: what-is-tanstack-db.html
description: TanStack DB is a reactive, in-memory client store with live queries and optimistic mutations. Learn what it is, how it works, and how to make it durable with RxDB.
image: /headers/what-is-tanstack-db.jpg
---

import {Steps} from '@site/src/components/steps';

# What Is TanStack DB? A Beginner's Guide with Persistence

**TanStack DB** is a reactive client store for JavaScript applications. It holds your data in memory as typed collections, runs live queries that update automatically when the data changes, and applies mutations optimistically with rollback on error. Persistence and sync are not part of the core: they come from the collection type you choose, and the official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/), a [local-first](../local-first-future.md) NoSQL database, underneath as the durable layer. This page explains what TanStack DB is, how collections and live queries work, which collection types exist, and how the [RxDB collection for TanStack DB](./rxdb-collection-for-tanstack-db.md) makes your data survive a page reload.

<RxdbLogo alt="what is TanStack DB beginner guide" />

## What Is TanStack DB?

TanStack DB comes from the team behind [TanStack Query](https://tanstack.com/query/latest) and extends it with collections, live queries, and optimistic mutations. The core idea: instead of fetching data per view through many bespoke API endpoints, you load normalized data into client-side collections once, and your components query those collections in whatever shape they need. This keeps the backend simple and avoids network waterfalls.

Three building blocks make up the development model:

- **Collections** are typed sets of objects. They decouple loading data into your app from binding data to your components.
- **Live queries** read data out of collections. When the underlying data changes in a way that affects the query result, the result updates incrementally and your component re-renders.
- **Optimistic mutations** apply `insert`, `update`, and `delete` calls to the in-memory state instantly. A handler persists the change in the background, and when the handler throws, the optimistic state rolls back.

The live query engine is built on differential dataflow, which means results are updated incrementally instead of re-running the whole query. TanStack's own benchmark puts an update of one row in a sorted 100,000-item collection at about 0.7 milliseconds on an M1 Pro MacBook. That is fast enough that interactions never wait for the network.

TanStack DB deserves credit here: as an in-memory reactive layer it is excellent, and none of what follows argues otherwise. The question a beginner hits later is where the data lives when the tab closes. We get to that below.

## Collections: Typed Sets of Objects

A collection in TanStack DB is not a table on a server. It is a client-side, in-memory set of objects with a schema-derived type, and each collection decides for itself where its data comes from, whether it is persisted, and whether it syncs. TanStack DB ships these official collection types:

- **Query collection**: loads data with TanStack Query, typically from REST API endpoints.
- **Electric collection**: syncs data from Postgres through the ElectricSQL sync engine.
- **TrailBase collection**: syncs with a self-hosted TrailBase backend using realtime subscriptions.
- **RxDB collection**: mirrors an [RxDB](https://rxdb.info/) collection, which adds durable [storage](../../rx-storage.md) and [replication with any backend](../../replication.md).
- **PowerSync collection**: syncs through PowerSync's SQLite-based service with Postgres, MongoDB, and MySQL backends.
- **LocalStorage collection**: stores small local-only state that persists across sessions and syncs across browser tabs.
- **LocalOnly collection**: holds in-memory client data or UI state that needs no persistence at all.

Collections also support eager, on-demand, and progressive sync modes that control how much data is loaded upfront. For a first app, the default eager mode is fine.

## Live Queries in Short

Live queries use a fluent, SQL-like builder. In React, the `useLiveQuery` hook subscribes a component to a query and re-renders it on every relevant change:

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function OpenTodos() {
    // Live query: updates automatically when a matching todo changes.
    const { data, isLoading } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    if (isLoading) return <div>Loading...</div>;
    return (
        <ul>
            {data.map((todo) => (
                <li key={todo.id}>{todo.text}</li>
            ))}
        </ul>
    );
}
```

The query builder goes far beyond this: joins across collections, subqueries, `groupBy` aggregations, `orderBy`, `limit`, and `select` projections are all supported, and the [live queries guide](https://tanstack.com/db/latest/docs/guides/live-queries) covers them in depth. For this beginner's guide, `from` plus `where` is all you need.

## Framework Bindings

TanStack DB is framework-independent at its core (`@tanstack/db`) and ships official bindings for the major frameworks:

- `@tanstack/react-db` for React
- `@tanstack/vue-db` for Vue
- `@tanstack/solid-db` for Solid
- `@tanstack/svelte-db` for Svelte
- `@tanstack/angular-db` for Angular

Collections are created through the framework-independent `createCollection()` function, so the same collection definition works everywhere. Only the query hook import changes per framework.

## The Persistence Question Every Beginner Hits

TanStack DB keeps collection data in memory. When you reload the page, the memory is gone. This is by design: the store itself stays small and fast, and persistence and sync are the job of the collection implementation you pick.

TanStack ships its own options for this. The `@tanstack/db-sqlite-persistence-core` package with platform adapters for the browser (wa-sqlite), Node.js, Electron, Expo, React Native, and Capacitor persists collections to SQLite, the `@tanstack/offline-transactions` package queues mutations while offline, and the LocalStorage collection covers small local-only state. The Electric, PowerSync, and TrailBase collections persist and sync through their respective services.

The RxDB collection takes a different approach: it puts a complete database under your store. Data is written durably through any [RxStorage](../../rx-storage.md) (localStorage, [IndexedDB, OPFS](./persist-tanstack-db-indexeddb.md), SQLite), replication runs through RxDB's [Sync Engine](../../replication.md) against [any backend](./sync-tanstack-db.md), and the app keeps working [offline](./tanstack-db-offline-first.md). TanStack DB stays your query and mutation layer. RxDB owns storage and sync.

## Getting Started: TanStack DB with RxDB Persistence

The following example is the smallest durable TanStack DB setup. It uses the free [localStorage-based RxStorage](../../rx-storage-localstorage.md), which needs no extra configuration and is the recommended default for a quick start in the browser.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

The `@tanstack/rxdb-db-collection` package requires `rxdb` version `16.17.2` or later.

### Create an RxDatabase with a Todos Collection

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'beginnerdb',
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

`todosCollection` behaves like any other TanStack DB collection. It loads its initial state from disk and stays in sync with RxDB through the change feed.

### Query and Mutate

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function OpenTodos() {
    const { data } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );
    return (
        <ul>
            {data.map((todo) => (
                <li
                    key={todo.id}
                    onClick={() =>
                        // Optimistic in the UI, persisted to RxDB in the background.
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

todosCollection.insert({
    id: 'todo-1',
    text: 'learn TanStack DB',
    completed: false
});
```

Reload the page. The todos are still there, loaded from localStorage back into the TanStack DB collection. When a write to RxDB fails, for example on a schema validation error, the optimistic state rolls back automatically.

</Steps>

localStorage is limited to around 5 MB per domain, so it fits demos, prototypes, and small apps. When your data grows, switch to [IndexedDB or OPFS](./persist-tanstack-db-indexeddb.md), and when you need a backend, add [replication](./sync-tanstack-db.md) on the RxDB collection. Both are configuration changes, not rewrites, and the full picture is described in the [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) hub article.

## FAQ

<details>
    <summary>Is TanStack DB a database?</summary>

No, not in the traditional sense. TanStack DB is an in-memory reactive client store with a database-like query API. It does not write to disk by itself and delegates persistence to the collection implementation. Pairing it with **[RxDB](../../rx-database.md)** through the official RxDB collection gives it an actual database underneath.

</details>

<details>
    <summary>Does TanStack DB persist data after a page reload?</summary>

No, not out of the box. Collection data lives in memory and a reload clears it. TanStack ships SQLite persistence adapters and a LocalStorage collection for this, and the **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** persists data through any [RxStorage](../../rx-storage.md) like localStorage, IndexedDB, OPFS, or SQLite.

</details>

<details>
    <summary>Does TanStack DB work offline?</summary>

Yes, when the collection type supports it. With the RxDB collection, all reads and writes go against the local database first, so the app keeps working without a network connection, and RxDB's [Sync Engine](../../replication.md) resumes replication from a checkpoint when the client comes back online. The **[offline-first guide](./tanstack-db-offline-first.md)** shows the complete pattern.

</details>

<details>
    <summary>Do I need TanStack Query to use TanStack DB?</summary>

No. The Query collection type uses TanStack Query to fetch data from REST APIs, but other collection types do not depend on it. The **[RxDB collection](./rxdb-collection-for-tanstack-db.md)** for example only needs `rxdb`, `rxjs`, and a TanStack DB framework binding.

</details>

## Follow Up

- Read the hub article [TanStack DB + RxDB: Durable, Offline-First Persistence & Sync](./rxdb-collection-for-tanstack-db.md).
- Persist bigger datasets with [IndexedDB and OPFS](./persist-tanstack-db-indexeddb.md).
- Connect a backend with [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- Go fully local-first with [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).
- Learn RxDB itself with the [RxDB Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to ask questions about your setup.
