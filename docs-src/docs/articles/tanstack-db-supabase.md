---
title: TanStack DB + RxDB + Supabase - Local-First Sync Stack
slug: tanstack-db-supabase.html
description: Use TanStack DB with RxDB as the persistence layer and sync to Supabase. Get sub-millisecond live queries, offline-first storage, and real-time Postgres sync in one stack.
image: /headers/tanstack-db-supabase.jpg
---

import {Steps} from '@site/src/components/steps';
import {HeadlineWithIcon} from '@site/src/components/headline-with-icon';

# TanStack DB with RxDB and Supabase

This guide shows how to combine three tools into one local-first stack:

- **[TanStack DB](https://tanstack.com/db)** as the reactive query layer with sub-millisecond live queries and optimistic mutations.
- **[RxDB](../rx-database.md)** as the persistence layer that stores data durably in the browser and handles replication.
- **[Supabase](../replication-supabase.md)** as the Postgres backend that syncs data across all clients in real time.

Each layer has one job. TanStack DB renders your UI and runs reactive queries. RxDB persists data to disk and manages the sync engine. Supabase stores the canonical data on the server. The result is an app that reads and writes instantly from local storage, keeps working offline, and syncs to Postgres whenever a connection is available.

## How the layers fit together

```txt
┌──────────────────────────────────────────────┐
│  UI (React / Vue / Solid / Svelte)           │
│  useLiveQuery() ── sub-ms reactive results    │
├──────────────────────────────────────────────┤
│  TanStack DB                                  │
│  in-memory store, live queries, optimistic    │
│  mutations, joins, transactions               │
├──────────────────────────────────────────────┤
│  RxDB (persistence layer)                     │
│  IndexedDB / OPFS / SQLite storage,           │
│  change streams, cross-tab sync, replication  │
├──────────────────────────────────────────────┤
│  Supabase Replication (RxDB Sync Engine)      │
│  PostgREST pull/push + Realtime WebSocket      │
├──────────────────────────────────────────────┤
│  Supabase (Postgres + Realtime)               │
└──────────────────────────────────────────────┘
```

Writes flow down: a mutation in TanStack DB persists to RxDB, and RxDB's [Sync Engine](../replication.md) pushes it to Supabase. Reads flow up: a change in Supabase streams to RxDB through Supabase Realtime, RxDB writes it to local storage, and RxDB's change stream pushes it into TanStack DB, which updates every live query that depends on it.

The connection point is the `@tanstack/rxdb-db-collection` package. It wraps an RxDB collection so TanStack DB treats it as a backing store. TanStack DB never talks to the network. RxDB owns persistence and replication, and TanStack DB subscribes to RxDB's change stream.

## Why use this stack

- **Sub-millisecond live queries**: TanStack DB uses differential dataflow. When data changes, it recomputes only the affected rows instead of re-running the whole query. Live queries, including joins across collections, typically resolve in under one millisecond.
- **Durable offline-first storage**: RxDB persists every document to IndexedDB, OPFS, or [SQLite](../rx-storage-sqlite.md). Closing the tab does not lose data. TanStack DB on its own holds state in memory, so it needs a persistence layer for offline-first apps. RxDB is that layer.
- **Real-time Postgres sync**: The [Supabase replication plugin](../replication-supabase.md) handles checkpointed incremental pulls, optimistic-concurrency pushes, and live updates over Supabase Realtime. You write Postgres on the server and read it locally with no custom sync code.
- **Optimistic UI for free**: TanStack DB applies mutations to its in-memory store immediately and rolls back if the persistence handler throws. Combined with RxDB's [conflict handling](../transactions-conflicts-revisions.md), users see instant feedback and the stack reconciles in the background. See the [Optimistic UI guide](./optimistic-ui.md).
- **Cross-tab consistency**: RxDB shares one storage instance across browser tabs. A write in one tab propagates to RxDB and then to TanStack DB collections in every other tab.
- **No backend lock-in**: RxDB replicates to Supabase, but also to [CouchDB](../replication-couchdb.md), [MongoDB](../replication-mongodb.md), [GraphQL](../replication-graphql.md), [REST](../replication-http.md), [Firestore](../replication-firestore.md), and [WebRTC peers](../replication-webrtc.md). Swapping the backend does not change your TanStack DB query code.

## Setup

<Steps>

### Install dependencies

```bash
npm install @tanstack/react-db @tanstack/rxdb-db-collection rxdb @supabase/supabase-js
```

Use `@tanstack/vue-db`, `@tanstack/solid-db`, or `@tanstack/svelte-db` instead of `@tanstack/react-db` for those frameworks.

### Create the Supabase table

Create a table where the primary key is a `text` column, rows carry a `_modified` timestamp, and deletions are soft-deletes via a `_deleted` boolean. RxDB needs these so clients can pull changes incrementally and never miss a deletion while offline.

```sql
create extension if not exists moddatetime schema extensions;

create table "public"."todos" (
    "id" text primary key,
    "title" text not null,
    "completed" boolean default false not null,

    "_deleted" boolean default false not null,
    "_modified" timestamp with time zone default now() not null
);

create trigger update_modified_datetime before update on public.todos
for each row execute function extensions.moddatetime('_modified');

alter publication supabase_realtime add table "public"."todos";
```

Protect the table with [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security) and only ship the `anon` key to clients.

### Create the RxDB database and collection

The RxDB schema mirrors the Supabase table. The primary key must match the column name and type, and fields stay top-level simple types.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

export const db = await createRxDatabase({
  name: 'mydb',
  storage: getRxStorageLocalstorage()
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

For production browsers use a persistent storage like [IndexedDB](../rx-storage-indexeddb.md) or [OPFS](../rx-storage-opfs.md). The [Localstorage](../rx-storage-localstorage.md) storage above works for smaller datasets.

### Start the Supabase replication

Connect the RxDB collection to the Supabase table. RxDB now keeps local storage and Postgres in sync in both directions.

```ts
import { createClient } from '@supabase/supabase-js';
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const replication = replicateSupabase({
  tableName: 'todos',
  client: supabase,
  collection: db.todos,
  replicationIdentifier: 'todos-supabase',
  live: true,
  pull: { batchSize: 50 },
  push: { batchSize: 50 }
});

await replication.awaitInitialReplication();
```

See the [Supabase replication docs](../replication-supabase.md) for joins, query builders, and conflict handling.

### Wrap the RxDB collection for TanStack DB

`rxdbCollectionOptions` adapts the RxDB collection into a TanStack DB collection. TanStack DB mirrors the RxDB state and subscribes to its change stream.

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

export const todosCollection = createCollection(
  rxdbCollectionOptions({
    rxCollection: db.todos,
    startSync: true
  })
);
```

### Read with live queries

`useLiveQuery` runs a reactive query against the TanStack DB collection. It recomputes incrementally when the underlying RxDB data changes, whether the change came from a local write or from Supabase.

```tsx
import { useLiveQuery } from '@tanstack/react-db';
import { eq } from '@tanstack/db';
import { todosCollection } from './collections';

export function OpenTodos() {
  const { data: todos } = useLiveQuery((q) =>
    q
      .from({ todo: todosCollection })
      .where(({ todo }) => eq(todo.completed, false))
      .orderBy(({ todo }) => todo.id, 'asc')
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

### Write with optimistic mutations

Mutations apply to the TanStack DB store immediately, persist to RxDB, and replicate to Supabase. If the persistence handler throws, TanStack DB rolls the optimistic state back.

```ts
// insert
todosCollection.insert({ id: crypto.randomUUID(), title: 'Buy milk', completed: false });

// update
todosCollection.update(todoId, (draft) => {
  draft.completed = true;
});

// delete
todosCollection.delete(todoId);
```

The write lands in local storage instantly, the UI updates in under a millisecond through the live query, and RxDB pushes the change to Supabase in the background.

</Steps>

## Comparison to other solutions

<details>
<summary>TanStack DB + RxDB + Supabase vs. plain Supabase client</summary>

The plain `@supabase/supabase-js` client fetches over HTTP and subscribes to Realtime, but it holds no durable local cache. Every query hits the network, the app does not work offline, and you write your own optimistic update and rollback logic. Adding RxDB gives durable offline-first storage and a managed sync engine, and TanStack DB adds reactive live queries and automatic optimistic state. You trade a larger client bundle for offline support, instant reads, and far less sync code.
</details>

<details>
<summary>TanStack DB with RxDB vs. TanStack DB with a Query Collection</summary>

TanStack DB's [Query Collection](https://tanstack.com/db) loads data through TanStack Query and keeps it in memory. It is a good fit for read-heavy apps backed by a REST API, but it does not persist to disk, so a page reload refetches everything and offline writes are not durable. RxDB as the backing collection persists every document to IndexedDB, OPFS, or SQLite and replicates through the RxDB Sync Engine. Use the Query Collection for stateless caching and the RxDB collection when you need offline-first persistence and a backend-agnostic sync layer.
</details>

<details>
<summary>This stack vs. ElectricSQL or Zero</summary>

ElectricSQL and Zero are sync engines that stream a Postgres subset to the client and require running their sync service alongside your database. The RxDB + Supabase path replicates directly against Supabase over PostgREST and Realtime with no extra sync server to operate. RxDB also runs in more environments (browser, Node.js, React Native, Electron, Capacitor) and supports many backends beyond Postgres. If you are already on Supabase and want to avoid running additional infrastructure, RxDB is the lighter operational choice. See the [RxDB alternatives overview](../alternatives.md).
</details>

<details>
<summary>This stack vs. RxDB alone</summary>

RxDB already ships reactive queries through RxJS observables and signals, so TanStack DB is optional. Add TanStack DB when you want its differential-dataflow live queries, cross-collection joins in the query layer, and the unified optimistic-mutation and transaction API across frameworks. If your UI only needs straightforward reactive lists from single collections, [RxDB's built-in reactivity](../reactivity.md) covers it without the extra dependency.
</details>

## FAQ

<details>
<summary>Does TanStack DB replace RxDB in this stack?</summary>

No. TanStack DB is an in-memory reactive query layer. It does not persist data to disk or talk to a backend. RxDB is the persistence layer that stores documents durably and runs replication. TanStack DB subscribes to RxDB's change stream and mirrors its state, so the two work together rather than replacing each other.
</details>

<details>
<summary>Where does the data actually live?</summary>

The canonical copy lives in Supabase Postgres. A durable replica lives on each client in RxDB's storage engine (IndexedDB, OPFS, or SQLite). TanStack DB holds an in-memory view derived from RxDB for fast reactive queries. Closing the tab keeps the RxDB copy, and the TanStack DB view is rebuilt from RxDB on the next load.
</details>

<details>
<summary>What happens when the user is offline?</summary>

Reads and writes keep working against RxDB's local storage. TanStack DB live queries update instantly from the local data. RxDB queues the writes, and when the connection returns the [Supabase Sync Engine](../replication-supabase.md) pushes the queued changes and pulls anything new, resolving [conflicts](../transactions-conflicts-revisions.md) as it goes.
</details>

<details>
<summary>Can I sync to a backend other than Supabase?</summary>

Yes. The TanStack DB and RxDB layers stay the same. Swap the replication plugin for [CouchDB](../replication-couchdb.md), [MongoDB](../replication-mongodb.md), [GraphQL](../replication-graphql.md), a [custom REST endpoint](../replication-http.md), [Firestore](../replication-firestore.md), or [WebRTC peers](../replication-webrtc.md). Your `useLiveQuery` code does not change.
</details>

## Follow Up

- **RxDB Supabase Replication:** Full reference for pull, push, joins, and RLS - [Supabase Replication](../replication-supabase.md)
- **RxDB Replication:** Core sync concepts and conflict handling - [Replication](../replication.md)
- **Optimistic UI:** Patterns for instant, reliable writes - [Optimistic UI](./optimistic-ui.md)
- **TanStack DB RxDB Collection:** Official integration docs - [tanstack.com/db](https://tanstack.com/db/latest/docs/collections/rxdb-collection)
- **Community:** Questions or feedback? Join our Discord - [Chat](../chat)
</content>
</invoke>
