---
title: RxDB as a PowerSync Alternative for JavaScript Local-First Apps
slug: powersync-alternative.html
description: Compare RxDB and PowerSync for local-first JavaScript apps. Learn why RxDB offers lower browser latency, flexible storage, and an Apache 2.0 license.
image: /headers/powersync-alternative.jpg
---

# RxDB as a PowerSync Alternative for JavaScript Local-First Apps

PowerSync looks attractive when you already run Postgres or MongoDB on the server and want a managed sync engine on top. For JavaScript teams the practical picture is more mixed. The browser client runs on top of WASM SQLite which adds read and write latency, the FSL source-available license restricts shipping competing products, and the server-authoritative model leaves little room to plug in a custom backend or non-SQL query layer.

RxDB takes a different route. It is a [local-first](../../offline-first.md) JavaScript database that stays storage-agnostic, runs MongoDB-style queries against [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), or [SQLite](../../rx-storage-sqlite.md), and lets you bring your own backend over [HTTP](../../replication-http.md), [GraphQL](../../replication-graphql.md), or any other transport. RxDB is licensed under Apache 2.0, so commercial use is unrestricted.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of PowerSync

PowerSync is built by JourneyApps, a South African company that ran an internal sync platform for years before publishing PowerSync as a standalone product around 2023. The first public version targeted Postgres, using logical replication and a change data capture (CDC) pipeline to stream row updates into a sync service. Clients embed a SQLite database, downloaded as a WASM build in the browser or as native SQLite on Flutter, Kotlin, and Swift.

Since the initial release the team has added a MongoDB backend connector, expanded the TypeScript-first SDKs for web and React Native, and tightened the integration with Supabase. The whole stack is published under the Functional Source License (FSL), a source-available license that converts to Apache 2.0 after two years. Until that conversion happens, you may not use PowerSync to build a product that competes with PowerSync itself or with the JourneyApps Platform.

## What is RxDB?

RxDB is a [reactive](../../reactivity.md), [local-first](../../articles/local-first-future.md) JavaScript database. Each [collection](../../rx-collection.md) is defined by a JSON [schema](../../rx-schema.md), stored on a pluggable storage layer, and queried with a Mango (MongoDB-style) query API. Every [query](../../rx-query.md) is observable, so UI components re-render automatically when underlying data changes, locally or through a sync. The [replication protocol](../../replication.md) is transport-agnostic, which means you can sync with Postgres, Mongo, Couch, Firestore, or any custom REST or GraphQL service, without changing how the application code reads or writes data.

## PowerSync Limitations for JavaScript Teams

### WASM SQLite Latency in the Browser

The PowerSync web client is a WASM build of SQLite that persists into IndexedDB or OPFS. Each query crosses the JavaScript and WASM boundary, decodes a SQLite result set, and returns rows back to the main thread. Benchmarks across local-first databases show that this layered approach adds milliseconds per query compared to a JavaScript-native engine that reads typed objects directly from IndexedDB or OPFS. For interactive UIs that observe many small queries the overhead compounds. RxDB sidesteps the WASM hop by running the query planner in JavaScript and going straight to the storage layer. See [Slow IndexedDB](../../slow-indexeddb.md) for the underlying constraints and the strategies RxDB uses to stay fast.

### Server-Authoritative Model

PowerSync places business logic, conflict resolution, and access rules on the central Postgres or Mongo server through Sync Rules. This works well when the server is the unambiguous source of truth and you are happy to express policy in SQL. It is more restrictive when you want client-side conflict handlers, offline writes that merge with custom logic, or a backend that is not a single managed Postgres or Mongo cluster. RxDB lets you define a [conflict handler](../../transactions-conflicts-revisions.md) per collection, run logic on the client, and choose any backend shape.

### Source-Available License

PowerSync ships under FSL, which forbids using the software to build a product that competes with PowerSync or the JourneyApps Platform for two years after each release. For agencies, platform vendors, and SaaS products that might overlap with sync tooling, this clause matters. RxDB is Apache 2.0, with no field-of-use restriction.

### SQL-Only Query DSL

PowerSync queries are SQL strings. That suits backend teams that already think in SQL, but it means schema migrations, type generation, and reactive bindings all flow through string parsing. RxDB queries are plain objects, type-checked against the schema, and composable in JavaScript:

