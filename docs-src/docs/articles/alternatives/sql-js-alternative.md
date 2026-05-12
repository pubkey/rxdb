---
title: RxDB as a sql.js Alternative for Browser Persistence
slug: sql-js-alternative.html
description: Compare RxDB with sql.js for browser data. Get durable storage, reactive queries, replication, and schemas where sql.js only offers in-memory SQLite.
image: /headers/sql-js-alternative.jpg
---

# RxDB as a sql.js Alternative for Browser Persistence

Developers often pick **sql.js** when they want to run SQL inside the browser without a server. It is a faithful port of SQLite compiled to WebAssembly, so any valid SQLite query runs in a JavaScript runtime. The catch shows up the moment a real application needs to keep data around: sql.js holds the entire database as an in-memory buffer. Closing the tab, reloading the page, or losing a process wipes the state. There is no built-in [persistence](../../offline-first.md), no [reactive query](../../reactivity.md) layer, no [replication](../../replication.md), and no awareness of other browser tabs.

This page explains why teams that started with sql.js often migrate to **RxDB** once their prototype turns into a product, and how RxDB fills the gaps while still letting you keep SQLite as the underlying storage if you want.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="RxDB JavaScript Database" width="220" />
    </a>
</center>

## A Short History of sql.js

sql.js started around 2014, created by Alon Zakai (kripken), the author of Emscripten. The original release compiled the SQLite C source to asm.js so a full SQL engine could run inside any JavaScript runtime. As browser support for WebAssembly matured, sql.js switched to a WASM build that delivered better startup time and smaller payloads. A pure JavaScript fallback remained for older browsers.

The library became the default choice for in-browser SQL demos, teaching tools, and offline document viewers that ship a prebuilt SQLite file. Because sql.js mirrors the SQLite feature set, queries written for the desktop or server work without changes inside the browser. What sql.js never aimed to solve was persistence, multi-tab coordination, or sync. Those concerns sit one layer above the engine, and most teams build them by hand or move to a database that already includes them.

## What is RxDB?

[RxDB](https://rxdb.info/) is a NoSQL, [local-first](../../articles/local-first-future.md) database for JavaScript applications. It runs in the browser, [Node.js](../../nodejs-database.md), [Electron](../../electron-database.md), [React Native](../../react-native-database.md), and any other runtime that can execute JavaScript. RxDB stores data in a swappable storage layer, validates documents against [JSON schemas](../../rx-schema.md), exposes [reactive queries](../../reactivity.md) through RxJS observables, and ships a [replication protocol](../../replication.md) that keeps clients in sync with any backend.

Where sql.js is one engine, RxDB is a full database product. The storage engine is just one configuration choice, and SQLite is one of several supported options.

## Where sql.js Falls Short

The list below covers the recurring problems that push teams away from sql.js once a project leaves the demo stage.

### 1. In-memory only
sql.js loads the database into a `Uint8Array`. To save state you serialize the buffer with `db.export()` and write it somewhere yourself, often [IndexedDB](../../rx-storage-indexeddb.md) or a server endpoint. To restore, you fetch the bytes and pass them to `new SQL.Database(bytes)`. Every change forces a manual export, which means either writing the full file on every mutation (slow for large datasets) or losing the most recent edits on a crash.

### 2. No observability
sql.js answers a query with a single result set. There is no way to subscribe to a query and receive updates when underlying rows change. Building a UI that reacts to data requires custom diff tracking or a full re-query after every write.

### 3. No schema validation per document
SQLite enforces table schemas, but the data model is row-and-column. Document-shaped data with nested objects, arrays, or optional fields needs hand-rolled JSON columns and manual validation.

### 4. No replication protocol
There is no built-in way to sync sql.js with a remote backend or another client. You write the protocol, the conflict logic, and the change tracking yourself.

### 5. No multi-tab coordination
Two browser tabs running sql.js each hold their own copy of the in-memory database. Writes in one tab do not appear in the other unless you re-export and re-import the buffer through some channel you implement.

### 6. Manual indexing strategy
You get SQLite indexes, but you also get the responsibility of designing them around access patterns that change as the app grows.

## Where RxDB Helps

RxDB addresses each of those gaps without giving up on the option to keep SQLite as the engine.

### Durable storage options
RxDB ships several storage backends that persist data without manual export steps.

- [SQLite Storage](../../rx-storage-sqlite.md) runs SQLite via WASM (or native bindings in Node.js, Electron, React Native) and writes through to a durable file or OPFS handle.
- [IndexedDB Storage](../../rx-storage-indexeddb.md) uses the standard browser database for broad compatibility.
- [OPFS Storage](../../rx-storage-opfs.md) writes to the Origin Private File System for the fastest pure-browser persistence available today.

You change the storage in one line of configuration and the rest of the application stays the same.

### MongoDB-style queries
RxDB exposes a [Mango query language](../../rx-query.md) that targets nested document fields, array contents, and compound conditions. The same query string runs against any storage backend.

### Reactive queries
Every [RxQuery](../../rx-query.md) returns an RxJS observable. UI components subscribe once and receive a fresh result set whenever a relevant document changes, including updates from other tabs.

### Full replication
The [Replication Protocol](../../replication.md) supports custom HTTP backends, [GraphQL](../../replication-graphql.md), [CouchDB](../../replication-couchdb.md), [Firestore](../../replication-firestore.md), [WebRTC](../../replication-webrtc.md), and more. Conflict handlers are pluggable.

### Schema validation
[RxCollections](../../rx-collection.md) require a JSON schema at creation time. Documents are validated on insert and update, indexes are derived from the schema, and TypeScript types can be generated from it.

### Multi-tab support
RxDB uses a leader election mechanism so writes from any tab propagate to all open tabs of the same origin without extra code.

## Code Sample: Schema-Driven Collection

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
  name: 'appdb',
  storage: getRxStorageIndexedDB()
});

