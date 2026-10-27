---
title: RxDB as an ElectricSQL Alternative for Local-First JavaScript Apps
slug: electricsql-alternative.html
description: Electric Cloud has shut down. Compare ElectricSQL with RxDB, a local-first JavaScript database with read and write replication and a backend you control.
image: /headers/electricsql-alternative.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';
import {ComparisonTable} from '@site/src/components/comparison-table';

# RxDB as an ElectricSQL Alternative for Local-First JavaScript Apps

[ElectricSQL](https://electric.ax/) is a read-path sync engine that streams subsets of a Postgres database ("shapes") to clients over HTTP. Electric reached 1.0 in March 2025 and its open source projects, including [PGlite](https://pglite.dev/), are widely used. Teams that ran on Electric Cloud now have to self-host the Electric sync service or move to a different stack, which is why many of them are looking for an **ElectricSQL alternative**.

:::note Electric Cloud has been shut down
In August 2026 the Electric team joined Databricks and announced that Electric Cloud is winding down ([announcement](https://electric.ax/blog/2026/08/11/electric-joining-databricks)). By September 28, 2026, Electric Cloud was shut down ([PR #4812](https://github.com/electric-sql/electric/pull/4812)). The open source sync service can still be self-hosted.
:::

[RxDB](https://rxdb.info/) is a [local-first](../local-first-future.md) NoSQL database for JavaScript that has been in production since 2016. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun. It ships a full bidirectional [replication protocol](../../replication.md), [reactive queries](../../reactivity.md), and pluggable storages including SQLite, IndexedDB, OPFS, and in-memory. This page explains what ElectricSQL offers today, where it falls short, and how RxDB fills the same role with a backend you control.

<RxdbLogo alt="ElectricSQL alternative" />

## A Short History of ElectricSQL

The first version of ElectricSQL embedded SQLite in each client and replicated rows between Postgres and those SQLite databases in both directions, with CRDT-based merge logic. In 2024 the team rewrote Electric with a much narrower scope: a sync service written in Elixir that sits in front of Postgres and streams "shapes", which are filtered subsets of a table, to clients as JSON over HTTP. The write path was intentionally left to the application.

### A Brief Timeline

- **2024** - Rewrite as "Electric Next", focused on read-path sync of shapes from Postgres.
- **March 17, 2025** - [Electric 1.0](https://electric-sql.com/blog/2025/03/17/electricsql-1.0-released) is released and declared production ready. Electric Cloud follows as a managed service.
- **August 11, 2026** - Electric [joins Databricks](https://electric.ax/blog/2026/08/11/electric-joining-databricks). The post says Electric Cloud "is winding down. Cloud users will need to self-host or move to another provider." Previously open sourced projects stay open source.
- **September 28, 2026** - A pull request in the Electric repository notes that Electric Cloud sign-in "no longer works now that Electric Cloud has been shut down" ([PR #4812](https://github.com/electric-sql/electric/pull/4812)).

## What is RxDB?

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications. Documents are validated against a JSON schema, queries use MongoDB-style (Mango) syntax, and every query can be observed as an [RxJS observable](../../reactivity.md).

The storage layer is pluggable. You can use [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), an in-memory store, or a [SQLite-backed storage](../../rx-storage-sqlite.md) when you want a SQL engine under the hood. The replication layer is also pluggable. RxDB ships handlers for [generic HTTP/REST](../../replication-http.md), GraphQL, CouchDB, WebRTC, Firestore, [Supabase](../../replication-supabase.md), NATS, and others. Because the [replication protocol](../../replication.md) is documented and minimal, you can implement it on top of any backend, including a Postgres database fronted by a small HTTP service.

## Where ElectricSQL Falls Short

These are the practical issues a team hits when evaluating ElectricSQL for a production local-first app.

### 1. No Managed Hosting Anymore

With Electric Cloud gone, running Electric means operating the sync service yourself. Notice that the service has to keep a logical replication connection to your Postgres database, so it becomes one more stateful component in your infrastructure. The team now works inside Databricks, and the Electric repository describes itself as "The agent platform built on sync", which makes the long-term focus of the standalone sync product hard to predict.

### 2. No Write Path

The Electric docs state it directly: "Electric does not do write-path sync." Local writes have to go through your own API, and the [writes guide](https://electric.ax/docs/guides/writes) lists several patterns, from online-only writes to optimistic state to syncing through a local PGlite database. Each of them has to be built and maintained by the application. For offline writes, this is the part that is hardest to get right, and Electric leaves it to you.

### 3. No Local Database by Default

Electric streams shape data to the client, but it does not decide where it is stored or how it is queried. To get queries with filters and sorts over local data, you combine it with another library such as TanStack DB or PGlite. With RxDB, the local database, the queries, and the replication are one system.

### 4. Elixir Backend Dependency

The sync service is written in Elixir and runs as its own process in front of Postgres. Teams that do not already operate Elixir services take on a new runtime, a new deployment, and a new monitoring surface.

### 5. Postgres-Centric

ElectricSQL assumes Postgres is the source of truth. If your backend uses MongoDB, MySQL, DynamoDB, a custom service, or a mix of stores, ElectricSQL is the wrong fit. The shape model is tied to Postgres logical replication.

As of October 27, 2026, [ElectricSQL](https://github.com/electric-sql/electric) has 10,418 GitHub stars while [RxDB](https://github.com/pubkey/rxdb) has 23,416.

## RxDB Advantages

### 1. Stable and Production Tested

RxDB has been published since 2016 and is used in production across web, desktop, and mobile apps. The API surface, schema model, and replication protocol are stable.

### 2. Full Read and Write Replication

The [RxDB replication protocol](../../replication.md) handles pull, push, and live updates. Writes made on the client flow back to the server through the push handler, with conflict detection based on document revisions. This works out of the box.

### 3. Multiple Storage Engines

You pick the storage that fits the runtime. IndexedDB and OPFS for browsers, [SQLite](../../rx-storage-sqlite.md) for Node.js, Electron, React Native, and Capacitor, and in-memory for tests. The collection and query API stay the same across all of them.

### 4. MongoDB-Style Queries

RxDB queries use the [Mango query syntax](../../rx-query.md). You can filter, sort, limit, and skip without writing SQL, and the query planner picks indexes you defined in the schema.

### 5. Observable Queries

Every query is an observable. Subscribe to it once and the subscription emits new results whenever matching data changes, locally or via replication. UI bindings for React, Vue, Svelte, Angular, and Solid are documented in the [reactivity guide](../../reactivity.md).

### 6. Bring Your Own Backend

RxDB does not require a specific backend. You can sync against Postgres through a REST or HTTP service, against MongoDB, against a GraphQL gateway, against CouchDB, or against peer clients over WebRTC. The [HTTP replication guide](../../replication-http.md) shows the standard pattern.

## Code Sample: Defining a Collection

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
  name: 'mydb',
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
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        priority: { type: 'integer', minimum: 0, maximum: 10, multipleOf: 1 },
        updatedAt: {
          type: 'number',
          minimum: 0,
          maximum: 1000000000000000,
          multipleOf: 1
        }
      },
      required: ['id', 'name', 'priority', 'updatedAt'],
      indexes: ['updatedAt']
    }
  }
});

// Observable query that updates on every change
const subscription = db.todos
  .find({ selector: { priority: { $gte: 5 } }, sort: [{ updatedAt: 'desc' }] })
  .$.subscribe(results => {
    console.log('current high priority todos:', results.length);
  });
```

See the [RxCollection guide](../../rx-collection.md) for the full collection API.

## Code Sample: HTTP Replication Against a Postgres Backend

The example below replicates an RxDB collection with a REST endpoint that reads from and writes to a Postgres database. The server side is any framework you already use, Express, Fastify, NestJS, Hono, or anything that can speak HTTP and run a SQL query.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
  collection: db.todos,
  replicationIdentifier: 'todos-postgres-rest',
  live: true,
  pull: {
    handler: async (checkpoint, batchSize) => {
      const updatedAt = checkpoint ? checkpoint.updatedAt : 0;
      const id = checkpoint ? checkpoint.id : '';
      const url = `https://api.example.com/todos/pull` +
        `?updatedAt=${updatedAt}&id=${encodeURIComponent(id)}&limit=${batchSize}`;
      const res = await fetch(url);
      const data = await res.json();
      return {
        documents: data.documents,
        checkpoint: data.checkpoint
      };
    }
  },
  push: {
    handler: async (changeRows) => {
      const res = await fetch('https://api.example.com/todos/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changeRows)
      });
      const conflicts = await res.json();
      return conflicts;
    }
  }
});

