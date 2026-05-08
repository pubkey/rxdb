---
title: RxDB as an ElectricSQL Alternative for Local-First JavaScript Apps
slug: electricsql-alternative.html
description: Need a stable ElectricSQL alternative? RxDB is a local-first JavaScript database with full read and write replication, observable queries, and a flexible backend.
---

# RxDB as an ElectricSQL Alternative for Local-First JavaScript Apps

[ElectricSQL](https://electric-sql.com/) is in the middle of a major rewrite. The original prototype combined SQLite, Postgres, and CRDT-based bidirectional sync. The new direction, often called Electric Next, drops most of that and focuses on partial sync of "shapes" from a Postgres source database to TypeScript or Elixir clients. The write path is not yet implemented and client-side reactivity is incomplete. Teams that want to ship a [local-first](../../offline-first.md) JavaScript application today need a stable alternative that already supports reads, writes, queries, and live updates.

[RxDB](https://rxdb.info/) is a [local-first](../../articles/local-first-future.md) NoSQL database for JavaScript that has been in production since 2016. It runs in the browser, in Node.js, in Electron, and in React Native. It ships a full bidirectional [replication protocol](../../replication.md), [reactive queries](../../reactivity.md), and pluggable storages including SQLite, IndexedDB, OPFS, and in-memory. This page explains what ElectricSQL offers today, where it falls short, and how RxDB fills the same role with fewer surprises.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of ElectricSQL

The first version of ElectricSQL targeted a specific architecture. Each client embedded SQLite. A backend process replicated rows from Postgres into those SQLite databases and back, using CRDT-based merge logic to resolve conflicts. The pitch was a SQL database on the client that stayed in sync with a SQL database on the server.

In 2024 the team announced a rewrite. The new branch, Electric Next, narrows the scope significantly:

- Sync is built around "shapes". A shape is a filtered subset of a Postgres table that the client subscribes to. Internally this looks closer to a document store than a relational system, since the client receives JSON rows over an HTTP stream.
- The backend is written in Elixir and runs as a service in front of Postgres.
- The client library is TypeScript and JavaScript, with an Elixir client also in scope.
- The write path is not yet implemented in the new architecture. Clients can read shapes but cannot send changes back through the same protocol.
- Client-side reactivity, the ability to subscribe to a query and receive updates as the local data changes, is not yet feature complete.

The shape-based read model is interesting for some workloads, but it is a partial product. Most apps need both reads and writes, and most apps need observable queries that the UI can bind to.

## What is RxDB?

RxDB is a JavaScript database that stores data on the client and syncs with any backend you choose. Documents are validated against a JSON schema, queries follow a MongoDB-style syntax, and every query can be observed as an [RxJS observable](../../reactivity.md). The same code runs in browsers, Node.js, Electron, React Native, Capacitor, and other JavaScript runtimes.

The storage layer is pluggable. You can use [IndexedDB](../../rx-storage-indexeddb.md), OPFS, an in-memory store, or a [SQLite-backed storage](../../rx-storage-sqlite.md) when you want a SQL engine under the hood. The replication layer is also pluggable. RxDB ships handlers for [generic HTTP/REST](../../replication-http.md), GraphQL, CouchDB, WebRTC, Firestore, NATS, and others. Because the [replication protocol](../../replication.md) is documented and minimal, you can implement it on top of any backend, including a Postgres database fronted by a small REST or HTTP service.

## ElectricSQL Limitations Today

These are the practical issues a team hits when evaluating ElectricSQL Next for a production app.

### 1. The Rewrite is in Flight

The product is being redesigned in public. Documentation, APIs, and feature scope keep shifting. Building on a moving target is risky for any application that needs a stable contract over the next few years.

### 2. No Write Path

Electric Next streams shapes from Postgres to the client. It does not provide a built-in mechanism to push local writes back through the same channel. Teams have to build their own write API on the side and reconcile it with the shape stream. This is the core feature most local-first apps need, and it is missing.

### 3. Incomplete Client Reactivity

A local-first app usually binds the UI to live query results. When the underlying data changes, the view updates. Electric Next does not yet offer a complete reactive query layer on the client. You receive shape updates, but wiring them into queries with filters, sorts, and joins is left to the application.

### 4. Elixir Backend Dependency

The sync service is written in Elixir and runs as its own process in front of Postgres. Teams that do not already operate Elixir services take on a new runtime, new deployment story, and new monitoring surface. For shops standardized on Node.js, Go, Python, or Rust, this is real overhead.

### 5. Postgres-Centric

ElectricSQL assumes Postgres is the source of truth. If your backend uses MongoDB, MySQL, DynamoDB, a custom service, or a mix of stores, ElectricSQL is the wrong fit. The shape model is tied to Postgres replication internals.

## RxDB Advantages

### 1. Stable and Production Tested

RxDB has been published since 2016 and is used in production across web, desktop, and mobile apps. The API surface, schema model, and replication protocol are stable.

### 2. Full Read and Write Replication

The [RxDB replication protocol](../../replication.md) handles pull, push, and live updates. Writes made on the client flow back to the server through the push handler, with conflict detection based on document revisions. This works out of the box, not as a future roadmap item.

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
  name: 'shop',
  storage: getRxStorageLocalstorage()
});