await db.addCollections({
  invoices: {
    schema: {
      title: 'invoice schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        customer: { type: 'string' },
        amount: { type: 'number' },
        paid: { type: 'boolean' },
        createdAt: { type: 'number' }
      },
      required: ['id', 'customer', 'amount', 'createdAt'],
      indexes: ['createdAt']
    }
  }
});

// Insert a document
await db.invoices.insert({
  id: 'inv-1001',
  customer: 'acme',
  amount: 420,
  paid: false,
  createdAt: Date.now()
});

// Reactive query: re-emits whenever a matching invoice changes
db.invoices
  .find({ selector: { paid: false }, sort: [{ createdAt: 'desc' }] })
  .$
  .subscribe(unpaid => {
    console.log('unpaid invoices:', unpaid.length);
  });
```

The query returns an observable. There is no polling, no manual export, and no diff logic in the UI layer.

## Code Sample: SQLite Storage in Browser, Node, and Electron

If you want SQLite as the engine but still need durability, reactivity, and replication, swap the storage to the [RxDB SQLite Storage](../../rx-storage-sqlite.md). The application code does not change.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsWasm
} from 'rxdb/plugins/storage-sqlite';
import sqliteWasm from '@vlcn.io/wa-sqlite';

// Browser: SQLite compiled to WASM, persisted via OPFS
const storage = getRxStorageSQLiteTrial({
  sqliteBasics: getSQLiteBasicsWasm(sqliteWasm)
});

const db = await createRxDatabase({
  name: 'sqlite-app',
  storage
});

await db.addCollections({
  notes: {
    schema: {
      title: 'note schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        title: { type: 'string' },
        body: { type: 'string' }
      },
      required: ['id', 'title']
    }
  }
});

await db.notes.insert({ id: 'n1', title: 'first', body: 'hello sqlite' });
```

The same configuration works in Node.js with `better-sqlite3` and in Electron with the native SQLite binding. You write your application against RxCollections once, and the storage adapter handles the runtime details.

## Need Raw SQL?

