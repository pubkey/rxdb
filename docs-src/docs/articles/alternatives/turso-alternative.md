---
title: RxDB as a Turso and libSQL WASM Alternative for Browser Apps
slug: turso-alternative.html
description: Compare Turso and libSQL in the browser via WASM with RxDB. Persistence, headers, multi-tab, bundle size, and sync explained with numbers.
image: /headers/turso-alternative.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';
import {ComparisonTable} from '@site/src/components/comparison-table';

# RxDB as a Turso and libSQL WASM Alternative for Browser Apps

[Turso](https://turso.tech/) is the company behind **libSQL**, an open source fork of SQLite, and **Turso Database**, a rewrite of SQLite in Rust. Both run on servers, at the edge, and in the browser through WebAssembly, and Turso Cloud adds hosted databases and sync. The team has shipped a lot of database engineering in a short time, and its Rust rewrite has 25,068 GitHub stars as of October 27, 2026. On October 2, 2026, [Supabase announced that it is acquiring Turso](https://supabase.com/blog/supabase-is-acquiring-turso).

If you want a **Turso alternative** or a **libSQL WASM alternative** for a browser app, the question is usually not "which SQL engine is better". It is how to get local data that persists, works in every tab, and stays in sync with a server. [RxDB](https://rxdb.info/) is a [local-first](../local-first-future.md), NoSQL database for JavaScript with a pluggable [storage layer](../../rx-storage.md), [reactive queries](../../reactivity.md), and a [Sync Engine](../../replication.md). This page explains what Turso and libSQL offer in the browser today, where they fall short for local-first web apps, and how RxDB covers the same use cases.

<RxdbLogo alt="Turso and libSQL WASM alternative" />

## A Short History of Turso and libSQL

Glauber Costa and Pekka Enberg forked SQLite as libSQL in 2022 because SQLite does not accept outside contributions. libSQL added features such as a server mode, replication, and vector search, and their company built a hosted edge database on top of it. In December 2024 they announced Limbo, a full rewrite of SQLite in Rust, which later became Turso Database and the main focus of the team.

### A Brief Timeline

- **2022** - libSQL is forked from SQLite ([coverage](https://www.devclass.com/development/2022/10/05/sqlite-not-open-enough-and-needs-modernization-complains-project-which-forks-it/1630721)). The company, then called ChiselStrike, later renames itself to Turso.
- **December 10, 2024** - [Limbo](https://turso.tech/blog/introducing-limbo-a-complete-rewrite-of-sqlite-in-rust) is announced as a rewrite of SQLite in Rust.
- **January 21, 2025** - Turso goes all-in on the rewrite. The new multitenant server is announced as closed source, edge replicas are discontinued for new users, and "everything that runs on the client will remain strictly open source" ([roadmap post](https://turso.tech/blog/upcoming-changes-to-the-turso-platform-and-roadmap)).
- **March 31, 2025** - [Offline sync public beta](https://turso.tech/blog/turso-offline-sync-public-beta) for TypeScript and Rust. The browser is "planned for the future".
- **July 1, 2025** - First alpha of [Turso Database](https://turso.tech/blog/turso-the-next-evolution-of-sqlite).
- **October 8, 2025** - [Turso in the browser](https://turso.tech/blog/introducing-turso-in-the-browser) via the `@tursodatabase/database-wasm` package, and the beta of [Turso Sync](https://turso.tech/blog/introducing-databases-anywhere-with-turso-sync).
- **October 2, 2026** - Supabase announces the acquisition of Turso. Both posts say Turso Cloud keeps running and Turso Database stays open source.
- **October 12, 2026** - Turso Database 0.8.3 is the latest release on npm.

## Turso and libSQL in the Browser Today

There are two ways to run Turso technology in a browser.

**Turso Database via `@tursodatabase/database-wasm`** (MIT, version 0.8.3 as of October 2026). Queries run on the main thread, and the library starts a Web Worker for all file operations through the synchronous OPFS ([Origin Private File System](../../rx-storage-opfs.md)) API. A minimal example from the Turso announcement:

```ts
import { connect } from '@tursodatabase/database-wasm';

const db = await connect('local.db');
console.info(await db.prepare('SELECT ?').run([42]));
```

**libSQL via `@libsql/client-wasm`** (version 0.18.0). This client wraps `@libsql/libsql-wasm-experimental`, which describes itself as "libSQL Wasm packaged as an ES module, forked from SQLite Wasm". It is based on SQLite 3.44.0 and has not been released since October 31, 2024. Calling `sync()` in this client throws "sync not supported in wasm mode", and encryption is not supported either.

For server-side apps, Turso also offers [embedded replicas](https://docs.turso.tech/features/embedded-replicas/introduction) and [Turso Sync](https://docs.turso.tech/sync/usage), which keep a local database file in sync with Turso Cloud. Those need a file system, so they target Node.js, mobile, and desktop, not the browser.

## What is RxDB?

RxDB (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs in the browser, Node.js, Electron, React Native, Capacitor, Deno, and Bun. Documents are validated against a [JSON schema](../../rx-schema.md), queries use MongoDB-style (Mango) syntax, and every query can be observed as an RxJS observable.

RxDB does not ship its own storage engine. Instead, it runs on top of a [storage](../../rx-storage.md) of your choice: [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [SQLite](../../rx-storage-sqlite.md), memory, or [localStorage](../../rx-storage-localstorage.md). Switching storages is a configuration change, not a rewrite.

## Where Turso and libSQL Fall Short in the Browser

### 1. COOP and COEP Headers Are Required

Turso Database shares memory between the main thread and its worker through `SharedArrayBuffer`. The Turso announcement says: "This requires additional COEP / COOP headers to be set for document resource." The bundled code throws when `SharedArrayBuffer` is not available. These headers break embedded third-party iframes, some OAuth popups, and ads, and many static hosts do not let you set them at all. RxDB storages work without special headers.

### 2. One Tab Only

The OPFS access handle locks the database file to one worker. In Turso's own words, this "will prevent usage of same database from different browser tab." Users open apps in several tabs, so you have to build tab coordination yourself. RxDB has [multi-tab](../../rx-collection.md) support built in: all tabs see the same data, changes in one tab show up in the others, and replication runs only in one tab through [leader election](../../leader-election.md).

### 3. Large WASM Download

The browser has to download and compile the database engine before the first query. We measured the `turso.wasm32-wasi.wasm` file of `@tursodatabase/database-wasm` 0.8.3 at **11.6 MB** raw and about **3.9 MB** gzipped. The CDN bundle, which inlines the WASM as base64, is 16.0 MB. For comparison, the official SQLite WASM binary is [about 938.9 kB](https://sqlite.org/download.html) uncompressed. In our [browser storage benchmark](../localstorage-indexeddb-cookies-opfs-sqlite-wasm.md), WASM SQLite needed **504 ms** until it could store the first document while IndexedDB needed **46 ms**. A binary that is more than ten times larger will not start faster.

### 4. No Sync in the Browser Docs

Turso Sync has a browser package (`@tursodatabase/sync-wasm`), but the [official SDK reference](https://docs.turso.tech/sdk/ts/reference) lists only Node.js for sync, and the libSQL WASM client does not sync at all. Where sync works, the remote is Turso Cloud and conflicts are resolved by ["last push wins"](https://docs.turso.tech/sync/conflict-resolution). There is no custom conflict handler. The RxDB [replication protocol](../../replication.md) runs in the browser, works with any backend, and lets you write a [conflict handler](../../transactions-conflicts-revisions.md) per collection.

### 5. Pre-1.0 Engine With Compatibility Gaps

The Turso Database README says it "runs in production today at multiple organizations" but has not reached 1.0 and recommends keeping backups. Its [compatibility list](https://github.com/tursodatabase/turso/blob/main/COMPAT.md) names gaps such as no FTS3/4/5, no `WITH RECURSIVE`, and WAL as the only journal mode. libSQL is battle-tested, but Turso writes that "new features are being developed in Turso", and the browser build of libSQL is still marked experimental.

### 6. Open Questions After the Acquisition

Supabase writes that "For existing users, nothing changes" and that Turso continues its SQLite work. Neither the Supabase post nor the [Turso post](https://turso.tech/blog/turso-is-joining-supabase) mentions libSQL, pricing, or the browser and offline sync roadmap. Notice that this is the third hosted sync product in 2026 whose future changed through an acquisition, after [Electric Cloud](./electricsql-alternative.md) and [Instant Cloud](./instantdb-alternative.md). RxDB is independent and funded by [<PremiumIcon /> RxDB Premium](/premium/) plugins, and its replication runs against your own backend.

## Code Sample: A Reactive Query in RxDB

With Turso in the browser you write SQL and run the query again after every write, because there are no change notifications. With RxDB, the query is an observable that emits whenever the result changes, from any tab or from replication:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const myDatabase = await createRxDatabase({
  name: 'mydb',
  storage: getRxStorageLocalstorage()
});

await myDatabase.addCollections({
  todos: {
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        done: { type: 'boolean', default: false },
        priority: { type: 'integer', minimum: 0, maximum: 10, multipleOf: 1 }
      },
      required: ['id', 'name']
    }
  }
});

await myDatabase.todos.insert({ id: 'todo1', name: 'Learn RxDB', priority: 8 });

myDatabase.todos
  .find({ selector: { done: false }, sort: [{ priority: 'desc' }] })
  .$.subscribe(todos => console.log(todos.map(t => t.name)));
// > ['Learn RxDB']
```

For larger datasets, switch to the [IndexedDB](../../rx-storage-indexeddb.md) or [OPFS](../../rx-storage-opfs.md) storage. If you want SQLite under the hood, the [SQLite storage](../../rx-storage-sqlite.md) runs RxDB on a WebAssembly build of SQLite in the browser and on native SQLite in React Native, Capacitor, Electron, and Node.js.

## Code Sample: Syncing With Your Own Backend

Instead of Turso Cloud, RxDB replicates with any server that implements a pull and a push endpoint. If your backend data lives in libSQL or Turso on the server, these endpoints can read from and write to it.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
  collection: myDatabase.todos,
  replicationIdentifier: 'todos-http',
  live: true,
  pull: {
    async handler(checkpoint, batchSize) {
      const url = 'https://api.example.com/todos/pull' +
        `?checkpoint=${JSON.stringify(checkpoint)}&limit=${batchSize}`;
      const response = await fetch(url);
      return await response.json(); // { documents, checkpoint }
    }
  },
  push: {
    async handler(changeRows) {
      const response = await fetch('https://api.example.com/todos/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changeRows)
      });
      return await response.json(); // conflicting documents
    }
  }
});
```

The full contract, including the event stream for live updates, is described in the [HTTP replication docs](../../replication-http.md).

## When Turso or libSQL Still Makes Sense

- **Server-side SQLite**: For a backend that needs one SQLite database per tenant or per AI agent, Turso Cloud and embedded replicas are built for exactly that. This is a server use case, not a browser one.
- **You need SQL in the browser**: If your app runs complex SQL queries over local data and you control the response headers, Turso Database in the browser gives you a SQLite-compatible engine with an async API. Also compare it with SQLite-Wasm and PGlite in [RxDB vs SQLite WASM vs PGlite](../rxdb-vs-sqlite-wasm-vs-pglite.md).
- **You want open source engine work**: Turso Database is MIT licensed, and the team publishes its engine work in the open.

## FAQ

<Faq>
<FaqItem question="Can Turso run in the browser?">

Yes. Turso Database runs in the browser through the `@tursodatabase/database-wasm` package, which stores data in OPFS through a Web Worker. It requires COOP and COEP headers, and the same database cannot be used from several browser tabs. **[RxDB](../../rx-database.md)** runs in the browser without special headers and supports multiple tabs out of the box.

</FaqItem>
<FaqItem question="Does libSQL WASM support offline sync?">

No. The `@libsql/client-wasm` client throws "sync not supported in wasm mode" when you call `sync()`. Turso's sync features target environments with a file system. The **[RxDB Sync Engine](../../replication.md)** runs in the browser and syncs with any backend.

</FaqItem>
<FaqItem question="What happens to Turso after the Supabase acquisition?">

Supabase and Turso both state that Turso Cloud keeps running and that Turso Database stays open source. Neither announcement mentions libSQL, pricing, or the browser roadmap. If you want a local database whose sync does not depend on a hosted service, **[RxDB](../../rx-database.md)** replicates with your own backend.

</FaqItem>
<FaqItem question="Is RxDB a SQL database?">

No. RxDB is a NoSQL document database with MongoDB-style (Mango) queries. It can use SQLite as its storage engine through the **[SQLite RxStorage](../../rx-storage-sqlite.md)**, but the query language works on JSON documents and has no joins.

</FaqItem>
</Faq>

## Comparison Table

<ComparisonTable>

| Feature | Turso / libSQL in the browser | RxDB |
| --- | --- | --- |
| Data model | SQL tables | JSON documents with schema |
| Query language | SQL | MongoDB-style (Mango) queries |
| Browser persistence | OPFS through a Web Worker (Turso Database) | IndexedDB, OPFS, SQLite, localStorage, memory |
| COOP/COEP headers | Required (Turso Database) | Not required |
| Multiple tabs | Not supported on the same database | Built in |
| Reactive queries | No | Yes, observables on every query |
| WASM download | 11.6 MB raw, about 3.9 MB gzipped (Turso Database 0.8.3) | No WASM needed with IndexedDB or localStorage |
| Sync in the browser | Not in the docs (Turso Sync), not supported (libSQL WASM) | Yes, with any backend |
| Conflict handling | Last push wins | Custom handler per collection or [CRDT](../../crdt.md) |
| Status | Turso Database pre-1.0, libSQL WASM experimental | Stable, maintained since 2016 |
| License | MIT (Turso Database), MIT (libSQL client) | Apache 2.0 core |

</ComparisonTable>

## Follow Up

If you came to Turso for local data in the browser, RxDB gives you persistence, multi-tab support, reactive queries, and sync without special headers or a hosted backend. Start with the [Quickstart](../../quickstart.md) and pick a storage in the [RxStorage overview](../../rx-storage.md).

More resources:

- [RxDB vs SQLite WASM vs PGlite](../rxdb-vs-sqlite-wasm-vs-pglite.md)
- [Browser Storage Benchmark](../localstorage-indexeddb-cookies-opfs-sqlite-wasm.md)
- [RxDB Sync Engine](../../replication.md)
- [SQLite RxStorage](../../rx-storage-sqlite.md)
- [Supabase Alternative](./supabase-alternative.md)
- [RxDB on GitHub](/code/), leave a star ⭐