await db.addCollections({
  products: {
    schema: {
      title: 'product schema',
      version: 0,
      type: 'object',
      primaryKey: 'id',
      properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        price: { type: 'number' },
        updatedAt: { type: 'number' }
      },
      required: ['id', 'name', 'price', 'updatedAt'],
      indexes: ['updatedAt']
    }
  }
});

// Observable query that updates on every change
const subscription = db.products
  .find({ selector: { price: { $lt: 100 } }, sort: [{ updatedAt: 'desc' }] })
  .$.subscribe(results => {
    console.log('current cheap products:', results.length);
  });
```

See the [RxCollection guide](../../rx-collection.md) for the full collection API.

## Code Sample: HTTP Replication Against a Postgres Backend

The example below replicates an RxDB collection with a REST endpoint that reads from and writes to a Postgres database. The server side is any framework you already use, Express, Fastify, NestJS, Hono, or anything that can speak HTTP and run a SQL query.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
  collection: db.products,
  replicationIdentifier: 'products-postgres-rest',
  live: true,
  pull: {
    handler: async (checkpoint, batchSize) => {
      const updatedAt = checkpoint ? checkpoint.updatedAt : 0;
      const id = checkpoint ? checkpoint.id : '';
      const url = `https://api.example.com/products/pull` +
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
      const res = await fetch('https://api.example.com/products/push', {
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

This setup mirrors what ElectricSQL provides on the read side, adds the write path that ElectricSQL Next is missing, and runs on whatever language your team already uses. There is no Elixir service to operate.

## FAQ

<details>
<summary>Is ElectricSQL stable for production?</summary>

The original ElectricSQL is no longer the active product. Electric Next is under active development, the write path is not implemented, and client reactivity is incomplete. For a production deployment that needs both reads and writes today, it is too early.

</details>

<details>
<summary>Can RxDB sync from a Postgres database?</summary>

Yes. Expose a small pull and push HTTP API in front of Postgres and use the [HTTP replication plugin](../../replication-http.md). The server can be Node.js, Go, Rust, Python, or anything else that speaks HTTP and SQL. RxDB does not require a specific backend runtime.

</details>

<details>
<summary>Does RxDB use SQLite?</summary>

RxDB can use SQLite as a storage backend through the [SQLite RxStorage](../../rx-storage-sqlite.md). It also supports IndexedDB, OPFS, in-memory, and other engines. The choice is per database, and the rest of the API stays the same.

</details>

<details>
<summary>What about partial sync, the equivalent of ElectricSQL shapes?</summary>

RxDB supports partial replication. The pull handler can filter on the server side based on user, tenant, region, or any other dimension. You can also run multiple replications per collection with different filters, which gives the same outcome as subscribing to several shapes.

</details>

<details>
<summary>Can I use ElectricSQL and RxDB together?</summary>

In theory yes. You could let ElectricSQL stream shapes into a service that then feeds an RxDB pull endpoint. In practice this adds two systems to maintain. Most teams pick one. If RxDB covers the read and write path on its own, the simpler choice is to drop the extra layer.

</details>

## Comparison Table

| Feature | ElectricSQL Next | RxDB |
| --- | --- | --- |
| Status | Rewrite in progress | Stable since 2016 |
| Read sync | Yes, via shapes | Yes, via pull handler |
| Write sync | Not yet implemented | Yes, via push handler |
| Client reactivity | Incomplete | Observable queries on every collection |
| Backend runtime | Elixir service in front of Postgres | Any HTTP server, any language |
| Source database | Postgres only | Postgres, MongoDB, MySQL, CouchDB, custom, P2P |
| Client storage | Internal, JSON over HTTP | IndexedDB, OPFS, SQLite, in-memory, more |
| Query language | Shape filters | MongoDB-style Mango queries |
| Conflict handling | Application defined | Pluggable conflict handler with revisions |
| Mobile support | Limited | React Native, Capacitor, Expo, Electron |
| Offline-first | Read-only today | Full offline reads and writes |

## Next Steps

If you were waiting for ElectricSQL Next to ship a complete read and write path with reactive queries, RxDB already covers that ground. Start with the [RxDB replication guide](../../replication.md), wire up an [HTTP replication](../../replication-http.md) against your Postgres backend, and bind your UI to [observable queries](../../reactivity.md).

More resources:

- [RxDB Sync Engine](../../replication.md)
- [HTTP Replication](../../replication-http.md)
- [RxQuery](../../rx-query.md)
- [Reactivity](../../reactivity.md)
- [SQLite RxStorage](../../rx-storage-sqlite.md)
- [Local-First Future](../../articles/local-first-future.md)
- [Realtime Database](../../articles/realtime-database.md)