```ts
const query = db.tasks.find({
  selector: {
    done: false,
    priority: { $gte: 2 }
  },
  sort: [{ updatedAt: 'desc' }]
});
```

## Why RxDB Works Well as a PowerSync Alternative

### Storage-Agnostic Client

RxDB separates the database API from the storage engine. You can pick the storage that fits the runtime:

- [IndexedDB storage](../../rx-storage-indexeddb.md) for broad browser support.
- [OPFS storage](../../rx-storage-opfs.md) for low-latency file system access in modern browsers.
- [Dexie storage](../../rx-storage-dexie.md) when you want a familiar IndexedDB wrapper.
- [SQLite storage](../../rx-storage-sqlite.md) for Node.js, Electron, Capacitor, or React Native.

Switching storages is a configuration change, not a rewrite.

### MongoDB-Style Queries with Reactivity

[RxQuery](../../rx-query.md) accepts Mango selectors and returns observable results. Subscribing to a query gives you a stream of updates that fires whenever a matching document is inserted, updated, or deleted, locally or via [replication](../../replication.md). This pairs naturally with React, Vue, Svelte, Angular, or any other framework that consumes observables.

### Bring Your Own Backend

RxDB does not require a managed sync server. The [HTTP replication](../../replication-http.md) plugin handles the protocol details, and you provide pull and push handlers that talk to whatever endpoint you have, including a Postgres-backed REST API, a Mongo Atlas function, or a [GraphQL](../../replication-graphql.md) gateway. You can also combine multiple replications, for example a server sync plus a peer-to-peer WebRTC sync, on the same collection.

### Apache 2.0 Licensing

The core RxDB engine is Apache 2.0. Premium plugins are available, but the base library imposes no field-of-use limits.

### First-Class Multi-Tab Support

RxDB coordinates writes and query state across multiple browser tabs through a leader election and broadcast channel system, so opening the app in two tabs does not duplicate sync work or produce inconsistent UI state.

## Code Sample: Schema and Mango Query

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
  name: 'appdb',
  storage: getRxStorageIndexedDB()
});

await db.addCollections({
  tasks: {
    schema: {
      title: 'task schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 40 },
        title: { type: 'string' },
        done: { type: 'boolean' },
        priority: { type: 'integer', minimum: 0, maximum: 5 },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      required: ['id', 'title', 'done', 'priority', 'updatedAt'],
      indexes: ['priority', 'updatedAt']
    }
  }
});

// Observable Mango query
db.tasks.find({
  selector: { done: false, priority: { $gte: 2 } },
  sort: [{ updatedAt: 'desc' }]
}).$.subscribe(results => {
  console.log('open high-priority tasks:', results.length);
});
```

## Code Sample: HTTP Replication With a Postgres-Backed REST API

The handler shape below maps cleanly onto a Postgres backend. The pull handler returns documents whose `updated_at` is greater than the checkpoint, and the push handler upserts incoming rows and reports any server-side conflicts.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replication = replicateRxCollection({
  collection: db.tasks,
  replicationIdentifier: 'tasks-postgres-rest',
  live: true,
  pull: {
    async handler(checkpoint, batchSize) {
      const since = checkpoint ? checkpoint.updatedAt : '1970-01-01T00:00:00Z';
      const res = await fetch(
        `/api/tasks/pull?since=${encodeURIComponent(since)}&limit=${batchSize}`
      );
      const body = await res.json();
      return {
        documents: body.documents,
        checkpoint: body.checkpoint
      };
    }
  },
  push: {
    async handler(changeRows) {
      const res = await fetch('/api/tasks/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changeRows)
      });
      // Server returns the documents that lost a conflict
      return await res.json();
    }
  }
});

replication.error$.subscribe(err => console.error('sync error', err));
```

The REST endpoints can wrap any Postgres query you like, including row-level security, computed columns, and stored procedures. The same pattern applies to MongoDB, Supabase, or a service mesh in front of multiple databases.

## When PowerSync Makes Sense

PowerSync is a strong fit when:

