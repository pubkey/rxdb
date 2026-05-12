---
title: RxDB as a LokiJS Alternative for Persistent JavaScript Apps
slug: lokijs-alternative.html
description: Replace LokiJS with RxDB for safe persistence, real replication, reactive queries, and an in-memory mode for cache-style speed when you need it.
image: /headers/lokijs-alternative.jpg
---

# RxDB as a LokiJS Alternative for Persistent JavaScript Apps

Developers reach for **LokiJS** when they want a small, MongoDB-like JavaScript database that lives in memory and feels instant. The trade-off shows up later: writes only become durable when an adapter flushes them on a timer or before the process exits, replication across tabs and devices is missing, and the project itself has slowed down. Teams that ship real applications eventually look for a database that keeps the same ergonomic API but stores data safely, syncs across clients, and is still under active development.

This page explains how **RxDB** fits that role and how it covers both the in-memory speed scenarios that drew people to LokiJS and the persistence and sync gaps that pushed them away.

<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## A Short History of LokiJS

LokiJS was started around 2014 by Joe Minichino as an embeddable JavaScript document store with a MongoDB-style query API. It kept the entire dataset in a JavaScript object graph, which is what made queries and mutations feel fast: there was no IO on the hot path. To survive a page reload, LokiJS shipped persistence adapters for IndexedDB, the file system in Node.js, and other targets. Those adapters serialize the in-memory state and write it out, either after a configurable autosave interval or when the process is asked to shut down.

Around 2020 the pace of releases dropped sharply. The project is closer to "feature complete" than to "actively developed", and unresolved issues have piled up. For new projects the question is no longer "is LokiJS fast enough" but "will the database I pick today still be maintained and safe to use in three years".

## What RxDB Is

RxDB is a [local-first](../../offline-first.md), reactive, NoSQL database for JavaScript. It runs in the browser, in Node.js, in Electron, and in React Native. Documents are validated against a JSON schema, queries are MongoDB-style, and every [RxQuery](../../rx-query.md) is observable so the UI can re-render when data changes. The storage layer is pluggable, so the same application code can run on top of [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), [SQLite](../../rx-storage-sqlite.md), or a pure [in-memory](../../rx-storage-memory.md) store.

On top of that, RxDB ships a [replication protocol](../../replication.md) that keeps clients in sync with each other and with a backend, with proper [conflict handling](../../transactions-conflicts-revisions.md).

## Where LokiJS Falls Short

The shortcomings below are the ones that show up most often when teams move off LokiJS:

- **In-memory primary store.** The authoritative copy of the data is the JavaScript object graph. If the tab crashes, the device loses power, or the user closes the browser between autosave intervals, every write since the last flush is gone.
- **Persistence is a side effect.** Adapters write a serialized snapshot of the database. That makes durability coarse and slow on larger datasets, since saving means re-emitting the whole collection or large parts of it.
- **No real replication.** LokiJS has no built-in protocol to sync changes between tabs, devices, or a server. Multi-tab usage in the browser is fragile because two tabs can both load the same database file and overwrite each other on save.
- **No conflict resolution.** Without revisions or a sync engine, there is no defined behavior when two writers touch the same document.
- **Dated codebase and low activity.** New runtimes, new browser storage APIs (OPFS, modern IndexedDB usage patterns), and new bundler conventions are not being adopted.
- **Maintenance mode.** Bug fixes and security patches arrive slowly, if at all.

## What RxDB Gives You Instead

RxDB was designed around the assumption that the database has to outlive a tab crash and stay consistent across many clients.

- **Durable storages by default.** Pick the engine that matches the runtime: [IndexedDB](../../rx-storage-indexeddb.md) and [OPFS](../../rx-storage-opfs.md) in the browser, [Dexie](../../rx-storage-dexie.md) as a thin wrapper over IndexedDB, [SQLite](../../rx-storage-sqlite.md) for Node.js, Electron, and React Native. Each write is persisted by the underlying engine, not by a periodic snapshot of the whole dataset.
- **In-memory mode when you want it.** The [Memory RxStorage](../../rx-storage-memory.md) keeps everything in RAM for cache-style use cases, ephemeral test runs, and hot-path workloads where you do not need persistence.
- **Real replication.** The [RxDB sync engine](../../replication.md) handles pull, push, and live updates against any backend you point it at, including HTTP, GraphQL, CouchDB, WebRTC peers, and Firestore.
- **MongoDB-style queries with indexes.** Define indexes on the fields you query and run rich selectors locally. Queries are observable, so subscribing to a result set is a single call.
- **Reactive UI integration.** Each [RxQuery](../../rx-query.md) emits the latest result whenever the underlying data changes, which is the [reactivity](../../reactivity.md) story LokiJS never fully had.
- **Multi-tab safety.** RxDB coordinates writes across tabs and refuses to corrupt itself when two tabs of the same origin open the same database.
- **Schema and migrations.** Documents are validated, and schema upgrades are first-class instead of ad-hoc.

## Defining a Schema and Subscribing to Changes

The example below mirrors what a LokiJS user would write to insert a document and observe a query, but with RxDB on top of IndexedDB so writes survive a reload.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageIndexedDB } from 'rxdb/plugins/storage-indexeddb';

const db = await createRxDatabase({
  name: 'appdb',
  storage: getRxStorageIndexedDB(),
  multiInstance: true,
  eventReduce: true
});

await db.addCollections({
  notes: {
    schema: {
      title: 'notes schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        title: { type: 'string' },
        body: { type: 'string' },
        updatedAt: { type: 'number' }
      },
      required: ['id', 'title', 'updatedAt'],
      indexes: ['updatedAt']
    }
  }
});

