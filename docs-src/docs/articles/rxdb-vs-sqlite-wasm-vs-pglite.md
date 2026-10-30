---
title: RxDB vs. SQLite-Wasm vs. PGlite - Browser Database Comparison
slug: rxdb-vs-sqlite-wasm-vs-pglite.html
description: Compare RxDB, SQLite-Wasm, and PGlite for client-side data. Persistence, bundle size, reactivity, multi-tab, and sync explained with code and numbers.
image: /headers/rxdb-vs-sqlite-wasm-vs-pglite.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';
import {ComparisonTable} from '@site/src/components/comparison-table';

# RxDB vs. SQLite-Wasm vs. PGlite

When you want a real database inside the browser, three names come up again and again: **SQLite-Wasm**, **PGlite**, and [RxDB](https://rxdb.info/). SQLite-Wasm is the official build of SQLite compiled to WebAssembly. PGlite is Postgres compiled to WebAssembly. RxDB is a [local-first](./local-first-future.md), NoSQL database that runs on top of a swappable [storage layer](../rx-storage.md) and ships [reactive queries](../reactivity.md) and a [Sync Engine](../replication.md).

These three tools are not on the same layer, which is why a direct "which is faster" comparison misses the point. Two of them are SQL engines. One is a database product that can even use SQLite as its engine. This page explains what each tool is, how they differ in persistence, bundle size, reactivity, multi-tab behavior, and sync, and when each one is the right choice.

<RxdbLogo alt="RxDB vs SQLite-Wasm vs PGlite browser database comparison" />

## The Short Answer

- Pick **SQLite-Wasm** when you need the full SQLite dialect in the browser, you are fine with building reactivity, multi-tab handling, and sync yourself, and you can run your database code inside a Web Worker.
- Pick **PGlite** when you need real Postgres on the client: the Postgres SQL dialect, extensions like `pgvector` or PostGIS, or a throwaway Postgres for tests and developer tools.
- Pick **RxDB** when you build an application that writes data, has to react to changes in the UI, runs in multiple browser tabs, and has to sync with a backend. RxDB also runs on [React Native](../react-native-database.md), [Electron](../electron-database.md), and [Node.js](../nodejs-database.md) with the same code.

## What is SQLite-Wasm?

[SQLite-Wasm](https://sqlite.org/wasm/) is the SQLite project's own build of SQLite3 compiled to WebAssembly. It is published to npm as [`@sqlite.org/sqlite-wasm`](https://www.npmjs.com/package/@sqlite.org/sqlite-wasm) (version `3.53.4-build2` as of October 16, 2026) and is maintained by the SQLite developers themselves. The engine is public domain and the npm wrapper is Apache-2.0.

You get the complete SQLite dialect: joins, window functions, the JSON1 extension, and full-text search. What you do not get is anything above the engine. There is no change stream, no reactive query, and no replication.

Persistence is done through so called VFS (virtual file system) adapters. The [SQLite persistence docs](https://sqlite.org/wasm/doc/trunk/persistence.md) list the options:

- **OPFS VFS**: Stores the database file in the Origin Private File System (OPFS). It only works inside a Web Worker and requires the COOP and COEP HTTP headers because it depends on `SharedArrayBuffer`.
- **OPFS SAHPool VFS**: The fastest option, needs no special headers, but also only runs in a Worker and has weak multi-tab concurrency.
- **kvvfs**: Stores the whole database in `localStorage` or `sessionStorage`, which caps it at a few megabytes and only works on the main thread.
- **In-memory**: The default when nothing is configured. Reloading the page loses all data.

## What is PGlite?

[PGlite](https://pglite.dev/) is a WASM build of Postgres, made by Electric and published as [`@electric-sql/pglite`](https://www.npmjs.com/package/@electric-sql/pglite) (version `0.5.10` as of October 16, 2026). In August 2026 [Electric announced](https://electric.ax/blog/2026/08/11/electric-joining-databricks) that it joins Databricks, and PGlite stays open source under Apache-2.0 and the PostgreSQL License.

PGlite runs Postgres in single-user mode, without booting a Linux virtual machine. The project describes it as "a complete WASM build of Postgres that's under 3MB Gzipped". It runs in the browser, Node.js, Bun, and Deno.

The parts that matter for a client-side decision:

- **Postgres SQL and extensions**: Standard Postgres SQL, plus extensions such as `pgvector` for vector search and PostGIS for geospatial data.
- **Persistence**: In-memory by default. In the browser it persists to IndexedDB with an `idb://` data directory or to OPFS with `opfs-ahp://`. The [PGlite filesystem docs](https://pglite.dev/docs/filesystems) note that the OPFS filesystem only works in a Web Worker and recommend IndexedDB in the browser because the OPFS variant is not supported by Safari.
- **Live queries**: The `live` extension adds `live.query()`, `live.incrementalQuery()`, and `live.changes()`.
- **Single connection**: PGlite is single user and single connection. For multiple tabs there is a multi-tab worker that routes all tabs through one instance.
- **Sync**: The core has no replication. Sync from a server-side Postgres is done with the separate `@electric-sql/pglite-sync` package and the Electric sync service.

## What is RxDB?

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun. Data is stored as JSON documents in [collections](../rx-collection.md) that are defined by a [JSON schema](../rx-schema.md), and you query them with MongoDB-style (Mango) [queries](../rx-query.md).

RxDB does not implement its own low-level engine. Instead the [RxStorage](../rx-storage.md) layer lets you choose where the data lives: [localStorage](../rx-storage-localstorage.md), [IndexedDB](../rx-storage-indexeddb.md), [OPFS](../rx-storage-opfs.md), [SQLite](../rx-storage-sqlite.md), memory, and more. Switching storages is a configuration change, not a rewrite. On top of the storage RxDB adds what an application needs: observable queries, [schema migrations](../migration-schema.md), [encryption](../encryption.md), [multi-tab support](../leader-election.md), and the [replication protocol](../replication.md).

## The Main Difference: Engine vs. Database Product

SQLite-Wasm and PGlite answer the question "how do I run SQL in the browser". RxDB answers the question "how do I build an app with local data that stays in sync". This is the most important point of this comparison.

With an engine you get tables and a query API. Everything around that is your job: keeping the UI in sync with the data, handling two open tabs, retrying writes to the server, and resolving conflicts when two devices edit the same row while offline. This is where most of the work in a local-first app is, and the engine does not help with it.

The layers can also be combined. The [RxDB SQLite storage](../rx-storage-sqlite.md) runs RxDB on top of SQLite, both on native platforms and in the browser through a WebAssembly build of SQLite (the browser adapter `getSQLiteBasicsWasm()` uses the [wa-sqlite](https://github.com/rhashimoto/wa-sqlite) build, not the official `@sqlite.org/sqlite-wasm` package). There is no RxDB storage based on PGlite. Turso also ships a SQLite-compatible engine written in Rust for the browser, which has its own trade-offs with headers, tabs, and bundle size, see the [Turso and libSQL WASM comparison](./alternatives/turso-alternative.md).

## Comparing the Details

### 1. Persistence and Browser Requirements

All three tools can persist data in the browser. The difference is in the requirements around it.

SQLite-Wasm and PGlite both reach their fastest persistence through OPFS, and both can only use OPFS from inside a Web Worker. The standard SQLite OPFS VFS additionally needs the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers, which you cannot always set (for example when your app embeds third-party iframes or is served from a static host without header control). So in practice you end up with a worker setup, a message protocol between the main thread and the worker, and a fallback for browsers where OPFS does not work.

RxDB has the same browser APIs available, but it lets you pick the storage per environment. The [localStorage RxStorage](../rx-storage-localstorage.md) works everywhere without any worker. The [IndexedDB RxStorage](../rx-storage-indexeddb.md) and the [OPFS RxStorage](../rx-storage-opfs.md) (inside a [Worker](../rx-storage-worker.md) or [SharedWorker](../rx-storage-shared-worker.md)) are the faster options from [RxDB Premium <PremiumIcon />](/premium/). The application code stays the same.

### 2. Bundle Size and Startup Time

Both SQL engines have to download and compile a WASM binary before the first query runs. The SQLite WASM binary is [about 938.9 kB](https://sqlite.org/download.html) uncompressed. PGlite is under 3 MB gzipped.

In the [storage benchmark](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md) we ran in Chrome, it took **504 ms** until WASM SQLite could store the first document (535 ms with IndexedDB persistence). Opening an IndexedDB database with one store took **46 ms**. This is the cost of shipping a database engine to the client. PGlite was not part of that benchmark, but with a binary that is several times larger, you should not expect it to start faster.

RxDB itself is plain JavaScript. With a storage that uses a native browser API (localStorage, IndexedDB, OPFS) there is no WASM binary to download at all.

### 3. Write and Read Latency

WASM cannot access browser storage directly. Every write has to leave the WASM module, go through JavaScript, and land in IndexedDB or OPFS. In the [same benchmark](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md#latency-of-small-writes) a single small write took **0.17 ms** with IndexedDB and **3.17 ms** with WASM SQLite persisting to IndexedDB. That is about 18 times slower.

For bulk operations the gap shrinks because the data crosses the WASM boundary only once. Writing 200 documents took 13.41 ms with IndexedDB and 37.12 ms with WASM SQLite on IndexedDB. Notice that these numbers measure plain key-value writes. When your workload is heavy relational queries with joins over large tables, a SQL engine can win back that overhead. For the typical app workload of many small reads and writes, the WASM boundary is the bottleneck. You can compare the RxDB storages in the [RxStorage performance](../rx-storage-performance.md) page.

### 4. Reactivity

A UI has to update when data changes. SQLite-Wasm has no change notifications, so you re-run queries after every write or build your own change tracking. PGlite has live queries through its `live` extension, which is a big step up from plain SQLite. But the live query only sees changes made through the same PGlite instance, which brings us back to the single-connection limit.

In RxDB every query is observable. You call `.find().$` and get an RxJS Observable that emits a new result whenever a matching document changes, including changes from other tabs and from replication. RxDB uses the [EventReduce algorithm](https://github.com/pubkey/event-reduce) to compute the new result from the change event in many cases instead of running the query again. There are hooks and [signals](../reactivity.md) for React, Vue, Angular, and others.

### 5. Multi-Tab Behavior

Users open your app in several tabs. With an OPFS-based SQL engine this is the sharp edge: OPFS access handles are exclusive, so two tabs cannot open the same database file at the same time. SQLite-Wasm users run into `SQLITE_BUSY` errors and have to coordinate access themselves. PGlite solves this with its multi-tab worker, which elects one tab to own the database and proxies the queries from all other tabs.

RxDB handles multiple tabs out of the box. Changes from one tab are broadcast to all other tabs so that their observable queries update, and [leader election](../leader-election.md) makes sure that only one tab runs the replication. You do not write any coordination code.

### 6. Sync and Conflict Handling

SQLite-Wasm has no sync at all. You design the protocol, the change tracking, and the conflict logic yourself, as described in [SQLite sync](./sqlite-sync.md).

PGlite can receive data from a server-side Postgres through Electric. That sync is server-authoritative and focused on the read path: the client subscribes to "shapes" (subsets of server tables). How local writes travel back to the server is up to your application.

RxDB ships a [replication protocol](../replication.md) that works offline-first in both directions. It has checkpoints, retries, resumes after being offline, and runs your [conflict handler](../transactions-conflicts-revisions.md) when two clients edit the same document. There are ready-to-use plugins for [HTTP](../replication-http.md), [GraphQL](../replication-graphql.md), [WebSocket](../replication-websocket.md), [CouchDB](../replication-couchdb.md), [Firestore](../replication-firestore.md), [Supabase](../replication-supabase.md), [MongoDB](../replication-mongodb.md), and [WebRTC](../replication-webrtc.md). So your server can even be a Postgres database, while the client runs RxDB.

### 7. Query Power

This is where the SQL engines win, and it is fair to say so. SQLite-Wasm gives you the full SQLite dialect. PGlite gives you the Postgres planner with CTEs, window functions, and extensions like `pgvector` and PostGIS. RxDB queries are MongoDB-style selectors on documents with sorting, limits, and indexes. There are no joins in the query language.

For most app screens (a list of todos, the messages of a chat, the orders of a customer) a Mango query on an indexed field is all you need. When your app is a SQL playground, a BI tool that runs ad-hoc analytical queries, or has to share SQL with a Postgres backend, an SQL engine is the better fit.

## Code Sample: The Same Todo List in All Three

The following samples store a todo and print all open todos. They show how much of the app logic each tool covers.

### SQLite-Wasm

```ts
// Must run inside a Web Worker to use OPFS persistence.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

const sqlite3 = await sqlite3InitModule();
const poolUtil = await sqlite3.installOpfsSAHPoolVfs();
const db = new poolUtil.OpfsSAHPoolDb('/todos.sqlite3');

db.exec(`CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    name TEXT,
    done INTEGER
)`);
db.exec({
    sql: 'INSERT INTO todos VALUES (?, ?, ?)',
    bind: ['todo1', 'Learn RxDB', 0]
});

const rows = db.exec({
    sql: 'SELECT * FROM todos WHERE done = 0',
    returnValue: 'resultRows',
    rowMode: 'object'
});
console.log(rows);
// > [{ id: 'todo1', name: 'Learn RxDB', done: 0 }]
// Not reactive: you have to run the query again after each write,
// and post the results from the worker to the main thread yourself.
```

### PGlite

```ts
import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';

// 'idb://' persists the Postgres data directory to IndexedDB.
const pg = await PGlite.create('idb://todos', {
    extensions: { live }
});

await pg.exec(`CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    name TEXT,
    done BOOLEAN
)`);
await pg.query(
    'INSERT INTO todos VALUES ($1, $2, $3)',
    ['todo1', 'Learn RxDB', false]
);

// Reactive inside this PGlite instance.
await pg.live.query(
    'SELECT * FROM todos WHERE done = false',
    [],
    (result) => console.log(result.rows)
);
```

### RxDB

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'todos',
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
                name: { type: 'string' },
                done: { type: 'boolean', default: false }
            },
            required: ['id', 'name', 'done']
        }
    }
});

await db.todos.insert({ id: 'todo1', name: 'Learn RxDB', done: false });

// Reactive across all browser tabs and replication.
db.todos.find({ selector: { done: false } }).$.subscribe(todos => {
    console.log(todos.map(t => t.toJSON()));
});
```

To sync the todos with your backend, you add one [replication](../replication.md) call, for example `replicateRxCollection()` with an HTTP endpoint. The query above then also updates when data comes in from the server.

## When SQLite-Wasm or PGlite Still Make Sense

RxDB is not the answer for every case where data lives in the browser.

- **You ship a prebuilt SQLite file**: Offline documentation, a dictionary, or reference data that you query read-only. SQLite-Wasm loads the file and runs SQL on it. RxDB would have to import the data into collections first.
- **Your app is about SQL**: SQL playgrounds, data exploration tools, and notebooks. Here the SQL engine is the product. Supabase's [database.build](https://database.build/) is built on PGlite for this reason.
- **You need Postgres on the client**: Same SQL dialect as your server, `pgvector` similarity search, or PostGIS queries in the browser.
- **Tests and developer tooling**: PGlite as an in-process Postgres in Node.js replaces a Docker container in CI.
- **You want full control**: When your team prefers to build its own reactivity and sync on top of a raw engine, SQLite-Wasm is the most trustworthy base you can pick.

The trouble starts when one of these engines becomes the database of a regular, write-heavy app. Then you rebuild the parts that RxDB has out of the box, and you maintain them yourself.

## FAQ

<Faq>
<FaqItem question="Is SQLite-Wasm faster than IndexedDB?">

No, not for small writes. In our [browser storage benchmark](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md) a single write took 3.17 ms with WASM SQLite on IndexedDB and 0.17 ms with plain IndexedDB, because every write has to cross the WASM boundary. SQLite-Wasm can be faster for complex SQL queries over large tables. **[RxDB](../rx-database.md)** lets you choose the storage that fits your workload.

</FaqItem>
<FaqItem question="Can RxDB use SQLite-Wasm as storage?">

Yes. The **[RxDB SQLite storage](../rx-storage-sqlite.md)** can run on a WebAssembly build of SQLite in the browser through the `getSQLiteBasicsWasm()` adapter, which is based on wa-sqlite. On React Native, Capacitor, Electron, and Node.js the same storage uses the native SQLite of the platform.

</FaqItem>
<FaqItem question="Can I use PGlite as an RxDB storage?">

No. There is no RxDB storage based on PGlite. RxDB is a document database and stores its data in storages like IndexedDB, OPFS, localStorage, or SQLite. When your backend is Postgres, you keep Postgres on the server and sync it with RxDB through the **[replication protocol](../replication.md)**, for example with the [Supabase plugin](../replication-supabase.md) or a custom HTTP endpoint.

</FaqItem>
<FaqItem question="Does PGlite work offline?">

Yes. PGlite runs fully in the browser and persists to IndexedDB or OPFS, so local reads and writes work offline. Syncing local writes back to a server is not part of the core, so you have to design that path yourself. **[RxDB](../offline-first.md)** includes bidirectional offline-first replication with conflict handling.

</FaqItem>
<FaqItem question="Which browser database should I use for a local-first app?">

For a local-first app that writes data, works offline, runs in multiple tabs, and syncs with a server, use a database with reactivity and replication built in, such as **[RxDB](../quickstart.md)**. Use SQLite-Wasm or PGlite when your main requirement is running SQL in the browser and you are willing to build the sync layer yourself.

</FaqItem>
</Faq>

## Comparison Table

<ComparisonTable>

| Feature | SQLite-Wasm | PGlite | RxDB |
| --- | --- | --- | --- |
| Type | SQL engine | SQL engine | Database with sync |
| Data model | Relational (SQLite) | Relational (Postgres) | JSON documents with schema |
| Query language | SQL | SQL (Postgres) | MongoDB-style (Mango) queries |
| Download size | About 938.9 kB WASM (uncompressed) | Under 3 MB gzipped | No WASM needed with native browser storages |
| Persistence | OPFS (Worker only), localStorage, memory | IndexedDB, OPFS (Worker only), memory | [localStorage](../rx-storage-localstorage.md), [IndexedDB](../rx-storage-indexeddb.md), [OPFS](../rx-storage-opfs.md), [SQLite](../rx-storage-sqlite.md), memory |
| Reactive queries | ❌ | ✅ Live query extension | ✅ [Observable queries](../reactivity.md) |
| Multi-tab | ⚠️ Manual, exclusive OPFS locks | ⚠️ Via multi-tab worker | ✅ Built in with [leader election](../leader-election.md) |
| Sync | ❌ | ⚠️ Read-path sync via Electric | ✅ [Bidirectional replication](../replication.md) with many backends |
| Conflict handling | ❌ | ❌ In the core | ✅ Pluggable conflict handlers |
| Schema migrations | Manual SQL | Manual SQL | ✅ [Migration strategies](../migration-schema.md) |
| Encryption | ❌ In the free build | ❌ | ✅ [Field-level encryption](../encryption.md) |
| Runtimes | Browser, Node.js | Browser, Node.js, Bun, Deno | Browser, Node.js, Electron, React Native, Capacitor, Deno, Bun |
| License | Public domain, Apache-2.0 wrapper | Apache-2.0 / PostgreSQL License | Apache-2.0, plus [RxDB Premium <PremiumIcon />](/premium/) plugins |

</ComparisonTable>

## Follow Up

SQLite-Wasm and PGlite bring real SQL engines to the browser, and both do that job well. When you build an application on top of them, you still have to add reactivity, multi-tab handling, and sync. RxDB includes these parts and can even run on SQLite under the hood.

More resources:

- [RxDB Quickstart](../quickstart.md)
- [LocalStorage vs. IndexedDB vs. Cookies vs. OPFS vs. WASM-SQLite](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md)
- [RxDB as a sql.js Alternative](./alternatives/sql-js-alternative.md)
- [TanStack DB with PGlite](./tanstack-db/tanstack-db-pglite.md)
- [RxDB as an ElectricSQL Alternative](./alternatives/electricsql-alternative.md)
- [The Local-First Future](./local-first-future.md)
- [Offline First Database Comparison](https://github.com/pubkey/client-side-databases)
- [RxDB on GitHub](/code/), leave a star ⭐