- The team is SQL-first and wants to keep writing SQL on both client and server.
- The backend is already Postgres or Mongo and you want managed CDC without writing pull and push handlers.
- The product targets Flutter, Kotlin, or Swift in addition to web, and you want a single vendor SDK across all of them.
- The license terms are acceptable for the product you are building.

If those constraints match, PowerSync gives you a coherent path. If you need browser-first performance, a NoSQL query model, custom backends, or unrestricted licensing, RxDB is the better tool.

## FAQ

<details>
<summary>Why is RxDB faster in the browser?</summary>

RxDB queries run in JavaScript directly against [IndexedDB](../../rx-storage-indexeddb.md) or [OPFS](../../rx-storage-opfs.md), so each read returns typed objects without crossing a WASM boundary or decoding a SQLite result set. PowerSync executes queries inside a WASM SQLite build that persists to the same browser primitives, which adds extra serialization on every read and write. See [Slow IndexedDB](../../slow-indexeddb.md) for the underlying constraints both engines have to work around.

</details>

<details>
<summary>Can RxDB sync with Postgres?</summary>

Yes. RxDB does not ship a built-in Postgres connector, but the [HTTP replication](../../replication-http.md) plugin lets you put any REST service in front of Postgres and stream changes both ways. You can also use [GraphQL replication](../../replication-graphql.md) with PostGraphile, Hasura, or a custom resolver layer.

</details>

<details>
<summary>Is PowerSync free?</summary>

PowerSync is source-available under the Functional Source License (FSL), which permits non-competing use and converts to Apache 2.0 two years after each release. There is also a hosted cloud tier with usage-based pricing. RxDB core is Apache 2.0 with no field-of-use restriction.

</details>

<details>
<summary>Does RxDB support Flutter, Kotlin, or Swift?</summary>

No. RxDB targets JavaScript and TypeScript runtimes, including the browser, Node.js, Electron, Capacitor, and [React Native](../../react-native-database.md). PowerSync ships native SDKs for Flutter, Kotlin, and Swift, so if those platforms are required without a JavaScript bridge, PowerSync covers more ground.

</details>

<details>
<summary>How are migrations handled?</summary>

RxDB schemas are versioned. When you bump the version of a [collection schema](../../rx-schema.md), you provide a migration strategy that maps documents from the previous version to the new one. The migration runs on the client when the database opens. PowerSync handles migrations through SQL DDL on the server plus client schema definitions that mirror the SQL tables.

</details>

## Comparison Table

| Topic | RxDB | PowerSync |
| --- | --- | --- |
| License | Apache 2.0 | FSL, source-available, two-year delayed Apache 2.0 |
| Client storage | Pluggable: [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), [SQLite](../../rx-storage-sqlite.md), memory | WASM SQLite in browser, native SQLite elsewhere |
| Query language | Mango (MongoDB-style) JSON queries | SQL strings |
| Reactivity | Observable queries via RxJS | Watched SQL queries |
| Backend | Bring your own via [HTTP](../../replication-http.md), [GraphQL](../../replication-graphql.md), WebRTC, Firestore, CouchDB | Managed sync service connected to Postgres or MongoDB |
| Conflict resolution | Per-collection custom handler on the client | Server-authoritative through Sync Rules |
| Client SDKs | JavaScript and TypeScript across browser, Node.js, Electron, [React Native](../../react-native-database.md) | JavaScript, Flutter, Kotlin, Swift |
| Multi-tab | Built-in leader election and broadcast | Limited, depends on storage configuration |
| Self-hosting | Full client and replication code is open source | Self-hosted service available, gated by FSL terms |

## Follow Up

If your stack is JavaScript-first, runs in the browser, or needs a backend shape that PowerSync does not cover out of the box, RxDB is worth a closer look. Start with the [Replication guide](../../replication.md), explore the [HTTP replication](../../replication-http.md) plugin, and read [The Local-First Future](../../articles/local-first-future.md) for the broader context. For real-time UI patterns, see [Realtime Database](../../articles/realtime-database.md).

More resources:

- [RxDB Sync Engine](../../replication.md)
- [HTTP Replication](../../replication-http.md)
- [GraphQL Replication](../../replication-graphql.md)
- [RxQuery API](../../rx-query.md)
- [RxDB GitHub Repository](/code/)