Some teams reach for sql.js because they have an existing body of SQL queries or a SQLite file they want to read in the browser. RxDB's [SQLite Storage](../../rx-storage-sqlite.md) keeps SQLite as the engine, so the same WASM build that powers sql.js sits underneath your collections. You get [Mango queries](../../rx-query.md) for the application layer, and you can still drop down to SQL when you need it. For most CRUD work, the RxDB query API is shorter than equivalent SQL and avoids string concatenation around dynamic filters.

If your goal is to ship a static, read-only SQLite file for full-text search or reference data, sql.js remains a fine fit. If your goal is an application that writes data, syncs across devices, and reacts to changes, RxDB on top of SQLite covers the same engine plus everything sql.js leaves to you.

## FAQ

<details>
<summary>Does RxDB use SQLite under the hood?</summary>

RxDB uses a pluggable storage layer. SQLite is one supported backend through the [RxDB SQLite Storage](../../rx-storage-sqlite.md), which can run on a WASM build of SQLite in the browser, on `better-sqlite3` in Node.js, on the native binding in Electron, or on the React Native SQLite module. Other storages such as [IndexedDB](../../rx-storage-indexeddb.md) and [OPFS](../../rx-storage-opfs.md) use no SQLite at all.

</details>

<details>
<summary>Can I run SQL queries in RxDB?</summary>

The primary RxDB query API is [Mango-style](../../rx-query.md), which is JSON based and works the same across every storage backend. When you choose the SQLite storage you can still execute raw SQL through the underlying SQLite handle for reporting or migrations, while keeping the application code on top of [RxCollections](../../rx-collection.md).

</details>

<details>
<summary>How is data persisted in RxDB?</summary>

Each storage backend writes to a durable target. [OPFS](../../rx-storage-opfs.md) and [IndexedDB](../../rx-storage-indexeddb.md) persist inside the browser's storage area for the origin. The [SQLite Storage](../../rx-storage-sqlite.md) writes a SQLite file in Node.js and Electron, and uses OPFS files in the browser. Inserts and updates are flushed by the storage layer; you do not call an export step the way sql.js requires.

</details>

<details>
<summary>Is RxDB faster than sql.js for app data?</summary>

For typical application workloads with many small reads and writes, RxDB is faster because changes do not require re-serializing a full database buffer. sql.js stays competitive for one-shot analytical queries over a preloaded dataset, since the whole database already sits in memory. For write-heavy apps that must persist after every mutation, RxDB's storages avoid the export and reimport cycle that dominates sql.js write costs.

</details>

## Comparison Table

| Feature | sql.js | RxDB |
| --- | --- | --- |
| Persistence | In-memory only, manual export | Durable through every storage backend |
| Storage options | Single in-memory buffer | [SQLite](../../rx-storage-sqlite.md), [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), and more |
| Query API | SQL | Mango queries with [reactive results](../../rx-query.md) |
| Reactive queries | Not supported | Built in via [RxJS observables](../../reactivity.md) |
| Schema validation | Row and column types only | JSON schema per [collection](../../rx-collection.md) |
| Replication | Not supported | [Full sync engine](../../replication.md) for HTTP, GraphQL, CouchDB, Firestore, WebRTC |
| Multi-tab coordination | Each tab is isolated | Shared state with leader election |
| TypeScript types | Manual | Generated from schema |
| Runtime support | Browser and Node.js | Browser, Node.js, Electron, React Native, Deno, Bun |
| Conflict handling | Application responsibility | Pluggable conflict handlers |

## Follow Up

If you started with sql.js for the SQL feature set and ran into the persistence and reactivity gaps, RxDB lets you keep SQLite as the engine while adding the rest of what an application database needs. Read the [Quickstart](../../quickstart.md), explore the [SQLite Storage docs](../../rx-storage-sqlite.md), and join the RxDB community on Discord and GitHub.

More resources:

- [RxDB Replication](../../replication.md)
- [RxDB SQLite Storage](../../rx-storage-sqlite.md)
- [RxDB OPFS Storage](../../rx-storage-opfs.md)
- [Local-First Future](../../articles/local-first-future.md)
- [RxDB on GitHub](/code/)