replicationState.error$.subscribe(err => console.error('sync error', err));
```

The pull handler returns documents newer than the checkpoint and a new checkpoint for the next batch. The push handler sends local writes to the server and returns any conflicting server documents. The full contract is described in the [HTTP replication docs](../../replication-http.md).

## Use Postgres as the Source of Truth

The standard pattern for replacing ElectricSQL with RxDB looks like this.

1. Keep Postgres as the canonical store on the server.
2. Add an `updated_at` column and a stable primary key on every table you want to sync.
3. Expose two HTTP endpoints per synced table, one for pull and one for push.
4. The pull endpoint accepts a checkpoint with `updated_at` and `id`, and returns rows ordered by `updated_at, id` with a new checkpoint.
5. The push endpoint accepts a batch of change rows, applies them inside a transaction, and returns rows that lost a conflict so the client can reconcile.
6. Add an event stream, server-sent events or a WebSocket, that emits a notification when any row in a table changes. The RxDB replication uses that signal to trigger a new pull. This is the live channel described in the [realtime database article](../../articles/realtime-database.md).

This setup mirrors what ElectricSQL provides on the read side, adds the write path that Electric leaves to the application, and runs on whatever language your team already uses. There is no Elixir service to operate and no hosted sync service that can be shut down.

## When ElectricSQL Still Makes Sense

If you only need read-path sync from Postgres, for example to stream live data into dashboards, and you already handle writes through an existing API, Electric does that job well. It is open source, and the [Electric 1.0 release](https://electric-sql.com/blog/2025/03/17/electricsql-1.0-released) stabilized its APIs. Same goes for [PGlite](https://pglite.dev/): if you want a full Postgres in the browser, it is the best-known option. Compare it with other browser databases in [RxDB vs SQLite WASM vs PGlite](../rxdb-vs-sqlite-wasm-vs-pglite.md).

## FAQ

<Faq>
<FaqItem question="Is Electric Cloud shut down?">

Yes. Electric announced on August 11, 2026 that Electric Cloud is winding down after the team joined Databricks, and by September 28, 2026 the Electric repository described it as shut down. Cloud users have to self-host the Electric sync service or move to another stack such as **[RxDB](../../rx-database.md)** with your own backend.

</FaqItem>
<FaqItem question="Is ElectricSQL still open source?">

Yes. Electric states that everything it previously open sourced stays open source, including the Postgres sync service, PGlite, and TanStack DB. You can run the sync service yourself, but you have to operate it next to your Postgres database.

</FaqItem>
<FaqItem question="Does ElectricSQL support offline writes?">

No, not by itself. Electric does read-path sync only, and writes go through your own API. With the **[RxDB Sync Engine](../../replication.md)**, writes are stored locally and pushed to the server by the push handler, with conflict handling built in.

</FaqItem>
<FaqItem question="Can RxDB sync from a Postgres database?">

Yes. Expose a small pull and push HTTP API in front of Postgres and use the **[HTTP replication plugin](../../replication-http.md)**. The server can be Node.js, Go, Rust, Python, or anything else that speaks HTTP and SQL. If your Postgres runs on Supabase, the [Supabase replication plugin](../../replication-supabase.md) does this without a custom server.

</FaqItem>
<FaqItem question="What about partial sync, the equivalent of ElectricSQL shapes?">

RxDB supports partial replication. The pull handler can filter on the server side based on user, tenant, region, or any other dimension. You can also run multiple replications per collection with different filters, which gives the same outcome as subscribing to several shapes. See **[partial sync](../../replication.md)**.

</FaqItem>
</Faq>

## Comparison Table

<ComparisonTable>

| Feature | ElectricSQL | RxDB |
| --- | --- | --- |
| Status | Open source, team joined Databricks in August 2026 | Independent, maintained since 2016 |
| Managed hosting | Electric Cloud shut down in 2026 | No hosted service required |
| Read sync | Yes, via shapes | Yes, via pull handler |
| Write sync | No, writes go through your own API | Yes, via push handler |
| Local database | Not included, combine with TanStack DB or PGlite | Included |
| Backend runtime | Elixir service in front of Postgres | Any HTTP server, any language |
| Source database | Postgres only | Postgres, MongoDB, MySQL, CouchDB, custom, P2P |
| Client storage | Up to the application | IndexedDB, OPFS, SQLite, in-memory, more |
| Query language | Shape filters | MongoDB-style (Mango) queries |
| Conflict handling | Application defined | Pluggable conflict handler with revisions |
| Offline-first | Read-only unless you build the write path | Full offline reads and writes |

</ComparisonTable>

## Next Steps

If you ran on Electric Cloud and have to move anyway, RxDB covers reads, writes, local queries, and live updates with a backend you control. The [InstantDB comparison](./instantdb-alternative.md) and the [Turso comparison](./turso-alternative.md) cover two more hosted sync services that changed course in 2026, and the [PowerSync comparison](./powersync-alternative.md) covers another Postgres sync engine. Start with the [RxDB replication guide](../../replication.md), wire up an [HTTP replication](../../replication-http.md) against your Postgres backend, and bind your UI to [observable queries](../../reactivity.md).

More resources:

- [RxDB Sync Engine](../../replication.md)
- [HTTP Replication](../../replication-http.md)
- [RxQuery](../../rx-query.md)
- [Reactivity](../../reactivity.md)
- [SQLite RxStorage](../../rx-storage-sqlite.md)
- [Local-First Future](../../articles/local-first-future.md)
- [Realtime Database](../../articles/realtime-database.md)