await db.notes.insert({
  id: 'note-1',
  title: 'First note',
  body: 'Hello RxDB',
  updatedAt: Date.now()
});

// Observe a live query: the subscription fires on every change
const query = db.notes
  .find()
  .sort({ updatedAt: 'desc' });

query.$.subscribe(notes => {
  console.log('current notes:', notes.map(n => n.title));
});
```

Compared to LokiJS, the meaningful difference is not the API surface, it is what happens under the hood: each insert is durable in IndexedDB, the query is reactive through RxJS, and other tabs of the same origin see the change automatically.

## Using In-Memory Storage for LokiJS-Style Speed

When the workload truly is "load some data, query it many times, throw it away", swap the storage for the [Memory RxStorage](../../rx-storage-memory.md). The rest of the code stays the same.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';

const cache = await createRxDatabase({
  name: 'cache',
  storage: getRxStorageMemory()
});

await cache.addCollections({
  products: {
    schema: {
      title: 'products schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        price: { type: 'number' }
      }
    }
  }
});

await cache.products.bulkInsert([
  { id: 'p1', name: 'Pen', price: 2 },
  { id: 'p2', name: 'Notebook', price: 6 }
]);

const cheap = await cache.products
  .find({ selector: { price: { $lt: 5 } } })
  .exec();
```

The Memory storage is also useful as a fast tier in front of a persistent [RxCollection](../../rx-collection.md) when you want both speed and durability.

## Why the LokiJS RxStorage Was Removed in RxDB v16

Earlier RxDB versions shipped a `lokijs` RxStorage that wrapped LokiJS as a backing store. It was removed in RxDB version 16. Two reasons drove the decision:

1. LokiJS itself stopped getting fixes for problems that surfaced through RxDB usage, especially around larger datasets and edge cases in the persistence adapters.
2. The use cases the LokiJS storage covered are now served by other built-in storages. For "everything in RAM" there is the [Memory RxStorage](../../rx-storage-memory.md). For "persistent in the browser" there is the [IndexedDB RxStorage](../../rx-storage-indexeddb.md), the [OPFS RxStorage](../../rx-storage-opfs.md), and the [Dexie RxStorage](../../rx-storage-dexie.md). Each of these is faster, safer, and actively maintained.

If you previously used the LokiJS RxStorage, the migration is to pick whichever of those storages matches your durability needs and switch the `storage` option of `createRxDatabase`. Schemas and collection definitions stay the same.

## FAQ

<details>
<summary>Why was the LokiJS RxStorage removed?</summary>

LokiJS is no longer actively maintained, and bugs that affected RxDB users were not getting fixed upstream. RxDB v16 removed the LokiJS storage and points users at the Memory storage for in-memory use and at IndexedDB, OPFS, or Dexie for persistent browser storage.

</details>

<details>
<summary>Can RxDB give me LokiJS-like in-memory speed?</summary>

Yes. The [Memory RxStorage](../../rx-storage-memory.md) keeps the dataset in RAM and runs queries against in-memory indexes, which gives the same query latency profile as LokiJS without the broken persistence story.

</details>

<details>
<summary>Is LokiJS still maintained?</summary>

Activity on the project has been minimal since around 2020. New issues and pull requests sit for long periods. For new projects, treating it as feature-frozen is the safer assumption.

</details>

<details>
<summary>How does RxDB persist data safely?</summary>

Each write goes through the configured RxStorage, and storages like [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), [Dexie](../../rx-storage-dexie.md), and [SQLite](../../rx-storage-sqlite.md) persist that write before acknowledging it. There is no autosave interval that can drop committed data when the tab is closed.

</details>

<details>
<summary>How do I migrate from LokiJS to RxDB?</summary>

Define an [RxCollection](../../rx-collection.md) with a JSON schema that matches your LokiJS collection, read the existing LokiJS data once on startup, and `bulkInsert` it into the RxDB collection. From that point on, write through RxDB and use a [replication plugin](../../replication.md) if you also need to sync the data with a server.

</details>

## RxDB vs LokiJS at a Glance

| Capability                | LokiJS                                       | RxDB                                                           |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| Primary storage model     | In-memory object graph                       | Pluggable RxStorage (IndexedDB, OPFS, Dexie, SQLite, Memory)   |
| Durability of writes      | Periodic snapshot via adapter                | Per-write durability through the underlying engine             |
| In-memory mode            | Default                                      | Optional via [Memory RxStorage](../../rx-storage-memory.md)       |
| Query API                 | MongoDB-style                                | MongoDB-style with observable [RxQuery](../../rx-query.md)        |
| Reactivity                | Events, no observable queries                | RxJS observables on every query and document                   |
| Multi-tab support         | Fragile, snapshot collisions                 | Coordinated writes across tabs                                 |
| Replication / sync        | Not built in                                 | Built-in [sync engine](../../replication.md), HTTP, GraphQL, CouchDB, WebRTC, Firestore |
| Conflict resolution       | None                                         | Custom [conflict handlers](../../transactions-conflicts-revisions.md) with revisions |
| Schema and migrations     | Optional, ad-hoc                             | JSON schema with versioned migrations                          |
| Project activity          | Low since around 2020                        | Actively maintained                                            |

## Follow Up

If LokiJS got you most of the way and stopped being enough once persistence, multi-tab safety, or sync entered the picture, RxDB is the natural next step. It keeps the document-store ergonomics, adds reactive queries, lets you choose between durable and in-memory storages per use case, and gives you a real replication protocol for the day your app stops being a single-device toy.

For more on the broader direction RxDB is built around, see [the local-first future](../../articles/local-first-future.md).
