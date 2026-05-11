---
title: RxDB as an absurd-sql Alternative for JS Apps That Need a Real Database
slug: absurd-sql-alternative.html
description: Looking beyond absurd-sql? RxDB offers schema validation, observable queries, replication, and pluggable storages like OPFS, IndexedDB, and SQLite without low-level SQL plumbing.
---

# RxDB as an absurd-sql Alternative for JS Apps That Need a Real Database

[absurd-sql](https://github.com/jlongster/absurd-sql) is a clever piece of low-level plumbing. It maps SQLite-on-WASM file I/O onto IndexedDB blocks so SQLite can persist data in the browser with reasonable performance. That trick worked well in 2021, but most product teams do not want to maintain raw SQL boilerplate, hand-written migrations, transaction wrappers, and a custom query subscription layer on top of a SQLite VFS shim. They want indexes, reactive queries, replication, schema validation, and observability out of the box.

This page compares **absurd-sql** with **RxDB** and shows where each one fits. If you already invested time into absurd-sql and now hit limits around reactivity, sync, multi-tab coordination, or schema management, RxDB is worth a look.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of absurd-sql

absurd-sql was published by James Long around 2021 with a single, focused idea: SQLite compiled to WebAssembly is fast, but durable persistence in the browser was awkward. The available IndexedDB SQLite VFS implementations made one IndexedDB transaction per query, and IndexedDB transactions are slow. absurd-sql treated IndexedDB as a block device and stored SQLite pages as fixed-size blocks, batching reads and writes. The result was much faster than naive IndexedDB persistence and enabled production apps like [Actual Budget](https://actualbudget.org/) to ship a real SQL database in the browser.

The web platform has moved on since then. The [Origin Private File System (OPFS)](../../rx-storage-opfs.md) is now widely available and gives WASM SQLite direct synchronous file access through `FileSystemSyncAccessHandle`. Most modern SQLite-in-browser stacks (including the official `sqlite-wasm` build from the SQLite team) use OPFS as the default storage backend. The original problem absurd-sql solved is largely addressed by OPFS today, and the absurd-sql repository itself has not seen active development for some time.

## What is RxDB?

[RxDB](https://rxdb.info/) is a [local-first](../../articles/local-first-future.md), reactive, NoSQL JavaScript database. It runs in the browser, [Node.js](../../nodejs-database.md), [React Native](../../react-native-database.md), [Electron](../../electron-database.md), and other JavaScript runtimes. RxDB separates the **database engine** from the **storage layer** so the same application code works on top of IndexedDB, OPFS, SQLite, in-memory, or custom storages.

The features that distinguish RxDB from a raw SQL VFS shim:

- **Schemas** validated against JSON Schema with versioned migrations.
- **Reactive queries** that emit new results when underlying data changes (see [reactivity](../../reactivity.md)).
- **Replication primitives** for syncing with any HTTP, WebSocket, GraphQL, or P2P backend (see [replication](../../replication.md)).
- **Storage agnostic** with adapters for [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [SQLite](../../rx-storage-sqlite.md), memory, and others.
- **Multi-tab safe** with leader election and cross-tab event propagation.
- **Offline-first by default** ([offline-first](../../offline-first.md)).

## Limitations of absurd-sql

absurd-sql is a storage backend, not an application database. The gaps that show up in real projects:

### 1. Low-level API surface

absurd-sql exposes SQLite. Every collection, index, foreign key, migration, and query is hand-written SQL. There is no schema validation framework, no document model, no query builder. Teams end up writing thin ORMs, type adapters, and migration runners themselves, which is the work the database should do.

### 2. No observable queries

SQLite (and absurd-sql by extension) does not push change events. To keep a UI in sync with the database you have to invalidate queries manually after every write, or build your own pub/sub layer. RxDB's [RxQuery](../../rx-query.md) returns an observable that emits new result sets whenever a matching document changes, with the `EventReduce` algorithm minimizing recomputation cost.

### 3. No replication

absurd-sql does not ship a sync protocol. If you want offline-first sync with a server, you build it: change tracking tables, conflict resolution, push and pull endpoints, retry logic, and checkpoint storage. RxDB includes a [replication protocol](../../replication.md) with first-party plugins for HTTP, GraphQL, WebRTC, CouchDB, Firestore, and more.

### 4. Blocking work on the SQLite WASM thread

Running SQLite in the main thread blocks the UI during heavy queries. Running it in a Web Worker (the recommended setup for absurd-sql) means every query crosses a `postMessage` boundary, and the IndexedDB block reads still happen synchronously inside that worker through `Atomics.wait`. Long transactions stall the worker for everything else routed through it.

### 5. Dated approach now that OPFS exists

OPFS provides synchronous file access designed for exactly this use case. New SQLite-in-browser projects target OPFS first and fall back to IndexedDB only for older browsers. The block-emulation trick that absurd-sql pioneered is no longer the fastest path on modern browsers.

### 6. No multi-tab coordination

If a user opens your app in two tabs, both tabs talk to the same IndexedDB blocks. absurd-sql does not coordinate writers across tabs, so concurrent writes can produce surprises. RxDB elects a leader tab, broadcasts events, and serializes writes through a single storage instance.

### 7. No built-in encryption, attachments, or backups

These are common requirements for local-first apps. With absurd-sql you build them on top of SQL. RxDB ships them as plugins.

## Why RxDB Fits Better for Most Apps

### Storage-agnostic with modern options

You pick the storage that matches your runtime and constraints, and you can swap it without changing application code:

- [OPFS storage](../../rx-storage-opfs.md) for the fastest persistent option in modern browsers.
- [IndexedDB storage](../../rx-storage-indexeddb.md) for broad compatibility (and for working around the [slow IndexedDB problem](../../slow-indexeddb.md) using RxDB's optimizations).
- [SQLite storage](../../rx-storage-sqlite.md) when you do want SQLite under the hood, in Node.js, Electron, React Native, or in browsers via `sqlite-wasm`.
- Memory storage for tests.

### Reactive queries and collections

[RxCollection](../../rx-collection.md) and [RxQuery](../../rx-query.md) expose RxJS observables. The UI subscribes once and stays in sync.

### Replication built in

The [sync engine](../../replication.md) handles checkpoints, conflict resolution, and live updates. Plug it into REST, GraphQL, WebSocket, WebRTC, or any custom transport.

### Schema validation and migrations

Define a JSON Schema once. RxDB validates inserts, generates types, and runs versioned migrations when the schema changes.

## Code Sample: Collection and Reactive Query

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
  name: 'budget',
  storage: getRxStorageIndexedDB()
});

await db.addCollections({
  transactions: {
    schema: {
      title: 'transaction schema',
      version: 0,
      type: 'object',
      primaryKey: 'id',
      properties: {
        id: { type: 'string', maxLength: 100 },
        amount: { type: 'number' },
        category: { type: 'string', maxLength: 50 },
        date: { type: 'string', format: 'date-time' }
      },
      required: ['id', 'amount', 'category', 'date'],
      indexes: ['category', 'date']
    }
  }
});

// Reactive query: emits a new array whenever a matching doc changes.
const groceries$ = db.transactions
  .find({ selector: { category: 'groceries' }, sort: [{ date: 'desc' }] })
  .$;

groceries$.subscribe(docs => {
  console.log('Groceries updated:', docs.length);
});

await db.transactions.insert({
  id: 't1',
  amount: 42.5,
  category: 'groceries',
  date: new Date().toISOString()
});
```

No SQL strings, no manual cache invalidation, no hand-rolled change feed.

## Code Sample: Switching Storages Without Rewriting Code

One of the practical pains with absurd-sql is that it is tied to its specific IndexedDB-block layout. With RxDB the storage is a parameter. Moving from IndexedDB to OPFS is a one-line change.

```ts
// Before: IndexedDB
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
  name: 'budget',
  storage: getRxStorageIndexedDB()
});
```

```ts
// After: OPFS, same collections, same queries, same replication.
import { getRxStorageOPFS } from 'rxdb/plugins/storage-opfs';

const db = await createRxDatabase({
  name: 'budget',
  storage: getRxStorageOPFS()
});
```

Schemas, queries, replication setup, and reactive subscriptions stay identical. The same pattern applies if you target Node.js with [SQLite storage](../../rx-storage-sqlite.md) or React Native.

## FAQ

<details>
<summary>Does RxDB use absurd-sql?</summary>

No. RxDB has its own [storage layer abstraction](../../rx-storage-indexeddb.md) and ships several first-party storage adapters. For browser persistence you can pick the [IndexedDB storage](../../rx-storage-indexeddb.md) or the [OPFS storage](../../rx-storage-opfs.md). If you want SQLite specifically, the [SQLite storage](../../rx-storage-sqlite.md) uses `sqlite-wasm` (or native SQLite on Node.js and React Native) without the absurd-sql block-on-IndexedDB trick.

</details>

<details>
<summary>Is OPFS a better fit than absurd-sql today?</summary>

For most modern browsers, yes. OPFS gives WASM modules synchronous file access through `FileSystemSyncAccessHandle`, which is what SQLite wants. The official `sqlite-wasm` build from the SQLite team uses OPFS as its primary persistent VFS. RxDB exposes this through the [OPFS storage](../../rx-storage-opfs.md). absurd-sql's IndexedDB-as-block-device approach was a workaround for the absence of OPFS, and that absence is mostly gone.

</details>

<details>
<summary>Can I run SQL in RxDB?</summary>

RxDB's primary query API is a NoSQL Mongo-style selector with sort, skip, and limit, designed for reactive subscriptions. If you specifically need SQL semantics, the [SQLite storage](../../rx-storage-sqlite.md) lets you use SQLite as the underlying engine while still keeping RxDB's schemas, [reactive queries](../../reactivity.md), and replication on top. Most applications find the document API plus indexes covers what they would otherwise write in SQL.

</details>

<details>
<summary>How does multi-tab work?</summary>

RxDB elects a leader tab using the BroadcastChannel API and serializes writes through a single storage instance, then broadcasts change events to every other tab. Reactive queries in all tabs update automatically when one tab writes a document. absurd-sql does not provide cross-tab coordination, so applications using it have to handle concurrent writers themselves.

</details>

## Comparison Table

| Capability | absurd-sql | RxDB |
| --- | --- | --- |
| Data model | Raw SQL tables | JSON Schema documents |
| Query API | Hand-written SQL | NoSQL selectors plus indexes |
| Reactive queries | Manual invalidation | Built-in observables |
| Schema validation | Application code | JSON Schema, enforced |
| Migrations | Hand-written | Versioned, declarative |
| Replication / sync | Not included | First-party plugins |
| Browser storage | IndexedDB blocks only | IndexedDB, OPFS, memory |
| Other runtimes | Browser focused | Browser, Node.js, React Native, Electron |
| Multi-tab coordination | None | Leader election plus events |
| Encryption, attachments, backups | Build yourself | Plugins |
| Active maintenance | Stagnant | Active |

## When absurd-sql Still Makes Sense

absurd-sql is reasonable if you already have a large SQL codebase, you need bit-for-bit SQLite semantics in the browser, you cannot rely on OPFS in your target browsers, and you are willing to maintain the surrounding application database concerns yourself. For most new projects, starting with RxDB and picking the storage that matches the runtime is a faster path to a working local-first app.

## Getting Started with RxDB

```bash
npm install rxdb rxjs
```

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageOPFS } from 'rxdb/plugins/storage-opfs';

const db = await createRxDatabase({
  name: 'mydb',
  storage: getRxStorageOPFS()
});
```

From there, add [collections](../../rx-collection.md), write [reactive queries](../../rx-query.md), and connect [replication](../../replication.md) when you are ready to sync. If you later decide to swap storages, the rest of your application code does not change.

More resources:

- [RxDB Storage: OPFS](../../rx-storage-opfs.md)
- [RxDB Storage: IndexedDB](../../rx-storage-indexeddb.md)
- [RxDB Storage: SQLite](../../rx-storage-sqlite.md)
- [Why IndexedDB is slow](../../slow-indexeddb.md)
- [The local-first future](../../articles/local-first-future.md)
- [RxDB Replication](../../replication.md)
